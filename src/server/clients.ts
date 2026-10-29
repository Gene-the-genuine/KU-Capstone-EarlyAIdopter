import "server-only";
import { randomBytes } from "node:crypto";
import type { CounselorClient, SessionStatus } from "@/lib/types";
import { getDb } from "./db";
import { notFound } from "./http";

/**
 * 내담자 관리 (상담사용) — 목록 · 추가 · 조회 · 삭제
 * 모든 함수는 counselorId 를 받아서 "로그인한 상담사의 내담자"만 다룹니다.
 */

// 내담자 + 그 내담자의 회기 목록을 한 번에 가져오는 select (sessions(...) = 연결된 회기들)
const CLIENT_WITH_SESSIONS = "id, name, birth_date, purpose_note, share_token, created_at, sessions(id, session_number, session_date, status, shared_at)";

type ClientRow = {
  id: string;
  name: string;
  birth_date: string;
  purpose_note: string | null;
  share_token: string;
  created_at: string;
  sessions: {
    id: string;
    session_number: number;
    session_date: string;
    status: string;
    shared_at: string | null;
  }[];
};

/** DB 행(snake_case) → API 응답(camelCase) */
function toCounselorClient(row: ClientRow): CounselorClient {
  return {
    id: row.id,
    name: row.name,
    birthDate: row.birth_date,
    purposeNote: row.purpose_note,
    shareToken: row.share_token,
    createdAt: row.created_at,
    sessions: row.sessions
      .map((session) => ({
        id: session.id,
        sessionNumber: session.session_number,
        sessionDate: session.session_date,
        status: session.status as SessionStatus,
        sharedAt: session.shared_at,
      }))
      .sort((a, b) => a.sessionNumber - b.sessionNumber),
  };
}

/** 내담자 링크용 무작위 토큰 (URL 에 넣기 안전한 32글자) */
function createShareToken(): string {
  return randomBytes(24).toString("base64url");
}

/** 내 내담자 목록 (등록한 순서) */
export async function listClients(counselorId: string): Promise<CounselorClient[]> {
  const { data, error } = await getDb()
    .from("clients")
    .select(CLIENT_WITH_SESSIONS)
    .eq("counselor_id", counselorId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(toCounselorClient);
}

/** 내담자 한 명 (내 내담자가 아니면 404) */
export async function getClient(counselorId: string, clientId: string): Promise<CounselorClient> {
  const { data, error } = await getDb()
    .from("clients")
    .select(CLIENT_WITH_SESSIONS)
    .eq("id", clientId)
    .eq("counselor_id", counselorId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound("내담자를 찾을 수 없습니다.");
  return toCounselorClient(data);
}

/** 내담자 추가 (공유 토큰은 이때 한 번 만들어져 고정됨) */
export async function addClient(
  counselorId: string,
  input: { name: string; birthDate: string; purposeNote: string | null },
): Promise<CounselorClient> {
  const { data, error } = await getDb()
    .from("clients")
    .insert({
      counselor_id: counselorId,
      name: input.name,
      birth_date: input.birthDate,
      purpose_note: input.purposeNote,
      share_token: createShareToken(),
    })
    .select(CLIENT_WITH_SESSIONS)
    .single();
  if (error) throw error;
  return toCounselorClient(data);
}

/**
 * 내담자 삭제
 * 회기·과제·질문은 DB 가 함께 지우고(ON DELETE CASCADE), 공유 토큰도 사라지므로 내담자 링크가 바로 막힙니다.
 */
export async function deleteClient(counselorId: string, clientId: string): Promise<void> {
  const { data, error } = await getDb()
    .from("clients")
    .delete()
    .eq("id", clientId)
    .eq("counselor_id", counselorId)
    .select("id");
  if (error) throw error;
  if (data.length === 0) throw notFound("내담자를 찾을 수 없습니다.");
}

/**
 * 내 내담자인지 확인하고 기본 정보를 돌려줍니다. (회기 API 들이 맨 먼저 부름)
 * 남의 내담자이거나 없는 내담자면 404 — 존재 여부도 알려 주지 않습니다.
 */
export async function getOwnedClient(counselorId: string, clientId: string) {
  const { data, error } = await getDb()
    .from("clients")
    .select("id, name, birth_date, purpose_note, share_token")
    .eq("id", clientId)
    .eq("counselor_id", counselorId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound("내담자를 찾을 수 없습니다.");
  return data;
}
