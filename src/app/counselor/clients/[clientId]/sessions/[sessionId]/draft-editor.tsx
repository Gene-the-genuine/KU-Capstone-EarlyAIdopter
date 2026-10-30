"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ErrorBox } from "@/components/feedback";
import { ScopeChip } from "@/components/scope-chip";
import { Spinner } from "@/components/spinner";
import { StatusBadge } from "@/components/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError, errorMessage, isUnauthorized } from "@/lib/api";
import { LIMITS } from "@/lib/schemas";
import type { CounselorSession, SessionContent } from "@/lib/types";
import { clearBackup, readBackup, writeBackup } from "./draft-backup";
import { ListEditor } from "./list-editor";
import { SessionHeader } from "./session-header";

/** 화면의 입력칸 전부 = 임시 저장 / 공유 확정 때 서버로 보내는 내용 */
function contentOf(session: CounselorSession): SessionContent {
  return {
    sessionDate: session.sessionDate,
    sourceText: session.sourceText,
    counselorNote: session.counselorNote,
    clientSummary: session.clientSummary,
    actionItems: session.actionItems,
    preparationQuestions: session.preparationQuestions,
  };
}

const isSame = (a: SessionContent, b: SessionContent) => JSON.stringify(a) === JSON.stringify(b);
const filled = (items: string[]) => items.filter((item) => item.trim() !== "");

/**
 * 작성 중 회기 편집 화면 (목업 docs/ui/session-draft.html, SPEC 3-D · 7장)
 * 순서: 회기 정보 → 상담 원문 + AI 버튼 → AI 결과(기록 | 요약) → (실천 과제 | 준비 질문) → 하단 고정 바
 */
