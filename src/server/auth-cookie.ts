import "server-only";
import type { SessionOptions } from "iron-session";
import { requireEnv } from "./env";

/**
 * 상담사 로그인 쿠키 설정 (iron-session)
 *
 * 로그인하면 { counselorId, username } 을 암호화해서 httpOnly 쿠키에 넣습니다.
 * DB에 로그인 기록을 따로 저장하지 않으므로 서버가 여러 대(Vercel)여도 그대로 동작합니다.
 *
 * auth.ts(API용)와 proxy.ts(페이지 접근 검사) 양쪽에서 쓰기 때문에 따로 떼어 둔 파일입니다.
 * ※ 이 프로젝트에서 "session"은 상담 회기를 뜻하므로, 로그인 상태는 "auth"라고 부릅니다.
 */

export type AuthCookieData = {
  counselorId: string;
  username: string;
};

const SEVEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 7;

export function authCookieOptions(): SessionOptions {
  return {
    cookieName: "hoegi_auth",
    password: requireEnv("SESSION_SECRET"), // 32자 이상 무작위 문자열
    ttl: SEVEN_DAYS_IN_SECONDS, // 7일 뒤 자동 로그아웃
    cookieOptions: {
      httpOnly: true, // 브라우저 JS 에서 읽을 수 없음
      secure: process.env.NODE_ENV === "production", // 배포(https)에서만 Secure
      sameSite: "lax", // 다른 사이트에서 보낸 POST 에는 쿠키가 붙지 않음
      path: "/",
    },
  };
}
