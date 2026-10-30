"use client";

import { cn } from "cn";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ClientHeader, InvalidLink } from "@/components/client-shell";
import { ErrorBox, ErrorState, LoadingState } from "@/components/feedback";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { LIMITS } from "@/lib/schemas";
import type { ClientActionItem, ClientQuestion, ClientSessionResponse } from "@/lib/types";

type Answers = Record<string, string>; // 질문 ID → 메모

const answersOf = (questions: ClientQuestion[]): Answers =>
  Object.fromEntries(questions.map((question) => [question.id, question.clientAnswer]));

const sameAnswers = (a: Answers, b: Answers) => JSON.stringify(a) === JSON.stringify(b);
const isGone = (err: unknown) => err instanceof ApiError && err.status === 404; // 링크가 막힘 (내담자 삭제 등)

const LEAVE_MESSAGE = "저장하지 않은 메모가 있어요. 저장하지 않고 이동할까요?";

const NAV_BUTTON =
  "inline-flex h-12 items-center justify-center rounded-lg border border-line bg-surface px-6 text-sm lg:h-11";

/**
 * 내담자 회기 상세: 요약 → 실천 과제(체크하면 바로 저장) → 질문별 메모(메모 저장) → 이전/다음 회기
 * 모바일은 위 순서대로 한 줄, lg 부터 왼쪽(요약·과제) + 오른쪽(질문 메모) 두 칸
 */
