import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "로그인" };

/** A. 상담사 로그인 — SPEC 3-A, 목업 docs/ui/login.html */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // 회원가입에 성공하면 /login?joined=1 로 와서 상단에 성공 문구를 보여 줍니다.
  const { joined } = await searchParams;
  return <LoginForm justSignedUp={joined === "1"} />;
}
