import type { Metadata } from "next";
import { ClientSession } from "./client-session";

// 내담자 링크는 검색 엔진에 노출되지 않게 합니다.
export const metadata: Metadata = { title: "상담 기록", robots: { index: false, follow: false } };

/** F. 내담자 회기 상세 — SPEC 3-F, 목업 docs/ui/client-session.html */
export default async function ClientSessionPage({ params }: PageProps<"/client/[token]/sessions/[sessionId]">) {
  const { token, sessionId } = await params;
  return <ClientSession key={sessionId} token={token} sessionId={sessionId} />;
}
