"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorState, LoadingState } from "@/components/feedback";
import { api, ApiError, errorMessage, isUnauthorized } from "@/lib/api";
import type { CounselorSession } from "@/lib/types";
import { DraftEditor } from "./draft-editor";
import { SessionHeader } from "./session-header";
import { ShareLinkDialog } from "./share-link-dialog";
import { SharedView } from "./shared-view";

/**
 * 회기 하나를 불러와 상태에 맞는 화면을 보여 줍니다.
 * - draft(작성 중): 편집 화면 (DraftEditor)
 * - shared(공유 완료): 같은 내용을 읽기 전용으로 (SharedView) + 공유 링크/QR 모달
 */
export function SessionView({ clientId, sessionId }: { clientId: string; sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<CounselorSession | null>(null);
  const [loadError, setLoadError] = useState<{ message: string; notFound: boolean } | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0); // 바꾸면 다시 불러옵니다 (다시 시도, 다른 탭에서 공유됨)
  const backHref = `/counselor?client=${clientId}`;
  const reload = () => setReloadKey((key) => key + 1);

  useEffect(() => {
    let ignore = false; // 화면을 떠난 뒤 도착한 응답은 버립니다.
    api.counselor.getSession(clientId, sessionId).then(
      ({ session }) => {
        if (ignore) return;
        setSession(session);
        setLoadError(null);
      },
      (error: unknown) => {
        if (ignore) return;
        if (isUnauthorized(error)) router.replace("/login");
        else setLoadError({ message: errorMessage(error), notFound: error instanceof ApiError && error.status === 404 });
      },
    );
    return () => {
      ignore = true;
    };
  }, [clientId, sessionId, router, reloadKey]);

  if (!session) {
    return (
      <>
        <SessionHeader backHref={backHref} />
        <main className="mx-auto max-w-5xl px-4 py-6">
          {loadError ? (
            loadError.notFound ? (
              <ErrorState
                title="회기를 찾을 수 없습니다"
                message="삭제되었거나 주소가 잘못되었습니다. 대시보드에서 다시 골라 주세요."
              />
            ) : (
              <ErrorState
                message={loadError.message}
                onRetry={() => {
                  setLoadError(null);
                  reload();
                }}
              />
            )
          ) : (
            <LoadingState />
          )}
        </main>
      </>
    );
  }

  return (
    <>
      {session.status === "draft" ? (
        <DraftEditor
          session={session}
          backHref={backHref}
          onShared={(shared) => {
            setSession(shared); // 화면이 읽기 전용으로 바뀌고
            setLinkOpen(true); // 공유 링크/QR 모달이 바로 열립니다. (SPEC 3-D)
          }}
          onReload={reload}
        />
      ) : (
        <SharedView session={session} backHref={backHref} onShowLink={() => setLinkOpen(true)} />
      )}

      {session.sharePath && (
        <ShareLinkDialog
          open={linkOpen}
          onOpenChange={setLinkOpen}
          sessionNumber={session.sessionNumber}
          sharePath={session.sharePath}
        />
      )}
    </>
  );
}
