-- History retention for puzzle drafts.
-- Run locally: supabase test db supabase/tests/puzzle_drafts_history_retention_test.sql
-- Do not pass --linked. That targets the hosted project.
-- The forward migration must already be applied (the CLI applies it).

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
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    '',
    now(),
    p_app,
    p_user_meta,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );
end;
$$;

create or replace function pg_temp.history_len(p_id uuid)
returns int
language sql
security definer
set search_path = ''
as $$
  select jsonb_array_length(history)
  from public.puzzle_drafts
  where id = p_id;
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
select pg_temp.make_user(
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
  'history-interchange@tuberush.test',
  '{"provider":"email","providers":["email"],"puzzle_role":"bot","bot_id":"grok-interchange"}'::jsonb,
  '{}'::jsonb
);
select pg_temp.make_user(
  'ffffffff-ffff-4fff-8fff-fffffffffff1',
  'history-player@tuberush.test',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"puzzle_role":"admin","bot_id":"grok-crossword"}'::jsonb
);

select ok(
  exists (
    select 1
    from pg_proc as proc
    join pg_namespace as ns on ns.oid = proc.pronamespace
    where ns.nspname = 'private'
      and proc.proname = 'puzzle_drafts_guard'
      and proc.prosecdef is false
      and proc.proconfig @> array['search_path=""']
  ),
  'guard stays security invoker with an empty search_path'
);
select ok(
  (select c.relrowsecurity and c.relforcerowsecurity
   from pg_class as c
   where c.oid = 'public.puzzle_drafts'::regclass),
  'puzzle_drafts still forces row level security'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'puzzle_drafts_history_retention'
      and conrelid = 'public.puzzle_drafts'::regclass
      and pg_get_constraintdef(oid) like '%jsonb_array_length(history) <= 8%'
  ),
  'history check rejects more than eight snapshots'
);
select ok(
  not has_column_privilege('authenticated', 'public.puzzle_drafts', 'history', 'update'),
  'clients still cannot update history'
);
select ok(
  not has_column_privilege('authenticated', 'public.puzzle_drafts', 'status', 'update'),
  'clients still cannot update status'
);
select ok(
  not has_column_privilege('authenticated', 'public.puzzle_drafts', 'approved_by', 'update'),
  'clients still cannot update approved_by'
);
select ok(
  not has_function_privilege('anon', 'private.puzzle_drafts_guard()', 'execute'),
  'anon still cannot execute the guard'
);
select ok(
  not has_function_privilege('authenticated', 'public.update_puzzle_draft(text, uuid, text, date, jsonb)', 'execute'),
  'a signed-in user still cannot call the publish-key update'
);
select ok(
  not has_function_privilege('service_role', 'public.review_puzzle_draft(uuid, text, text)', 'execute'),
  'service role still cannot execute review'
);

select pg_temp.jwt(null, '');
set local role anon;
select throws_ok(
  'select id from public.puzzle_drafts',
  '42501',
  null,
  'anon cannot select puzzle drafts'
);
reset role;

select pg_temp.jwt('ffffffff-ffff-4fff-8fff-fffffffffff1', 'authenticated');
set local role authenticated;
select throws_ok(
  $$insert into public.puzzle_drafts (game_type, target_date, payload, created_by_bot)
    values ('crossword', '2026-11-20', '{"n":0}'::jsonb, 'grok-crossword')$$,
  '42501',
  'not allowed to insert puzzle drafts',
  'player cannot insert a draft'
);
select throws_ok(
  $$select public.review_puzzle_draft(
      'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
      'approved',
      'promote me'
    )$$,
  '42501',
  'only an admin can review puzzle drafts',
  'user_metadata cannot grant admin'
);
reset role;

