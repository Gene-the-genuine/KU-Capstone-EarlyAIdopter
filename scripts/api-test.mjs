/**
 * 백엔드 자동 점검 — docs/SPEC.md 10장 "MVP 완료 검증 시나리오"를 API 로 그대로 따라 합니다.
 *
 *   1) 서버 켜기:   npm run dev
 *   2) 다른 터미널: npm run test:api
 *      (배포 주소를 점검하려면  BASE_URL=https://내-앱.vercel.app npm run test:api)
 *
 * - 실행할 때마다 apitest_ 로 시작하는 새 상담사 계정 2개를 만들고, 만든 내담자는 끝에 지웁니다.
 *   쌓인 테스트 계정을 지우려면 Supabase SQL Editor 에서:
 *     delete from public.counselors where username like 'apitest\_%';
 * - AI 정리는 서버 설정대로 동작합니다(AI_MOCK=true 면 예시 결과, 아니면 실제 AI 호출 1~2회. 학교 키면 회당 약 5~6 크레딧).
 */

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const run = crypto.randomUUID().slice(0, 8); // 여러 명이 동시에 돌려도 계정 이름이 겹치지 않게

let passed = 0;
const failures = [];

/** 다음 단계에 꼭 필요한 값이 없으면 점검을 멈춥니다. (그 뒤 항목은 의미가 없으므로) */
function must(value, label) {
  if (!value) throw new Error(`필수 단계 실패: ${label} — 이후 항목은 건너뜁니다.`);
  return value;
}

function check(label, condition, detail) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(label);
    console.log(`  ✗ ${label}${detail === undefined ? "" : `\n      → ${JSON.stringify(detail).slice(0, 400)}`}`);
  }
}

function step(title) {
  console.log(`\n${title}`);
}

/** 브라우저처럼 쿠키를 기억하는 작은 클라이언트 */
function createAgent() {
  let cookie = "";
  async function call(method, path, body) {
    const response = await fetch(BASE_URL + path, {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
    });
    for (const setCookie of response.headers.getSetCookie()) {
      const pair = setCookie.split(";")[0];
      const [name, value] = [pair.slice(0, pair.indexOf("=")), pair.slice(pair.indexOf("=") + 1)];
      const others = cookie.split("; ").filter((c) => c && !c.startsWith(`${name}=`));
      cookie = (value ? [...others, `${name}=${value}`] : others).join("; ");
    }
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: response.status, json, headers: response.headers };
  }
  return { call };
}

/** 응답 JSON 어디에도 이 키가 없어야 함 (내담자에게 숨겨야 하는 정보) */
function findKeys(value, keys, path = "$") {
  if (Array.isArray(value)) return value.flatMap((v, i) => findKeys(v, keys, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => [
      ...(keys.includes(k) ? [`${path}.${k}`] : []),
      ...findKeys(v, keys, `${path}.${k}`),
    ]);
  }
  return [];
}

const SECRET_FOR_CLIENT = ["sourceText", "counselorNote", "purposeNote", "source_text", "counselor_note", "purpose_note", "shareToken"];
const SECRET_FOR_COUNSELOR = ["isCompleted", "clientAnswer", "is_completed", "client_answer"];

const todayKorea = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());

const SOURCE_TEXT = `상담사: 이번 주는 어떻게 지내셨어요?
내담자: 발표 준비 때문에 계속 긴장했어요. 밤에 잠이 잘 안 와요.
상담사: 긴장될 때 몸에서 어떤 변화가 느껴지나요?
내담자: 어깨가 굳고 숨이 짧아져요.
상담사: 다음 상담까지 자기 전에 5분 동안 천천히 숨 쉬는 연습을 해 보기로 해요.
내담자: 네, 해 볼게요.`;

