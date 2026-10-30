"use client";

import type { ReactNode } from "react";
import { ScopeChip } from "@/components/scope-chip";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatKoreanDate } from "@/lib/format";
import type { CounselorSession } from "@/lib/types";
import { SessionHeader } from "./session-header";

/**
 * 공유 완료 회기: 작성 화면과 같은 내용을 읽기 전용으로 (목업 docs/ui/session-shared.html, SPEC 3-D)
 * 수정 · AI 재생성 · 저장은 할 수 없고, "공유 링크 보기"로 링크/QR 을 다시 띄울 수 있습니다.
 */
export function SharedView({
  session,
  backHref,
  onShowLink,
}: {
  session: CounselorSession;
  backHref: string;
  onShowLink: () => void;
}) {
  return (
    <>
      <SessionHeader backHref={backHref} />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{session.client.name}</p>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="text-2xl font-bold tabular-nums">{session.sessionNumber}회기</h1>
              <StatusBadge status="shared" />
            </div>
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
              상담 날짜 {formatDate(session.sessionDate)}
              {session.sharedAt && ` · 공유 ${formatKoreanDate(session.sharedAt)}`}
            </p>
          </div>
          <Button className="h-10 px-4" onClick={onShowLink}>
            공유 링크 보기
          </Button>
        </div>

        <p className="rounded-md border border-line bg-surface px-4 py-3 text-sm text-muted-foreground">
          공유된 회기는 수정할 수 없습니다. 내담자의 과제 체크와 메모는 내담자만 볼 수 있습니다.
        </p>

        <section className="rounded-xl border border-line bg-surface p-5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">상담 원문</h2>
            <ScopeChip scope="counselor" />
          </div>
          <div
            tabIndex={0}
            aria-label="상담 원문"
            className="mt-3 max-h-48 overflow-y-auto rounded-md bg-canvas px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
          >
            {session.sourceText || <Empty>입력된 원문이 없습니다.</Empty>}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <ReadOnlyCard title="상담사용 상세 기록" scope="counselor">
            {session.counselorNote ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{session.counselorNote}</p>
            ) : (
              <Empty>작성된 기록이 없습니다.</Empty>
            )}
          </ReadOnlyCard>

          <ReadOnlyCard title="내담자용 요약" scope="shared">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{session.clientSummary}</p>
          </ReadOnlyCard>

          <ReadOnlyCard title="실천 과제" scope="shared">
            <NumberedList items={session.actionItems} emptyText="공유한 실천 과제가 없습니다." />
          </ReadOnlyCard>

          <ReadOnlyCard title="다음 상담 준비 질문" scope="shared">
            <NumberedList items={session.preparationQuestions} emptyText="공유한 준비 질문이 없습니다." />
          </ReadOnlyCard>
        </div>
      </main>
    </>
  );
}

function ReadOnlyCard({
  title,
  scope,
  children,
}: {
  title: string;
  scope: "counselor" | "shared";
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <ScopeChip scope={scope} />
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function NumberedList({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (items.length === 0) return <Empty>{emptyText}</Empty>;
  return (
    <ol className="list-decimal space-y-1.5 pl-5 text-sm">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ol>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
