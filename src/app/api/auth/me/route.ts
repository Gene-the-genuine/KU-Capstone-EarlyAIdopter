import type { CounselorResponse } from "@/lib/types";
import { requireCounselor } from "@/server/auth";
import { handleApi, json } from "@/server/http";

/** 지금 로그인한 상담사 (로그인하지 않았으면 401) */
export const GET = handleApi(async () => {
  const counselor = await requireCounselor();
  return json<CounselorResponse>({ counselor });
});