async function main() {
  console.log(`백엔드 자동 점검 → ${BASE_URL}`);

  const health = await fetch(`${BASE_URL}/api/health`).catch(() => null);
  if (!health) {
    console.error(`\n서버에 연결할 수 없습니다. 먼저 'npm run dev' 로 서버를 켜 주세요. (${BASE_URL})`);
    process.exit(1);
  }
  check("상태 확인 /api/health → 200 (서버와 DB 연결)", health.status === 200, await health.json().catch(() => null));

  const a = createAgent(); // 상담사 A
  const b = createAgent(); // 상담사 B (데이터 분리 확인용)
  const guest = createAgent(); // 로그인 안 한 사람 / 내담자
  const userA = { username: `apitest_${run}_a`, password: "password-a-1234" };
  const userB = { username: `apitest_${run}_b`, password: "password-b-1234" };
  const createdClientIds = []; // 끝나면(실패해도) 지움

  try {
    await scenario({ a, b, guest, userA, userB, createdClientIds });
  } finally {
    for (const clientId of createdClientIds) {
      await a.call("DELETE", `/api/counselor/clients/${clientId}`).catch(() => {});
    }
  }

  console.log(`\n결과: 통과 ${passed}개, 실패 ${failures.length}개`);
  if (failures.length > 0) {
    console.log("실패한 항목:\n" + failures.map((f) => `  - ${f}`).join("\n"));
    process.exit(1);
  }
}

