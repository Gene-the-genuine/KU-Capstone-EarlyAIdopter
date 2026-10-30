import { cn } from "cn";

/**
 * 공개 범위 칩 — 섹션 제목 옆에 붙여 "내담자에게 보이는 내용인지" 알려 줍니다. (DESIGN.md 4장 "공개 범위 표시")
 *   counselor: 상담 원문 · 상담사용 기록 · 상담 목적 메모
 *   share / shared: 내담자용 요약 · 실천 과제 · 준비 질문 (작성 중 / 공유 완료)
 */
const SCOPES = {
  counselor: { label: "상담사만", className: "bg-canvas text-muted-foreground" },
  share: { label: "내담자에게 공유", className: "bg-brand-soft text-brand" },
  shared: { label: "공유됨", className: "bg-brand-soft text-brand" },
} as const;

export function ScopeChip({ scope }: { scope: keyof typeof SCOPES }) {
  const { label, className } = SCOPES[scope];
  return <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", className)}>{label}</span>;
}
