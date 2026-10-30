/**
 * API 응답 타입 모음 (프론트엔드와 백엔드가 함께 쓰는 "약속")
 *
 * - 백엔드 API가 돌려주는 JSON의 모양이 여기 그대로 정의되어 있습니다.
 * - 이름 규칙: Counselor* = 상담사 화면용, Client* = 내담자(링크) 화면용
 * - 날짜는 'YYYY-MM-DD' 문자열, 시각은 ISO 문자열(예: '2026-10-29T06:00:00+00:00')
 * - 각 API의 설명과 예시는 docs/API.md 에 있습니다.
 */

/** 회기 상태: draft = 작성 중, shared = 공유 완료 */
export type SessionStatus = "draft" | "shared";

// ─────────────────────────────────────────────────────────────
// 오류
// ─────────────────────────────────────────────────────────────

export type ApiErrorCode =
  | "VALIDATION_ERROR" // 입력값이 잘못됨 (field 에 어느 칸인지 들어 있음)
  | "INVALID_JSON" // 요청 body 가 JSON 이 아님
  | "UNAUTHORIZED" // 로그인이 필요함
  | "LOGIN_FAILED" // 아이디 또는 비밀번호가 틀림
  | "USERNAME_TAKEN" // 이미 있는 아이디
  | "NOT_FOUND" // 없거나 볼 권한이 없음
  | "SESSION_LOCKED" // 공유 완료된 회기라 수정/AI 정리 불가
  | "SUMMARY_REQUIRED" // 공유하려면 내담자용 요약 필요
  | "AI_FAILED" // AI 정리 실패 (다시 시도 가능)
  | "AI_NOT_CONFIGURED" // 서버에 OPENAI_API_KEY 가 없음
  | "SERVER_ERROR"; // 그 밖의 서버 오류

/** 모든 오류 응답은 이 모양입니다. */
export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string; // 화면에 그대로 보여 줘도 되는 한국어 문장
    field?: string; // VALIDATION_ERROR 일 때 문제가 된 입력칸 이름 (예: 'passwordConfirm')
  };
};

// ─────────────────────────────────────────────────────────────
// 상담사 계정
// ─────────────────────────────────────────────────────────────

export type Counselor = {
  id: string;
  username: string;
};

// ─────────────────────────────────────────────────────────────
// 상담사 화면: 내담자와 회기
// ─────────────────────────────────────────────────────────────

/** 대시보드의 회기 목록 한 줄 */
export type SessionListItem = {
  id: string;
  sessionNumber: number;
  sessionDate: string;
  status: SessionStatus;
  sharedAt: string | null;
};

/** 상담사가 보는 내담자 (회기 목록 포함, 회기 번호 순) */
export type CounselorClient = {
  id: string;
  name: string;
  birthDate: string;
  purposeNote: string | null; // 상담 목적 메모 (상담사만)
  shareToken: string; // 내담자 링크용 토큰
  createdAt: string;
  sessions: SessionListItem[];
};

/** 임시 저장 / 공유 확정 때 보내는 회기 내용 (화면의 입력칸 전부) */
export type SessionContent = {
  sessionDate: string;
  sourceText: string; // 상담 원문 (상담사만)
  counselorNote: string; // 상담사용 상세 기록 (상담사만)
  clientSummary: string; // 내담자용 요약
  actionItems: string[]; // 실천 과제 제목들 (화면 순서대로)
  preparationQuestions: string[]; // 준비 질문들 (화면 순서대로)
};

/**
 * 상담사가 보는 회기 상세
 * - 내담자의 과제 완료 여부와 질문 답변은 포함하지 않습니다(명세: 내담자만 확인).
 */
export type CounselorSession = SessionContent & {
  id: string;
  sessionNumber: number;
  status: SessionStatus;
  createdAt: string;
  sharedAt: string | null;
  /** 공유 완료일 때만 값이 있음: '/client/{shareToken}/sessions/{id}' (앞에 window.location.origin 을 붙여 사용) */
  sharePath: string | null;
  client: {
    id: string;
    name: string;
    birthDate: string;
    purposeNote: string | null;
  };
};

/** AI 정리 결과. DB에 저장되지 않으며, 임시 저장/공유 확정을 눌러야 저장됩니다. */
export type AiResult = {
  counselorNote: string;
  clientSummary: string;
  actionItems: string[];
  preparationQuestions: string[];
};

// ─────────────────────────────────────────────────────────────
// 내담자(링크) 화면 — 상담 원문·상담사 기록·목적 메모는 절대 포함되지 않음
// ─────────────────────────────────────────────────────────────

export type ClientProfile = {
  name: string;
  birthDate: string;
};

/** 내담자 홈의 회기 카드 (공유 완료 회기만) */
export type ClientSessionCard = {
  id: string;
  sessionNumber: number;
  sessionDate: string;
  clientSummary: string;
  actionItemCount: number;
  completedActionItemCount: number;
};

export type ClientActionItem = {
  id: string;
  title: string;
  isCompleted: boolean;
};

export type ClientQuestion = {
  id: string;
  question: string;
  clientAnswer: string;
};

export type ClientSessionDetail = {
  id: string;
  sessionNumber: number;
  sessionDate: string;
  clientSummary: string;
  actionItems: ClientActionItem[];
  preparationQuestions: ClientQuestion[];
};

// ─────────────────────────────────────────────────────────────
// API별 응답 (docs/API.md 의 표와 1:1 대응)
// ─────────────────────────────────────────────────────────────

export type OkResponse = { ok: true };
export type CounselorResponse = { counselor: Counselor };
export type ClientsResponse = { clients: CounselorClient[] };
export type ClientResponse = { client: CounselorClient };
export type SessionResponse = { session: CounselorSession };
export type ShareResponse = { session: CounselorSession; alreadyShared: boolean };
export type AiResponse = { result: AiResult };

export type ClientHomeResponse = {
  client: ClientProfile;
  sessions: ClientSessionCard[]; // 날짜 → 회기 번호 순
};
export type ClientSessionResponse = {
  client: ClientProfile;
  session: ClientSessionDetail;
  prevSessionId: string | null; // 이전 공유 회기 (없으면 null)
  prevSessionNumber: number | null; // 그 회기의 번호 (버튼 글자 "‹ 1회기" 용)
  nextSessionId: string | null; // 다음 공유 회기 (없으면 null)
  nextSessionNumber: number | null;
};
export type ActionItemResponse = { actionItem: ClientActionItem };
export type AnswersResponse = { preparationQuestions: ClientQuestion[] };
