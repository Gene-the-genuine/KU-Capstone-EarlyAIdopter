import type {
  ActionItemResponse,
  AiResponse,
  AnswersResponse,
  ApiErrorBody,
  ApiErrorCode,
  ClientHomeResponse,
  ClientResponse,
  ClientSessionResponse,
  ClientsResponse,
  CounselorResponse,
  OkResponse,
  SessionContent,
  SessionResponse,
  ShareResponse,
} from "./types";
import type { AddClientInput, AnswerInput, LoginInput, SignupInput } from "./schemas";

/**
 * 프론트엔드에서 백엔드 API 를 부르는 함수 모음 ("use client" 컴포넌트에서 사용)
 *
 *   import { api, ApiError } from "@/lib/api";
 *
 *   try {
 *     const { clients } = await api.counselor.listClients();
 *   } catch (error) {
 *     if (error instanceof ApiError) {
 *       if (error.status === 401) router.push("/login"); // 로그인이 풀린 경우
 *       else setMessage(error.message); // 화면에 그대로 보여 줘도 되는 한국어 문장
 *     }
 *   }
 *
 * 각 API 의 자세한 설명: docs/API.md
 */

/** API 가 실패하면 이 오류가 던져집니다. */
export class ApiError extends Error {
  readonly status: number; // HTTP 상태 코드 (서버에 닿지 못했으면 0)
  readonly code: ApiErrorCode;
  readonly field?: string; // 입력값 오류일 때 문제가 된 입력칸 이름

  constructor(status: number, code: ApiErrorCode, message: string, field?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "SERVER_ERROR", "서버에 연결하지 못했습니다. 인터넷 연결을 확인하세요.");
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (data as ApiErrorBody | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "SERVER_ERROR",
      error?.message ?? "요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.",
      error?.field,
    );
  }
  return data as T;
}

const id = encodeURIComponent;

export const api = {
  /** 상담사 계정 */
  auth: {
    signup: (input: SignupInput) => request<CounselorResponse>("POST", "/api/auth/signup", input),
    login: (input: LoginInput) => request<CounselorResponse>("POST", "/api/auth/login", input),
    logout: () => request<OkResponse>("POST", "/api/auth/logout"),
    me: () => request<CounselorResponse>("GET", "/api/auth/me"),
  },

  /** 상담사 화면 (로그인 필요) */
  counselor: {
    listClients: () => request<ClientsResponse>("GET", "/api/counselor/clients"),
    addClient: (input: AddClientInput) => request<ClientResponse>("POST", "/api/counselor/clients", input),
    getClient: (clientId: string) => request<ClientResponse>("GET", `/api/counselor/clients/${id(clientId)}`),
    deleteClient: (clientId: string) => request<OkResponse>("DELETE", `/api/counselor/clients/${id(clientId)}`),

    createSession: (clientId: string) =>
      request<SessionResponse>("POST", `/api/counselor/clients/${id(clientId)}/sessions`),
    getSession: (clientId: string, sessionId: string) =>
      request<SessionResponse>("GET", `/api/counselor/clients/${id(clientId)}/sessions/${id(sessionId)}`),
    /** 임시 저장 */
    saveSession: (clientId: string, sessionId: string, content: SessionContent) =>
      request<SessionResponse>("PUT", `/api/counselor/clients/${id(clientId)}/sessions/${id(sessionId)}`, content),
    /** 공유 확정 (응답의 session.sharePath 로 링크/QR 생성) */
    shareSession: (clientId: string, sessionId: string, content: SessionContent) =>
      request<ShareResponse>(
        "POST",
        `/api/counselor/clients/${id(clientId)}/sessions/${id(sessionId)}/share`,
        content,
      ),
    /** AI 정리 (결과는 저장되지 않음) */
    summarize: (clientId: string, sessionId: string, sourceText: string) =>
      request<AiResponse>("POST", `/api/counselor/clients/${id(clientId)}/sessions/${id(sessionId)}/ai`, {
        sourceText,
      }),
  },

  /** 내담자 화면 (로그인 없이 링크 토큰으로) */
  client: {
    getHome: (token: string) => request<ClientHomeResponse>("GET", `/api/client/${id(token)}`),
    getSession: (token: string, sessionId: string) =>
      request<ClientSessionResponse>("GET", `/api/client/${id(token)}/sessions/${id(sessionId)}`),
    /** 과제 체크/해제 (즉시 저장) */
    setActionItemCompleted: (token: string, sessionId: string, itemId: string, isCompleted: boolean) =>
      request<ActionItemResponse>(
        "PATCH",
        `/api/client/${id(token)}/sessions/${id(sessionId)}/action-items/${id(itemId)}`,
        { isCompleted },
      ),
    /** 메모 저장 */
    saveAnswers: (token: string, sessionId: string, answers: AnswerInput[]) =>
      request<AnswersResponse>("PUT", `/api/client/${id(token)}/sessions/${id(sessionId)}/answers`, { answers }),
  },
};

/** 공유 링크 전체 주소 만들기: shareUrl(session.sharePath) → 'https://…/client/…/sessions/…' */
export function shareUrl(sharePath: string): string {
  return `${window.location.origin}${sharePath}`;
}
