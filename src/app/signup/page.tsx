import type { Metadata } from "next";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "회원가입" };

/** B. 상담사 회원가입 — SPEC 3-B, 목업 docs/ui/signup.html */
export default function SignupPage() {
  return <SignupForm />;
}
