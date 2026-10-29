import { answersSchema } from "@/lib/schemas";
import type { AnswersResponse } from "@/lib/types";
import { saveAnswers } from "@/server/client-view";
import { handleApi, json, readJson } from "@/server/http";

type Context = RouteContext<"/api/client/[token]/sessions/[sessionId]/answers">;

/** 준비 질문 메모 저장 ("메모 저장" 버튼: 여러 질문의 메모를 한 번에) */
export const PUT = handleApi(async (request, { params }: Context) => {
  const { token, sessionId } = await params;
  const { answers } = await readJson(request, answersSchema);
  const preparationQuestions = await saveAnswers(token, sessionId, answers);
  return json<AnswersResponse>({ preparationQuestions });
});
