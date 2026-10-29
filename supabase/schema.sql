-- =====================================================================
--  회기노트 DB 스키마 (Supabase / PostgreSQL)
-- ---------------------------------------------------------------------
--  적용 방법: Supabase 대시보드 → SQL Editor → 이 파일 전체를 붙여넣고 Run
--  여러 번 실행해도 안전합니다. (이미 있는 테이블은 건너뛰고, 함수는 새로 교체)
--
--  테이블 구조를 바꾸고 싶을 때:
--    이미 만들어진 테이블은 "create table if not exists"가 건너뛰므로,
--    맨 아래 "변경 기록"에 alter table 문을 추가하고 다시 실행하세요.
--    (개발 중 데이터를 버려도 되면 reset.sql → schema.sql 순서로 실행)
--
--  관계 한눈에 보기
--    counselors 1─N clients 1─N sessions 1─N action_items
--                                        1─N preparation_questions
--    (위쪽 행을 지우면 아래쪽 행이 함께 지워집니다: ON DELETE CASCADE)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. 테이블
-- ---------------------------------------------------------------------

-- 상담사 계정 (Supabase Auth 대신 직접 만든 아이디/비밀번호 테이블)
create table if not exists public.counselors (
  id            uuid        primary key default gen_random_uuid(),
  username      text        not null unique,
  password_hash text        not null,                -- bcrypt 해시 (원래 비밀번호는 저장하지 않음)
  created_at    timestamptz not null default now()
);

-- 내담자 (상담사 한 명이 여러 내담자를 가짐)
create table if not exists public.clients (
  id           uuid        primary key default gen_random_uuid(),
  counselor_id uuid        not null references public.counselors(id) on delete cascade,
  name         text        not null,
  birth_date   date        not null,
  purpose_note text,                                  -- 상담 목적 메모 (상담사만 봄)
  share_token  text        not null unique,           -- 내담자 링크용 무작위 토큰
  created_at   timestamptz not null default now()
);
create index if not exists clients_counselor_id_idx on public.clients (counselor_id);

-- 회기 (내담자 한 명이 여러 회기를 가짐)
create table if not exists public.sessions (
  id             uuid        primary key default gen_random_uuid(),
  client_id      uuid        not null references public.clients(id) on delete cascade,
  session_number int         not null check (session_number > 0),  -- 내담자별 1, 2, 3 …
  session_date   date        not null default ((now() at time zone 'Asia/Seoul')::date), -- 기본값: 한국 날짜로 오늘
  status         text        not null default 'draft'
                             check (status in ('draft', 'shared')), -- draft=작성 중, shared=공유 완료
  source_text    text        not null default '',   -- 상담 원문 (상담사만)
  counselor_note text        not null default '',   -- 상담사용 상세 기록 (상담사만)
  client_summary text        not null default '',   -- 내담자용 요약 (공유 후 내담자에게 보임)
  created_at     timestamptz not null default now(),
  shared_at      timestamptz,                        -- 공유 확정 시각
  unique (client_id, session_number),
  -- 공유 완료 상태와 공유 시각은 항상 함께 존재
  constraint sessions_shared_at_matches_status check ((status = 'shared') = (shared_at is not null))
);

-- 실천 과제 (제목은 상담사가, 완료 여부는 내담자가 바꿈)
create table if not exists public.action_items (
  id           uuid    primary key default gen_random_uuid(),
  session_id   uuid    not null references public.sessions(id) on delete cascade,
  position     int     not null,                    -- 화면 표시 순서 (0부터)
  title        text    not null,
  is_completed boolean not null default false,      -- 내담자만 보고 바꿈
  unique (session_id, position)
);

-- 다음 상담 준비 질문 (질문은 상담사가, 답변 메모는 내담자가 씀)
create table if not exists public.preparation_questions (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  position      int  not null,                      -- 화면 표시 순서 (0부터)
  question      text not null,
  client_answer text not null default '',           -- 내담자만 보고 씀
  unique (session_id, position)
);


-- ---------------------------------------------------------------------
-- 2. 보안: 브라우저는 DB에 직접 접근할 수 없게
-- ---------------------------------------------------------------------
--  이 앱은 브라우저가 DB를 직접 부르지 않습니다. Next.js 서버만 secret key
--  (= service_role 권한)로 접근하고, 누가 무엇을 볼 수 있는지는 서버 코드가 검사합니다.
--
--  - RLS를 켜고 정책을 하나도 만들지 않음 → publishable(anon) 키로는 행이 하나도 안 보임
--  - anon/authenticated 의 테이블 권한도 회수 → 이중 잠금
--  - service_role 에는 권한을 명시적으로 부여
--    (2026-05-30 이후 만든 Supabase 프로젝트는 이 권한을 자동으로 주지 않습니다)

