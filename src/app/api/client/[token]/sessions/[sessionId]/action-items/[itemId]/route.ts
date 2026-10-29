import { actionItemUpdateSchema } from "@/lib/schemas";
import type { ActionItemResponse } from "@/lib/types";
import { setActionItemCompleted } from "@/server/client-view";
import { handleApi, json, readJson } from "@/server/http";

type Context = RouteContext<"/api/client/[token]/sessions/[sessionId]/action-items/[itemId]">;

/** 실천 과제 체크/해제 (누르는 즉시 저장) */
export const PATCH = handleApi(async (request, { params }: Context) => {
  const { token, sessionId, itemId } = await params;
  const { isCompleted } = await readJson(request, actionItemUpdateSchema);
  const actionItem = await setActionItemCompleted(token, sessionId, itemId, isCompleted);
  return json<ActionItemResponse>({ actionItem });
});