export function ClientSession({ token, sessionId }: { token: string; sessionId: string }) {
  const [data, setData] = useState<ClientSessionResponse | null>(null);
  const [error, setError] = useState<{ message: string; invalidLink: boolean } | null>(null);
  const [items, setItems] = useState<ClientActionItem[]>([]);
  const [savingItemIds, setSavingItemIds] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [savedAnswers, setSavedAnswers] = useState<Answers>({});
  const [savingAnswers, setSavingAnswers] = useState(false);
  const [answersSaved, setAnswersSaved] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0); // 바꾸면 다시 불러옵니다 (다시 시도 버튼)

  useEffect(() => {
    let ignore = false; // 화면을 떠난 뒤 도착한 응답은 버립니다.
    api.client.getSession(token, sessionId).then(
      (next) => {
        if (ignore) return;
        setData(next);
        setItems(next.session.actionItems);
        setAnswers(answersOf(next.session.preparationQuestions));
        setSavedAnswers(answersOf(next.session.preparationQuestions));
      },
      (err: unknown) => {
        if (!ignore) setError({ message: errorMessage(err), invalidLink: err instanceof ApiError && err.status === 404 });
      },
    );
    return () => {
      ignore = true;
    };
  }, [token, sessionId, reloadKey]);

  // 메모를 적고 저장하지 않은 채 새로고침하거나 닫으면 브라우저 기본 경고를 띄웁니다.
  const answersDirty = !sameAnswers(answers, savedAnswers);
  useEffect(() => {
    if (!answersDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [answersDirty]);

  /** 화면 안 링크(내 상담 기록 · 이전/다음 회기)로 이동할 때도 저장하지 않은 메모가 있으면 확인합니다. */
  function confirmLeave(event: { preventDefault: () => void }) {
    if (answersDirty && !window.confirm(LEAVE_MESSAGE)) event.preventDefault();
  }

  /** 보는 도중 링크가 막혔으면(상담사가 내담자를 삭제 등) "열 수 없는 링크" 화면으로 바꿉니다. */
  function showInvalidLink(err: unknown) {
    setError({ message: errorMessage(err), invalidLink: true });
  }

  /** 과제 체크/해제: 화면을 먼저 바꾸고 바로 저장합니다. 실패하면 되돌립니다. (SPEC 3-F) */
  async function toggle(item: ClientActionItem, isCompleted: boolean) {
    const setCompleted = (value: boolean) =>
      setItems((current) => current.map((it) => (it.id === item.id ? { ...it, isCompleted: value } : it)));

    setCompleted(isCompleted);
    setSavingItemIds((current) => [...current, item.id]);
    try {
      await api.client.setActionItemCompleted(token, sessionId, item.id, isCompleted);
    } catch (err) {
      setCompleted(!isCompleted);
      if (isGone(err)) showInvalidLink(err);
      else toast.error("저장하지 못했어요. 잠시 후 다시 눌러 주세요.");
    } finally {
      setSavingItemIds((current) => current.filter((id) => id !== item.id));
    }
  }

  /** 질문별 메모를 한 번에 저장 (SPEC 3-F) */
  async function saveAnswers(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    const submitted = answers;
    setSavingAnswers(true);
    setAnswerError(null);
    setAnswersSaved(false);
    try {
      const { preparationQuestions } = await api.client.saveAnswers(
        token,
        sessionId,
        data.session.preparationQuestions.map((question) => ({
          questionId: question.id,
          answer: submitted[question.id] ?? "",
        })),
      );
      const saved = answersOf(preparationQuestions);
      setSavedAnswers(saved);
      // 저장하는 동안 더 적은 내용은 지우지 않고 "저장 안 됨"으로 남겨 둡니다.
      setAnswers((current) => (sameAnswers(current, submitted) ? saved : current));
      setAnswersSaved(true);
    } catch (err) {
      if (isGone(err)) showInvalidLink(err);
      else setAnswerError("메모를 저장하지 못했어요. 적은 내용은 그대로 있으니 다시 저장해 주세요.");
    } finally {
      setSavingAnswers(false);
    }
  }

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

  const { client, session } = data;
  const doneCount = items.filter((item) => item.isCompleted).length;

  return (
    <>
      <ClientHeader name={client.name} />
      <main className="mx-auto max-w-5xl px-4 pt-4 pb-12">
        <Link
          href={`/client/${token}`}
          onNavigate={confirmLeave}
          className="inline-flex h-10 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:bg-surface hover:text-ink"
        >
          ‹ 내 상담 기록
        </Link>

        <div className="mt-3">
          <p className="text-sm text-muted-foreground tabular-nums">{formatDate(session.sessionDate)}</p>
          <h1 className="mt-1 text-2xl font-bold tabular-nums">{session.sessionNumber}회기 상담</h1>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
          <div className="min-w-0 space-y-4">
            <section className="rounded-xl border border-line bg-surface p-5 lg:p-6">
              <h2 className="text-sm font-semibold text-brand">이번 상담 요약</h2>
              <p className="mt-3 text-[16px] leading-[1.8] whitespace-pre-wrap">{session.clientSummary}</p>
            </section>

            <section className="rounded-xl border border-line bg-surface p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-brand">실천 과제</h2>
                {items.length > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {items.length}개 중 {doneCount}개 완료
                  </span>
                )}
              </div>
              {items.length > 0 ? (
                <>
                  <ul className="mt-3 space-y-2">
                    {items.map((item) => (
                      <li key={item.id}>
                        {/* 줄 전체를 눌러도 체크됩니다. */}
                        <label
                          htmlFor={`task-${item.id}`}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg border p-3.5",
                            item.isCompleted ? "border-brand/40 bg-brand-soft" : "border-line",
                          )}
                        >
                          <Checkbox
                            id={`task-${item.id}`}
                            checked={item.isCompleted}
                            disabled={savingItemIds.includes(item.id)}
                            onCheckedChange={(checked) => void toggle(item, checked === true)}
                            className="mt-0.5 size-5"
                          />
                          <span className="text-[15px] leading-relaxed">{item.title}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-muted-foreground">체크하면 바로 저장돼요.</p>
                </>
              ) : (
                <p className="mt-3 text-[15px] text-muted-foreground">이번 회기에는 실천 과제가 없어요.</p>
              )}
            </section>
          </div>

          <section className="min-w-0 rounded-xl border border-line bg-surface p-5 lg:sticky lg:top-6 lg:p-6">
            <h2 className="text-sm font-semibold text-brand">다음 상담 전에 생각해 볼 질문</h2>
            {session.preparationQuestions.length > 0 ? (
              <>
                <p className="mt-1 text-xs text-muted-foreground">적어둔 메모는 {client.name} 님만 볼 수 있어요.</p>
                <form className="mt-4 space-y-5" onSubmit={saveAnswers}>
                  {session.preparationQuestions.map((question, index) => (
                    <div key={question.id} className="space-y-2">
                      <label htmlFor={`q-${question.id}`} className="block text-[15px] leading-relaxed font-medium">
                        {index + 1}. {question.question}
                      </label>
                      <Textarea
                        id={`q-${question.id}`}
                        rows={3}
                        maxLength={LIMITS.answer}
                        placeholder="떠오르는 대로 적어보세요"
                        className="field-sizing-fixed text-[15px] leading-relaxed"
                        value={answers[question.id] ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAnswers((current) => ({ ...current, [question.id]: value }));
                          setAnswersSaved(false);
                        }}
                      />
                    </div>
                  ))}
                  <Button type="submit" className="h-12 w-full text-[15px] lg:h-11" disabled={savingAnswers}>
                    {savingAnswers ? (
                      <>
                        <Spinner />
                        저장하는 중…
                      </>
                    ) : (
                      "메모 저장"
                    )}
                  </Button>
                  {answerError && <ErrorBox>{answerError}</ErrorBox>}
                  {answersSaved && !answersDirty && (
                    <p role="status" className="text-center text-sm text-brand">
                      메모를 저장했어요.
                    </p>
                  )}
                </form>
              </>
            ) : (
              <p className="mt-3 text-[15px] text-muted-foreground">이번 회기에는 준비 질문이 없어요.</p>
            )}
          </section>
        </div>

        {/* 이전/다음 공유 회기 (작성 중인 회기는 건너뜀) */}
        <nav className="mt-6 grid grid-cols-2 gap-3 lg:flex lg:justify-between" aria-label="회기 이동">
          {data.prevSessionId ? (
            <Link
              href={`/client/${token}/sessions/${data.prevSessionId}`}
              onNavigate={confirmLeave}
              className={cn(NAV_BUTTON, "font-medium hover:border-brand/50")}
            >
              ‹ {data.prevSessionNumber}회기
            </Link>
          ) : (
            <span aria-disabled="true" className={cn(NAV_BUTTON, "text-muted-foreground/50")}>
              이전 회기 없음
            </span>
          )}
          {data.nextSessionId ? (
            <Link
              href={`/client/${token}/sessions/${data.nextSessionId}`}
              onNavigate={confirmLeave}
              className={cn(NAV_BUTTON, "font-medium hover:border-brand/50")}
            >
              {data.nextSessionNumber}회기 ›
            </Link>
          ) : (
            <span aria-disabled="true" className={cn(NAV_BUTTON, "text-muted-foreground/50")}>
              다음 회기 없음
            </span>
          )}
        </nav>
      </main>
    </>
  );
}
