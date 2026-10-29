import { sessionContentSchema } from "@/lib/schemas";
import type { SessionResponse } from "@/lib/types";
import { requireCounselor } from "@/server/auth";
import { handleApi, json, readJson } from "@/server/http";
import { getCounselorSession, saveSessionDraft } from "@/server/sessions";

type Context = RouteContext<"/api/counselor/clients/[clientId]/sessions/[sessionId]">;

/** 회기 상세 (상담사용) */
export const GET = handleApi(async (_request, { params }: Context) => {
  const counselor = await requireCounselor();
  const { clientId, sessionId } = await params;
  const session = await getCounselorSession(counselor.id, clientId, sessionId);
  return json<SessionResponse>({ session });
});

/** 임시 저장: 화면의 모든 입력을 한 번에 저장 (공유 완료된 회기는 409) */
export const PUT = handleApi(async (request, { params }: Context) => {
  const counselor = await requireCounselor();
  const { clientId, sessionId } = await params;
  const content = await readJson(request, sessionContentSchema);
  const session = await saveSessionDraft(counselor.id, clientId, sessionId, content);
  return json<SessionResponse>({ session });
});