alter table public.counselors            enable row level security;
alter table public.clients               enable row level security;
alter table public.sessions              enable row level security;
alter table public.action_items          enable row level security;
alter table public.preparation_questions enable row level security;

revoke all on table
  public.counselors, public.clients, public.sessions,
  public.action_items, public.preparation_questions
from anon, authenticated;

grant select, insert, update, delete on table
  public.counselors, public.clients, public.sessions,
  public.action_items, public.preparation_questions
to service_role;


-- ---------------------------------------------------------------------
-- 3. 함수: 회기 저장 (임시 저장 / 공유 확정)
-- ---------------------------------------------------------------------
--  회기 본문 + 실천 과제 + 준비 질문을 "한 번에(트랜잭션으로)" 저장합니다.
--  supabase-js 로는 여러 테이블 변경을 하나로 묶을 수 없어서 DB 함수로 만들었습니다.
--  중간에 실패하면 전부 취소되므로 "본문은 저장됐는데 과제는 사라진" 상태가 생기지 않습니다.
--
--  호출하는 곳: src/server/sessions.ts → saveSessionDraft(), shareSession()
--
--  반환값:
--    'saved'            임시 저장 완료
--    'shared'           공유 확정 완료 (이제 수정 불가)
--    'not_found'        회기가 없거나, 이 상담사의 회기가 아님
--    'already_shared'   이미 공유된 회기라서 아무것도 바꾸지 않음
--    'summary_required' 공유하려면 내담자용 요약이 필요함

create or replace function public.save_session(
  p_counselor_id          uuid,
  p_client_id             uuid,
  p_session_id            uuid,
  p_session_date          date,
  p_source_text           text,
  p_counselor_note        text,
  p_client_summary        text,
  p_action_items          text[],
  p_preparation_questions text[],
  p_share                 boolean
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
begin
  -- ① 로그인한 상담사의 회기인지 확인하고, 저장이 끝날 때까지 이 회기 행을 잠급니다.
  --    (같은 회기를 동시에 저장/공유해도 한 번에 하나씩만 처리됨)
  select s.status
    into v_status
    from public.sessions s
    join public.clients c on c.id = s.client_id
   where s.id = p_session_id
     and s.client_id = p_client_id
     and c.counselor_id = p_counselor_id
     for update of s;

  if not found then
    return 'not_found';
  end if;

  -- ② 공유 완료된 회기의 상담사 기록은 바꾸지 않습니다.
  if v_status = 'shared' then
    return 'already_shared';
  end if;

  -- ③ 공유하려면 내담자용 요약이 있어야 합니다.
  if p_share and coalesce(btrim(p_client_summary), '') = '' then
    return 'summary_required';
  end if;

  -- ④ 회기 본문 저장 (공유 확정이면 상태도 함께 바꿈)
  update public.sessions
     set session_date   = p_session_date,
         source_text    = p_source_text,
         counselor_note = p_counselor_note,
         client_summary = p_client_summary,
         status         = case when p_share then 'shared' else 'draft' end,
         shared_at      = case when p_share then now() else null end
   where id = p_session_id;

  -- ⑤ 실천 과제 / 준비 질문은 지우고 화면 순서대로 다시 넣습니다.
  --    작성 중(draft)에는 내담자 체크/메모가 아직 없으므로 지워도 잃는 정보가 없습니다.
  delete from public.action_items where session_id = p_session_id;
  insert into public.action_items (session_id, position, title)
  select p_session_id, item.ord - 1, item.title
    from unnest(p_action_items) with ordinality as item(title, ord);

  delete from public.preparation_questions where session_id = p_session_id;
  insert into public.preparation_questions (session_id, position, question)
  select p_session_id, q.ord - 1, q.question
    from unnest(p_preparation_questions) with ordinality as q(question, ord);

  return case when p_share then 'shared' else 'saved' end;
end;
$$;

-- 함수는 기본적으로 누구나(PUBLIC) 실행할 수 있으므로 서버(service_role)만 부를 수 있게 막습니다.
-- 새 함수를 추가하면 아래 두 줄도 같은 방식으로 꼭 추가하세요.
revoke all on function public.save_session(uuid, uuid, uuid, date, text, text, text, text[], text[], boolean)
  from public, anon, authenticated;
grant execute on function public.save_session(uuid, uuid, uuid, date, text, text, text, text[], text[], boolean)
  to service_role;


-- ---------------------------------------------------------------------
-- 4. 변경 기록 (테이블을 바꿀 때 여기에 alter 문을 추가)
-- ---------------------------------------------------------------------
--  예) alter table public.clients add column if not exists phone text;
