# DESIGN.md — 화면 디자인 규칙

> 이 문서와 `docs/ui/*.html`은 `docs/SPEC.md`(MVP 구현 명세 v1.0)를 화면으로 옮긴 것이다.
> 프론트엔드를 구현할 때 **SPEC.md가 기능의 기준, 이 문서가 모양의 기준**이다. 둘이 다르면 SPEC.md를 따른다.

## 0. AI에게 작업을 맡길 때

- HTML 파일은 **참고용 목업**이다. 그대로 복사하지 말고 Next.js App Router + shadcn/ui 컴포넌트로 다시 만든다.
- 예시 프롬프트:
  > `docs/ui/session-draft.html`을 참고해서 `/counselor/clients/[clientId]/sessions/[sessionId]` 페이지를 만들어줘. 기능은 `docs/SPEC.md` 3장 D와 7장을 따르고, 색·글꼴·컴포넌트는 `docs/DESIGN.md`를 따라줘. 버튼, 입력창, 모달은 shadcn/ui 컴포넌트를 써줘.
- 목업에는 **여러 상태를 한 화면에 동시에** 그려 둔 곳이 있다(로딩 버튼, 오류 박스, 빈 상태, 저장 완료 문구 등). 실제 구현에서는 조건에 따라 하나만 보여준다. 해당 위치에 `<!-- … 예시 -->` 주석이 있다.
- 목업의 `<script>`(모달 토글, 가짜 QR)는 미리보기용이다. 실제 구현은 shadcn `Dialog`/`AlertDialog`, `qrcode.react`를 쓴다.
- 서비스 이름 **"회기노트"는 가칭**이다. 바꾸면 모든 화면에서 함께 바꾼다.

## 1. 디자인 방향

- 차분하고 신뢰감 있는 **밝은 테마 하나**만 쓴다(다크 모드 없음, SPEC 8장).
- 기본 바탕은 살짝 초록빛이 도는 밝은 회색, 강조색은 짙은 세이지 그린 하나.
- 애니메이션은 로딩 스피너 외에는 쓰지 않는다.
- **누가 볼 수 있는 정보인지**를 화면에서 항상 드러낸다(아래 4장 "공개 범위 표시").

## 2. 색상 토큰

> **구현 메모 (2026-10-29 백엔드 작업 중 추가, 2026-10-30 화면 구현하며 갱신)**
> 프로젝트는 **Tailwind CSS v4**로 만들어져서, 아래의 `tailwind.config.ts`(v3 방식)와 HSL 변수 대신 `src/app/globals.css`에 같은 색을 이미 넣어 두었습니다.
> - 클래스 이름은 이 문서에 적힌 그대로 쓰면 됩니다: `bg-canvas`, `text-ink`, `bg-brand`, `hover:bg-brand-hover`, `bg-brand-soft`, `text-draft`, `bg-danger-soft`, `border-brand/30` …
> - **예외 하나**: 보조 글자색 `text-muted` → **`text-muted-foreground`** 로 쓰세요. shadcn/ui에서 `muted`는 보조 *배경색* 이름이라, `text-muted`로 쓰면 글자가 배경색(거의 흰색)이 됩니다.
> - shadcn/ui 컴포넌트는 Radix 기반으로 `src/components/ui/`에 들어 있습니다(Button, Input, Textarea, Label, Card, Badge, Dialog, AlertDialog, Checkbox, Sonner). 더 필요하면 `npx shadcn@latest add <이름>`.
> - 폰트(IBM Plex Sans KR)는 `src/app/layout.tsx`에서 불러옵니다.
> - shadcn/ui의 `Card`는 테두리를 `border`가 아니라 `ring`으로 그립니다. 공유 카드 강조(`border-brand/30`)는 `Card`에 쓸 때 **`ring-brand/30`**으로 쓰세요.
> - 버튼(`Button`) 기본 높이는 `h-8`입니다. 이 문서의 `h-10`(모바일 주요 버튼 `h-12`)은 `className="h-10"`처럼 직접 지정하세요. 입력창(`Input`)은 `h-10`이 기본이 되도록 고쳐 두었습니다.
> - `src/components/ui/`의 몇 가지는 목업에 맞춰 고쳐 두었습니다: 기본 버튼 hover는 `brand-hover`, 보조(outline) 버튼 바탕은 흰색, `destructive`는 빨간 바탕에 흰 글자, `Dialog`·`AlertDialog`는 흰 카드(`p-6`, 최대 `max-w-md`)·왼쪽 정렬 제목·오른쪽 버튼·애니메이션 없음.
> - 화면은 `src/app/login`, `signup`, `counselor`, `client/[token]`에 있습니다(README 2장). 여러 화면이 같이 쓰는 조각은 `src/components/*.tsx`: 상태 배지 `StatusBadge`, 공개 범위 칩 `ScopeChip`, 로딩·오류 문구 `feedback.tsx`, 입력 칸 `FormField`, 내담자 화면 틀 `client-shell.tsx`.
> - 목업에 없던 상태(첫 AI 정리 버튼 "✦ AI로 정리하기", 하단 바의 "모든 변경 사항이 저장되었습니다", 내담자 0명 빈 화면, 로딩·불러오기 실패 화면)는 같은 규칙으로 추가했습니다.


