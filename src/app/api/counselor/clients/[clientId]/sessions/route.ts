import type { SessionResponse } from "@/lib/types";
import { requireCounselor } from "@/server/auth";
import { handleApi, json } from "@/server/http";
import { createDraftSession } from "@/server/sessions";

type Context = RouteContext<"/api/counselor/clients/[clientId]/sessions">;

/** 새 회기 만들기: 빈 draft 를 DB 에 만들고 돌려줍니다 → 프론트에서 그 회기 페이지로 이동 */
export const POST = handleApi(async (_request, { params }: Context) => {
  const counselor = await requireCounselor();
  const { clientId } = await params;
  const session = await createDraftSession(counselor.id, clientId);
  return json<SessionResponse>({ session }, 201);
});
