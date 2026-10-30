# 회기노트 (가칭)

상담사가 입력한 회기 기록을 AI가 정리하고, 상담사가 검토해 공유한 내용을 내담자가 링크로 다시 읽으며 실천 과제를 체크하고 다음 상담을 준비하는 웹서비스입니다. 고려대학교 캡스톤 프로젝트(팀 EarlyAIdopter)입니다.

> ⚠️ **시연용 데모입니다. 실제 상담 내용이나 개인 정보를 절대 넣지 마세요.**
> 비밀번호 암호화, 로그인 확인, 데이터 소유자 확인, 공유 링크 확인 말고는 운영 수준의 보안이나 개인정보 규정 대응이 되어 있지 않습니다. 내담자 링크는 주소를 아는 누구나 열 수 있습니다. 시연은 지어낸 합성 데이터로만 합니다.

| 문서 | 내용 |
|---|---|
| [docs/SPEC.md](docs/SPEC.md) | 기능 명세. **무엇을 만들지의 기준** |
| [docs/DESIGN.md](docs/DESIGN.md) | 화면 디자인 규칙 (색·글꼴·컴포넌트). 화면 목업은 [docs/ui/](docs/ui/) (`_preview.html` 하나로 전체 보기) |
| [docs/API.md](docs/API.md) | 백엔드 API 명세. 프론트엔드가 백엔드를 부르는 방법 |
| [AGENTS.md](AGENTS.md) | 코딩 규칙 요약. AI 코딩 도구(Cursor, Codex, Claude Code)도 이 파일을 읽습니다 |

---

## 1. 처음 받았을 때 실행하기

준비물: **Node.js 22.13 이상** (`node -v`로 확인), Git.

```bash
git clone https://github.com/Gene-the-genuine/KU-Capstone-EarlyAIdopter.git
cd KU-Capstone-EarlyAIdopter
npm install
cp .env.example .env.local     # 그다음 .env.local 의 빈 값을 채웁니다 (아래 3장)
npm run dev                    # http://localhost:3000
```

- Supabase 키 값은 Supabase를 만든 팀원에게 **1:1로** 받으세요. 깃허브나 단톡방에 올리면 안 됩니다.
- AI 키는 각자 학교 llm.korea.ac.kr에서 발급받아 넣습니다(아래 3장). 키가 없거나 크레딧을 아끼려면 `.env.local`에서 `AI_MOCK=true`로 두세요. AI 정리 버튼이 1초 뒤 예시 결과를 돌려주므로 화면 개발에는 지장이 없습니다.
- 데모 계정: 아이디 `demo` / 비밀번호 `demo1234` (DB에 `supabase/seed.sql`을 넣은 경우).

백엔드가 명세대로 동작하는지 한 번에 확인하려면, 서버를 켠 상태에서 다른 터미널로:

```bash
npm run test:api     # SPEC 10장 "완료 검증 시나리오"를 API로 그대로 따라 합니다 (70여 개 항목)
```

## 2. 폴더 구조

