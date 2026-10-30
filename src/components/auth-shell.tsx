import type { ReactNode } from "react";
import { SERVICE_NAME } from "@/lib/brand";

/** 로그인 · 회원가입 화면의 공통 틀: 가운데 정렬된 제목 + 카드 (목업 docs/ui/login.html, signup.html) */
export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold tracking-wide text-brand">{SERVICE_NAME}</p>
          <h1 className="mt-2 text-2xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
