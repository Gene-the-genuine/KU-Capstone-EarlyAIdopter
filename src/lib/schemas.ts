import { z } from "zod";

/**
 * API 요청 검증 규칙 (프론트엔드와 백엔드가 함께 씀)
 *
 * - 백엔드: 모든 요청 body 를 이 규칙으로 검사하고, 어긋나면 400 VALIDATION_ERROR 를 돌려줍니다.
 * - 프론트엔드(선택): 같은 규칙으로 미리 검사하면 서버에 보내기 전에 오류 문구를 보여 줄 수 있습니다.
 *     const result = signupSchema.safeParse(form);
 *     if (!result.success) setError(result.error.issues[0].message);
 */

/** 길이 제한 (바꾸고 싶으면 여기만 고치면 됩니다) */
export const LIMITS = {
  username: 30,
  passwordMin: 8,
  passwordMaxBytes: 72, // bcrypt 는 앞 72바이트만 사용 (한글은 1자 = 3바이트)
  clientName: 50,
  purposeNote: 1_000,
  sourceText: 50_000,
  counselorNote: 20_000,
  clientSummary: 5_000,
  listItem: 300, // 실천 과제 / 준비 질문 한 줄
  listCount: 20, // 실천 과제 / 준비 질문 개수
  answer: 2_000, // 내담자 메모 한 칸
} as const;