select pg_temp.jwt('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 'authenticated');
set local role authenticated;
select lives_ok(
  $$insert into public.puzzle_drafts (game_type, target_date, payload, created_by_bot)
    values ('crossword', '2026-11-20', '{"n":0}'::jsonb, 'grok-interchange')$$,
  'bot can insert a draft'
);
select lives_ok(
  $$insert into public.puzzle_drafts (game_type, target_date, payload, created_by_bot)
    values ('crossword', '2026-11-21', '{"n":0}'::jsonb, 'grok-crossword')$$,
  'bot can insert the review draft'
);
select lives_ok(
  $$insert into public.puzzle_drafts (game_type, target_date, payload, created_by_bot)
    values ('crossword', '2026-11-22', '{"n":0}'::jsonb, 'grok-crossword')$$,
  'bot can insert the backfill draft'
);
select results_eq(
  $$select created_by_bot from public.puzzle_drafts where target_date = '2026-11-20'$$,
  array['grok-crossword'],
  'spoofed created_by_bot is replaced from app_metadata'
);
select throws_ok(
  $$update public.puzzle_drafts set status = 'approved' where target_date = '2026-11-20'$$,
  '42501',
  null,
  'bot cannot set status'
);
select throws_ok(
  $$update public.puzzle_drafts set history = '[{"revision":1}]'::jsonb where target_date = '2026-11-20'$$,
  '42501',
  null,
  'bot cannot write history directly'
);
reset role;

select pg_temp.jwt('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', 'authenticated');
set local role authenticated;
select is_empty(
  $$update public.puzzle_drafts
    set payload = '{"n":-1}'::jsonb
    where target_date = '2026-11-20'
    returning id$$,
  'bot cannot update another bot draft'
);
reset role;

select pg_temp.jwt('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'authenticated');
set local role authenticated;
select lives_ok(
  $$select public.review_puzzle_draft(id, 'approved', 'ship it')
    from public.puzzle_drafts
    where target_date = '2026-11-20'$$,
  'admin can approve before repeated edits'
);
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
    set payload = jsonb_build_object('n', i, 'pad', repeat('x', 2000))
    where target_date = '2026-11-20';
    if not found then
      raise exception 'content edit missed the draft';
    end if;
    select jsonb_array_length(history)
    into v_len
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

select is(
  current_setting('test.content_max_history')::int,
  8,
  'repeated content edits never store more than eight snapshots'
);
select is(
  pg_temp.revisions('2026-11-20'),
  array[4, 5, 6, 7, 8, 9, 10, 11],
  'content edits keep the eight most recent snapshots'
);
select results_eq(
  $$select status, revision, approved_by::text, created_by_bot, created_by::text,
           payload ->> 'n',
           history -> -1 -> 'payload' ->> 'n'
    from public.puzzle_drafts
    where target_date = '2026-11-20'$$,
  $$values ('draft'::text, 12, null::text, 'grok-crossword', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', '10', '9')$$,
  'latest edit clears approval and the newest snapshot is the previous payload'
);
select ok(
  (
    select bool_and(octet_length((entry -> 'payload')::text) > 2000)
    from public.puzzle_drafts as drafts
    cross join lateral jsonb_array_elements(drafts.history) as entry
    where drafts.target_date = '2026-11-20'
  ),
  'each retained content snapshot still contains the payload'
);

select pg_temp.jwt('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'authenticated');
set local role authenticated;
do $reviews$
declare
  i int;
  v_id uuid;
  v_len int;
  v_max int := 0;
  v_decision text;
begin
  select id into v_id
  from public.puzzle_drafts
  where target_date = '2026-11-21';
  for i in 1..12 loop
    v_decision := case when i % 2 = 1 then 'approved' else 'rejected' end;
    perform public.review_puzzle_draft(v_id, v_decision, 'review-' || i);
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

select is(
  current_setting('test.review_max_history')::int,
  8,
  'repeated reviews never store more than eight snapshots'
);
select is(
  pg_temp.revisions('2026-11-21'),
  array[5, 6, 7, 8, 9, 10, 11, 12],
  'reviews keep the eight most recent snapshots'
);
select results_eq(
  $$select status, revision, feedback, approved_by::text, payload ->> 'n',
           history -> -1 ->> 'status',
           history -> -1 ->> 'feedback'
    from public.puzzle_drafts
    where target_date = '2026-11-21'$$,
  $$values (
      'rejected'::text,
      13,
      'review-12',
      null::text,
      '0',
      'approved',
      'review-11'
    )$$,
  'the live review is the latest decision and the previous one stays in history'
);

select pg_temp.jwt('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 'authenticated');
set local role authenticated;
select throws_ok(
  $$update public.puzzle_drafts set status = 'approved' where target_date = '2026-11-21'$$,
  '42501',
  null,
  'a full history does not let a bot approve'
);
reset role;

select pg_temp.jwt('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'authenticated');
set local role authenticated;
select lives_ok(
  $$select public.review_puzzle_draft(id, 'approved', 'after edits')
    from public.puzzle_drafts
    where target_date = '2026-11-20'$$,
  'admin can approve a draft whose history is already full'
);
reset role;
select is(
  (select status || ':' || coalesce(approved_by::text, 'none') || ':' || jsonb_array_length(history)::text
   from public.puzzle_drafts
   where target_date = '2026-11-20'),
  'approved:dddddddd-dddd-4ddd-8ddd-ddddddddddd1:8',
  'approval at the cap keeps eight snapshots and the admin uid'
);

select set_config(
  'test.publish_id',
  (select id::text from public.puzzle_drafts where target_date = '2026-11-20'),
  true
);
select set_config(
  'test.review_id',
  (select id::text from public.puzzle_drafts where target_date = '2026-11-21'),
  true
);
select pg_temp.jwt(null, 'service_role');
set local role service_role;
select lives_ok(
  $$select public.mark_puzzle_draft_published(current_setting('test.publish_id')::uuid)$$,
  'publish still succeeds when history is already full'
);
select throws_ok(
  $$select public.review_puzzle_draft(current_setting('test.review_id')::uuid, 'approved', null)$$,
  '42501',
  null,
  'service role still cannot review'
);
reset role;
select results_eq(
  $$select status, revision, approved_by::text, jsonb_array_length(history)
    from public.puzzle_drafts
    where target_date = '2026-11-20'$$,
  $$values ('published'::text, 14, 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'::text, 8)$$,
  'publish keeps approval and stays inside the history cap'
);

select pg_temp.jwt('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 'authenticated');
set local role authenticated;
select throws_ok(
  $$update public.puzzle_drafts
    set payload = '{"n":99}'::jsonb
    where target_date = '2026-11-20'$$,
  '55000',
  'published puzzle drafts are immutable',
  'published drafts stay immutable after the cap'
);
reset role;

select pg_temp.jwt(null, 'service_role');
set local role service_role;
select lives_ok(
  $$select public.register_publish_key(
      'grok-crossword',
      'pk_historykey01',
      repeat('d', 64),
      null,
      'history'
    )$$,
  'service role can register a publish key'
);
select lives_ok(
  $$select set_config(
      'test.key_draft_id',
      public.submit_puzzle_draft(
        repeat('d', 64),
        'connections',
        '2026-12-02',
        '{"n":0}'::jsonb
      )::text,
      true
    )$$,
  'publish key can submit a draft'
);
do $key_edits$
declare
  i int;
  v_len int;
  v_max int := 0;
  v_id uuid := current_setting('test.key_draft_id')::uuid;
begin
  for i in 1..9 loop
    perform public.update_puzzle_draft(
      repeat('d', 64),
      v_id,
      'connections',
      '2026-12-02',
      jsonb_build_object('n', i)
    );
    v_len := pg_temp.history_len(v_id);
    if v_len > v_max then
      v_max := v_len;
    end if;
  end loop;
  perform set_config('test.key_max_history', v_max::text, true);
end;
$key_edits$;
reset role;

select is(
  current_setting('test.key_max_history')::int,
  8,
  'repeated publish-key edits never store more than eight snapshots'
);
select is(
  pg_temp.revisions('2026-12-02'),
  array[2, 3, 4, 5, 6, 7, 8, 9],
  'publish-key edits keep the eight most recent snapshots'
);
select results_eq(
  $$select status, revision, created_by_bot, approved_by::text, payload ->> 'n'
    from public.puzzle_drafts
    where target_date = '2026-12-02'$$,
  $$values ('draft'::text, 10, 'grok-crossword', null::text, '9')$$,
  'publish-key edits stay unapproved drafts owned by that bot'
);

select pg_temp.jwt(null, 'service_role');
set local role service_role;
select lives_ok(
  $$select public.register_publish_key(
      'grok-interchange',
      'pk_historykey02',
      repeat('e', 64),
      null,
      'other'
    )$$,
  'service role can register the other bot key'
);
select throws_ok(
  $$select public.update_puzzle_draft(
      repeat('e', 64),
      current_setting('test.key_draft_id')::uuid,
      'connections',
      '2026-12-02',
      '{"n":-1}'::jsonb
    )$$,
  '42501',
  'puzzle draft not found',
  'another bot key cannot update the draft'
);
reset role;

-- Seed a longer history the way rows written before this migration would look,
-- then run the same no-op update the migration uses to trim them.
select pg_temp.jwt('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'authenticated');
set local role authenticated;
select lives_ok(
  $$select public.review_puzzle_draft(id, 'approved', 'keep me')
    from public.puzzle_drafts
    where target_date = '2026-11-22'$$,
  'admin can approve the backfill draft'
);
reset role;

alter table public.puzzle_drafts drop constraint puzzle_drafts_history_retention;
alter table public.puzzle_drafts disable trigger puzzle_drafts_guard;
update public.puzzle_drafts
set history = (
  select jsonb_agg(
    jsonb_build_object('revision', g, 'payload', jsonb_build_object('marker', g))
    order by g
  )
  from generate_series(1, 12) as g
)
where target_date = '2026-11-22';
alter table public.puzzle_drafts enable trigger puzzle_drafts_guard;

update public.puzzle_drafts
set history = history
where target_date = '2026-11-22'
  and jsonb_array_length(history) > 8;

select results_eq(
  $$select status, revision, created_by_bot, approved_by::text, payload ->> 'n'
    from public.puzzle_drafts
    where target_date = '2026-11-22'$$,
  $$values (
      'approved'::text,
      2,
      'grok-crossword',
      'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'::text,
      '0'
    )$$,
  'trimming an existing history leaves approval, revision, and payload alone'
);
select is(
  pg_temp.revisions('2026-11-22'),
  array[5, 6, 7, 8, 9, 10, 11, 12],
  'trimming an existing history keeps the eight most recent snapshots'
);

alter table public.puzzle_drafts
  add constraint puzzle_drafts_history_retention
  check (
    case
      when jsonb_typeof(history) = 'array' then jsonb_array_length(history) <= 8
      else false
    end
  );

alter table public.puzzle_drafts disable trigger puzzle_drafts_guard;
select throws_ok(
  $$update public.puzzle_drafts
    set history = (
      select jsonb_agg(jsonb_build_object('revision', g) order by g)
      from generate_series(1, 9) as g
    )
    where target_date = '2026-11-22'$$,
  '23514',
  'new row for relation "puzzle_drafts" violates check constraint "puzzle_drafts_history_retention"',
  'the check rejects a ninth snapshot when the guard is off'
);
alter table public.puzzle_drafts enable trigger puzzle_drafts_guard;
select is(
  pg_temp.revisions('2026-11-22'),
  array[5, 6, 7, 8, 9, 10, 11, 12],
  'a rejected ninth snapshot leaves the retained history in place'
);

select * from finish();

rollback;
