-- Retention, snapshot order, upgrade trim, and the history-column grant.
-- Run locally with supabase test db. Do not pass --linked.
-- Unchanged auth, RLS, and publish-key checks stay in puzzle_drafts_rls.test.sql.

begin;

select no_plan();

create or replace function pg_temp.jwt(p_sub uuid, p_role text)
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_sub, 'role', nullif(p_role, ''))::text,
    true
  );
  perform set_config('request.jwt.claim.sub', coalesce(p_sub::text, ''), true);
  perform set_config('request.jwt.claim.role', coalesce(nullif(p_role, ''), ''), true);
end;
$$;

create or replace function pg_temp.make_user(
  p_id uuid,
  p_email text,
  p_app jsonb,
  p_user_meta jsonb
)
returns void
language plpgsql
as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    p_id, 'authenticated', 'authenticated', p_email, '', now(),
    p_app, p_user_meta, now(), now(), '', '', '', ''
  );
end;
$$;

create or replace function pg_temp.revisions(p_date date)
returns int[]
language sql
as $$
  select coalesce(
    array_agg((item.entry ->> 'revision')::int order by item.ordinality),
    '{}'::int[]
  )
  from public.puzzle_drafts as drafts
  cross join lateral jsonb_array_elements(drafts.history)
    with ordinality as item(entry, ordinality)
  where drafts.target_date = p_date;
$$;

select pg_temp.make_user(
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  'history-admin@tuberush.test',
  '{"provider":"email","providers":["email"],"puzzle_role":"admin"}'::jsonb,
  '{}'::jsonb
);
select pg_temp.make_user(
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
  'history-crossword@tuberush.test',
  '{"provider":"email","providers":["email"],"puzzle_role":"bot","bot_id":"grok-crossword"}'::jsonb,
  '{}'::jsonb
);

select ok(
  (
    select guard.tgname < retain.tgname
    from pg_trigger as guard
    join pg_trigger as retain
      on retain.tgrelid = guard.tgrelid
     and retain.tgname = 'puzzle_drafts_retain_history'
    where guard.tgrelid = 'public.puzzle_drafts'::regclass
      and guard.tgname = 'puzzle_drafts_guard'
      and not guard.tgisinternal
      and not retain.tgisinternal
      and (guard.tgtype & 2) = 2
      and (retain.tgtype & 2) = 2
  ),
  'retention is a before trigger and sorts after the guard'
);
select ok(
  exists (
    select 1
    from pg_proc as proc
    join pg_namespace as ns on ns.oid = proc.pronamespace
    where ns.nspname = 'private'
      and proc.proname = 'puzzle_drafts_retain_history'
      and proc.prosecdef is false
      and proc.proconfig @> array['search_path=""']
  ),
  'retention stays security invoker with an empty search_path'
);
select ok(
  not has_function_privilege('anon', 'private.puzzle_drafts_retain_history()', 'execute'),
  'anon cannot execute history retention'
);

