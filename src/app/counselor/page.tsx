import type { Metadata } from "next";
import { Dashboard } from "./dashboard";

export const metadata: Metadata = { title: "대시보드" };

/** C. 상담사 대시보드 — SPEC 3-C, 목업 docs/ui/dashboard.html (로그인 확인은 src/proxy.ts) */
export default async function CounselorPage({ searchParams }: PageProps<"/counselor">) {
  // /counselor?client={내담자 ID} 면 그 내담자를 고른 채로 엽니다. (회기 페이지의 "대시보드로 돌아가기")
  const { client } = await searchParams;
  return <Dashboard initialClientId={typeof client === "string" ? client : null} />;
}
