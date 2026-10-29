import { signupSchema } from "@/lib/schemas";
import type { CounselorResponse } from "@/lib/types";
import { signUp } from "@/server/auth";
import { handleApi, json, readJson } from "@/server/http";

/** 회원가입. 계정만 만들고 로그인은 하지 않습니다 → 프론트에서 /login 으로 이동 */
export const POST = handleApi(async (request) => {
  const input = await readJson(request, signupSchema);
  const counselor = await signUp(input.username, input.password);
  return json<CounselorResponse>({ counselor }, 201);
});