| 토큰 | HEX | 용도 |
|---|---|---|
| `canvas` | `#F5F7F6` | 페이지 바탕, 보조 배경(원문 읽기 영역, 목적 메모 박스) |
| `surface` | `#FFFFFF` | 카드, 모달, 입력창 |
| `ink` | `#1E2925` | 본문 글자, AI 생성 버튼 |
| `muted` | `#5B6862` | 보조 글자, 안내 문구 |
| `line` | `#DFE5E2` | 테두리, 구분선 |
| `brand` | `#2E6A5C` | 주요 버튼, 링크, 선택 상태, "공유 완료" |
| `brand-hover` | `#25574B` | 주요 버튼 hover |
| `brand-soft` | `#E7F1EE` | 선택된 목록 항목, 공유 배지 배경, 완료된 과제 배경 |
| `draft` | `#9A5B0B` | "작성 중" 배지 글자, 미저장 표시 |
| `draft-soft` | `#FDF3E1` | "작성 중" 배지 배경 |
| `danger` | `#B4321F` | 삭제, 오류 |
| `danger-soft` | `#FCEBE8` | 오류 박스 배경, 삭제 버튼 hover |

### Tailwind 설정 (`tailwind.config.ts`의 `theme.extend.colors`)

```ts
colors: {
  canvas: '#F5F7F6', surface: '#FFFFFF', ink: '#1E2925', muted: '#5B6862', line: '#DFE5E2',
  brand: { DEFAULT: '#2E6A5C', hover: '#25574B', soft: '#E7F1EE' },
  draft: { DEFAULT: '#9A5B0B', soft: '#FDF3E1' },
  danger: { DEFAULT: '#B4321F', soft: '#FCEBE8' },
}
```

### shadcn/ui 테마 변수 (`app/globals.css`의 `:root`)

```css
:root {
  --background: 150 13% 97%;        /* canvas */
  --foreground: 158 16% 14%;        /* ink */
  --card: 0 0% 100%;
  --card-foreground: 158 16% 14%;
  --popover: 0 0% 100%;
  --popover-foreground: 158 16% 14%;
  --primary: 166 39% 30%;           /* brand */
  --primary-foreground: 0 0% 100%;
  --secondary: 150 13% 97%;
  --secondary-foreground: 158 16% 14%;
  --muted: 150 13% 97%;
  --muted-foreground: 152 7% 38%;   /* muted */
  --accent: 162 26% 93%;            /* brand-soft */
  --accent-foreground: 166 39% 30%;
  --destructive: 8 71% 41%;         /* danger */
  --destructive-foreground: 0 0% 100%;
  --border: 150 10% 89%;            /* line */
  --input: 150 10% 89%;
  --ring: 166 39% 30%;
  --radius: 0.5rem;
}
```

## 3. 글꼴과 크기

- 글꼴: **IBM Plex Sans KR** (Google Fonts, `next/font/google`로 불러오기). 대체: Apple SD Gothic Neo, Malgun Gothic, sans-serif.
- 굵기: 400(본문), 500(버튼·라벨), 600(카드 제목), 700(페이지 제목).

| 역할 | 상담사 화면 | 내담자 화면 |
|---|---|---|
| 페이지 제목 | `text-2xl font-bold` (대시보드 내담자명은 `text-xl`) | `text-2xl font-bold` |
| 섹션 제목 | `text-base font-semibold` | `text-sm font-semibold text-brand` |
| 카드 제목·라벨 | `text-sm font-semibold` / `text-sm font-medium` | `text-[15px] font-medium` |
| 본문 | `text-sm leading-relaxed` | `text-[15px]~[16px] leading-relaxed` (요약은 `leading-[1.8]`) |
| 보조·안내 | `text-xs text-muted` | `text-xs`~`text-sm text-muted` |

- 날짜·회기 번호·개수에는 `tabular-nums`를 쓴다. 날짜 표기는 `2026.10.20`.

## 4. 공통 컴포넌트 (shadcn/ui 대응)

