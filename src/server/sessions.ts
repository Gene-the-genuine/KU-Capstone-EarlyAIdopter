import "server-only";
import type { CounselorSession, SessionContent, SessionStatus } from "@/lib/types";
import { getOwnedClient } from "./clients";
import { getDb } from "./db";
import { HttpError, notFound } from "./http";

/**
 * 회기 (상담사용) — 새 회기 만들기 · 조회 · 임시 저장 · 공유 확정
 * 모든 함수는 먼저 getOwnedClient 로 "로그인한 상담사의 내담자"인지 확인합니다.
 */

// 내담자의 완료 여부(is_completed)·메모(client_answer)는 상담사에게 보여 주지 않으므로 고르지 않습니다.
const SESSION_DETAIL =
  "id, session_number, session_date, status, source_text, counselor_note, client_summary, created_at, shared_at, action_items(position, title), preparation_questions(position, question)";

type SessionRow = {
  id: string;
  session_number: number;
  session_date: string;
  status: string;
  source_text: string;
  counselor_note: string;
  client_summary: string;
  created_at: string;
  shared_at: string | null;
  action_items: { position: number; title: string }[];
  preparation_questions: { position: number; question: string }[];
};

type OwnedClient = Awaited<ReturnType<typeof getOwnedClient>>;

function toCounselorSession(client: OwnedClient, row: SessionRow): CounselorSession {
  const isShared = row.status === "shared";
  return {
    id: row.id,
    sessionNumber: row.session_number,
    sessionDate: row.session_date,
    status: row.status as SessionStatus,
    sourceText: row.source_text,
    counselorNote: row.counselor_note,
    clientSummary: row.client_summary,
    actionItems: [...row.action_items].sort((a, b) => a.position - b.position).map((item) => item.title),
    preparationQuestions: [...row.preparation_questions]
      .sort((a, b) => a.position - b.position)
      .map((item) => item.question),
    createdAt: row.created_at,
    sharedAt: row.shared_at,
    sharePath: isShared ? `/client/${client.share_token}/sessions/${row.id}` : null,
    client: {
      id: client.id,
      name: client.name,
      birthDate: client.birth_date,
      purposeNote: client.purpose_note,
    },
  };
}

/**
 * 새 회기 만들기 (빈 draft)
 * - 회기 번호 = 이 내담자의 마지막 번호 + 1, 날짜 = 한국 날짜로 오늘(DB 기본값)
 * - 두 요청이 동시에 같은 번호를 잡으면 DB 의 unique 제약이 막아 주고, 여기서 다시 시도합니다.
 */
export async function createDraftSession(counselorId: string, clientId: string): Promise<CounselorSession> {
  const client = await getOwnedClient(counselorId, clientId);
  const db = getDb();

  for (let attempt = 1; attempt <= 5; attempt++) {
    const { data: last, error: lastError } = await db
      .from("sessions")
      .select("session_number")
      .eq("client_id", clientId)
      .order("session_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastError) throw lastError;

    const { data, error } = await db
      .from("sessions")
      .insert({ client_id: clientId, session_number: (last?.session_number ?? 0) + 1 })
      .select(SESSION_DETAIL)
      .single();

    if (!error) return toCounselorSession(client, data);
    if (error.code !== "23505") throw error; // 23505 = 번호가 겹침 → 다시 시도
  }
  throw new Error("회기 번호를 정하지 못했습니다. 잠시 후 다시 시도하세요.");
}

/** 회기 상세 (상담사용) */
export async function getCounselorSession(
  counselorId: string,
  clientId: string,
  sessionId: string,
): Promise<CounselorSession> {
  const client = await getOwnedClient(counselorId, clientId);

  const { data, error } = await getDb()
    .from("sessions")
    .select(SESSION_DETAIL)
    .eq("id", sessionId)
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound("회기를 찾을 수 없습니다.");
  return toCounselorSession(client, data);
}

/** DB 함수 save_session 호출 (supabase/schema.sql 3번 참고) */
async function callSaveSession(
  counselorId: string,
  clientId: string,
  sessionId: string,
  content: SessionContent,
  share: boolean,
): Promise<string> {
  const { data, error } = await getDb().rpc("save_session", {
    p_counselor_id: counselorId,
    p_client_id: clientId,
    p_session_id: sessionId,
    p_session_date: content.sessionDate,
    p_source_text: content.sourceText,
    p_counselor_note: content.counselorNote,
    p_client_summary: content.clientSummary,
    p_action_items: content.actionItems,
    p_preparation_questions: content.preparationQuestions,
    p_share: share,
  });
  if (error) throw error;
  return data;
}

/** 임시 저장: 화면의 모든 입력(날짜·원문·기록·요약·과제·질문)을 한 번에 저장 */
export async function saveSessionDraft(
  counselorId: string,
  clientId: string,
  sessionId: string,
  content: SessionContent,
): Promise<CounselorSession> {
  const result = await callSaveSession(counselorId, clientId, sessionId, content, false);

  if (result === "not_found") throw notFound("회기를 찾을 수 없습니다.");
  if (result === "already_shared") {
    throw new HttpError(409, "SESSION_LOCKED", "이미 공유 완료된 회기는 수정할 수 없습니다.");
  }
  if (result !== "saved") throw new Error(`save_session 이 예상하지 못한 값을 돌려줌: ${result}`);

  return getCounselorSession(counselorId, clientId, sessionId);
}

/**
 * 공유 확정: 화면의 내용을 저장하면서 동시에 shared 로 잠급니다.
 * 이미 공유된 회기면 아무것도 바꾸지 않고 기존 링크를 돌려줍니다(alreadyShared: true).
 */
export async function shareSession(
  counselorId: string,
  clientId: string,
  sessionId: string,
  content: SessionContent,
): Promise<{ session: CounselorSession; alreadyShared: boolean }> {
  const result = await callSaveSession(counselorId, clientId, sessionId, content, true);

  if (result === "not_found") throw notFound("회기를 찾을 수 없습니다.");
  if (result === "summary_required") {
    throw new HttpError(400, "SUMMARY_REQUIRED", "공유하려면 내담자용 요약을 입력하세요.", "clientSummary");
  }
  if (result !== "shared" && result !== "already_shared") {
    throw new Error(`save_session 이 예상하지 못한 값을 돌려줌: ${result}`);
  }

  const session = await getCounselorSession(counselorId, clientId, sessionId);
  return { session, alreadyShared: result === "already_shared" };
}

/** AI 정리 전에 확인: 내 회기이고 아직 작성 중(draft)이어야 함 */
export async function assertDraftSession(counselorId: string, clientId: string, sessionId: string): Promise<void> {
  await getOwnedClient(counselorId, clientId);

  const { data, error } = await getDb()
    .from("sessions")
    .select("status")
    .eq("id", sessionId)
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound("회기를 찾을 수 없습니다.");
  if (data.status === "shared") {
    throw new HttpError(409, "SESSION_LOCKED", "공유 완료된 회기는 다시 정리할 수 없습니다.");
  }
}
