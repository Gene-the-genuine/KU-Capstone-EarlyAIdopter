import { getIronSession, nextProxyCookies } from "iron-session";
import { NextResponse, type NextRequest } from "next/server";
import { authCookieOptions, type AuthCookieData } from "@/server/auth-cookie";

/**
 * 페이지 접근 검사 (Next.js 16 부터 middleware.ts 의 새 이름이 proxy.ts 입니다)
 *
 * 로그인하지 않은 사람이 /counselor 아래 페이지를 열면 /login 으로 보냅니다.
 * 이것은 화면 이동용 1차 검사일 뿐이고, 데이터 보호는 각 API 의 requireCounselor() 가 맡습니다.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const auth = await getIronSession<AuthCookieData>(nextProxyCookies(request, response), authCookieOptions());

  if (!auth.counselorId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/counselor/:path*"],
};