| 요소 | shadcn 컴포넌트 | 규칙 |
|---|---|---|
| 주요 버튼 | `Button` (default) | `h-10`, brand 배경. 화면당 1개만(저장/공유 바에서는 "공유 확정") |
| 보조 버튼 | `Button variant="outline"` | 취소, 임시 저장, 복사 |
| 텍스트 버튼 | `Button variant="ghost"` | 로그아웃, 뒤로가기 |
| 삭제 버튼 | `Button variant="destructive"` | 확인 모달 안에서만. 목록의 삭제 진입 버튼은 outline + danger 글자 |
| AI 생성 버튼 | `Button` + `className="bg-ink"` | 앞에 `✦` 표시. 생성 중엔 disabled + 스피너 + "정리하는 중…" |
| 입력창 | `Input`, `Textarea`, `Label` | `h-10`, 포커스 시 brand 테두리 + 옅은 링. 오류 시 `border-danger` + 아래 `text-xs text-danger` 문구 |
| 카드 | `Card` | `rounded-xl border bg-surface p-5`. 그림자는 로그인/가입 폼에만 |
| 상태 배지 | `Badge` | **작성 중**: `bg-draft-soft text-draft` / **공유 완료**: `bg-brand-soft text-brand`. `rounded-full text-xs` |
| 모달 | `Dialog`, `AlertDialog` | 확인이 필요한 행동(재생성, 공유 확정, 내담자 삭제)은 `AlertDialog`. 제목은 질문형("~할까요?"), 본문에 결과를 구체적으로 적는다 |
| 체크박스 | `Checkbox` | 내담자 화면은 항목 전체를 누를 수 있는 큰 행(`p-3.5`), 체크되면 `bg-brand-soft` |
| 알림 | `sonner` 토스트 또는 인라인 문구 | 저장 성공 "저장했어요", 오류는 인라인 박스 `bg-danger-soft text-danger` |

### 공개 범위 표시 (이 서비스만의 규칙)

상담사 회기 페이지의 각 섹션 제목 옆에 작은 칩을 붙여, 내담자에게 보이는지 알려준다.

- `상담사만` — `bg-canvas text-muted` : 상담 원문, 상담사용 상세 기록, 상담 목적 메모
- `내담자에게 공유` (draft) / `공유됨` (shared) — `bg-brand-soft text-brand` : 내담자용 요약, 실천 과제, 준비 질문
- 내담자에게 공유되는 카드는 테두리를 `border-brand/30`으로 살짝 강조한다(draft 화면).

## 5. 화면 목록

| 파일 | 경로 | SPEC | 담당 메모 |
|---|---|---|---|
| `login.html` | `/login` | 3-A | 실패 메시지는 로그인 실패 시에만 |
| `signup.html` | `/signup` | 3-B | 오류 문구 3종 예시, 성공 메시지는 로그인 화면 상단에 |
| `dashboard.html` | `/counselor` | 3-C | 좌측 280px 목록 + 우측 상세, `md` 미만은 세로 배치. 내담자 추가·삭제 모달 포함 |
| `session-draft.html` | `/counselor/clients/[clientId]/sessions/[sessionId]` (draft) | 3-D, 7 | 하단 고정 액션 바, 재생성·공유 확인 모달, 로딩·오류 예시 |
| `session-shared.html` | 같은 경로 (shared) | 3-D | 같은 컴포넌트를 읽기 전용으로. 입력창 대신 텍스트. 공유 링크/QR 모달 |
| `client-home.html` | `/client/[token]` | 3-E | 반응형. 모바일은 한 줄, `lg`부터 왼쪽 프로필(300px) + 오른쪽 회기 카드 2열. 카드에 요약 첫 줄 + 과제 진행률 |
| `client-session.html` | `/client/[token]/sessions/[sessionId]` | 3-F | 모바일은 요약 → 과제 → 질문 메모 → 이전/다음 순서. `lg`부터 왼쪽(요약·과제) + 오른쪽(질문 메모) 두 칸 |
| `client-invalid.html` | 토큰 오류 | 3-E | 이유를 구체적으로 밝히지 않는다 |

## 6. 레이아웃 규칙

- 상담사 화면: 상단 바 `h-14` + 본문 `max-w-6xl`(대시보드) / `max-w-5xl`(회기 페이지), 좌우 여백 `px-4`.
- 회기 페이지(draft) 순서: 회기 정보(이름·회기·배지·날짜) → 상담 원문 + AI 버튼 → AI 결과(기록 | 요약) → (실천 과제 | 준비 질문) → 하단 고정 바(미저장 표시 · 임시 저장 · 공유 확정). `lg` 미만에서는 두 칸이 한 칸으로 쌓인다.
- 내담자 화면: 모바일 우선으로 만들되 데스크톱에서도 자연스럽게 보이도록 반응형. 상단 바 `h-14`(서비스명 + 내담자 이름) + 본문 `max-w-5xl`. 모바일에서는 한 줄로 쌓고, `lg`(1024px)부터 두 칸으로 나눈다. 터치 대상은 최소 `h-10`(모바일 주요 버튼 `h-12`), 본문 15~16px.
- 간격은 `space-y-*`, `gap-*`로만 잡고 개별 margin은 피한다.

## 7. 문구 규칙

- 상담사 화면은 "~합니다/~하세요", 내담자 화면은 부드러운 "~해요"체.
- 버튼은 실제로 일어나는 일을 쓴다: "공유 확정", "다시 정리하기", "메모 저장". "확인" 단독 사용은 피한다.
- 오류는 무엇이 잘못됐고 무엇이 보존됐는지 쓴다: "AI 정리에 실패했습니다. 입력한 원문과 현재 결과는 그대로 남아 있습니다."
- 상태 이름은 화면 전체에서 통일한다: DB `draft` = **작성 중**, `shared` = **공유 완료**.
- 시연 데이터는 모두 가명·합성 데이터다.
