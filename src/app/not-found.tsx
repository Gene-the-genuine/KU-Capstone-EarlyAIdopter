import Link from "next/link";
import { SERVICE_NAME } from "@/lib/brand";

/** 없는 주소로 들어왔을 때 (Next.js 기본 영어 화면 대신) */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface px-6 py-10 text-center">
        <p className="text-sm font-semibold text-brand">{SERVICE_NAME}</p>
        <h1 className="mt-4 text-xl font-bold">페이지를 찾을 수 없습니다</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">주소가 잘못되었거나 없는 페이지입니다.</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm font-medium hover:bg-canvas"
        >
          첫 화면으로
        </Link>
      </div>
    </main>
  );
}