export function DraftEditor({
  session,
  backHref,
  onShared,
  onReload,
}: {
  session: CounselorSession;
  backHref: string;
  onShared: (session: CounselorSession) => void;
  onReload: () => void;
}) {
  const router = useRouter();
  // 처음 그릴 때: 서버에 저장된 내용 + (있으면) 이 탭에 보관해 둔 미저장 내용 (draft-backup.ts)
  const [initial] = useState(() => {
    const saved = contentOf(session);
    const restored = readBackup(session.id, saved);
    return { saved, form: restored ?? saved, restored: restored !== null && !isSame(restored, saved) };
  });
  const [form, setForm] = useState<SessionContent>(initial.form);
  const [saved, setSaved] = useState<SessionContent>(initial.saved); // 마지막으로 저장된 내용
  const [restoredNotice, setRestoredNotice] = useState(initial.restored);
  const dirty = !isSame(form, saved);

  const [aiPending, setAiPending] = useState(false);
  const [aiError, setAiError] = useState<{ message: string; canRetry: boolean } | null>(null);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const busy = aiPending || saving || sharing;
  // AI 정리 중 · 공유 중에는 입력을 잠급니다. (응답이 그 사이 고친 내용을 덮어쓰거나, 공유에서 빠지지 않도록)
  const locked = aiPending || sharing;

  // 저장하지 않고 새로고침하거나 탭을 닫으면 브라우저 기본 경고를 띄웁니다. (SPEC 3-D)
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // 저장하지 않은 내용은 이 탭에 보관하고, 저장된 상태가 되면 지웁니다. (브라우저 뒤로 가기 대비)
  useEffect(() => {
    if (dirty) writeBackup(session.id, saved, form);
    else clearBackup(session.id);
  }, [dirty, form, saved, session.id]);

  function update<K extends keyof SessionContent>(field: K, value: SessionContent[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setActionError(null);
  }

  /** 로그인 풀림 → 로그인 화면, 다른 탭에서 이미 공유됨 → 다시 불러와 읽기 전용으로. 처리했으면 true */
  function handleCommonError(error: unknown): boolean {
    if (isUnauthorized(error)) {
      router.replace("/login");
      return true;
    }
    if (error instanceof ApiError && error.code === "SESSION_LOCKED") {
      toast.error(error.message);
      onReload();
      return true;
    }
    return false;
  }

  // ── AI 정리 ───────────────────────────────────────────────
  const hasResult =
    form.counselorNote.trim() !== "" ||
    form.clientSummary.trim() !== "" ||
    filled(form.actionItems).length > 0 ||
    filled(form.preparationQuestions).length > 0;

  function requestAi() {
    if (form.sourceText.trim() === "") {
      setAiError({ message: "상담 원문을 입력한 뒤 AI 정리를 눌러 주세요.", canRetry: false });
      return;
    }
    // 이미 결과가 있으면 덮어쓰기 전에 꼭 확인합니다. 취소하면 아무것도 바뀌지 않습니다. (SPEC 3-D)
    if (hasResult) setRegenerateOpen(true);
    else void runAi();
  }

  async function runAi() {
    setAiPending(true);
    setAiError(null);
    try {
      // 이 회기의 원문만 보냅니다. 결과는 화면에만 채우고, 저장은 상담사가 직접 합니다. (SPEC 6장)
      const { result } = await api.counselor.summarize(session.client.id, session.id, form.sourceText);
      setForm((current) => ({ ...current, ...result }));
      toast.success("AI 정리 결과를 채웠습니다. 검토한 뒤 저장하세요.");
    } catch (error) {
      if (!handleCommonError(error)) setAiError({ message: errorMessage(error), canRetry: true });
    } finally {
      setAiPending(false);
    }
  }

  // ── 임시 저장 ─────────────────────────────────────────────
  async function save() {
    const submitted = form;
    setSaving(true);
    setActionError(null);
    try {
      const { session: next } = await api.counselor.saveSession(session.client.id, session.id, submitted);
      const savedContent = contentOf(next);
      setSaved(savedContent);
      // 서버가 정리한 내용(빈 줄 제거, 앞뒤 공백 정리)으로 화면을 맞춥니다.
      // 단, 저장하는 동안 더 고친 내용이 있으면 지우지 않고 "저장하지 않은 변경"으로 남겨 둡니다.
      setForm((current) => (isSame(current, submitted) ? savedContent : current));
      setRestoredNotice(false);
      toast.success("저장했어요");
    } catch (error) {
      if (!handleCommonError(error)) setActionError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  // ── 공유 확정 ─────────────────────────────────────────────
  function requestShare() {
    if (form.clientSummary.trim() === "") {
      setActionError("내담자용 요약을 입력해야 공유할 수 있습니다.");
      return;
    }
    setShareOpen(true);
  }

  async function share() {
    setSharing(true);
    setActionError(null);
    try {
      // 화면 내용을 저장하면서 공유 상태로 바꿉니다(서버에서 한 번에 처리).
      const { session: shared } = await api.counselor.shareSession(session.client.id, session.id, form);
      clearBackup(session.id);
      onShared(shared);
    } catch (error) {
      if (!handleCommonError(error)) setActionError(errorMessage(error));
      setSharing(false);
    }
  }

  const actionCount = filled(form.actionItems).length;
  const questionCount = filled(form.preparationQuestions).length;

  return (
    <>
      <SessionHeader backHref={backHref} confirmLeave={dirty} />

      <main className="mx-auto max-w-5xl px-4 pt-6 pb-36 sm:pb-28">
        <fieldset disabled={locked} className="min-w-0 space-y-6">
          {/* 회기 정보 */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{session.client.name}</p>
              <div className="mt-1 flex items-center gap-3">
                <h1 className="text-2xl font-bold tabular-nums">{session.sessionNumber}회기</h1>
                <StatusBadge status="draft" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="session-date" className="text-xs text-muted-foreground">
                상담 날짜
              </Label>
              <Input
                id="session-date"
                type="date"
                className="h-9 w-auto"
                value={form.sessionDate}
                onChange={(event) => update("sessionDate", event.target.value)}
              />
            </div>
          </div>

          {/* 브라우저 뒤로 가기 등으로 나갔다가 돌아왔을 때 */}
          {restoredNotice && (
            <div
              role="status"
              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-draft-soft px-4 py-3 text-sm text-draft"
            >
              <span>저장하지 않고 나갔던 내용을 다시 불러왔습니다. 확인한 뒤 저장하세요.</span>
              <button
                type="button"
                className="font-medium underline underline-offset-4"
                onClick={() => {
                  setForm(saved);
                  setRestoredNotice(false);
                }}
              >
                불러온 내용 버리기
              </button>
            </div>
          )}

          {/* 상담 원문 */}
          <section className="rounded-xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">상담 원문</h2>
                <ScopeChip scope="counselor" />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {form.sourceText.length.toLocaleString()}자
              </span>
            </div>
            <label htmlFor="source-text" className="sr-only">
              상담 원문
            </label>
            <Textarea
              id="source-text"
              rows={9}
              maxLength={LIMITS.sourceText}
              placeholder="상담 내용을 입력하거나 붙여 넣으세요. 실제 상담 내용 대신 합성 데이터만 쓰세요."
              className="mt-3 field-sizing-fixed text-sm leading-relaxed"
              value={form.sourceText}
              onChange={(event) => update("sourceText", event.target.value)}
            />

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button className="h-10 bg-ink px-4 hover:bg-ink/90" disabled={busy} onClick={requestAi}>
                {aiPending ? (
                  <>
                    <Spinner />
                    정리하는 중…
                  </>
                ) : hasResult ? (
                  "✦ AI로 다시 정리하기"
                ) : (
                  "✦ AI로 정리하기"
                )}
              </Button>
              <span className="text-xs text-muted-foreground">AI는 이 회기의 원문만 참고합니다.</span>
            </div>

            {aiError && (
              <ErrorBox
                className="mt-3"
                action={
                  aiError.canRetry && (
                    <button
                      type="button"
                      className="font-medium underline underline-offset-4"
                      disabled={busy}
                      onClick={() => void runAi()}
                    >
                      다시 시도
                    </button>
                  )
                }
              >
                {aiError.message}
              </ErrorBox>
            )}
          </section>

          {/* AI 결과 */}
          <section className="space-y-4">
            <h2 className="text-base font-semibold">
              AI 정리 결과 <span className="font-normal text-muted-foreground">· 검토 후 수정하세요</span>
            </h2>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="min-w-0 rounded-xl border border-line bg-surface p-5">
                <div className="flex items-center gap-2">
                  <label htmlFor="counselor-note" className="text-sm font-semibold">
                    상담사용 상세 기록
                  </label>
                  <ScopeChip scope="counselor" />
                </div>
                <Textarea
                  id="counselor-note"
                  rows={10}
                  maxLength={LIMITS.counselorNote}
                  placeholder="AI 정리를 누르면 채워집니다. 직접 써도 됩니다."
                  className="mt-3 field-sizing-fixed text-sm leading-relaxed"
                  value={form.counselorNote}
                  onChange={(event) => update("counselorNote", event.target.value)}
                />
              </div>

              <div className="min-w-0 rounded-xl border border-brand/30 bg-surface p-5">
                <div className="flex items-center gap-2">
                  <label htmlFor="client-summary" className="text-sm font-semibold">
                    내담자용 요약
                  </label>
                  <ScopeChip scope="share" />
                </div>
                <Textarea
                  id="client-summary"
                  rows={10}
                  maxLength={LIMITS.clientSummary}
                  placeholder="공유하려면 내담자용 요약이 꼭 필요합니다."
                  className="mt-3 field-sizing-fixed text-sm leading-relaxed"
                  value={form.clientSummary}
                  onChange={(event) => update("clientSummary", event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <ListEditor
                title="실천 과제"
                itemName="실천 과제"
                addLabel="+ 과제 추가"
                emptyText="원문에서 합의한 과제가 없으면 비워 둬도 됩니다."
                items={form.actionItems}
                onChange={(items) => update("actionItems", items)}
              />
              <ListEditor
                title="다음 상담 준비 질문"
                itemName="준비 질문"
                addLabel="+ 질문 추가"
                emptyText="다음 상담 전에 생각해 볼 질문이 여기에 들어갑니다."
                items={form.preparationQuestions}
                onChange={(items) => update("preparationQuestions", items)}
              />
            </div>
          </section>
        </fieldset>
      </main>

      {/* 하단 고정 바: 저장 상태 · 임시 저장 · 공유 확정 */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          {actionError ? (
            <p role="alert" className="text-sm text-danger">
              {actionError}
            </p>
          ) : dirty ? (
            <p className="flex items-center gap-2 text-sm text-draft">
              <span className="size-2 rounded-full bg-draft" aria-hidden="true" />
              저장하지 않은 변경 사항이 있습니다
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">모든 변경 사항이 저장되었습니다</p>
          )}
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              variant="outline"
              className="h-11 flex-1 px-4 sm:h-10 sm:flex-none"
              disabled={busy}
              onClick={() => void save()}
            >
              {saving ? (
                <>
                  <Spinner />
                  저장하는 중…
                </>
              ) : (
                "임시 저장"
              )}
            </Button>
            <Button className="h-11 flex-1 px-4 sm:h-10 sm:flex-none" disabled={busy} onClick={requestShare}>
              {sharing ? (
                <>
                  <Spinner />
                  공유하는 중…
                </>
              ) : (
                "공유 확정"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* AI 재생성 확인 */}
      <AlertDialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>AI로 다시 정리할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              상담사용 기록, 내담자용 요약, 실천 과제, 준비 질문이 새 결과로 모두 바뀝니다. 직접 수정한 내용도
              사라집니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction className="bg-ink hover:bg-ink/90" onClick={() => void runAi()}>
              다시 정리하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 공유 확정 확인 */}
      <AlertDialog open={shareOpen} onOpenChange={setShareOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{session.sessionNumber}회기를 내담자에게 공유할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              공유하면 이 회기의 기록은 더 이상 수정할 수 없습니다. 내담자는 아래 내용만 볼 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="mt-3 space-y-1 rounded-md bg-canvas px-4 py-3 text-sm">
            <li>✓ 내담자용 요약</li>
            <li>{actionCount > 0 ? `✓ 실천 과제 ${actionCount}개` : "· 실천 과제 없음"}</li>
            <li>{questionCount > 0 ? `✓ 다음 상담 준비 질문 ${questionCount}개` : "· 다음 상담 준비 질문 없음"}</li>
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => void share()}>공유 확정</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
