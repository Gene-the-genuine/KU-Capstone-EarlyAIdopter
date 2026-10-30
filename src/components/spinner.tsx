import { cn } from "cn";

/** 로딩 스피너. 화면에서 움직이는 것은 이것 하나뿐입니다. (DESIGN.md 1장) */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none",
        className,
      )}
    />
  );
}
