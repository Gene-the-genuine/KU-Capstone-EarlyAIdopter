import { Badge } from "@/components/ui/badge";
import type { SessionStatus } from "@/lib/types";

/** 회기 상태 배지: draft = 작성 중, shared = 공유 완료 (DESIGN.md 4장 · 7장) */
export function StatusBadge({ status }: { status: SessionStatus }) {
  return status === "shared" ? (
    <Badge className="bg-brand-soft px-2.5 text-brand">공유 완료</Badge>
  ) : (
    <Badge className="bg-draft-soft px-2.5 text-draft">작성 중</Badge>
  );
}
