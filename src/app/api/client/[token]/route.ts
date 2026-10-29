import type { ClientHomeResponse } from "@/lib/types";
import { getClientHome } from "@/server/client-view";
import { handleApi, json } from "@/server/http";

type Context = RouteContext<"/api/client/[token]">;

/** 내담자 홈: 이름·생년월일 + 공유 완료 회기 목록 (로그인 없이 링크 토큰으로 접근) */
export const GET = handleApi(async (_request, { params }: Context) => {
  const { token } = await params;
  return json<ClientHomeResponse>(await getClientHome(token));
});
