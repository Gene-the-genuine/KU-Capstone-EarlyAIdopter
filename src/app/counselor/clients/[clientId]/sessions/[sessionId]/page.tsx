import type { Metadata } from "next";
import { SessionView } from "./session-view";

export const metadata: Metadata = { title: "회기 기록" };

/**
 * D. 상담사 회기 페이지 — SPEC 3-D · 7장
 * 목업: docs/ui/session-draft.html (작성 중) · docs/ui/session-shared.html (공유 완료)
 */
export default async function SessionPage({ params }: PageProps<"/counselor/clients/[clientId]/sessions/[sessionId]">) {
  const { clientId, sessionId } = await params;
  return <SessionView key={sessionId} clientId={clientId} sessionId={sessionId} />;
}
