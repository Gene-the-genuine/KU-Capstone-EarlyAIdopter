"use client";

import Link from "next/link";
import { SERVICE_NAME } from "@/lib/brand";

const LEAVE_MESSAGE = "저장하지 않은 변경 사항이 있습니다. 저장하지 않고 나갈까요?";

/**
 * 회기 페이지 상단 바: 대시보드로 돌아가기 + 서비스 이름
 * confirmLeave 가 true 면(저장하지 않은 내용이 있으면) 나가기 전에 확인합니다. (SPEC 3-D)
 */
export function SessionHeader({ backHref, confirmLeave = false }: { backHref: string; confirmLeave?: boolean }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href={backHref}
          // onNavigate: 이 앱 안에서 이동할 때만 불립니다(새 탭으로 열 때는 안 불림).
          onNavigate={(event) => {
            if (confirmLeave && !window.confirm(LEAVE_MESSAGE)) event.preventDefault();
          }}
          className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:bg-canvas hover:text-ink"
        >
          ‹ 대시보드로 돌아가기
        </Link>
        <p className="text-sm font-semibold text-brand">{SERVICE_NAME}</p>
      </div>
    </header>
  );
}
