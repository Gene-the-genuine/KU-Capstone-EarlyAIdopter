/**
 * 화면에 보여 줄 때 쓰는 형식 (DESIGN.md 3장: 날짜는 2026.10.20 처럼)
 */

/** 'YYYY-MM-DD' → 'YYYY.MM.DD' */
export function formatDate(date: string): string {
  return date.replaceAll("-", ".");
}

/** ISO 시각(예: 공유한 시각) → 한국 날짜 'YYYY.MM.DD' */
export function formatKoreanDate(isoTime: string): string {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(isoTime));
  return formatDate(day);
}
