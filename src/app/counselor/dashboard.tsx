"use client";

import { cn } from "cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ErrorState, LoadingState } from "@/components/feedback";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { api, errorMessage, isUnauthorized } from "@/lib/api";
import { SERVICE_NAME } from "@/lib/brand";
import { formatDate } from "@/lib/format";
import type { CounselorClient } from "@/lib/types";
import { AddClientDialog } from "./add-client-dialog";

/**
 * 왼쪽: 내담자 목록 / 오른쪽: 고른 내담자의 정보와 회기 목록 (md 미만에서는 위아래로)
 * 새 회기 생성은 이 화면에서만 합니다. (SPEC 3-C)
 */
export function Dashboard({ initialClientId }: { initialClientId: string | null }) {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [clients, setClients] = useState<CounselorClient[] | null>(null); // null = 불러오는 중
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialClientId);
  const [addOpen, setAddOpen] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null); // 삭제 요청 중인 내담자
  const [reloadKey, setReloadKey] = useState(0); // 바꾸면 다시 불러옵니다 (다시 시도 버튼)

  useEffect(() => {
    let ignore = false; // 화면을 떠난 뒤 도착한 응답은 버립니다.
    Promise.all([api.auth.me(), api.counselor.listClients()]).then(
      ([me, list]) => {
        if (ignore) return;
        setUsername(me.counselor.username);
        setClients(list.clients);
      },
      (error: unknown) => {
        if (ignore) return;
        if (isUnauthorized(error)) router.replace("/login");
        else setLoadError(errorMessage(error));
      },
    );
    return () => {
      ignore = true;
    };
  }, [router, reloadKey]);

  // 고른 내담자가 없거나 목록에 없으면 첫 번째 내담자를 보여 줍니다.
  const selected = clients?.find((client) => client.id === selectedId) ?? clients?.[0] ?? null;

  function select(clientId: string | null) {
    setSelectedId(clientId);
    // 주소에도 남겨서 새로고침하거나 회기 페이지에서 돌아와도 같은 내담자가 보이게 합니다.
    window.history.replaceState(null, "", clientId ? `/counselor?client=${clientId}` : "/counselor");
  }

  async function logout() {
    try {
      await api.auth.logout();
    } catch {
      // 이미 로그인이 풀렸어도 로그인 화면으로 보냅니다.
    }
    router.replace("/login");
  }

  function handleAdded(client: CounselorClient) {
    setClients((current) => [...(current ?? []), client]);
    select(client.id);
  }

  async function deleteClient(client: CounselorClient) {
    setDeletingId(client.id);
    try {
      await api.counselor.deleteClient(client.id);
      setClients((current) => current?.filter((item) => item.id !== client.id) ?? null);
      // 기다리는 동안 다른 내담자를 골랐다면 그 선택은 그대로 둡니다.
      setSelectedId((current) => (current === client.id ? null : current));
      if (new URLSearchParams(window.location.search).get("client") === client.id) {
        window.history.replaceState(null, "", "/counselor");
      }
      toast.success(`${client.name} 님을 삭제했습니다.`);
    } catch (error) {
      if (isUnauthorized(error)) return router.replace("/login");
      toast.error(errorMessage(error));
    } finally {
      setDeletingId(null);
    }
  }

  async function createSession(client: CounselorClient) {
    setCreatingSession(true);
    try {
      // 빈 "작성 중" 회기를 DB에 만들고 그 회기 페이지로 이동합니다. (SPEC 3-C, 7장)
      const { session } = await api.counselor.createSession(client.id);
      router.push(`/counselor/clients/${client.id}/sessions/${session.id}`);
    } catch (error) {
      if (isUnauthorized(error)) return router.replace("/login");
      toast.error(errorMessage(error));
      setCreatingSession(false);
    }
  }

  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <p className="text-sm font-semibold text-brand">{SERVICE_NAME}</p>
          <div className="flex items-center gap-3 text-sm">
            {username && <span className="text-muted-foreground">{username} 님</span>}
            <Button variant="ghost" className="px-3 text-muted-foreground" onClick={logout}>
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      {loadError ? (
        <main className="mx-auto max-w-6xl px-4 py-6">
          <ErrorState
            message={loadError}
            onRetry={() => {
              setLoadError(null);
              setReloadKey((key) => key + 1);
            }}
          />
        </main>
      ) : clients === null ? (
        <main className="mx-auto max-w-6xl px-4 py-6">
          <LoadingState />
        </main>
      ) : (
        <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[280px_1fr]">
          {/* 왼쪽: 내담자 목록 */}
          <aside className="min-w-0 self-start rounded-xl border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold">
                내담자 <span className="font-normal text-muted-foreground tabular-nums">{clients.length}명</span>
              </h2>
              <Button className="h-8 px-3 text-xs" onClick={() => setAddOpen(true)}>
                + 내담자 추가
              </Button>
            </div>
            {clients.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">아직 내담자가 없습니다.</p>
            ) : (
              <ul className="space-y-0.5 p-2">
                {clients.map((client) => {
                  const isSelected = client.id === selected?.id;
                  return (
                    <li key={client.id}>
                      <button
                        type="button"
                        onClick={() => select(client.id)}
                        aria-current={isSelected ? "true" : undefined}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left",
                          isSelected ? "bg-brand-soft" : "hover:bg-canvas",
                        )}
                      >
                        <span className="min-w-0">
                          <span
                            className={cn(
                              "block truncate text-sm",
                              isSelected ? "font-semibold text-brand" : "font-medium",
                            )}
                          >
                            {client.name}
                          </span>
                          <span className="block text-xs text-muted-foreground tabular-nums">
                            {formatDate(client.birthDate)}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          회기 {client.sessions.length}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {/* 오른쪽: 고른 내담자 */}
          <section className="min-w-0 space-y-6">
            {selected ? (
              <ClientDetail
                client={selected}
                creatingSession={creatingSession}
                deleting={deletingId === selected.id}
                onCreateSession={() => createSession(selected)}
                onDelete={() => deleteClient(selected)}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-line bg-surface px-5 py-10 text-center">
                <p className="text-sm font-medium">아직 등록된 내담자가 없습니다</p>
                <p className="mt-1 text-sm text-muted-foreground">내담자를 추가하면 회기 기록을 시작할 수 있습니다.</p>
                <Button className="mt-4 h-9 px-4" onClick={() => setAddOpen(true)}>
                  + 내담자 추가
                </Button>
              </div>
            )}
          </section>
        </main>
      )}

      <AddClientDialog open={addOpen} onOpenChange={setAddOpen} onAdded={handleAdded} />
    </>
  );
}

function ClientDetail({
  client,
  creatingSession,
  deleting,
  onCreateSession,
  onDelete,
}: {
  client: CounselorClient;
  creatingSession: boolean;
  deleting: boolean; // 삭제 요청 중이면 버튼을 잠급니다 (두 번 삭제 방지)
  onCreateSession: () => void;
  onDelete: () => void;
}) {
  // 최근 회기가 위로 오게 (목업 순서)
  const sessions = [...client.sessions].sort((a, b) => b.sessionNumber - a.sessionNumber);

  const newSessionButton = (
    <Button className="h-9 px-4" disabled={creatingSession} onClick={onCreateSession}>
      {creatingSession ? (
        <>
          <Spinner />
          만드는 중…
        </>
      ) : (
        "+ 새 회기 생성"
      )}
    </Button>
  );

  return (
    <>
      <div className="rounded-xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold break-words">{client.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">생년월일 {formatDate(client.birthDate)}</p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="h-8 px-3 text-xs text-danger hover:bg-danger-soft hover:text-danger"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Spinner className="size-3" />
                    삭제하는 중…
                  </>
                ) : (
                  "내담자 삭제"
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{client.name} 님을 삭제할까요?</AlertDialogTitle>
                <AlertDialogDescription>
                  모든 회기 기록, 실천 과제, 준비 질문이 함께 삭제되고 내담자 공유 링크도 더 이상 열리지 않습니다.
                  되돌릴 수 없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={onDelete}>
                  삭제
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {client.purposeNote && (
          <div className="mt-4 rounded-md bg-canvas px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">상담 목적 메모 · 상담사만 볼 수 있음</p>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{client.purposeNote}</p>
          </div>
        )}
      </div>

      {sessions.length > 0 ? (
        <div className="rounded-xl border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="text-sm font-semibold">회기 목록</h2>
            {newSessionButton}
          </div>
          <ul className="divide-y divide-line">
            {sessions.map((session) => (
              <li key={session.id}>
                <Link
                  href={`/counselor/clients/${client.id}/sessions/${session.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-canvas"
                >
                  <span className="w-14 text-sm font-semibold tabular-nums">{session.sessionNumber}회기</span>
                  <span className="flex-1 text-sm text-muted-foreground tabular-nums">
                    {formatDate(session.sessionDate)}
                  </span>
                  <StatusBadge status={session.status} />
                  <span className="text-muted-foreground" aria-hidden="true">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-line bg-surface px-5 py-10 text-center">
          <p className="text-sm font-medium">아직 기록된 회기가 없습니다</p>
          <p className="mt-1 text-sm text-muted-foreground">첫 상담을 마쳤다면 새 회기를 만들어 기록을 시작하세요.</p>
          <div className="mt-4">{newSessionButton}</div>
        </div>
      )}
    </>
  );
}
