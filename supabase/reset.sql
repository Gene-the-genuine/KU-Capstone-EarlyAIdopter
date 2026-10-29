-- =====================================================================
--  ⚠️ 개발용 초기화: 회기노트의 테이블과 데이터를 "전부" 지웁니다. 되돌릴 수 없습니다.
--  사용 예: 테이블 구조를 크게 바꾼 뒤 처음부터 다시 만들고 싶을 때
--    reset.sql 실행 → schema.sql 실행 → (선택) seed.sql 실행
-- =====================================================================

drop function if exists public.save_session(uuid, uuid, uuid, date, text, text, text, text[], text[], boolean);

drop table if exists public.preparation_questions;
drop table if exists public.action_items;
drop table if exists public.sessions;
drop table if exists public.clients;
drop table if exists public.counselors;
