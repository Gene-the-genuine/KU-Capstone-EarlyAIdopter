import type { ReactNode } from "react";
import { cn } from "cn";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";

/**
 * 화면 피드백 (DESIGN.md 4장 "알림")
 * - ErrorBox: 빨간 인라인 오류 문구    - SuccessBox: 초록 안내 문구
 * - LoadingState / ErrorState: 데이터를 불러오는 중 / 불러오지 못했을 때 영역 전체
 * 짧은 성공 알림은 토스트를 씁니다: import { toast } from "sonner"; toast.success("저장했어요")
 */

export function ErrorBox({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode; // 오른쪽 버튼 (예: 다시 시도)
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger",
        className,
      )}
    >
      <span>{children}</span>
      {action}
    </div>
  );
}

export function SuccessBox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p role="status" className={cn("rounded-md bg-brand-soft px-3 py-2 text-sm text-brand", className)}>
      {children}
    </p>
  );
}

export function LoadingState({ label = "불러오는 중…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
      <Spinner />
      {label}
    </div>
  );
}

export function ErrorState({
  title = "불러오지 못했습니다",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-5 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4 h-9 px-4" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  );
}
