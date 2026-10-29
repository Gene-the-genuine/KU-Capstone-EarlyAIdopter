import { sessionContentSchema } from "@/lib/schemas";
import type { ShareResponse } from "@/lib/types";
import { requireCounselor } from "@/server/auth";
import { handleApi, json, readJson } from "@/server/http";
import { shareSession } from "@/server/sessions";

type Context = RouteContext<"/api/counselor/clients/[clientId]/sessions/[sessionId]/share">;

/**
 * 공유 확정: 화면의 내용을 저장하면서 shared 로 잠그고, 내담자 링크(session.sharePath)를 돌려줍니다.
 * 이미 공유된 회기면 저장하지 않고 기존 링크를 돌려줍니다(alreadyShared: true).
 */
export const POST = handleApi(async (request, { params }: Context) => {
  const counselor = await requireCounselor();
  const { clientId, sessionId } = await params;
  const content = await readJson(request, sessionContentSchema);
  const result = await shareSession(counselor.id, clientId, sessionId, content);
  return json<ShareResponse>(result);
});
