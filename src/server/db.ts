import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { requireEnv } from "./env";

function createDb() {
  return createClient<Database>(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

let db: ReturnType<typeof createDb> | undefined;

/**
 * Supabase DB 클라이언트 (서버 전용)
 *
 * - secret key 로 접속하므로 DB의 접근 제한(RLS)을 그대로 통과합니다.
 *   → "이 데이터를 이 사람이 봐도 되는지"는 반드시 서버 코드에서 검사하세요.
 *     (상담사: counselor_id 확인, 내담자: share_token + status='shared' 확인)
 * - 브라우저 코드에서 import 하면 빌드 오류가 납니다 (server-only).
 */
export function getDb() {
  db ??= createDb();
  return db;
}