async function scenario({ a, b, guest, userA, userB, createdClientIds }) {
  // ── 1 ──────────────────────────────────────────────────────────
  step("1. 회원가입 → 로그인 → 로그아웃 → 재로그인");
  let r = await a.call("POST", "/api/auth/signup", { ...userA, passwordConfirm: userA.password });
  check("회원가입 → 201", r.status === 201 && r.json?.counselor?.username === userA.username, r.json);
  r = await a.call("POST", "/api/auth/signup", { ...userA, passwordConfirm: userA.password });
  check("같은 아이디로 다시 가입 → 409 USERNAME_TAKEN", r.status === 409 && r.json?.error?.code === "USERNAME_TAKEN", r.json);
  r = await a.call("POST", "/api/auth/signup", { username: `apitest_${run}_x`, password: "12345678", passwordConfirm: "87654321" });
  check("비밀번호 확인 불일치 → 400 (field: passwordConfirm)", r.status === 400 && r.json?.error?.field === "passwordConfirm", r.json);
  r = await a.call("POST", "/api/auth/signup", { username: `apitest_${run}_y`, password: "short", passwordConfirm: "short" });
  check("비밀번호 8자 미만 → 400 (field: password)", r.status === 400 && r.json?.error?.field === "password", r.json);
  r = await a.call("GET", "/api/auth/me");
  check("가입만 하고 로그인 전 → /me 401", r.status === 401, r.json);
  r = await a.call("POST", "/api/auth/login", { username: userA.username, password: "wrong-password" });
  check("틀린 비밀번호 → 401 LOGIN_FAILED", r.status === 401 && r.json?.error?.code === "LOGIN_FAILED", r.json);
  r = await a.call("POST", "/api/auth/login", userA);
  check("로그인 → 200", r.status === 200 && r.json?.counselor?.username === userA.username, r.json);
  r = await a.call("GET", "/api/auth/me");
  check("로그인 후 /me → 200", r.status === 200 && r.json?.counselor?.username === userA.username, r.json);
  r = await a.call("POST", "/api/auth/logout");
  check("로그아웃 → 200", r.status === 200, r.json);
  r = await a.call("GET", "/api/auth/me");
  check("로그아웃 후 /me → 401", r.status === 401, r.json);
  r = await a.call("POST", "/api/auth/login", userA);
  check("재로그인 → 200", r.status === 200, r.json);
  r = await guest.call("GET", "/counselor");
  check("로그인 안 하고 /counselor 페이지 → /login 으로 이동", [302, 303, 307, 308].includes(r.status) && (r.headers.get("location") ?? "").includes("/login"), { status: r.status, location: r.headers.get("location") });

  // ── 2 ──────────────────────────────────────────────────────────
  step("2. 내담자 A·B 만들기, 상담사끼리 데이터 분리");
  r = await a.call("POST", "/api/counselor/clients", { name: "테스트 내담자A", birthDate: "1999-05-01", purposeNote: "  시험 불안  " });
  const clientA = r.json?.client;
  check("내담자 A 추가 → 201 (목적 메모 앞뒤 공백 제거)", r.status === 201 && clientA?.purposeNote === "시험 불안" && clientA?.sessions?.length === 0, r.json);
  createdClientIds.push(must(clientA?.id, "내담자 A 추가"));
  r = await a.call("POST", "/api/counselor/clients", { name: "테스트 내담자B", birthDate: "2000-01-31" });
  const clientB = r.json?.client;
  check("내담자 B 추가(목적 메모 없이) → 201, purposeNote null", r.status === 201 && clientB?.purposeNote === null, r.json);
  createdClientIds.push(must(clientB?.id, "내담자 B 추가"));
  r = await a.call("POST", "/api/counselor/clients", { name: "미래인", birthDate: "2999-01-01" });
  check("생년월일이 미래 → 400", r.status === 400 && r.json?.error?.field === "birthDate", r.json);
  r = await a.call("GET", "/api/counselor/clients");
  check("A 의 내담자 목록 = 2명", r.status === 200 && r.json?.clients?.length === 2, r.json);
  r = await b.call("POST", "/api/auth/signup", { ...userB, passwordConfirm: userB.password });
  r = await b.call("POST", "/api/auth/login", userB);
  check("상담사 B 가입·로그인", r.status === 200, r.json);
  r = await b.call("GET", "/api/counselor/clients");
  check("B 의 내담자 목록 = 0명 (A 의 내담자가 안 보임)", r.status === 200 && r.json?.clients?.length === 0, r.json);
  r = await b.call("GET", `/api/counselor/clients/${clientA.id}`);
  check("B 가 A 의 내담자를 직접 조회 → 404", r.status === 404, r.json);
  r = await b.call("DELETE", `/api/counselor/clients/${clientA.id}`);
  check("B 가 A 의 내담자를 삭제 시도 → 404 (삭제 안 됨)", r.status === 404, r.json);
  r = await guest.call("GET", "/api/counselor/clients");
  check("로그인 안 하고 상담사 API → 401", r.status === 401 && r.json?.error?.code === "UNAUTHORIZED", r.json);
  r = await a.call("GET", "/api/counselor/clients/not-a-uuid");
  check("잘못된 ID 모양 → 404 (500 아님)", r.status === 404, r.json);

  // ── 3 ──────────────────────────────────────────────────────────
  step("3. A 의 1회기: 생성 → AI 정리 → 수정 → 임시 저장 → 다시 불러와도 유지");
  r = await a.call("POST", `/api/counselor/clients/${clientA.id}/sessions`);
  const s1 = r.json?.session;
  check("1회기 생성 → 201, 번호 1, 작성 중, 날짜 = 오늘(한국)", r.status === 201 && s1?.sessionNumber === 1 && s1?.status === "draft" && s1?.sessionDate === todayKorea, r.json);
  must(s1?.id, "1회기 생성");
  const base1 = `/api/counselor/clients/${clientA.id}/sessions/${s1.id}`;
  r = await a.call("POST", `${base1}/ai`, { sourceText: "   " });
  check("원문이 공백뿐이면 AI 요청 거절 → 400", r.status === 400 && r.json?.error?.field === "sourceText", r.json);
  r = await a.call("POST", `${base1}/ai`, { sourceText: SOURCE_TEXT });
  const ai = r.json?.result;
  const aiShapeOk =
    r.status === 200 &&
    typeof ai?.counselorNote === "string" && ai.counselorNote.length > 0 &&
    typeof ai?.clientSummary === "string" && ai.clientSummary.length > 0 &&
    Array.isArray(ai?.actionItems) && Array.isArray(ai?.preparationQuestions);
  check("AI 정리 → 200, 4개 항목 JSON", aiShapeOk, r.json);
  if (ai) console.log(`      (AI 결과 미리보기) 요약: ${ai.clientSummary.slice(0, 60)}… / 과제 ${ai.actionItems.length}개 / 질문 ${ai.preparationQuestions.length}개`);
  r = await a.call("GET", base1);
  check("AI 결과는 자동 저장되지 않음 (상담사 기록 빈 값 유지)", r.status === 200 && r.json?.session?.counselorNote === "", r.json);

  const content1 = {
    sessionDate: "2026-10-20",
    sourceText: SOURCE_TEXT,
    counselorNote: `${ai?.counselorNote ?? "기록"}\n(상담사가 직접 고친 문장)`,
    clientSummary: "이번 상담에서는 발표 준비로 긴장된 마음을 이야기했어요.",
    actionItems: ["자기 전 5분 호흡 연습", "  ", "발표 전날 일찍 자기  "],
    preparationQuestions: ["긴장이 줄어든 순간은 언제였나요?", "나를 편하게 해 주는 것은 무엇인가요?"],
  };
  r = await a.call("PUT", base1, content1);
  check("임시 저장 → 200, 빈 줄 과제는 빠지고 공백은 정리됨", r.status === 200 && JSON.stringify(r.json?.session?.actionItems) === JSON.stringify(["자기 전 5분 호흡 연습", "발표 전날 일찍 자기"]), r.json);
  r = await a.call("GET", base1);
  const saved1 = r.json?.session;
  check("다시 불러와도 날짜·기록·요약·과제·질문 유지 (회기 번호는 그대로 1)",
    saved1?.sessionDate === "2026-10-20" && saved1?.counselorNote === content1.counselorNote && saved1?.clientSummary === content1.clientSummary &&
    saved1?.preparationQuestions?.length === 2 && saved1?.sessionNumber === 1, saved1);
  r = await a.call("PUT", base1, { ...content1, actionItems: Array.from({ length: 21 }, (_, i) => `과제${i}`) });
  check("과제 21개 → 400", r.status === 400 && r.json?.error?.field === "actionItems", r.json);
  r = await b.call("GET", base1);
  check("상담사 B 가 A 의 회기 조회 → 404", r.status === 404, r.json);
  r = await b.call("PUT", base1, content1);
  check("상담사 B 가 A 의 회기 저장 시도 → 404", r.status === 404, r.json);

  // ── 4 ──────────────────────────────────────────────────────────
  step("4. 2회기를 작성 중으로 둔 채 3회기 생성 (각자 고유 번호·주소)");
  r = await a.call("POST", `/api/counselor/clients/${clientA.id}/sessions`);
  const s2 = r.json?.session;
  r = await a.call("POST", `/api/counselor/clients/${clientA.id}/sessions`);
  const s3 = r.json?.session;
  check("회기 번호 1·2·3, ID 모두 다름", s2?.sessionNumber === 2 && s3?.sessionNumber === 3 && new Set([s1.id, s2?.id, s3?.id]).size === 3, { s2, s3 });
  must(s2?.id && s3?.id, "2·3회기 생성");
  const [p1, p2] = await Promise.all([
    a.call("POST", `/api/counselor/clients/${clientB.id}/sessions`),
    a.call("POST", `/api/counselor/clients/${clientB.id}/sessions`),
  ]);
  check("같은 내담자에 회기 2개를 동시에 만들어도 번호가 겹치지 않음 (1, 2)",
    p1.status === 201 && p2.status === 201 && [p1.json.session.sessionNumber, p2.json.session.sessionNumber].sort().join() === "1,2", [p1.json, p2.json]);
  r = await a.call("GET", `/api/counselor/clients/${clientA.id}`);
  check("대시보드 회기 목록: 1·2·3 순서, 모두 작성 중", JSON.stringify(r.json?.client?.sessions?.map((s) => [s.sessionNumber, s.status])) === JSON.stringify([[1, "draft"], [2, "draft"], [3, "draft"]]), r.json);

  // ── 5 ──────────────────────────────────────────────────────────
  step("5. 2회기만 다시 정리·저장 → 다른 회기는 그대로");
  const base2 = `/api/counselor/clients/${clientA.id}/sessions/${s2.id}`;
  const base3 = `/api/counselor/clients/${clientA.id}/sessions/${s3.id}`;
  r = await a.call("PUT", base2, { ...content1, sessionDate: todayKorea, clientSummary: "2회기 요약", actionItems: ["2회기 과제"], preparationQuestions: [] });
  check("2회기 저장 → 200", r.status === 200, r.json);
  r = await a.call("GET", base1);
  check("1회기 내용은 바뀌지 않음", r.json?.session?.clientSummary === content1.clientSummary, r.json);
  r = await a.call("GET", base3);
  check("3회기 내용은 바뀌지 않음 (빈 상태)", r.json?.session?.clientSummary === "" && r.json?.session?.actionItems?.length === 0, r.json);

  // ── 6 ──────────────────────────────────────────────────────────
  step("6. 1회기 공유 확정 → 링크 발급 → 읽기 전용");
  r = await a.call("POST", `${base3}/share`, { ...content1, clientSummary: "   " });
  check("요약 없이 공유 → 400 SUMMARY_REQUIRED", r.status === 400 && r.json?.error?.code === "SUMMARY_REQUIRED", r.json);
  r = await a.call("POST", `${base1}/share`, content1);
  const shared1 = r.json?.session;
  const sharePath = shared1?.sharePath ?? "";
  check("공유 확정 → 200, 공유 완료, sharePath 발급", r.status === 200 && shared1?.status === "shared" && r.json?.alreadyShared === false && sharePath.startsWith(`/client/${clientA.shareToken}/sessions/${s1.id}`), r.json);
  r = await a.call("POST", `${base1}/share`, { ...content1, clientSummary: "바뀌면 안 되는 요약" });
  check("다시 공유 → 저장 없이 기존 링크 (alreadyShared: true)", r.status === 200 && r.json?.alreadyShared === true && r.json?.session?.sharePath === sharePath && r.json?.session?.clientSummary === content1.clientSummary, r.json);
  r = await a.call("PUT", base1, content1);
  check("공유된 회기 임시 저장 → 409 SESSION_LOCKED", r.status === 409 && r.json?.error?.code === "SESSION_LOCKED", r.json);
  r = await a.call("POST", `${base1}/ai`, { sourceText: SOURCE_TEXT });
  check("공유된 회기 AI 정리 → 409 SESSION_LOCKED", r.status === 409 && r.json?.error?.code === "SESSION_LOCKED", r.json);
  r = await a.call("GET", base1);
  check("공유 후에도 상담사는 원문·상담사 기록을 볼 수 있음", r.json?.session?.sourceText === SOURCE_TEXT && r.json?.session?.counselorNote === content1.counselorNote, r.json);

  // ── 7 ──────────────────────────────────────────────────────────
  step("7. 내담자 링크: 공유된 내용만 보이고 상담사 정보는 안 보임");
  const token = clientA.shareToken;
  r = await guest.call("GET", `/api/client/${token}`);
  check("내담자 홈 → 이름·생년월일 + 공유 회기 1개", r.status === 200 && r.json?.client?.name === "테스트 내담자A" && r.json?.client?.birthDate === "1999-05-01" && r.json?.sessions?.length === 1, r.json);
  check("내담자 홈 응답에 원문·상담사 기록·목적 메모 없음", findKeys(r.json, SECRET_FOR_CLIENT).length === 0, findKeys(r.json, SECRET_FOR_CLIENT));
  r = await guest.call("GET", `/api/client/${token}/sessions/${s1.id}`);
  const view1 = r.json?.session;
  check("내담자 회기 상세 → 요약·과제 2개·질문 2개", r.status === 200 && view1?.clientSummary === content1.clientSummary && view1?.actionItems?.length === 2 && view1?.preparationQuestions?.length === 2, r.json);
  must(view1?.actionItems?.length && view1?.preparationQuestions?.length, "내담자 회기 상세 조회");
  check("내담자 회기 상세에 원문·상담사 기록·목적 메모 없음", findKeys(r.json, SECRET_FOR_CLIENT).length === 0, findKeys(r.json, SECRET_FOR_CLIENT));
  check("공유 회기가 1개뿐이라 이전/다음 없음", r.json?.prevSessionId === null && r.json?.nextSessionId === null, r.json);
  r = await guest.call("GET", `/api/client/wrong-token-1234567890/sessions/${s1.id}`);
  check("틀린 토큰 → 404", r.status === 404, r.json);
  r = await guest.call("GET", `/api/client/${clientB.shareToken}/sessions/${s1.id}`);
  check("다른 내담자의 토큰으로 A 의 회기 → 404", r.status === 404, r.json);

  // ── 8 ──────────────────────────────────────────────────────────
  step("8. 내담자가 과제 체크·메모 저장 → 유지, 상담사에게는 안 보임");
  const item = view1.actionItems[0];
  r = await guest.call("PATCH", `/api/client/${token}/sessions/${s1.id}/action-items/${item.id}`, { isCompleted: true });
  check("과제 체크 → 200, isCompleted true", r.status === 200 && r.json?.actionItem?.isCompleted === true, r.json);
  const answers = view1.preparationQuestions.map((q, i) => ({ questionId: q.id, answer: `내 메모 ${i + 1}` }));
  r = await guest.call("PUT", `/api/client/${token}/sessions/${s1.id}/answers`, { answers });
  check("메모 저장 → 200", r.status === 200 && r.json?.preparationQuestions?.[0]?.clientAnswer === "내 메모 1", r.json);
  r = await guest.call("PUT", `/api/client/${token}/sessions/${s1.id}/answers`, { answers: [{ questionId: "00000000-0000-4000-8000-000000000000", answer: "x" }] });
  check("이 회기에 없는 질문 ID 로 메모 → 400", r.status === 400, r.json);
  r = await guest.call("GET", `/api/client/${token}/sessions/${s1.id}`);
  check("새로고침 후에도 체크·메모 유지", r.json?.session?.actionItems?.[0]?.isCompleted === true && r.json?.session?.preparationQuestions?.[1]?.clientAnswer === "내 메모 2", r.json);
  r = await guest.call("GET", `/api/client/${token}`);
  check("내담자 홈 카드의 과제 진행률 1/2", r.json?.sessions?.[0]?.completedActionItemCount === 1 && r.json?.sessions?.[0]?.actionItemCount === 2, r.json);
  r = await a.call("GET", base1);
  check("상담사 회기 응답에 완료 여부·메모 없음", r.status === 200 && findKeys(r.json, SECRET_FOR_COUNSELOR).length === 0, findKeys(r.json, SECRET_FOR_COUNSELOR));

  // ── 9 ──────────────────────────────────────────────────────────
  step("9. 작성 중인 2·3회기는 내담자에게 안 보임");
  r = await guest.call("GET", `/api/client/${token}/sessions/${s2.id}`);
  check("작성 중 2회기 직접 접근 → 404", r.status === 404, r.json);
  r = await guest.call("PATCH", `/api/client/${token}/sessions/${s2.id}/action-items/${item.id}`, { isCompleted: false });
  check("작성 중 회기 주소로 과제 체크 시도 → 404", r.status === 404, r.json);
  r = await guest.call("GET", `/api/client/${token}`);
  check("내담자 홈 목록에 1회기만", JSON.stringify(r.json?.sessions?.map((s) => s.sessionNumber)) === "[1]", r.json);

  // ── 10 ─────────────────────────────────────────────────────────
  // 정렬이 "회기 번호 순"이 아니라 "날짜 순(같은 날짜면 회기 번호 순)"인지 구분되도록,
  // 2회기는 1회기(10-20)보다 이른 날짜(10-13)로, 3회기는 1회기와 같은 날짜(10-20)로 공유합니다.
  step("10. 2·3회기 공유 → 내담자 홈은 날짜 순(같은 날은 회기 번호 순), 이전/다음 이동");
  r = await a.call("POST", `${base2}/share`, { ...content1, sessionDate: "2026-10-13", clientSummary: "2회기 요약", actionItems: ["2회기 과제"], preparationQuestions: [] });
  check("2회기 공유 → 200", r.status === 200 && r.json?.session?.status === "shared", r.json);
  r = await guest.call("GET", `/api/client/${token}`);
  check("내담자 홈: 날짜가 이른 2회기(10-13)가 1회기(10-20)보다 먼저", JSON.stringify(r.json?.sessions?.map((s) => s.sessionNumber)) === "[2,1]", r.json);
  r = await guest.call("GET", `/api/client/${token}/sessions/${s1.id}`);
  check("1회기: 이전 = 2회기, 다음 없음 (작성 중 3회기는 건너뜀)", r.json?.prevSessionId === s2.id && r.json?.nextSessionId === null, r.json);
  r = await a.call("POST", `${base3}/share`, { ...content1, sessionDate: "2026-10-20", clientSummary: "3회기 요약", actionItems: [], preparationQuestions: [] });
  check("3회기를 1회기와 같은 날짜로 공유 → 200", r.status === 200 && r.json?.session?.status === "shared", r.json);
  r = await guest.call("GET", `/api/client/${token}`);
  check("내담자 홈: 2회기 → 1회기 → 3회기 (같은 날짜는 회기 번호 순)", JSON.stringify(r.json?.sessions?.map((s) => s.sessionNumber)) === "[2,1,3]", r.json);
  r = await guest.call("GET", `/api/client/${token}/sessions/${s2.id}`);
  check("2회기: 이전 없음, 다음 = 1회기", r.json?.prevSessionId === null && r.json?.nextSessionId === s1.id, r.json);
  r = await guest.call("GET", `/api/client/${token}/sessions/${s1.id}`);
  check("1회기: 이전 = 2회기, 다음 = 3회기", r.json?.prevSessionId === s2.id && r.json?.nextSessionId === s3.id, r.json);
  r = await guest.call("GET", `/api/client/${token}/sessions/${s3.id}`);
  check("3회기: 이전 = 1회기, 다음 없음, 과제·질문이 없어도 정상", r.status === 200 && r.json?.prevSessionId === s1.id && r.json?.nextSessionId === null && r.json?.session?.actionItems?.length === 0, r.json);

  // ── 11 ─────────────────────────────────────────────────────────
  step("11. 내담자 A 삭제 → A 링크 막힘, B 는 유지");
  r = await a.call("DELETE", `/api/counselor/clients/${clientA.id}`);
  check("A 삭제 → 200", r.status === 200, r.json);
  r = await guest.call("GET", `/api/client/${token}`);
  check("A 의 링크(홈) → 404", r.status === 404, r.json);
  r = await guest.call("GET", `/api/client/${token}/sessions/${s1.id}`);
  check("A 의 링크(회기) → 404", r.status === 404, r.json);
  r = await a.call("GET", `/api/counselor/clients/${clientB.id}`);
  check("B 는 그대로 (회기 2개)", r.status === 200 && r.json?.client?.sessions?.length === 2, r.json);
}

main().catch((error) => {
  console.error("\n점검 도중 예외가 발생했습니다:", error);
  process.exit(1);
});