select pg_temp.jwt('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 'authenticated');
set local role authenticated;
insert into public.puzzle_drafts (game_type, target_date, payload, created_by_bot)
values
  ('crossword', '2026-11-20', '{"n":0}'::jsonb, 'grok-crossword'),
  ('crossword', '2026-11-21', '{"n":0}'::jsonb, 'grok-crossword'),
  ('crossword', '2026-11-22', '{"n":0}'::jsonb, 'grok-crossword');
select throws_ok(
  $$update public.puzzle_drafts
    set history = '[{"revision":1}]'::jsonb
    where target_date = '2026-11-20'$$,
  '42501',
  null,
  'a bot cannot write history directly'
);
reset role;

select pg_temp.jwt('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'authenticated');
set local role authenticated;
do $approve$
begin
  perform public.review_puzzle_draft(id, 'approved', 'ship it')
  from public.puzzle_drafts
  where target_date = '2026-11-20';
end
$approve$;
reset role;

select pg_temp.jwt('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 'authenticated');
set local role authenticated;
do $edits$
declare
  i int;
  v_len int;
  v_max int := 0;
begin
  for i in 1..10 loop
    update public.puzzle_drafts
    set payload = jsonb_build_object('n', i)
    where target_date = '2026-11-20';
    if not found then
      raise exception 'content edit missed the draft';
    end if;
    select jsonb_array_length(history) into v_len
    from public.puzzle_drafts
    where target_date = '2026-11-20';
    if v_len > v_max then
      v_max := v_len;
    end if;
  end loop;
  perform set_config('test.content_max_history', v_max::text, true);
end;
$edits$;
reset role;

select is(current_setting('test.content_max_history')::int, 8,
  'repeated content edits never store more than eight snapshots');
select is(pg_temp.revisions('2026-11-20'), array[4, 5, 6, 7, 8, 9, 10, 11],
  'content edits keep the eight most recent snapshots in order');
select results_eq(
  $$select status, revision, approved_by::text, created_by_bot, payload ->> 'n',
           history -> -1 ->> 'revision', history -> -1 -> 'payload' ->> 'n'
    from public.puzzle_drafts
    where target_date = '2026-11-20'$$,
  $$values ('draft'::text, 12, null::text, 'grok-crossword', '10', '11', '9')$$,
  'the newest snapshot is the prior revision and approval stays cleared'
);

select pg_temp.jwt('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'authenticated');
set local role authenticated;
do $reviews$
declare
  i int;
  v_id uuid;
  v_len int;
  v_max int := 0;
begin
  select id into v_id from public.puzzle_drafts where target_date = '2026-11-21';
  for i in 1..12 loop
    perform public.review_puzzle_draft(
      v_id,
      case when i % 2 = 1 then 'approved' else 'rejected' end,
      'review-' || i
    );
    select jsonb_array_length(history) into v_len
    from public.puzzle_drafts
    where id = v_id;
    if v_len > v_max then
      v_max := v_len;
    end if;
  end loop;
  perform set_config('test.review_max_history', v_max::text, true);
end;
$reviews$;
reset role;

select is(current_setting('test.review_max_history')::int, 8,
  'repeated reviews never store more than eight snapshots');
select is(pg_temp.revisions('2026-11-21'), array[5, 6, 7, 8, 9, 10, 11, 12],
  'reviews keep the eight most recent snapshots in order');
select results_eq(
  $$select status, revision, feedback, approved_by::text,
           history -> -1 ->> 'revision', history -> -1 ->> 'status', history -> -1 ->> 'feedback'
    from public.puzzle_drafts
    where target_date = '2026-11-21'$$,
  $$values ('rejected'::text, 13, 'review-12', null::text, '12', 'approved', 'review-11')$$,
  'the live review is the latest decision and the previous snapshot stays last'
);

select pg_temp.jwt('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'authenticated');
set local role authenticated;
do $approve_full$
begin
  perform public.review_puzzle_draft(id, 'approved', 'after edits')
  from public.puzzle_drafts
  where target_date = '2026-11-20';
end
$approve_full$;
reset role;
do $publish_id$
begin
  perform set_config(
    'test.publish_id',
    (select id::text from public.puzzle_drafts where target_date = '2026-11-20'),
    true
  );
end
$publish_id$;
select pg_temp.jwt(null, 'service_role');
set local role service_role;
do $publish$
begin
  perform public.mark_puzzle_draft_published(current_setting('test.publish_id')::uuid);
end
$publish$;
reset role;
select is(
  (select status || ':' || revision::text || ':' || approved_by::text || ':' || jsonb_array_length(history)::text
   from public.puzzle_drafts
   where target_date = '2026-11-20'),
  'published:14:dddddddd-dddd-4ddd-8ddd-ddddddddddd1:8',
  'publish at the cap keeps approval and eight snapshots'
);

select pg_temp.jwt('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'authenticated');
set local role authenticated;
do $approve_old$
begin
  perform public.review_puzzle_draft(id, 'approved', 'keep me')
  from public.puzzle_drafts
  where target_date = '2026-11-22';
end
$approve_old$;
reset role;

alter table public.puzzle_drafts drop constraint puzzle_drafts_history_retention;
alter table public.puzzle_drafts disable trigger user;
update public.puzzle_drafts
set history = (
  select jsonb_agg(jsonb_build_object(
    'revision', g,
    'payload', jsonb_build_object('marker', g)
  ) order by g)
  from generate_series(1, 12) as g
)
where target_date = '2026-11-22';
alter table public.puzzle_drafts enable trigger user;
update public.puzzle_drafts
set history = history
where target_date = '2026-11-22'
  and jsonb_array_length(history) > 8;

select results_eq(
  $$select status, revision, created_by_bot, approved_by::text, payload ->> 'n'
    from public.puzzle_drafts
    where target_date = '2026-11-22'$$,
  $$values ('approved'::text, 2, 'grok-crossword', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', '0')$$,
  'trimming an existing history leaves approval, revision, and payload alone'
);
select is(pg_temp.revisions('2026-11-22'), array[5, 6, 7, 8, 9, 10, 11, 12],
  'trimming an existing history keeps the eight most recent snapshots');

alter table public.puzzle_drafts
  add constraint puzzle_drafts_history_retention
  check (
    case
      when jsonb_typeof(history) = 'array' then jsonb_array_length(history) <= 8
      else false
    end
  );
alter table public.puzzle_drafts disable trigger user;
select throws_ok(
  $$update public.puzzle_drafts
    set history = (
      select jsonb_agg(jsonb_build_object('revision', g) order by g)
      from generate_series(1, 9) as g
    )
    where target_date = '2026-11-22'$$,
  '23514',
  'new row for relation "puzzle_drafts" violates check constraint "puzzle_drafts_history_retention"',
  'the check rejects a ninth snapshot when the triggers are off'
);
alter table public.puzzle_drafts enable trigger user;
select is(pg_temp.revisions('2026-11-22'), array[5, 6, 7, 8, 9, 10, 11, 12],
  'a rejected ninth snapshot leaves the retained history in place');

select * from finish();
rollback;
