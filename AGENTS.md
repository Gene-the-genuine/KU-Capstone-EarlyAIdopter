<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 회기노트 프로젝트 규칙 (사람과 AI 코딩 도구 공통)

코드를 쓰기 전에 읽을 문서: 기능은 `docs/SPEC.md`, 화면 모양은 `docs/DESIGN.md`와 목업 `docs/ui/*.html`, 백엔드 API는 `docs/API.md`.

## 용어 (헷갈리기 쉬움)

- **session = 상담 회기**입니다. 상담사 로그인 상태는 **auth**라고 부릅니다 (`src/server/auth.ts`).
- **client = 내담자**입니다. 브라우저나 프론트엔드를 뜻하지 않습니다.
- 회기 상태: `draft` = 작성 중, `shared` = 공유 완료.

## 폴더 역할

| 폴더 | 역할 | 규칙 |
|---|---|---|
| `src/app/api/**/route.ts` | 백엔드 API (폴더 경로 = URL) | 짧게 유지: 로그인 확인 → 입력 검사 → `src/server` 함수 호출 → JSON 응답 |
| `src/server/` | DB · 로그인 · AI 로직 | 서버 전용. `"use client"` 파일에서 import 금지 (`server-only`) |
| `src/lib/` | 프론트·백엔드 공용 | `types.ts` 응답 타입, `schemas.ts` 입력 규칙, `api.ts` 프론트용 호출 함수. 서버 전용 코드 금지 |
| `src/components/ui/` | shadcn/ui 컴포넌트 (Radix 기반, 목업 모양에 맞춰 조금 고침) | 추가: `npx shadcn@latest add <이름>` |
| `src/components/*.tsx` | 여러 화면이 같이 쓰는 조각 (`StatusBadge`, `ScopeChip`, `feedback`, `FormField`, `client-shell`) | 새 화면에서도 먼저 찾아 쓰기 |
| `src/app/(그 외)` | 페이지 (프론트엔드) | `page.tsx`는 탭 제목·주소 값만, 화면은 같은 폴더의 `"use client"` 컴포넌트가 `api.*`로 데이터를 가져와 그림 |
| `supabase/` | DB 스키마·시드 SQL | 테이블을 바꾸면 `src/server/database.types.ts`도 함께 수정 |

## 데이터 보호 규칙 (반드시 지킬 것)

- DB는 Next.js 서버에서만 secret key로 접근합니다. 브라우저에서 Supabase를 직접 부르지 않습니다. `NEXT_PUBLIC_SUPABASE_*` 환경변수를 만들지 않습니다.
- 상담사 API: 첫 줄에서 `requireCounselor()`를 부르고, 내담자·회기가 그 상담사(`counselor_id`)의 것인지 확인합니다.
- 내담자 API: `share_token` → 내담자 → `status = 'shared'`를 함께 확인합니다. `source_text`, `counselor_note`, `purpose_note`를 절대 응답하지 않습니다.
- 내담자의 `is_completed`, `client_answer`는 상담사 API 응답에 넣지 않습니다.
- AI 정리 결과는 자동 저장하지 않습니다. 상담사가 임시 저장이나 공유 확정을 눌러야 저장됩니다.
- 실제 상담·개인 정보는 쓰지 않습니다. 합성 데이터만 씁니다.

## 프론트엔드 메모

- 백엔드 호출은 `import { api, ApiError } from "@/lib/api"`로 합니다. 401이면 `/login`으로 보냅니다.
- 색은 DESIGN.md 토큰 클래스(`bg-canvas`, `text-ink`, `bg-brand` …)를 씁니다. 단, 보조 글자색은 `text-muted`가 아니라 `text-muted-foreground`입니다.
- 다크 모드는 쓰지 않습니다. 애니메이션은 로딩 스피너(`src/components/spinner.tsx`)만 씁니다.
- 서비스 이름은 `SERVICE_NAME`(`src/lib/brand.ts`), 날짜 표시는 `formatDate`(`src/lib/format.ts`, 2026.10.20 형식)를 씁니다.
- 상담사 화면 문구는 "~합니다", 내담자 화면 문구는 "~해요"체입니다(DESIGN.md 7장).

## 점검 명령

- `npm run lint` / `npm run typecheck` / `npm run build`
- `npm run test:api` — 서버(`npm run dev`)가 켜진 상태에서 SPEC 10장 시나리오를 API로 점검