```
├── docs/                    문서 (SPEC, DESIGN, API) + ui/ 화면 목업 HTML
├── supabase/
│   ├── schema.sql           DB 테이블·함수·보안 설정 (SQL Editor에 붙여넣어 실행)
│   ├── seed.sql             시연용 가짜 데이터 (선택)
│   └── reset.sql            개발용 초기화: 테이블을 전부 지움 (주의)
├── scripts/api-test.mjs     백엔드 자동 점검 (npm run test:api)
└── src/
    ├── proxy.ts             로그인 안 한 사람이 /counselor 화면을 열면 /login 으로 (로그인한 사람이 /login 을 열면 대시보드로)
    ├── app/
    │   ├── login/ · signup/ ★ 화면: 상담사 로그인 · 회원가입
    │   ├── counselor/       ★ 화면: 상담사 대시보드
    │   │   └── clients/[clientId]/sessions/[sessionId]/   회기 작성(작성 중) · 읽기 전용(공유 완료) · 공유 링크/QR
    │   ├── client/[token]/  ★ 화면: 내담자 홈 (로그인 없이 링크로)
    │   │   └── sessions/[sessionId]/   내담자 회기 상세 (과제 체크 · 메모)
    │   ├── not-found.tsx    없는 주소 화면
    │   ├── api/             ★ 백엔드 API. 폴더 경로가 곧 URL (예: api/counselor/clients/route.ts → /api/counselor/clients)
    │   │   ├── auth/        회원가입·로그인·로그아웃·내 정보
    │   │   ├── counselor/   상담사용: 내담자·회기·AI 정리·공유
    │   │   ├── client/      내담자용(로그인 없음): 공유된 회기 보기·과제 체크·메모
    │   │   └── health/      상태 확인
    │   ├── layout.tsx       전체 틀 (글꼴, 알림)
    │   └── globals.css      색상 (DESIGN.md 토큰)
    ├── server/              ★ 백엔드 로직 (서버에서만 실행, 브라우저 코드에서 import 금지)
    │   ├── auth.ts          회원가입·로그인·로그아웃, requireCounselor()
    │   ├── auth-cookie.ts   로그인 쿠키 설정 (auth.ts 와 proxy.ts 가 함께 씀)
    │   ├── clients.ts       내담자 목록·추가·삭제
    │   ├── sessions.ts      회기 생성·조회·임시 저장·공유 확정
    │   ├── client-view.ts   내담자 링크 화면용 조회·과제 체크·메모 저장
    │   ├── ai.ts            AI 정리 (OpenAI 호출)
    │   ├── ai-prompt.ts     AI 에게 주는 지시문 (결과 품질은 여기서 조정)
    │   ├── db.ts            Supabase 연결
    │   ├── database.types.ts  DB 테이블 타입 (schema.sql 과 같은 모양)
    │   ├── http.ts          API 공통 처리 (오류 응답 모양, 요청 검사)
    │   └── env.ts           환경변수 읽기
    ├── lib/                 ★ 프론트·백엔드 공용 (브라우저에서도 안전)
    │   ├── api.ts           프론트에서 백엔드 부르는 함수: api.counselor.listClients() …
    │   ├── types.ts         API 응답 타입
    │   ├── schemas.ts       입력 규칙 (글자 수 제한, 오류 문구)
    │   ├── format.ts        날짜 표시 (2026-10-20 → 2026.10.20)
    │   ├── brand.ts         서비스 이름 (가칭 "회기노트" — 여기만 바꾸면 모든 화면이 바뀜)
    │   └── utils.ts         cn() (shadcn/ui 용 클래스 합치기)
    └── components/
        ├── ui/              shadcn/ui 컴포넌트 (Button, Dialog …). 목업 모양에 맞춰 조금 고쳐 둠
        └── *.tsx            여러 화면이 함께 쓰는 조각: 상태 배지, 공개 범위 칩, 로딩·오류 문구, 입력 칸, 내담자 화면 틀
```

**화면 폴더 읽는 법**: `page.tsx`는 탭 제목과 주소 값만 정하고, 실제 화면은 같은 폴더의 컴포넌트(`"use client"`)가 그립니다. 예를 들어 `/counselor` 화면은 `counselor/page.tsx` → `counselor/dashboard.tsx`입니다. 화면은 `src/lib/api.ts`의 `api.*`로 백엔드를 부릅니다.

**프론트엔드는 `src/app`의 페이지와 `src/components`를, 백엔드는 `src/app/api`, `src/server`, `supabase`를 맡습니다.** 둘의 약속(계약)은 `src/lib`에 있습니다.

### 꼭 알아야 할 용어 두 개

- 코드의 **session은 상담 "회기"**입니다. 상담사 로그인 상태는 헷갈리지 않게 **auth**라고 부릅니다.
- 코드의 **client는 "내담자"**입니다. 웹 개발에서 말하는 클라이언트(브라우저)가 아닙니다.

## 3. 환경변수

`.env.example`을 복사한 `.env.local`에 넣습니다. 배포할 때는 같은 이름으로 Vercel에 넣습니다.

| 이름 | 필수 | 설명 | 어디서 얻나 |
|---|---|---|---|
| `SUPABASE_URL` | 필수 | Supabase 프로젝트 주소 | Supabase → Project Settings → Data API의 Project URL |
| `SUPABASE_SECRET_KEY` | 필수 | 서버 전용 DB 키 (`sb_secret_…`) | Supabase → Project Settings → API Keys → Secret keys |
| `SESSION_SECRET` | 필수 | 로그인 쿠키 암호화 비밀값 (32자 이상) | `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `OPENAI_API_KEY` | AI 정리에 필요 | AI API 키. 학교 키(`baze_…`) 또는 OpenAI 키(`sk-…`) | 학교: llm.korea.ac.kr → 왼쪽 아래 API Gateway → API 키 생성 / OpenAI: https://platform.openai.com/api-keys |
| `OPENAI_BASE_URL` | 학교 키면 필수 | AI API 주소. 학교 키면 `https://api.baze.co/v1/gateway`, OpenAI 키면 지움 | |
| `OPENAI_MODEL` | 선택 | 모델 (기본 `gpt-6-luna`) | |
| `OPENAI_REASONING_EFFORT` | 선택 | 추론 강도 `none`/`low`/`medium`/`high` (기본 `low`) | |
| `AI_MOCK` | 선택 | `true`면 AI를 부르지 않고 예시 결과를 돌려줌 | 화면 개발용, 크레딧 절약 |

