import type { OkResponse } from "@/lib/types";
import { logOut } from "@/server/auth";
import { handleApi, json } from "@/server/http";

/** 로그아웃 */
export const POST = handleApi(async () => {
  await logOut();
  return json<OkResponse>({ ok: true });
});
