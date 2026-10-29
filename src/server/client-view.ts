import "server-only";
import type {
  ClientActionItem,
  ClientHomeResponse,
  ClientQuestion,
  ClientSessionResponse,
} from "@/lib/types";
import { getDb } from "./db";
import { HttpError, notFound } from "./http";

/**
 * 내담자(링크) 화면 — 로그인 없이 /client/{share_token} 링크로 들어오는 사람용
 *
 * 지키는 규칙 (명세 2장, 7장)
 * - 링크 토큰 → 내담자 → 그 내담자의 회기 → status = 'shared' 를 매번 함께 확인
 * - 상담 원문 · 상담사용 기록 · 상담 목적 메모는 select 에 넣지 않음 (애초에 꺼내지 않음)
 * - 링크가 왜 안 되는지(토큰 오류/삭제/작성 중 회기)는 구분해서 알려 주지 않음
 */

function invalidLink(): HttpError {
  return notFound("링크가 올바르지 않거나 더 이상 사용할 수 없습니다.");
}

/** 공유 토큰으로 내담자 찾기 (이름·생년월일만) */
async function findClientByToken(token: string) {
  // 토큰 모양이 아니면 DB 에 묻지 않고 바로 거절
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(token)) throw invalidLink();

  const { data, error } = await getDb()
    .from("clients")
    .select("id, name, birth_date")
    .eq("share_token", token)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw invalidLink();
  return data;
}

/** 이 내담자의 공유 완료 회기들 (날짜 → 회기 번호 순) */
async function listSharedSessions(clientId: string) {
  const { data, error } = await getDb()
    .from("sessions")
    .select("id, session_number, session_date, client_summary, action_items(is_completed)")
    .eq("client_id", clientId)
    .eq("status", "shared")
    .order("session_date", { ascending: true })
    .order("session_number", { ascending: true });
  if (error) throw error;
  return data;
}

/** 공유 완료된 이 내담자의 회기인지 확인 (아니면 링크 오류와 같은 404) */
async function assertSharedSession(clientId: string, sessionId: string): Promise<void> {
  const { data, error } = await getDb()
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("client_id", clientId)
    .eq("status", "shared")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw invalidLink();
}

/** 내담자 홈: 이름·생년월일 + 공유 완료 회기 카드 목록 */
export async function getClientHome(token: string): Promise<ClientHomeResponse> {
  const client = await findClientByToken(token);
  const sessions = await listSharedSessions(client.id);

  return {
    client: { name: client.name, birthDate: client.birth_date },
    sessions: sessions.map((session) => ({
      id: session.id,
      sessionNumber: session.session_number,
      sessionDate: session.session_date,
      clientSummary: session.client_summary,
      actionItemCount: session.action_items.length,
      completedActionItemCount: session.action_items.filter((item) => item.is_completed).length,
    })),
  };
}

/** 내담자 회기 상세: 요약 · 과제(체크) · 준비 질문(메모) + 이전/다음 공유 회기 */
export async function getClientSession(token: string, sessionId: string): Promise<ClientSessionResponse> {
  const client = await findClientByToken(token);

  // 이전/다음 버튼도 공유 완료 회기 사이에서만 움직이도록, 공유 회기 목록에서 위치를 찾습니다.
  const sharedSessions = await listSharedSessions(client.id);
  const index = sharedSessions.findIndex((session) => session.id === sessionId);
  if (index === -1) throw invalidLink(); // 없는 회기 · 작성 중 회기 · 다른 내담자의 회기

  const { data, error } = await getDb()
    .from("sessions")
    .select(
      "id, session_number, session_date, client_summary, action_items(id, position, title, is_completed), preparation_questions(id, position, question, client_answer)",
    )
    .eq("id", sessionId)
    .eq("client_id", client.id)
    .eq("status", "shared")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw invalidLink();

  return {
    client: { name: client.name, birthDate: client.birth_date },
    session: {
      id: data.id,
      sessionNumber: data.session_number,
      sessionDate: data.session_date,
      clientSummary: data.client_summary,
      actionItems: [...data.action_items]
        .sort((a, b) => a.position - b.position)
        .map((item) => ({ id: item.id, title: item.title, isCompleted: item.is_completed })),
      preparationQuestions: [...data.preparation_questions]
        .sort((a, b) => a.position - b.position)
        .map((item) => ({ id: item.id, question: item.question, clientAnswer: item.client_answer })),
    },
    prevSessionId: sharedSessions[index - 1]?.id ?? null,
    nextSessionId: sharedSessions[index + 1]?.id ?? null,
  };
}

/** 실천 과제 체크/해제 (누르는 즉시 저장) */
export async function setActionItemCompleted(
  token: string,
  sessionId: string,
  itemId: string,
  isCompleted: boolean,
): Promise<ClientActionItem> {
  const client = await findClientByToken(token);
  await assertSharedSession(client.id, sessionId);

  const { data, error } = await getDb()
    .from("action_items")
    .update({ is_completed: isCompleted })
    .eq("id", itemId)
    .eq("session_id", sessionId)
    .select("id, title, is_completed")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound("과제를 찾을 수 없습니다.");
  return { id: data.id, title: data.title, isCompleted: data.is_completed };
}

/** 준비 질문 메모 저장 ("메모 저장" 버튼 한 번에 여러 질문의 메모를 저장) */
export async function saveAnswers(
  token: string,
  sessionId: string,
  answers: { questionId: string; answer: string }[],
): Promise<ClientQuestion[]> {
  const client = await findClientByToken(token);
  await assertSharedSession(client.id, sessionId);
  const db = getDb();

  // 보낸 질문 ID 가 모두 이 회기의 질문인지 먼저 확인
  const { data: questions, error } = await db
    .from("preparation_questions")
    .select("id")
    .eq("session_id", sessionId);
  if (error) throw error;
  const questionIds = new Set(questions.map((question) => question.id));
  if (answers.some((answer) => !questionIds.has(answer.questionId))) {
    throw new HttpError(400, "VALIDATION_ERROR", "이 회기에 없는 질문의 메모가 들어 있습니다.", "answers");
  }

  // 질문 수가 2~3개라 하나씩 저장합니다. 중간에 실패하면 일부만 저장될 수 있지만,
  // 내담자가 쓴 글은 화면에 그대로 남아 있으므로 "메모 저장"을 다시 누르면 모두 저장됩니다.
  for (const { questionId, answer } of answers) {
    const { error: updateError } = await db
      .from("preparation_questions")
      .update({ client_answer: answer })
      .eq("id", questionId)
      .eq("session_id", sessionId);
    if (updateError) throw updateError;
  }

  const { data: saved, error: savedError } = await db
    .from("preparation_questions")
    .select("id, position, question, client_answer")
    .eq("session_id", sessionId)
    .order("position", { ascending: true });
  if (savedError) throw savedError;
  return saved.map((item) => ({ id: item.id, question: item.question, clientAnswer: item.client_answer }));
}