- `NEXT_PUBLIC_`으로 시작하는 환경변수는 브라우저에 그대로 노출됩니다. **Supabase 키에는 절대 붙이지 마세요.** 이 앱은 브라우저가 DB를 직접 부르지 않아서 publishable key는 쓰지 않습니다.
- `SESSION_SECRET`을 바꾸면 모든 상담사가 로그아웃됩니다.

### 학교 AI 키 (llm.korea.ac.kr)

학교 AI 서비스(BAZE 게이트웨이)는 OpenAI와 같은 방식으로 부를 수 있어서, 키와 주소만 넣으면 코드 변경 없이 동작합니다(2026-10-30 실제 호출로 확인).

| 항목 | 내용 |
|---|---|
| 비용 | AI 정리 1회에 약 5~6 크레딧 (개인정보 가림 5 + 모델 사용료 1 미만). 월 크레딧은 매월 1일에 다시 채워집니다. 월 3,000 크레딧이면 약 500회 |
| 개인정보 가림 | 학교가 API 요청에도 개인정보 가림을 켜 두었습니다. 원문의 전화번호·이메일·생년월일 등은 `[PHONE]`, `[EMAIL]`, `[DATE-OF-BIRTH]`로 바뀐 채 AI에 전달되고, AI 결과에도 그대로 나옵니다. 이름은 가리지 않습니다 |
| 누구의 크레딧? | 키를 만든 사람의 크레딧에서 차감됩니다. 팀원은 각자 자기 키를 쓰고, 배포(Vercel)에는 한 사람의 키를 넣습니다 |
| 남은 크레딧 | `curl -H "Authorization: Bearer <키>" https://api.baze.co/v1/gateway/credits/` |

AI 정리가 `AI_FAILED`로 실패하면 `npm run dev` 터미널의 `[AI] 정리 실패` 로그에서 상태 숫자를 보세요. 401은 키와 주소가 안 맞는 경우(학교 키인데 `OPENAI_BASE_URL`이 비었거나, OpenAI 키인데 남아 있음), 402는 크레딧 소진, 403은 쓸 수 없는 모델, 429는 요청 과다입니다.

## 4. 동작 방식

```
브라우저 (페이지)
   │  fetch /api/...   ← src/lib/api.ts
   ▼
Next.js 서버 (src/app/api → src/server)
   │  ① 로그인 쿠키 확인 (상담사)  또는  공유 토큰 확인 (내담자)
   │  ② 이 데이터를 이 사람이 봐도 되는지 확인 (counselor_id / status='shared')
   ├──▶ Supabase PostgreSQL  (secret key, 서버에서만)
   └──▶ AI: 학교 게이트웨이(BAZE) 또는 OpenAI  (AI 정리할 때만, 상담 원문만 보냄)
```

- **상담사 로그인**: Supabase Auth 대신 `counselors` 테이블(아이디 + bcrypt로 암호화한 비밀번호)과 암호화된 httpOnly 쿠키(iron-session)를 씁니다(SPEC 1장). 이메일 인증이 없어 시연이 쉽습니다. 7일 동안 유지됩니다.
- **내담자 접근**: 로그인 없이 `/client/{공유 토큰}` 링크로 들어옵니다. 토큰은 내담자를 추가할 때 한 번 무작위로 만들어지고(32글자), 내담자를 삭제하면 함께 사라집니다.
- **AI 정리**: 화면에 입력된 상담 원문만 AI에 보내고, 정해진 JSON 모양(상담사 기록·내담자 요약·과제·질문)으로만 받습니다. 결과는 저장하지 않고 화면에만 채웁니다. 상담사가 고친 뒤 임시 저장이나 공유 확정을 눌러야 저장됩니다.

