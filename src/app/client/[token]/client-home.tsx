"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClientHeader, InvalidLink } from "@/components/client-shell";
import { ErrorState, LoadingState } from "@/components/feedback";
import { api, ApiError, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { ClientHomeResponse, ClientSessionCard } from "@/lib/types";

/**
 * 내담자 홈: 이름 · 생년월일 + 공유 완료 회기 카드 (상담 목적 메모는 보여 주지 않음, SPEC 2장)
 * 모바일은 한 줄, lg 부터 왼쪽 프로필(300px) + 오른쪽 카드 2열
 */
export function ClientHome({ token }: { token: string }) {
  const [data, setData] = useState<ClientHomeResponse | null>(null);
  const [error, setError] = useState<{ message: string; invalidLink: boolean } | null>(null);
  const [reloadKey, setReloadKey] = useState(0); // 바꾸면 다시 불러옵니다 (다시 시도 버튼)

  useEffect(() => {
    let ignore = false; // 화면을 떠난 뒤 도착한 응답은 버립니다.
    api.client.getHome(token).then(
      (home) => {
        if (!ignore) setData(home);
      },
      (err: unknown) => {
        if (!ignore) setError({ message: errorMessage(err), invalidLink: err instanceof ApiError && err.status === 404 });
      },
    );
    return () => {
      ignore = true;
    };
  }, [token, reloadKey]);

  if (error?.invalidLink) return <InvalidLink />;

  if (!data) {
    return (
      <>
        <ClientHeader />
        <main className="mx-auto max-w-5xl px-4 py-8">
          {error ? (
            <ErrorState
              title="불러오지 못했어요"
              message={error.message}
              onRetry={() => {
                setError(null);
                setReloadKey((key) => key + 1);
              }}
            />
          ) : (
            <LoadingState />
          )}
        </main>
      </>
    );
  }

  const { client, sessions } = data;
  const newestFirst = [...sessions].reverse(); // API 는 오래된 순 → 최근 회기를 위로 (목업 순서)

  return (
    <>
      <ClientHeader name={client.name} />
      <main className="mx-auto max-w-5xl px-4 pt-8 pb-12 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8">
        {/* 모바일: 위쪽 / 데스크톱: 왼쪽에 고정 */}
        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <h1 className="text-2xl leading-snug font-bold break-words">
            {client.name} 님의
            <br />
            상담 기록
          </h1>
          <p className="mt-2 text-sm text-muted-foreground tabular-nums">생년월일 {formatDate(client.birthDate)}</p>
          <p className="mt-6 rounded-lg bg-brand-soft px-4 py-3 text-sm leading-relaxed text-brand">
            상담사 선생님이 확인한 내용만 이곳에 보여요. 과제 체크와 메모는 {client.name} 님만 볼 수 있어요.
          </p>
        </aside>

        <div className="mt-8 min-w-0 lg:mt-0">
          {newestFirst.length > 0 ? (
            <section>
              <h2 className="text-base font-semibold">
                공유된 회기 <span className="font-normal text-muted-foreground tabular-nums">{sessions.length}개</span>
              </h2>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {newestFirst.map((session) => (
                  <li key={session.id}>
                    <SessionCard token={token} session={session} />
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <section className="rounded-xl border border-dashed border-line bg-surface px-5 py-8 text-center">
              <p className="text-[15px] font-medium">아직 공유된 상담 기록이 없어요</p>
              <p className="mt-1 text-sm text-muted-foreground">상담사 선생님이 기록을 공유하면 여기에 표시돼요.</p>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

/** 회기 카드: 회기 번호 · 날짜 · 요약 앞부분 · 과제 진행률 */
function SessionCard({ token, session }: { token: string; session: ClientSessionCard }) {
  const total = session.actionItemCount;
  const done = session.completedActionItemCount;

  return (
    <Link
      href={`/client/${token}/sessions/${session.id}`}
      className="flex h-full flex-col rounded-xl border border-line bg-surface p-5 hover:border-brand/50"
    >
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold tabular-nums">{session.sessionNumber}회기</span>
        <span className="text-sm text-muted-foreground tabular-nums">{formatDate(session.sessionDate)}</span>
      </div>
      <p className="mt-2 line-clamp-2 flex-1 text-[15px] leading-relaxed text-muted-foreground">
        {session.clientSummary}
      </p>
      {total > 0 ? (
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas" aria-hidden="true">
            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round((done / total) * 100)}%` }} />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            과제 {total}개 중 {done}개 완료
          </span>
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">실천 과제 없음</p>
      )}
    </Link>
  );
}
