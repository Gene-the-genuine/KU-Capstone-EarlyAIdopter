import { loginSchema } from "@/lib/schemas";
import type { CounselorResponse } from "@/lib/types";
import { logIn } from "@/server/auth";
import { handleApi, json, readJson } from "@/server/http";

/** 로그인. 성공하면 로그인 쿠키가 심어집니다 → 프론트에서 /counselor 로 이동 */
export const POST = handleApi(async (request) => {
  const input = await readJson(request, loginSchema);
  const counselor = await logIn(input.username, input.password);
  return json<CounselorResponse>({ counselor });
});
