"use client";

import { useState } from "react";
import { ScopeChip } from "@/components/scope-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LIMITS } from "@/lib/schemas";

/**
 * 실천 과제 · 준비 질문 편집 카드: 줄 추가 / 수정 / 삭제 (SPEC 3-D)
 * 빈 줄은 저장할 때 서버가 빼 줍니다.
 */
export function ListEditor({
  title,
  itemName,
  addLabel,
  emptyText,
  items,
  onChange,
}: {
  title: string; // 카드 제목 (예: "실천 과제")
  itemName: string; // 화면 낭독기용 이름 (예: "실천 과제 1 삭제")
  addLabel: string; // 추가 버튼 글자
  emptyText: string; // 줄이 하나도 없을 때 안내
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [focusIndex, setFocusIndex] = useState<number | null>(null); // 방금 추가한 줄에 커서를 둡니다.

  function add() {
    onChange([...items, ""]);
    setFocusIndex(items.length);
  }

  function change(index: number, value: string) {
    onChange(items.map((item, i) => (i === index ? value : item)));
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
    setFocusIndex(null);
  }

  return (
    <div className="min-w-0 rounded-xl border border-brand/30 bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          <ScopeChip scope="share" />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{items.length}개</span>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              <Input
                aria-label={`${itemName} ${index + 1}`}
                value={item}
                maxLength={LIMITS.listItem}
                autoFocus={index === focusIndex}
                onChange={(event) => change(index, event.target.value)}
                className="min-w-0 flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${itemName} ${index + 1} 삭제`}
                onClick={() => remove(index)}
                className="size-10 shrink-0 text-muted-foreground hover:bg-danger-soft hover:text-danger"
              >
                ✕
              </Button>
            </li>
          ))}
        </ul>
      )}

      {items.length < LIMITS.listCount && (
        <button
          type="button"
          onClick={add}
          className="mt-3 inline-flex h-9 items-center rounded-md border border-dashed border-line px-3 text-sm text-muted-foreground hover:border-brand hover:text-brand"
        >
          {addLabel}
        </button>
      )}
    </div>
  );
}
