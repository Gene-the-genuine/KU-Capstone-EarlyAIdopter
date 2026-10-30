import type { SessionContent } from "@/lib/types";

/*
 * 저장하지 않은 회기 내용을 이 브라우저 탭에만 잠시 보관합니다 (sessionStorage — DB 저장이 아님).
 * 브라우저 "뒤로 가기"는 이탈 경고 없이 화면을 바꾸기 때문에, 돌아왔을 때 쓰던 내용을 되살리려는 용도입니다.
 * 탭을 닫으면 사라지고, 저장하거나 공유하면 지웁니다.
 */

type Backup = {
  saved: SessionContent; // 보관할 때 서버에 저장돼 있던 내용
  form: SessionContent; // 화면에 쓰고 있던 내용
};

const keyOf = (sessionId: string) => `hoegi-note:unsaved-session:${sessionId}`;

/** 보관본이 있고 그 사이 서버 내용이 바뀌지 않았으면(다른 탭에서 저장 등) 쓰던 내용을 돌려줍니다. */
export function readBackup(sessionId: string, saved: SessionContent): SessionContent | null {
  try {
    const raw = window.sessionStorage.getItem(keyOf(sessionId));
    if (!raw) return null;
    const backup = JSON.parse(raw) as Backup;
    return JSON.stringify(backup.saved) === JSON.stringify(saved) ? backup.form : null;
  } catch {
    return null; // 저장소를 쓸 수 없는 브라우저 설정이면 그냥 넘어갑니다.
  }
}

export function writeBackup(sessionId: string, saved: SessionContent, form: SessionContent): void {
  try {
    const backup: Backup = { saved, form };
    window.sessionStorage.setItem(keyOf(sessionId), JSON.stringify(backup));
  } catch {
    // 용량 초과 등으로 못 남겨도 화면 동작에는 영향이 없습니다.
  }
}

export function clearBackup(sessionId: string): void {
  try {
    window.sessionStorage.removeItem(keyOf(sessionId));
  } catch {
    // 위와 같음
  }
}
