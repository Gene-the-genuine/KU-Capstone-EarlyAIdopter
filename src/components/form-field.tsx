import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

/**
 * 입력 칸 한 줄: 라벨 + 입력창 + 아래 문구 (오류는 빨간색, 안내는 회색) — DESIGN.md 4장 "입력창"
 * 입력창에는 aria-invalid 와 aria-describedby={`${id}-message`} 를 직접 넣어 주세요.
 */
export function FormField({
  id,
  label,
  labelNote,
  input,
  error,
  hint,
}: {
  id: string;
  label: string;
  labelNote?: string; // 라벨 옆 회색 글자 (예: "(선택)")
  input: ReactNode;
  error?: string;
  hint?: string;
}) {
  const message = error ?? hint;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {labelNote && <span className="font-normal text-muted-foreground">{labelNote}</span>}
      </Label>
      {input}
      {message && (
        <p id={`${id}-message`} className={error ? "text-xs text-danger" : "text-xs text-muted-foreground"}>
          {message}
        </p>
      )}
    </div>
  );
}