## 5. 데이터베이스 (Supabase)

### 테이블 5개

```
counselors 상담사 ─┬─ clients 내담자 ─┬─ sessions 회기 ─┬─ action_items 실천 과제
                   │   (share_token)  │   (draft/shared) └─ preparation_questions 준비 질문
```

위쪽을 지우면 아래쪽이 함께 지워집니다. 예를 들어 내담자를 지우면 그 회기, 과제, 질문이 모두 지워집니다. 각 칸의 설명은 `supabase/schema.sql`의 주석에 있습니다.

### 처음 만들기 (프로젝트당 한 번)

1. Supabase 대시보드 → **SQL Editor** → New query
2. `supabase/schema.sql` 전체를 붙여넣고 **Run**
3. (선택) 새 쿼리에 `supabase/seed.sql` 전체를 붙여넣고 **Run** → 데모 계정 `demo` / `demo1234`

`schema.sql`은 여러 번 실행해도 안전합니다.

### 테이블을 바꾸고 싶을 때

- `schema.sql` 맨 아래 "변경 기록"에 `alter table …` 문을 추가하고 SQL Editor에서 실행합니다.
- `src/server/database.types.ts`도 같은 모양으로 고칩니다. 고치지 않으면 빌드할 때 타입 오류로 알려 줍니다.
- 개발 중이라 데이터를 버려도 되면 `reset.sql` → `schema.sql` → `seed.sql` 순서로 실행해 처음부터 다시 만들 수 있습니다.

### 보안 구조

- 모든 테이블에 RLS(행 단위 접근 제한)를 켜고 허용 정책을 하나도 만들지 않았습니다. 그래서 공개 키(publishable)로는 아무것도 읽을 수 없습니다.
- Next.js 서버만 secret key로 접근합니다. 누가 무엇을 볼 수 있는지는 서버 코드가 매번 확인합니다.
- 회기 저장과 공유 확정은 DB 함수 `save_session` 하나로 처리합니다. 본문, 과제, 질문이 **한 번에 저장되거나 하나도 저장되지 않으므로** 중간에 실패해도 반쯤 저장된 상태가 생기지 않습니다.

## 6. Supabase 무료 플랜 주의사항

| 제한 | 영향 | 대응 |
|---|---|---|
| 7일 동안 사용이 적으면 **일시정지** | 시연 날 접속 불가 | 대시보드에서 **Resume project**를 누르면 몇 분 안에 복구됩니다(1년 안). 시연 전날 꼭 접속해 확인하세요. 배포 후 아래 자동 ping을 켜면 예방됩니다 |
| 자동 백업 없음 | 데이터 복구 불가 | 스키마와 시드는 git에 있고, 데이터는 합성이라 다시 만들면 됩니다 |
| DB 500MB, 전송량 월 5GB | 텍스트만 저장해서 캡스톤 규모로는 넉넉함 | — |
| 활성 프로젝트 2개 | 개발용/시연용 DB를 따로 두기 어려움 | 팀 전체가 DB 하나를 같이 씁니다. 테스트 계정은 아래 SQL로 정리하세요 |
| 직접 DB 연결(5432)은 IPv6 전용 | 학교·집 네트워크에서 psql 등이 안 될 수 있음 | SQL Editor를 쓰세요. 앱은 HTTPS(supabase-js)로 접속해서 상관없습니다 |

**자동 ping 켜기 (배포 후)**: GitHub 저장소 → Settings → Secrets and variables → Actions → Variables → `HEALTH_URL` = `https://<배포주소>/api/health`. 그러면 `.github/workflows/keep-supabase-awake.yml`이 매일 한 번 DB를 조회합니다.

**테스트 계정 정리** (`npm run test:api`가 만든 계정):

```sql
delete from public.counselors where username like 'apitest\_%';
```

## 7. 배포 (Vercel)

1. https://vercel.com → Add New → Project → 이 GitHub 저장소 Import (Framework: Next.js 자동 인식)
2. Environment Variables에 3장의 값을 넣습니다. 배포 환경에서는 `AI_MOCK=false`로 둡니다.
3. Deploy. 배포가 끝나면 `https://<주소>/api/health`가 `{"ok":true,…}`인지 확인합니다.
4. 점검: `BASE_URL=https://<주소> npm run test:api`

