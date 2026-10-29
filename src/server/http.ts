import "server-only";
import type { z } from "zod";
import type { ApiErrorBody, ApiErrorCode } from "@/lib/types";

/**
 * API 가 일부러 돌려주는 오류. 서비스 코드에서 throw 하면 handleApi 가 JSON 응답으로 바꿉니다.
 *   throw new HttpError(404, "NOT_FOUND", "내담자를 찾을 수 없습니다.");
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly field?: string;

  constructor(status: number, code: ApiErrorCode, message: string, field?: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

export function notFound(message: string): HttpError {
  return new HttpError(404, "NOT_FOUND", message);
}

/** JSON 응답. 꺾쇠 안의 타입(@/lib/types)으로 응답 모양이 약속과 맞는지 검사됩니다. */
export function json<T>(body: T, status = 200): Response {
  return Response.json(body, { status });
}

/**
 * Route Handler 를 감싸서, 안에서 던진 오류를 항상 같은 모양의 JSON 으로 바꿔 줍니다.
 *   export const GET = handleApi(async (request, { params }: RouteContext<"/api/...">) => { ... });
 */
export function handleApi<Context>(handler: (request: Request, context: Context) => Promise<Response>) {
  return async (request: Request, context: Context): Promise<Response> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    const body: ApiErrorBody = {
      error: { code: error.code, message: error.message, ...(error.field && { field: error.field }) },
    };
    return Response.json(body, { status: error.status });
  }

  // URL 의 ID 가 UUID 모양이 아니면 DB 가 22P02 오류를 냅니다 → "없는 데이터"로 취급
  if (isDbError(error) && error.code === "22P02") {
    const body: ApiErrorBody = { error: { code: "NOT_FOUND", message: "찾을 수 없습니다." } };
    return Response.json(body, { status: 404 });
  }

  console.error("[API] 예상하지 못한 오류:", error);
  const body: ApiErrorBody = {
    error: { code: "SERVER_ERROR", message: "서버 오류가 발생했습니다. 잠시 후 다시 시도하세요." },
  };
  return Response.json(body, { status: 500 });
}

function isDbError(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && typeof (error as { code?: unknown }).code === "string";
}

/** 요청 body(JSON)를 읽고 규칙(schema)으로 검사합니다. 규칙에 어긋나면 400 오류를 던집니다. */
export async function readJson<Schema extends z.ZodType>(request: Request, schema: Schema): Promise<z.output<Schema>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, "INVALID_JSON", "요청 형식이 올바르지 않습니다. JSON 으로 보내 주세요.");
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.map(String).join(".") || undefined;
    throw new HttpError(400, "VALIDATION_ERROR", issue.message, field);
  }
  return result.data;
}
