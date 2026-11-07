-- TUB-331 allowed and denied operations.
-- Run locally with `supabase test db`. Do not pass --linked; that targets the hosted project.
-- The migration must already be applied to that local database (the CLI applies it).

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

select pg_temp.make_user(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'puzzle-admin@tuberush.test',
  '{"provider":"email","providers":["email"],"puzzle_role":"admin"}'::jsonb,
  '{}'::jsonb
);
select pg_temp.make_user(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'bot-crossword@tuberush.test',
  '{"provider":"email","providers":["email"],"puzzle_role":"bot","bot_id":"grok-crossword"}'::jsonb,
  '{}'::jsonb
);
select pg_temp.make_user(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  'bot-interchange@tuberush.test',
  '{"provider":"email","providers":["email"],"puzzle_role":"bot","bot_id":"grok-interchange"}'::jsonb,
  '{}'::jsonb
);
select pg_temp.make_user(
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  'player@tuberush.test',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"puzzle_role":"admin","bot_id":"grok-crossword"}'::jsonb
);

select ok(
  (select c.relrowsecurity and c.relforcerowsecurity from pg_class c where c.oid = 'public.puzzle_drafts'::regclass),
  'puzzle_drafts forces row level security'
);
select ok(
  (select c.relrowsecurity and c.relforcerowsecurity from pg_class c where c.oid = 'public.publish_keys'::regclass),
  'publish_keys forces row level security'
);
select ok(
  not has_table_privilege('anon', 'public.puzzle_drafts', 'select,insert,update,delete'),
  'anon has no grant on puzzle drafts'
);
select ok(
  not has_table_privilege('anon', 'public.publish_keys', 'select,insert,update,delete'),
  'anon has no grant on publish keys'
);
select ok(
  not has_table_privilege('authenticated', 'public.publish_keys', 'select,insert,update,delete'),
  'authenticated has no grant on publish keys'
);
select ok(
  not has_table_privilege('service_role', 'public.publish_keys', 'select,insert,update,delete'),
  'service role has no direct grant on publish keys'
);
select ok(
  not has_column_privilege('authenticated', 'public.puzzle_drafts', 'status', 'update'),
  'clients cannot update status'
);
select ok(
  not has_column_privilege('authenticated', 'public.puzzle_drafts', 'approved_by', 'update'),
  'clients cannot update approved_by'
);
select ok(
  has_column_privilege('authenticated', 'public.puzzle_drafts', 'payload', 'update'),
  'clients can update payload and the trigger decides if that is legal'
);
select ok(
  not has_function_privilege('anon', 'public.review_puzzle_draft(uuid, text, text)', 'execute'),
  'anon cannot call review'
);
select ok(
  not has_function_privilege('service_role', 'public.review_puzzle_draft(uuid, text, text)', 'execute'),
  'service role cannot approve'
);
select ok(
  not has_function_privilege('authenticated', 'public.submit_puzzle_draft(text, text, date, jsonb)', 'execute'),
  'a signed-in user cannot submit with a publish key'
);
select ok(
  not has_function_privilege('authenticated', 'public.rotate_publish_key(uuid, text, text, timestamptz, text)', 'execute'),
  'a signed-in user cannot rotate publish keys'
);

select pg_temp.jwt(null, '');
set local role anon;
select throws_ok(
  'select id from public.puzzle_drafts',
  '42501',
  null,
  'anon cannot select puzzle drafts'
);
select throws_ok(
  'select id from public.publish_keys',
  '42501',
  null,
  'anon cannot select publish keys'
);
reset role;