- 서버 위치는 `vercel.json`에서 **서울(icn1)**로 정해 두었습니다. Supabase도 서울이라 DB 왕복이 가장 짧습니다.
- Node.js 버전은 `package.json`의 `engines`(22.13 이상)를 따릅니다.
- QR 시연: localhost 주소는 휴대폰에서 열리지 않습니다. Vercel 주소로 시연하세요(SPEC 4장).
- **AI 비용은 배포에 넣은 키 주인이 냅니다.** 회원가입이 열려 있어 배포 주소를 아는 누구나 가입해 AI 정리를 쓸 수 있습니다. 학교 키는 월 크레딧이 떨어지면 AI 정리가 멈추고(402), OpenAI 키라면 사용 한도를 꼭 거세요 (platform.openai.com → Settings → Limits).

## 8. 기술 선택 메모 (왜 이렇게 만들었나)

| 선택 | 이유 |
|---|---|
| Next.js 16 Route Handlers로 REST API | 프론트와 백엔드의 경계가 `/api` 주소로 분명해서 나눠 작업하기 쉽고, 브라우저 없이 스크립트로 시험할 수 있음 |
| Supabase Auth 대신 자체 계정 + iron-session | SPEC 1장 결정. 이메일 인증 없이 아이디/비밀번호로 바로 가입 |
| DB 함수 `save_session` | supabase-js로는 여러 테이블 변경을 한 트랜잭션으로 묶을 수 없어서. "공유 확정은 원자적으로"(SPEC 3-D) |
| `cacheComponents` 끔 | create-next-app 16.4 기본값은 켜짐. 켜 두면 페이지에서 `cookies()`나 `params`를 `<Suspense>` 밖에서 읽을 때 **빌드 오류**가 나는데, AI 코딩 도구가 만드는 코드 대부분이 이 규칙을 모름. 이 앱은 화면마다 사람별 데이터라 캐시 이득도 거의 없음 |
| `middleware.ts`가 아니라 `src/proxy.ts` | Next.js 16에서 이름이 바뀜. 화면 이동용 1차 검사일 뿐이고, 데이터 보호는 각 API가 직접 함 |
| AI 모델 `gpt-6-luna` | 저렴하고(100만 토큰당 입력 $0.10) JSON 구조화 출력을 지원. `gpt-5-mini`/`gpt-5-nano`는 2026-12-11 서비스 종료 예정 |
| AI 키는 학교 게이트웨이(BAZE) 추천 | 학생 계정에 매달 크레딧이 나와 팀원 모두 결제 없이 씀. OpenAI와 호출 방식이 같아 주소만 바꾸면 되고, `gpt-6-luna`도 같은 이름으로 제공 |
| shadcn/ui Radix 기반 | 튜토리얼과 AI 코딩 도구가 가장 많이 아는 형태(`asChild` 등) |
| Supabase 서울 리전 + Vercel 서울 리전 | 파리 리전에서는 한국에서 DB 요청 1번에 약 0.8초가 걸렸음(측정) |

## 9. 점검 명령

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 (http://localhost:3000) |
| `npm run lint` | 코드 규칙 검사 |
| `npm run typecheck` | 타입 검사 (라우트 타입 생성 포함) |
| `npm run build` | 배포용 빌드. 환경변수 없이도 통과해야 정상 |
| `npm run test:api` | 백엔드 자동 점검 (서버가 켜져 있어야 함) |

## 10. 알려진 한계

- 회원가입이 누구에게나 열려 있습니다(SPEC 결정). 배포 주소가 퍼지면 모르는 사람이 가입할 수 있습니다.
- 요청 횟수 제한(rate limit)이 없습니다. AI 비용은 키의 한도(학교 월 크레딧, OpenAI 사용 한도)로만 막힙니다.
- 내담자 링크는 비밀번호와 같습니다. 링크가 새면 그 내담자의 공유 회기를 누구나 볼 수 있습니다. 내담자를 삭제하면 링크도 함께 막힙니다.
- 같은 이유로, 링크를 만든 상담사도 그 링크를 열면 내담자 화면(과제 체크·메모)을 볼 수 있습니다. 명세의 "상담사에게 보이지 않음"은 상담사 화면과 상담사 API에서 보여 주지 않는다는 뜻으로 구현했습니다. 진짜로 막으려면 내담자 로그인이 필요합니다(명세 범위 밖).
- 데모 계정(`demo`/`demo1234`)의 비밀번호가 이 공개 저장소에 적혀 있습니다. 데모 데이터는 모두 가짜입니다.
