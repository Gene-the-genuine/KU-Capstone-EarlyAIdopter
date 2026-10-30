import { SERVICE_NAME } from "@/lib/brand";

/*
 * 내담자(링크) 화면의 공통 부분. 내담자 화면 문구는 부드러운 "~해요"체입니다. (DESIGN.md 7장)
 */

/** 상단 바: 서비스 이름 + 내담자 이름 (목업 docs/ui/client-home.html) */
export function ClientHeader({ name }: { name?: string }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <p className="text-sm font-semibold text-brand">{SERVICE_NAME}</p>
        {name && <span className="text-sm text-muted-foreground">{name} 님</span>}
      </div>
    </header>
  );
}

/**
 * 열 수 없는 링크 (목업 docs/ui/client-invalid.html)
 * 토큰이 틀렸는지, 내담자가 삭제됐는지, 작성 중인 회기인지는 일부러 구분하지 않습니다. (SPEC 3-E)
 */
export function InvalidLink() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface px-6 py-10 text-center">
        <p className="text-sm font-semibold text-brand">{SERVICE_NAME}</p>
        <h1 className="mt-4 text-xl font-bold">열 수 없는 링크예요</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          링크가 잘못되었거나 더 이상 사용할 수 없습니다.
          <br />
          상담사 선생님께 새 링크를 요청해 주세요.
        </p>
      </div>
    </main>
  );
}
