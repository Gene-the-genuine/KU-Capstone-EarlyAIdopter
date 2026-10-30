# 백엔드 API 명세

프론트엔드가 백엔드를 부를 때 보는 문서입니다. 기능의 기준은 [SPEC.md](./SPEC.md)이고, 이 문서는 그 기능을 어떤 주소로 부르는지 정리합니다.

- **직접 `fetch`하지 말고 `src/lib/api.ts`의 함수를 쓰세요.** 주소와 응답 타입이 이미 맞춰져 있습니다.
- 응답 JSON의 정확한 모양(타입)은 `src/lib/types.ts`에 있습니다.
- 입력 규칙(글자 수 제한, 오류 문구)은 `src/lib/schemas.ts`에 있고, 프론트에서도 그대로 가져다 쓸 수 있습니다.

```tsx
"use client";
import { api, ApiError } from "@/lib/api";

try {
  const { clients } = await api.counselor.listClients();
} catch (error) {
  if (error instanceof ApiError) {
    if (error.status === 401) router.push("/login"); // 로그인이 풀림
    else setMessage(error.message); // 화면에 그대로 보여 줘도 되는 한국어 문장
  }
}
```

## 1. 공통 규칙

| 항목 | 규칙 |
|---|---|
| 주소 | 모두 `/api/...` (같은 도메인이라 CORS 설정 없음) |
| 형식 | 요청·응답 모두 JSON. 필드 이름은 camelCase |
| 날짜 | `"2026-10-29"` (YYYY-MM-DD). 화면에는 `2026.10.29`로 바꿔서 표시(DESIGN.md 3장) |
| 시각 | ISO 문자열 `"2026-10-29T06:00:00.123+00:00"` |
| 상담사 로그인 | 로그인하면 httpOnly 쿠키가 생깁니다. 브라우저가 자동으로 보내므로 프론트는 신경 쓸 것이 없습니다 |
| 내담자 접근 | 로그인 없음. URL의 `token`(내담자별 공유 토큰)으로 확인 |
| 상태 이름 | `draft` = **작성 중**, `shared` = **공유 완료** (화면 문구 통일) |

### 오류 응답

