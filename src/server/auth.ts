import "server-only";
import bcrypt from "bcryptjs";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import type { Counselor } from "@/lib/types";
import { authCookieOptions, type AuthCookieData } from "./auth-cookie";
import { getDb } from "./db";
import { HttpError } from "./http";

/**
 * 상담사 계정: 회원가입 · 로그인 · 로그아웃 · 현재 로그인한 상담사
 * (Supabase Auth 는 쓰지 않고 counselors 테이블 + 암호화 쿠키로 직접 처리)
 */

const BCRYPT_ROUNDS = 10;

async function getAuthCookie() {
  return getIronSession<AuthCookieData>(await cookies(), authCookieOptions());
}

/** 회원가입: 계정만 만들고 로그인은 하지 않습니다. (명세: 가입 후 로그인 화면으로 이동) */
export async function signUp(username: string, password: string): Promise<Counselor> {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const { data, error } = await getDb()
    .from("counselors")
    .insert({ username, password_hash: passwordHash })
    .select("id, username")
    .single();

  if (error) {
    if (error.code === "23505") {
      // 23505 = unique 위반 → 같은 아이디가 이미 있음
      throw new HttpError(409, "USERNAME_TAKEN", "이미 사용 중인 아이디입니다.", "username");
    }
    throw error;
  }
  return data;
}

/** 로그인: 아이디/비밀번호가 맞으면 로그인 쿠키를 심습니다. */
export async function logIn(username: string, password: string): Promise<Counselor> {
  const { data: counselor, error } = await getDb()
    .from("counselors")
    .select("id, username, password_hash")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;

  const passwordMatches = counselor !== null && (await bcrypt.compare(password, counselor.password_hash));
  if (!counselor || !passwordMatches) {
    // 아이디가 없는지, 비밀번호가 틀렸는지는 일부러 구분하지 않습니다.
    throw new HttpError(401, "LOGIN_FAILED", "아이디 또는 비밀번호가 올바르지 않습니다.");
  }

  const auth = await getAuthCookie();
  auth.counselorId = counselor.id;
  auth.username = counselor.username;
  await auth.save();

  return { id: counselor.id, username: counselor.username };
}

/** 로그아웃: 로그인 쿠키를 지웁니다. */
export async function logOut(): Promise<void> {
  const auth = await getAuthCookie();
  auth.destroy();
}

/** 지금 로그인한 상담사. 로그인하지 않았으면 null */
export async function getLoggedInCounselor(): Promise<Counselor | null> {
  const auth = await getAuthCookie();
  if (!auth.counselorId || !auth.username) return null;
  return { id: auth.counselorId, username: auth.username };
}

/** 상담사 전용 API 의 첫 줄에서 부릅니다. 로그인하지 않았으면 401 오류. */
export async function requireCounselor(): Promise<Counselor> {
  const counselor = await getLoggedInCounselor();
  if (!counselor) {
    throw new HttpError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
  }
  return counselor;
}