/** 한국 시간 기준 오늘 날짜 'YYYY-MM-DD' (서버가 해외에 있어도 한국 날짜) */
export function todayInKorea(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

const bytesOf = (text: string) => new TextEncoder().encode(text).length;

// ─────────────────────────────────────────────────────────────
// 상담사 계정
// ─────────────────────────────────────────────────────────────

export const signupSchema = z
  .object({
    username: z
      .string({ error: "아이디를 입력하세요." })
      .trim()
      .min(1, "아이디를 입력하세요.")
      .max(LIMITS.username, `아이디는 ${LIMITS.username}자 이하로 입력하세요.`),
    password: z
      .string({ error: "비밀번호를 입력하세요." })
      .min(LIMITS.passwordMin, `비밀번호는 ${LIMITS.passwordMin}자 이상이어야 합니다.`)
      .refine((password) => bytesOf(password) <= LIMITS.passwordMaxBytes, {
        error: "비밀번호가 너무 깁니다. (영문 72자, 한글 24자 이하)",
      }),
    passwordConfirm: z.string({ error: "비밀번호 확인을 입력하세요." }),
  })
  .refine((input) => input.password === input.passwordConfirm, {
    error: "비밀번호가 일치하지 않습니다.",
    path: ["passwordConfirm"],
  });

// 로그인은 형식만 가볍게 봅니다. 길이 상한은 엄청 긴 값을 보내 서버를 괴롭히는 것을 막는 용도입니다.
export const loginSchema = z.object({
  username: z
    .string({ error: "아이디를 입력하세요." })
    .trim()
    .min(1, "아이디를 입력하세요.")
    .max(LIMITS.username, "아이디 또는 비밀번호가 올바르지 않습니다."),
  password: z
    .string({ error: "비밀번호를 입력하세요." })
    .min(1, "비밀번호를 입력하세요.")
    .refine((password) => bytesOf(password) <= LIMITS.passwordMaxBytes, {
      error: "아이디 또는 비밀번호가 올바르지 않습니다.",
    }),
});

// ─────────────────────────────────────────────────────────────
// 상담사: 내담자
// ─────────────────────────────────────────────────────────────

export const addClientSchema = z.object({
  name: z
    .string({ error: "이름을 입력하세요." })
    .trim()
    .min(1, "이름을 입력하세요.")
    .max(LIMITS.clientName, `이름은 ${LIMITS.clientName}자 이하로 입력하세요.`),
  birthDate: z
    .iso.date({ error: "생년월일을 날짜 형식으로 입력하세요. (예: 1998-03-14)" })
    .refine((date) => date >= "1900-01-01", { error: "생년월일을 다시 확인하세요." })
    .refine((date) => date <= todayInKorea(), { error: "생년월일은 오늘 이후일 수 없습니다." }),
  // 선택 입력: 비워 두면 null 로 저장
  purposeNote: z
    .string({ error: "상담 목적 메모는 글자로 입력하세요." })
    .trim()
    .max(LIMITS.purposeNote, `상담 목적 메모는 ${LIMITS.purposeNote.toLocaleString()}자 이하로 입력하세요.`)
    .nullish()
    .transform((note) => note || null),
});

// ─────────────────────────────────────────────────────────────
// 상담사: 회기 (임시 저장 / 공유 확정 / AI 정리)
// ─────────────────────────────────────────────────────────────

/** 실천 과제·준비 질문 목록: 앞뒤 공백을 지우고, 빈 줄은 저장하지 않습니다. */
function textList(messages: { type: string; tooLong: string; tooMany: string }) {
  return z
    .array(z.string({ error: messages.type }).trim().max(LIMITS.listItem, messages.tooLong), {
      error: messages.type,
    })
    .transform((items) => items.filter((item) => item.length > 0))
    .refine((items) => items.length <= LIMITS.listCount, { error: messages.tooMany });
}

export const sessionContentSchema = z.object({
  sessionDate: z.iso.date({ error: "회기 날짜를 날짜 형식으로 입력하세요. (예: 2026-10-29)" }),
  sourceText: z
    .string({ error: "상담 원문은 글자로 입력하세요." })
    .max(LIMITS.sourceText, `상담 원문은 ${LIMITS.sourceText.toLocaleString()}자 이하로 입력하세요.`),
  counselorNote: z
    .string({ error: "상담사용 기록은 글자로 입력하세요." })
    .max(LIMITS.counselorNote, `상담사용 기록은 ${LIMITS.counselorNote.toLocaleString()}자 이하로 입력하세요.`),
  clientSummary: z
    .string({ error: "내담자용 요약은 글자로 입력하세요." })
    .max(LIMITS.clientSummary, `내담자용 요약은 ${LIMITS.clientSummary.toLocaleString()}자 이하로 입력하세요.`),
  actionItems: textList({
    type: "실천 과제는 글자 목록이어야 합니다.",
    tooLong: `실천 과제 한 줄은 ${LIMITS.listItem}자 이하로 입력하세요.`,
    tooMany: `실천 과제는 ${LIMITS.listCount}개까지 입력할 수 있습니다.`,
  }),
  preparationQuestions: textList({
    type: "준비 질문은 글자 목록이어야 합니다.",
    tooLong: `준비 질문 한 줄은 ${LIMITS.listItem}자 이하로 입력하세요.`,
    tooMany: `준비 질문은 ${LIMITS.listCount}개까지 입력할 수 있습니다.`,
  }),
});

export const aiRequestSchema = z.object({
  sourceText: z
    .string({ error: "상담 원문을 입력한 뒤 AI 정리를 눌러 주세요." })
    .max(LIMITS.sourceText, `상담 원문은 ${LIMITS.sourceText.toLocaleString()}자 이하로 입력하세요.`)
    .refine((text) => text.trim().length > 0, {
      error: "상담 원문을 입력한 뒤 AI 정리를 눌러 주세요.",
    }),
});

// ─────────────────────────────────────────────────────────────
// 내담자(링크) 화면
// ─────────────────────────────────────────────────────────────

export const actionItemUpdateSchema = z.object({
  isCompleted: z.boolean({ error: "isCompleted 는 true 또는 false 여야 합니다." }),
});

export const answersSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.guid({ error: "질문 ID가 올바르지 않습니다." }),
        answer: z
          .string({ error: "메모는 글자로 입력하세요." })
          .max(LIMITS.answer, `메모는 ${LIMITS.answer.toLocaleString()}자 이하로 입력하세요.`),
      }),
      { error: "answers 는 [{ questionId, answer }] 목록이어야 합니다." },
    )
    .max(LIMITS.listCount, "메모가 너무 많습니다.")
    .refine((answers) => new Set(answers.map((a) => a.questionId)).size === answers.length, {
      error: "같은 질문의 메모가 두 번 들어 있습니다.",
    }),
});

// ─────────────────────────────────────────────────────────────
// 요청 타입 (프론트에서 보낼 때 쓰는 모양)
// ─────────────────────────────────────────────────────────────

export type SignupInput = z.input<typeof signupSchema>;
export type LoginInput = z.input<typeof loginSchema>;
export type AddClientInput = z.input<typeof addClientSchema>;
export type SessionContentInput = z.input<typeof sessionContentSchema>;
export type AnswerInput = z.input<typeof answersSchema>["answers"][number];
