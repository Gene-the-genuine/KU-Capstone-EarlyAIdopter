import type { Metadata } from "next";
import { ClientHome } from "./client-home";

// 내담자 링크는 검색 엔진에 노출되지 않게 합니다.
export const metadata: Metadata = { title: "내 상담 기록", robots: { index: false, follow: false } };

/** E. 내담자 홈 (로그인 없이 링크 토큰으로) — SPEC 3-E, 목업 docs/ui/client-home.html */
export default async function ClientHomePage({ params }: PageProps<"/client/[token]">) {
  const { token } = await params;
  return <ClientHome token={token} />;
}
