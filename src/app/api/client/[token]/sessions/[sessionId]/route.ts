import type { ClientSessionResponse } from "@/lib/types";
import { getClientSession } from "@/server/client-view";
import { handleApi, json } from "@/server/http";

type Context = RouteContext<"/api/client/[token]/sessions/[sessionId]">;

/** 내담자 회기 상세: 요약 · 과제 · 준비 질문 + 이전/다음 공유 회기 ID */
export const GET = handleApi(async (_request, { params }: Context) => {
  const { token, sessionId } = await params;
  return json<ClientSessionResponse>(await getClientSession(token, sessionId));
});