select pg_temp.jwt('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'authenticated');
set local role authenticated;
select is_empty(
  'select id from public.puzzle_drafts',
  'player cannot read drafts'
);
select throws_ok(
  $$insert into public.puzzle_drafts (game_type, target_date, payload, created_by_bot)
    values ('crossword', '2026-11-08', '{"id":"x"}'::jsonb, 'grok-crossword')$$,
  '42501',
  'not allowed to insert puzzle drafts',
  'player cannot insert a draft'
);
select throws_ok(
  $$select public.review_puzzle_draft(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'approved',
      'promote me'
    )$$,
  '42501',
  'only an admin can review puzzle drafts',
  'user_metadata cannot grant admin'
);
select throws_ok(
  $$insert into public.games (game_type, game_date, puzzle_data)
    values ('crossword', '2026-11-08', '{}'::jsonb)$$,
  '42501',
  null,
  'players cannot write live games'
);
reset role;

select pg_temp.jwt('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'authenticated');
set local role authenticated;
select lives_ok(
  $$insert into public.puzzle_drafts (game_type, target_date, payload, created_by_bot)
    values ('crossword', '2026-11-08', '{"id":"1","date":"2026-11-08"}'::jsonb, 'grok-interchange')$$,
  'bot can insert a draft'
);
select results_eq(
  $$select created_by_bot || ':' || status from public.puzzle_drafts$$,
  array['grok-crossword:draft'],
  'spoofed created_by_bot is replaced and the row starts as draft'
);
select throws_ok(
  $$update public.puzzle_drafts set status = 'approved'$$,
  '42501',
  null,
  'bot cannot set status'
);
reset role;

select pg_temp.jwt('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'authenticated');
set local role authenticated;
select lives_ok(
  $$insert into public.puzzle_drafts (game_type, target_date, payload, created_by_bot)
    values ('connections', '2026-11-08', '{"id":"2","date":"2026-11-08"}'::jsonb, 'grok-interchange')$$,
  'second bot can insert their own draft'
);
select is_empty(
  $$update public.puzzle_drafts
    set payload = '{"id":"stolen"}'::jsonb
    where created_by_bot = 'grok-crossword'
    returning id$$,
  'bot cannot update another bot draft'
);
reset role;

select pg_temp.jwt('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'authenticated');
set local role authenticated;
select lives_ok(
  $$select public.review_puzzle_draft(id, 'approved', 'ship it')
    from public.puzzle_drafts
    where created_by_bot = 'grok-crossword'$$,
  'admin can approve'
);
select results_eq(
  $$select approved_by::text
    from public.puzzle_drafts
    where created_by_bot = 'grok-crossword'$$,
  array['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'],
  'approved_by is the admin uid, not a client-supplied id'
);
reset role;

select pg_temp.jwt('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'authenticated');
set local role authenticated;
select lives_ok(
  $$update public.puzzle_drafts
    set payload = '{"id":"1","date":"2026-11-08","edited":true}'::jsonb
    where created_by_bot = 'grok-crossword'$$,
  'bot can edit their approved draft'
);
select results_eq(
  $$select status || ':' || revision::text || ':' || coalesce(approved_by::text, 'none')
    from public.puzzle_drafts
    where created_by_bot = 'grok-crossword'$$,
  array['draft:3:none'],
  'editing an approved draft clears approval'
);
reset role;

select pg_temp.jwt('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'authenticated');
set local role authenticated;
select lives_ok(
  $$select public.review_puzzle_draft(id, 'approved', null)
    from public.puzzle_drafts
    where created_by_bot = 'grok-crossword'$$,
  'admin can approve the edited draft'
);
reset role;

select set_config(
  'test.crossword_id',
  (select id::text from public.puzzle_drafts where created_by_bot = 'grok-crossword' and status = 'approved'),
  true
);
select pg_temp.jwt(null, 'service_role');
set local role service_role;
select lives_ok(
  $$select public.mark_puzzle_draft_published(current_setting('test.crossword_id')::uuid)$$,
  'publish service can mark an approved draft published'
);
select throws_ok(
  $$select public.review_puzzle_draft('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'approved', null)$$,
  '42501',
  null,
  'service role cannot call review'
);
reset role;

select pg_temp.jwt('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'authenticated');
set local role authenticated;
select throws_ok(
  $$update public.puzzle_drafts
    set payload = '{"id":"1","changed":true}'::jsonb
    where created_by_bot = 'grok-crossword'$$,
  '55000',
  'published puzzle drafts are immutable',
  'published puzzle drafts are immutable'
);
reset role;

select pg_temp.jwt(null, 'service_role');
set local role service_role;
select lives_ok(
  $$select set_config(
      'test.key_id',
      public.register_publish_key(
        'grok-crossword',
        'pk_activekey01',
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        null,
        'test'
      )::text,
      true
    )$$,
  'service role can register a key hash'
);
select results_eq(
  $$select bot_id || ':' || key_id
    from public.verify_publish_key('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')$$,
  array['grok-crossword:pk_activekey01'],
  'verify returns the bot and the public key id'
);
select lives_ok(
  $$select set_config(
      'test.key_draft_id',
      public.submit_puzzle_draft(
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        'connections',
        '2026-12-01',
        '{"id":"key-draft","date":"2026-12-01"}'::jsonb
      )::text,
      true
    )$$,
  'publish key can submit a draft'
);
reset role;
select pg_temp.jwt(null, '');
select results_eq(
  $$select status || ':' || created_by_bot
    from public.puzzle_drafts
    where target_date = '2026-12-01'$$,
  array['draft:grok-crossword'],
  'publish key does not approve the draft'
);
select throws_ok(
  $$select public.verify_publish_key('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')$$,
  '42501',
  'invalid publish key',
  'unknown hash is rejected without a distinct error'
);
reset role;

select pg_temp.jwt('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'authenticated');
set local role authenticated;
select lives_ok(
  $$select public.review_puzzle_draft(id, 'approved', null)
    from public.puzzle_drafts
    where target_date = '2026-12-01'$$,
  'admin approves the key-submitted draft'
);
reset role;

select pg_temp.jwt(null, 'service_role');
set local role service_role;
select lives_ok(
  $$select public.update_puzzle_draft(
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      current_setting('test.key_draft_id')::uuid,
      'connections',
      '2026-12-01',
      '{"id":"key-draft","date":"2026-12-01","edited":true}'::jsonb
    )$$,
  'publish key can update its own draft'
);
reset role;
select pg_temp.jwt(null, '');
select results_eq(
  $$select status from public.puzzle_drafts where target_date = '2026-12-01'$$,
  array['draft'],
  'key update of an approved draft clears approval'
);
select pg_temp.jwt(null, 'service_role');
set local role service_role;
select lives_ok(
  $$select public.rotate_publish_key(
      current_setting('test.key_id')::uuid,
      'pk_rotatedkey1',
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      null,
      'rotated'
    )$$,
  'service role can rotate a key'
);
select throws_ok(
  $$select public.verify_publish_key('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')$$,
  '42501',
  'invalid publish key',
  'rotated key replaces the old hash'
);
select results_eq(
  $$select bot_id from public.verify_publish_key('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')$$,
  array['grok-crossword'],
  'rotated hash belongs to the same bot'
);
reset role;
select pg_temp.jwt(null, '');
select set_config(
  'test.rotated_id',
  (select id::text from public.publish_keys where key_id = 'pk_rotatedkey1'),
  true
);
select pg_temp.jwt(null, 'service_role');
set local role service_role;
select lives_ok(
  $$select public.revoke_publish_key(current_setting('test.rotated_id')::uuid)$$,
  'service role can revoke a key'
);
select throws_ok(
  $$select public.verify_publish_key('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')$$,
  '42501',
  'invalid publish key',
  'revoked key is rejected'
);
select lives_ok(
  $$select public.register_publish_key(
      'grok-crossword',
      'pk_expiredkey1',
      'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      now() + interval '1 minute',
      'soon'
    )$$,
  'service role can register an expiring key'
);
reset role;
select pg_temp.jwt(null, '');
update public.publish_keys
set created_at = now() - interval '2 hours',
    expires_at = now() - interval '1 hour'
where key_id = 'pk_expiredkey1';
select pg_temp.jwt(null, 'service_role');
set local role service_role;
select throws_ok(
  $$select public.verify_publish_key('cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc')$$,
  '42501',
  'invalid publish key',
  'expired key is rejected'
);
reset role;

select pg_temp.jwt(null, '');
select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'publish_keys'
      and column_name in ('key', 'plaintext', 'secret', 'api_key', 'token')
  ),
  'publish_keys has no plaintext secret column'
);
select results_eq(
  $$select key_hash from public.publish_keys where key_id = 'pk_rotatedkey1'$$,
  array['bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],
  'the table stores the hash that was registered'
);

select * from finish();

rollback;
