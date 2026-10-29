import { aiRequestSchema } from "@/lib/schemas";
import type { AiResponse } from "@/lib/types";
import { summarizeSourceText } from "@/server/ai";
import { requireCounselor } from "@/server/auth";
import { handleApi, json, readJson } from "@/server/http";
import { assertDraftSession } from "@/server/sessions";

// AI 응답을 기다리는 최대 시간(초). Vercel 무료(Hobby) 플랜 한도 안의 값입니다.
export const maxDuration = 60;

type Context = RouteContext<"/api/counselor/clients/[clientId]/sessions/[sessionId]/ai">;

/**
 * AI 정리: 화면에 입력된 상담 원문(sourceText)만 AI 에 보내고 결과를 돌려줍니다.
 * 결과는 DB 에 저장하지 않습니다 → 상담사가 검토 후 "임시 저장"/"공유 확정"을 눌러야 저장됩니다.
 */
export const POST = handleApi(async (request, { params }: Context) => {
  const counselor = await requireCounselor();
  const { clientId, sessionId } = await params;
  const { sourceText } = await readJson(request, aiRequestSchema);
  await assertDraftSession(counselor.id, clientId, sessionId);
  const result = await summarizeSourceText(sourceText);
  return json<AiResponse>({ result });
});