실패하면 항상 아래 모양으로 옵니다. `api.ts`가 이것을 `ApiError`로 바꿔 던집니다.

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "비밀번호가 일치하지 않습니다.", "field": "passwordConfirm" } }
```

| code | HTTP | 언제 | 화면 처리 예 |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | 입력값이 규칙에 어긋남. `field`에 입력칸 이름 | 그 입력칸 아래에 `message` 표시 |
| `INVALID_JSON` | 400 | body가 JSON이 아님 | (프론트 버그) |
| `UNAUTHORIZED` | 401 | 로그인이 필요함 | `/login`으로 이동 |
| `LOGIN_FAILED` | 401 | 아이디 또는 비밀번호가 틀림 | 로그인 폼에 `message` 표시 |
| `USERNAME_TAKEN` | 409 | 이미 있는 아이디 (`field: "username"`) | 아이디 칸 아래에 표시 |
| `NOT_FOUND` | 404 | 없거나 볼 권한이 없음. 내담자 링크가 틀렸거나 삭제됨 | 상담사: "찾을 수 없음" / 내담자: 접근 불가 화면 |
| `SESSION_LOCKED` | 409 | 공유 완료된 회기를 저장하거나 AI 정리하려 함 | 새로고침해서 읽기 전용 화면으로 |
| `SUMMARY_REQUIRED` | 400 | 공유하려는데 내담자용 요약이 비어 있음 (`field: "clientSummary"`) | 요약 칸에 표시 |
| `AI_FAILED` | 502 | AI 정리 실패 (네트워크·모델 오류) | `message` 표시 + 다시 시도 버튼. 입력값은 그대로 둠 |
| `AI_NOT_CONFIGURED` | 500 | 서버에 `OPENAI_API_KEY`가 없음 | 관리자에게 알림 |
| `SERVER_ERROR` | 500 / 0 | 그 밖의 서버 오류, 또는 서버에 연결 못 함(status 0) | `message` 표시 |

## 2. 한눈에 보기

| 화면 | 함수 (`src/lib/api.ts`) | 메서드·주소 | 로그인 |
|---|---|---|---|
| 회원가입 | `api.auth.signup(input)` | `POST /api/auth/signup` | |
| 로그인 | `api.auth.login(input)` | `POST /api/auth/login` | |
| 공통 | `api.auth.logout()` | `POST /api/auth/logout` | |
| 공통 | `api.auth.me()` | `GET /api/auth/me` | 필요 |
| 대시보드 | `api.counselor.listClients()` | `GET /api/counselor/clients` | 필요 |
| 대시보드 | `api.counselor.addClient(input)` | `POST /api/counselor/clients` | 필요 |
| 대시보드 | `api.counselor.getClient(clientId)` | `GET /api/counselor/clients/{clientId}` | 필요 |
| 대시보드 | `api.counselor.deleteClient(clientId)` | `DELETE /api/counselor/clients/{clientId}` | 필요 |
| 대시보드 | `api.counselor.createSession(clientId)` | `POST /api/counselor/clients/{clientId}/sessions` | 필요 |
| 회기 페이지 | `api.counselor.getSession(clientId, sessionId)` | `GET /api/counselor/clients/{clientId}/sessions/{sessionId}` | 필요 |
| 회기 페이지 | `api.counselor.saveSession(clientId, sessionId, content)` | `PUT …/sessions/{sessionId}` | 필요 |
| 회기 페이지 | `api.counselor.shareSession(clientId, sessionId, content)` | `POST …/sessions/{sessionId}/share` | 필요 |
| 회기 페이지 | `api.counselor.summarize(clientId, sessionId, sourceText)` | `POST …/sessions/{sessionId}/ai` | 필요 |
| 내담자 홈 | `api.client.getHome(token)` | `GET /api/client/{token}` | |
| 내담자 회기 | `api.client.getSession(token, sessionId)` | `GET /api/client/{token}/sessions/{sessionId}` | |
| 내담자 회기 | `api.client.setActionItemCompleted(token, sessionId, itemId, isCompleted)` | `PATCH /api/client/{token}/sessions/{sessionId}/action-items/{itemId}` | |
| 내담자 회기 | `api.client.saveAnswers(token, sessionId, answers)` | `PUT /api/client/{token}/sessions/{sessionId}/answers` | |
| (점검용) | — | `GET /api/health` | |

API 주소는 페이지 주소 앞에 `/api`를 붙인 모양입니다. 예를 들어 페이지 `/counselor/clients/{clientId}/sessions/{sessionId}`의 데이터는 `/api/counselor/clients/{clientId}/sessions/{sessionId}`에서 옵니다.

## 3. 상담사 계정

### 회원가입 `POST /api/auth/signup`

가입만 하고 **로그인은 하지 않습니다.** 성공하면 `/login`으로 이동하면서 성공 문구를 보여 주세요(SPEC 3-B).

```json
// 요청
{ "username": "kim", "password": "password1234", "passwordConfirm": "password1234" }
// 201 응답
{ "counselor": { "id": "8d1c…", "username": "kim" } }
```

검사: 아이디 1~30자(앞뒤 공백 제거), 비밀번호 8자 이상, 비밀번호 확인 일치, 중복 아이디(409). 이메일·본인인증은 없습니다.

### 로그인 `POST /api/auth/login`

```json
// 요청
{ "username": "kim", "password": "password1234" }
// 200 응답 (+ 로그인 쿠키, 7일 유지)
{ "counselor": { "id": "8d1c…", "username": "kim" } }
```

틀리면 401 `LOGIN_FAILED`. 아이디가 없는지 비밀번호가 틀렸는지는 구분하지 않습니다.

### 로그아웃 `POST /api/auth/logout` → `{ "ok": true }`

### 현재 상담사 `GET /api/auth/me` → `{ "counselor": { "id", "username" } }` (로그인 안 했으면 401)

## 4. 상담사: 내담자

### 목록 `GET /api/counselor/clients`

로그인한 상담사의 내담자만, 등록한 순서대로 옵니다. **각 내담자의 회기 목록이 함께 들어 있어서** 대시보드는 이것 하나로 왼쪽 목록과 오른쪽 상세를 모두 그릴 수 있습니다.

```json
{
  "clients": [
    {
      "id": "c1…",
      "name": "김하늘",
      "birthDate": "1998-03-14",
      "purposeNote": "취업 준비 스트레스와 수면 문제",
      "shareToken": "x8Jq…",
      "createdAt": "2026-10-29T03:00:00+00:00",
      "sessions": [
        { "id": "s1…", "sessionNumber": 1, "sessionDate": "2026-10-13", "status": "shared", "sharedAt": "2026-10-13T06:00:00+00:00" },
        { "id": "s3…", "sessionNumber": 3, "sessionDate": "2026-10-27", "status": "draft", "sharedAt": null }
      ]
    }
  ]
}
```

`sessions`는 회기 번호 순입니다. 비어 있으면 "아직 회기가 없습니다" 같은 빈 상태와 `새 회기 생성` 버튼을 보여 주세요(SPEC 3-D).

### 추가 `POST /api/counselor/clients`

```json
// 요청 (purposeNote 는 생략 가능)
{ "name": "김하늘", "birthDate": "1998-03-14", "purposeNote": "취업 준비 스트레스" }
// 201 응답: 위 목록의 한 항목과 같은 모양 (sessions: [])
{ "client": { "id": "…", "name": "김하늘", "…": "…", "sessions": [] } }
```

검사: 이름 1~50자, 생년월일은 1900-01-01부터 오늘(한국 날짜)까지, 목적 메모 1,000자 이하.

### 한 명 `GET /api/counselor/clients/{clientId}` → `{ "client": { … } }` (목록 항목과 같은 모양)

### 삭제 `DELETE /api/counselor/clients/{clientId}` → `{ "ok": true }`

그 내담자의 회기·과제·질문이 모두 지워지고, 내담자 링크도 바로 막힙니다. 프론트는 반드시 확인 모달(`AlertDialog`)을 먼저 띄우세요(SPEC 7장).

## 5. 상담사: 회기

### 새 회기 만들기 `POST /api/counselor/clients/{clientId}/sessions`

body 없음. 빈 **작성 중** 회기를 DB에 만들고 돌려줍니다. 응답의 `session.id`로 회기 페이지로 이동하세요. 회기 번호는 그 내담자의 마지막 번호 + 1이고, 날짜는 한국 날짜로 오늘입니다. 작성 중 회기가 있어도 새 회기를 또 만들 수 있습니다.

```json
// 201 응답: 아래 "회기 상세"와 같은 모양
{ "session": { "id": "s4…", "sessionNumber": 4, "status": "draft", "sessionDate": "2026-10-29", "sourceText": "", "…": "…" } }
```

### 회기 상세 `GET /api/counselor/clients/{clientId}/sessions/{sessionId}`

```json
{
  "session": {
    "id": "s1…",
    "sessionNumber": 1,
    "status": "shared",
    "sessionDate": "2026-10-13",
    "sourceText": "상담사: 요즘 어떻게 지내셨어요? …",
    "counselorNote": "주제: …",
    "clientSummary": "이번 상담에서는 …",
    "actionItems": ["밤 11시 이후 휴대폰을 거실에 두고 자기", "채용 공고는 오전에 30분만 확인하기"],
    "preparationQuestions": ["공고를 확인하지 않았을 때 실제로 놓친 일이 있었나요?"],
    "createdAt": "2026-10-13T05:00:00+00:00",
    "sharedAt": "2026-10-13T06:00:00+00:00",
    "sharePath": "/client/x8Jq…/sessions/s1…",
    "client": { "id": "c1…", "name": "김하늘", "birthDate": "1998-03-14", "purposeNote": "취업 준비 …" }
  }
}
```

- `status`가 `shared`이면 **같은 화면을 읽기 전용으로** 그리세요. 저장, AI 정리, 공유 버튼을 숨기고 `공유 링크 보기` 버튼만 남깁니다.
- `sharePath`는 공유 완료일 때만 값이 있습니다. 전체 주소는 `shareUrl(session.sharePath)`(= `window.location.origin + sharePath`)로 만들고, 이 주소로 복사 버튼과 `qrcode.react`의 QR을 만듭니다(SPEC 4장).
- 내담자의 과제 완료 여부와 메모는 **일부러 넣지 않았습니다**(SPEC 2장: 내담자만 확인).

### 임시 저장 `PUT /api/counselor/clients/{clientId}/sessions/{sessionId}`

화면의 **모든 입력**을 한 번에 보냅니다. 응답은 저장된 회기 상세(위와 같은 모양)입니다.

```json
{
  "sessionDate": "2026-10-29",
  "sourceText": "상담 원문 …",
  "counselorNote": "상담사용 기록 …",
  "clientSummary": "내담자용 요약 …",
  "actionItems": ["과제1", "과제2"],
  "preparationQuestions": ["질문1", "질문2"]
}
```

- 과제와 질문은 화면 순서대로 문자열 배열로 보냅니다. 앞뒤 공백은 지워지고 **빈 줄은 저장되지 않습니다.** 저장 후에는 응답으로 화면 상태를 맞추세요.
- 제한: 원문 50,000자, 상담사 기록 20,000자, 요약 5,000자, 과제·질문 각 20개, 한 줄 300자.
- 공유 완료된 회기는 409 `SESSION_LOCKED`입니다.
- 저장하지 않고 페이지를 떠나면 바뀐 내용이 사라집니다. `beforeunload` 경고를 띄워 주세요(SPEC 3-D).

### 공유 확정 `POST /api/counselor/clients/{clientId}/sessions/{sessionId}/share`

body는 임시 저장과 같습니다. **저장과 공유가 한 번에 처리됩니다.** 중간에 실패하면 아무것도 바뀌지 않습니다.

```json
// 200 응답
{ "session": { "…": "회기 상세", "status": "shared", "sharePath": "/client/x8Jq…/sessions/s1…" }, "alreadyShared": false }
```

- 내담자용 요약이 비어 있으면 400 `SUMMARY_REQUIRED`.
- 이미 공유된 회기면 **아무것도 저장하지 않고** 기존 링크를 돌려줍니다(`alreadyShared: true`, SPEC 7장).
- 프론트 흐름: 확인 모달 → 이 API → 공유 링크/QR 모달.

### AI 정리 `POST /api/counselor/clients/{clientId}/sessions/{sessionId}/ai`

```json
// 요청: 지금 화면 textarea 에 있는 원문 (저장 안 된 내용이어도 됨)
{ "sourceText": "상담사: … 내담자: …" }
// 200 응답
{
  "result": {
    "counselorNote": "주제: …\n주요 내용: …\n합의사항: …",
    "clientSummary": "이번 상담에서는 …했어요. …",
    "actionItems": ["자기 전 5분 호흡 연습"],
    "preparationQuestions": ["긴장이 줄어든 순간은 언제였나요?", "…"]
  }
}
```

- **결과는 DB에 저장되지 않습니다.** 화면의 네 칸에 채워 넣고, 상담사가 검토한 뒤 `임시 저장`이나 `공유 확정`을 눌러야 저장됩니다(SPEC 6장).
- 원문이 비었거나 공백뿐이면 400입니다. 프론트에서 먼저 막고 안내하세요.
- 다시 정리하면 수동으로 고친 내용까지 덮어씁니다. 프론트에서 **확인 모달을 반드시** 띄우세요(SPEC 3-D).
- 기다리는 동안 버튼을 `disabled` + 스피너 + "정리하는 중…"으로 바꾸세요. 실패(502 `AI_FAILED`)하면 입력값은 그대로 두고 다시 시도 버튼을 보여 줍니다.
- 응답까지 보통 수 초 걸립니다. 서버 설정이 `AI_MOCK=true`이면 1초 뒤 예시 결과가 옵니다.
- AI에는 원문만 보냅니다. 이전 회기, 생년월일, 상담 목적, 내담자 메모는 보내지 않습니다.
- 서버가 학교 AI 키를 쓰면 원문의 전화번호·이메일·생년월일 등이 `[PHONE]`, `[EMAIL]`, `[DATE-OF-BIRTH]`처럼 가려진 채 AI에 전달되어, 결과에도 이 표시가 나올 수 있습니다. 상담사가 검토할 때 고치면 됩니다.

## 6. 내담자 화면 (로그인 없음)

내담자에게는 **공유 완료 회기만** 보입니다. 상담 원문, 상담사용 기록, 상담 목적 메모는 응답에 아예 들어 있지 않습니다. 토큰이 틀렸거나, 내담자가 삭제됐거나, 작성 중인 회기면 모두 같은 404가 옵니다(이유를 구분해서 보여 주지 않음, DESIGN.md `client-invalid.html`).

### 내담자 홈 `GET /api/client/{token}`

```json
{
  "client": { "name": "김하늘", "birthDate": "1998-03-14" },
  "sessions": [
    { "id": "s1…", "sessionNumber": 1, "sessionDate": "2026-10-13", "clientSummary": "이번 상담에서는 …", "actionItemCount": 2, "completedActionItemCount": 1 }
  ]
}
```

`sessions`는 날짜 순이고, 같은 날짜면 회기 번호 순입니다. 카드에는 요약 첫 줄(`line-clamp`)과 과제 진행률(`completedActionItemCount / actionItemCount`)을 보여 줍니다.

### 내담자 회기 상세 `GET /api/client/{token}/sessions/{sessionId}`

```json
{
  "client": { "name": "김하늘", "birthDate": "1998-03-14" },
  "session": {
    "id": "s1…",
    "sessionNumber": 1,
    "sessionDate": "2026-10-13",
    "clientSummary": "이번 상담에서는 …",
    "actionItems": [{ "id": "a1…", "title": "밤 11시 이후 휴대폰을 거실에 두고 자기", "isCompleted": true }],
    "preparationQuestions": [{ "id": "q1…", "question": "공고를 확인하지 않았을 때 …?", "clientAnswer": "생각해 보니 아직은 없었어요." }]
  },
  "prevSessionId": null,
  "nextSessionId": "s2…"
}
```

`prevSessionId`와 `nextSessionId`는 공유 완료 회기 사이에서만 움직입니다. `null`이면 그 방향 버튼을 숨기거나 `disabled`로 두세요.

### 과제 체크 `PATCH /api/client/{token}/sessions/{sessionId}/action-items/{itemId}`

체크박스를 누르는 **즉시** 부르세요.

```json
// 요청
{ "isCompleted": true }
// 200 응답
{ "actionItem": { "id": "a1…", "title": "…", "isCompleted": true } }
```

### 메모 저장 `PUT /api/client/{token}/sessions/{sessionId}/answers`

`메모 저장` 버튼 하나로 여러 질문의 메모를 **한 번에** 보냅니다.

```json
// 요청
{ "answers": [{ "questionId": "q1…", "answer": "제 생각은 …" }, { "questionId": "q2…", "answer": "" }] }
// 200 응답: 그 회기의 질문 전체 (저장된 값)
{ "preparationQuestions": [{ "id": "q1…", "question": "…", "clientAnswer": "제 생각은 …" }, { "id": "q2…", "question": "…", "clientAnswer": "" }] }
```

메모는 한 칸에 2,000자까지 쓸 수 있습니다. 다른 회기의 질문 ID가 섞여 있으면 400입니다.

## 7. 상태 확인 `GET /api/health`

서버와 DB가 살아 있는지 확인합니다. `{ "ok": true, "checkedAt": "…" }`. 배포 확인과 Supabase 무료 플랜 일시정지 예방(README 참고)에 씁니다.
