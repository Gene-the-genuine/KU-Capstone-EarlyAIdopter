import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { LIMITS } from "@/lib/schemas";
import type { AiResult } from "@/lib/types";
import { AI_INSTRUCTIONS } from "./ai-prompt";
import { HttpError } from "./http";

/**
 * AI 정리 (OpenAI Responses API + Structured Outputs)
 *
 * - 결과는 아래 AiOutput 모양의 JSON 으로만 받도록 강제합니다(모델이 다른 모양을 낼 수 없음).
 * - 결과를 DB 에 저장하지 않습니다. 상담사가 "임시 저장"/"공유 확정"을 눌러야 저장됩니다.
 * - 환경변수: OPENAI_API_KEY, OPENAI_MODEL, OPENAI_REASONING_EFFORT, AI_MOCK (.env.example 참고)
 */

const DEFAULT_MODEL = "gpt-6-luna";
const MAX_QUESTIONS = 3; // 명세: 준비 질문 2~3개
const REASONING_EFFORTS = ["none", "minimal", "low", "medium", "high", "xhigh", "max"] as const;

// 한 번만 시도하고 50초 안에 끝냅니다(라우트 제한 60초). 실패하면 화면의 "다시 시도" 버튼으로 다시 부릅니다.
const OPENAI_TIMEOUT_MS = 50_000;

const AiOutput = z.object({
  counselorNote: z.string().describe("원문에 근거한 상담사용 상세 기록"),
  clientSummary: z.string().describe("내담자가 읽을 존댓말 요약, 5문장 안팎"),
  actionItems: z.array(z.string()).describe("원문에서 명시적으로 합의한 실천 과제. 없으면 빈 배열"),
  preparationQuestions: z.array(z.string()).describe("다음 상담 전에 생각해 볼 개방형 질문 2~3개"),
});

export async function summarizeSourceText(sourceText: string): Promise<AiResult> {
  if (process.env.AI_MOCK === "true") {
    return mockResult();
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new HttpError(500, "AI_NOT_CONFIGURED", "AI 설정이 없습니다. 서버의 OPENAI_API_KEY 를 확인하세요.");
  }

  // 추론 강도: 낮을수록 빠르고 저렴. 비워 두면 모델 기본값을 씁니다.
  const effort = process.env.OPENAI_REASONING_EFFORT?.trim().toLowerCase() || undefined;
  if (effort && !REASONING_EFFORTS.some((allowed) => allowed === effort)) {
    throw new HttpError(
      500,
      "AI_NOT_CONFIGURED",
      `OPENAI_REASONING_EFFORT 값(${effort})이 올바르지 않습니다. ${REASONING_EFFORTS.join(" / ")} 중 하나로 두거나 지우세요.`,
    );
  }

  const openai = new OpenAI({ apiKey, timeout: OPENAI_TIMEOUT_MS, maxRetries: 0 });

  try {
    const response = await openai.responses.parse({
      model: process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL,
      instructions: AI_INSTRUCTIONS,
      input: sourceText,
      text: { format: zodTextFormat(AiOutput, "session_summary") },
      ...(effort && { reasoning: { effort: effort as OpenAI.ReasoningEffort } }),
      store: false, // 응답을 나중에 다시 조회할 수 있게 OpenAI 에 보관하지 않음 (데이터 보존 정책 자체는 OpenAI 약관을 따름)
    });

    if (!response.output_parsed) {
      throw new Error(`AI 응답에 결과 JSON 이 없습니다. (status: ${response.status})`);
    }
    return cleanUp(response.output_parsed);
  } catch (error) {
    console.error("[AI] 정리 실패:", error);
    throw new HttpError(
      502,
      "AI_FAILED",
      "AI 정리에 실패했습니다. 입력한 원문과 현재 결과는 그대로 남아 있습니다.",
    );
  }
}

/** 공백 정리 + 저장 규칙(@/lib/schemas 의 LIMITS)을 넘지 않게 자르기 */
function cleanUp(result: z.infer<typeof AiOutput>): AiResult {
  const cleanList = (items: string[], maxCount: number) =>
    items
      .map((item) => item.trim().slice(0, LIMITS.listItem))
      .filter((item) => item.length > 0)
      .slice(0, maxCount);

  return {
    counselorNote: result.counselorNote.trim().slice(0, LIMITS.counselorNote),
    clientSummary: result.clientSummary.trim().slice(0, LIMITS.clientSummary),
    actionItems: cleanList(result.actionItems, LIMITS.listCount),
    preparationQuestions: cleanList(result.preparationQuestions, MAX_QUESTIONS),
  };
}

/** AI_MOCK=true 일 때: OpenAI 를 부르지 않고 예시 결과를 돌려줍니다 (키 없이 화면 개발용) */
async function mockResult(): Promise<AiResult> {
  await new Promise((resolve) => setTimeout(resolve, 1_000)); // 로딩 화면을 확인할 수 있게 1초 대기
  return {
    counselorNote:
      "[예시 결과 — AI_MOCK 모드]\n주제: 학업 스트레스\n주요 내용: 시험 기간에 잠을 줄이며 공부하는 패턴을 이야기함.\n합의사항: 밤 12시 전에 잠자리에 들기.",
    clientSummary:
      "[예시 결과] 이번 상담에서는 시험 준비로 힘들었던 마음을 이야기해 주셨어요. 잠을 줄여 가며 노력해 온 시간이 얼마나 컸는지 함께 살펴봤어요. 다음 상담까지는 밤 12시 전에 잠자리에 들어 보기로 했어요.",
    actionItems: ["(예시) 밤 12시 전에 잠자리에 들기"],
    preparationQuestions: [
      "(예시) 이번 주에 가장 편안했던 순간은 언제였나요?",
      "(예시) 잠을 충분히 잔 다음 날에는 무엇이 달랐나요?",
    ],
  };
}
