import { getDb } from "@/server/db";
import { handleApi, json } from "@/server/http";

/**
 * 상태 확인: 서버와 DB 가 살아 있는지 봅니다. (배포 확인, Supabase 일시정지 예방 ping 용)
 * 개인 정보는 돌려주지 않습니다.
 */
export const GET = handleApi(async () => {
  const { error } = await getDb().from("counselors").select("id", { head: true }).limit(1);
  if (error) throw error;
  return json({ ok: true, checkedAt: new Date().toISOString() });
});
