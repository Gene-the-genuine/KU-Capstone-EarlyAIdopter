import type { Metadata } from "next";
import { InvalidLink } from "@/components/client-shell";

export const metadata: Metadata = { title: "열 수 없는 링크", robots: { index: false, follow: false } };

/** 토큰 없이 /client 로 들어온 경우 — 토큰이 없거나 틀리면 접근 불가 안내 (SPEC 3-E) */
export default function ClientWithoutTokenPage() {
  return <InvalidLink />;
}
