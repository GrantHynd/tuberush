-- TUB-331: puzzle drafts, per-bot publish keys, and RLS.
-- Apply this file only from the operator's machine. Do not run it from CI.
--
-- Interchange is stored as game_type 'connections'. Crossword is 'crossword'.
-- Structural checks live in supabase/functions/_shared/puzzle-validators.ts.
-- This migration enforces authorship and the review state machine, not puzzle quality.
-- A valid payload is not approval.
--
-- Admin and bot identity are read from auth.users.raw_app_meta_data, which only
-- the Auth admin API can write. Client-editable profile metadata is never read.
--   puzzle_role = 'admin'  -> may approve or reject, and may read every draft
--   puzzle_role = 'bot' and bot_id = '<id>' -> may insert and update own drafts
-- bot_id and created_by_bot match ^[a-z0-9][a-z0-9_-]{0,63}$.
-- Set the claim with the service role, for example:
--   update auth.users
--   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
--     || jsonb_build_object('puzzle_role', 'admin')
--   where id = '<auth-user-uuid>';
-- The check reads the table, so it takes effect without waiting for a JWT refresh.
--
-- Publish keys: store only a lowercase hex SHA-256 of the raw UTF-8 secret
-- (no trim, no trailing newline). Plaintext never goes in a column, a client
-- bundle, or a database error. Verification, rotation, and revocation are
-- service-role or database-owner operations. A valid key can submit or update
-- that bot's draft. It cannot approve, reject, or write public.games.
--
-- State machine:
--   insert -> draft
--   draft|rejected|approved content edit -> draft, approval cleared, history appended
--   admin: draft|rejected|approved -> approved|rejected, or back to draft
--   publish service: approved -> published, payload unchanged
--   published rows reject every later update

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to postgres, supabase_admin, service_role, authenticated;

-- ---------------------------------------------------------------------------
-- Identity helpers. security definer so policies can read auth.users without
-- granting that table to clients. search_path is pinned.
-- ---------------------------------------------------------------------------

create or replace function private.puzzle_role()
returns text
language sql
stable
security definer
set search_path = ''
as $fn$
  select nullif(u.raw_app_meta_data ->> 'puzzle_role', '')
  from auth.users as u
  where u.id = (select auth.uid());
$fn$;

create or replace function private.is_puzzle_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select coalesce(private.puzzle_role() = 'admin', false);
$fn$;

create or replace function private.current_bot_id()
returns text
language sql
stable
security definer
set search_path = ''
as $fn$
  select case
    when private.puzzle_role() = 'bot' then nullif(u.raw_app_meta_data ->> 'bot_id', '')
    else null
  end
  from auth.users as u
  where u.id = (select auth.uid());
$fn$;

create or replace function private.caller_is_publish_service()
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select coalesce(
    auth.role() = 'service_role'
    or (
      session_user in ('postgres', 'supabase_admin')
      and auth.uid() is null
      and coalesce(auth.role(), '') not in ('anon', 'authenticated', 'service_role')
    ),
    false
  );
$fn$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.puzzle_drafts (
  id uuid primary key default gen_random_uuid(),
  game_type text not null,
  target_date date not null,
  payload jsonb not null,
  status text not null default 'draft',
  revision integer not null default 1,
  history jsonb not null default '[]'::jsonb,
  feedback text,
  approved_by uuid,
  approved_at timestamptz,
  created_by_bot text not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint puzzle_drafts_game_type_check
    check (game_type in ('connections', 'crossword')),
  constraint puzzle_drafts_status_check
    check (status in ('draft', 'approved', 'rejected', 'published')),
  constraint puzzle_drafts_bot_id_format
    check (created_by_bot ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  constraint puzzle_drafts_payload_object
    check (jsonb_typeof(payload) = 'object'),
  constraint puzzle_drafts_payload_size
    check (octet_length(payload::text) <= 65536),
  constraint puzzle_drafts_history_array
    check (jsonb_typeof(history) = 'array'),
  constraint puzzle_drafts_revision_positive
    check (revision >= 1),
  constraint puzzle_drafts_feedback_length
    check (feedback is null or char_length(feedback) <= 4000),
  constraint puzzle_drafts_approval_pair
    check (
      (
        status in ('approved', 'published')
        and approved_by is not null
        and approved_at is not null
      )
      or (
        status in ('draft', 'rejected')
        and approved_by is null
        and approved_at is null
      )
    )
);

comment on table public.puzzle_drafts is
  'Bot-submitted puzzle revisions. Approval is admin-only and is cleared when the payload, game_type, or target_date changes.';
comment on column public.puzzle_drafts.created_by_bot is
  'Server-assigned bot id from app_metadata.bot_id or from the publish key. Not a client-chosen role.';
comment on column public.puzzle_drafts.approved_by is
  'auth.uid() of the admin who approved. Clients cannot set this column.';
comment on column public.puzzle_drafts.history is
  'Previous revisions, newest last. Each entry is the row from before that change.';

create index puzzle_drafts_created_by_bot_idx on public.puzzle_drafts (created_by_bot);
create index puzzle_drafts_schedule_idx on public.puzzle_drafts (game_type, target_date);
create index puzzle_drafts_approved_by_idx on public.puzzle_drafts (approved_by);
create index puzzle_drafts_created_by_idx on public.puzzle_drafts (created_by);
create unique index puzzle_drafts_one_published_idx
  on public.puzzle_drafts (game_type, target_date)
  where status = 'published';

create table public.publish_keys (
  id uuid primary key default gen_random_uuid(),
  bot_id text not null,
  key_id text not null unique,
  key_hash text not null unique,
  hash_alg text not null default 'sha256',
  created_at timestamptz not null default now(),
  created_by uuid,
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid,
  rotated_from uuid references public.publish_keys (id) on delete restrict,
  last_used_at timestamptz,
  label text,
  constraint publish_keys_bot_id_format
    check (bot_id ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  constraint publish_keys_key_id_format
    check (key_id ~ '^pk_[A-Za-z0-9_-]{8,64}$'),
  constraint publish_keys_key_hash_format
    check (key_hash ~ '^[0-9a-f]{64}$'),
  constraint publish_keys_hash_alg_check
    check (hash_alg = 'sha256'),
  constraint publish_keys_label_length
    check (label is null or char_length(label) <= 120),
  constraint publish_keys_expiry_after_create
    check (expires_at is null or expires_at > created_at)
);

comment on table public.publish_keys is
  'SHA-256 hashes of per-bot publish keys. There is no plaintext column. Revoke and rotate; do not edit a hash in place.';
comment on column public.publish_keys.key_hash is
  'Lowercase hex SHA-256 of the raw UTF-8 key. The secret itself is never stored.';
comment on column public.publish_keys.key_id is
  'Public identifier safe to put in logs. It is not the secret and not the hash.';

create index publish_keys_bot_id_idx on public.publish_keys (bot_id);
create index publish_keys_rotated_from_idx on public.publish_keys (rotated_from);
create index publish_keys_active_bot_idx
  on public.publish_keys (bot_id)
  where revoked_at is null;

-- ---------------------------------------------------------------------------
-- Guard trigger. Runs for table owners and service-role functions too, so a
-- direct update cannot skip the state machine.
-- ---------------------------------------------------------------------------

create or replace function private.puzzle_drafts_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $guard$
declare
  v_content_changed boolean;
  v_bot_id text;
begin
  if tg_op = 'INSERT' then
    v_bot_id := private.current_bot_id();
    if v_bot_id is not null then
      new.created_by_bot := v_bot_id;
    elsif private.caller_is_publish_service() then
      if new.created_by_bot is null or btrim(new.created_by_bot) = '' then
        raise exception 'created_by_bot is required' using errcode = '22023';
      end if;
    else
      raise exception 'not allowed to insert puzzle drafts' using errcode = '42501';
    end if;

    new.created_by := auth.uid();
    new.status := 'draft';
    new.revision := 1;
    new.history := '[]'::jsonb;
    new.approved_by := null;
    new.approved_at := null;
    new.feedback := null;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  if tg_op <> 'UPDATE' then
    raise exception 'puzzle draft changes are not allowed' using errcode = '42501';
  end if;

  if old.status = 'published' then
    raise exception 'published puzzle drafts are immutable' using errcode = '55000';
  end if;

  new.id := old.id;
  new.created_by_bot := old.created_by_bot;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_at := now();

  v_content_changed :=
    new.payload is distinct from old.payload
    or new.game_type is distinct from old.game_type
    or new.target_date is distinct from old.target_date;

  if v_content_changed then
    new.history := old.history || jsonb_build_array(jsonb_build_object(
      'revision', old.revision,
      'game_type', old.game_type,
      'target_date', old.target_date,
      'payload', old.payload,
      'status', old.status,
      'feedback', old.feedback,
      'approved_by', old.approved_by,
      'approved_at', old.approved_at,
      'recorded_at', now()
    ));
    new.revision := old.revision + 1;
    new.status := 'draft';
    new.approved_by := null;
    new.approved_at := null;
    new.feedback := old.feedback;
    return new;
  end if;

  new.payload := old.payload;
  new.game_type := old.game_type;
  new.target_date := old.target_date;

  if new.status is not distinct from old.status and new.feedback is not distinct from old.feedback then
    new.status := old.status;
    new.feedback := old.feedback;
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
    new.revision := old.revision;
    new.history := old.history;
    return new;
  end if;

  if new.status is distinct from old.status and new.status = 'published' then
    if old.status <> 'approved' then
      raise exception 'approval required before publish' using errcode = '55000';
    end if;
    if not private.caller_is_publish_service() then
      raise exception 'only the publish service can mark a draft published' using errcode = '42501';
    end if;
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
  elsif private.is_puzzle_admin() is not true or auth.uid() is null then
    raise exception 'only an admin can review puzzle drafts' using errcode = '42501';
  elsif new.status = 'approved' then
    new.approved_by := auth.uid();
    new.approved_at := now();
  elsif new.status in ('draft', 'rejected') then
    new.approved_by := null;
    new.approved_at := null;
  else
    raise exception 'puzzle draft status change is not allowed' using errcode = '22023';
  end if;

  new.history := old.history || jsonb_build_array(jsonb_build_object(
    'revision', old.revision,
    'game_type', old.game_type,
    'target_date', old.target_date,
    'payload', old.payload,
    'status', old.status,
    'feedback', old.feedback,
    'approved_by', old.approved_by,
    'approved_at', old.approved_at,
    'recorded_at', now()
  ));
  new.revision := old.revision + 1;
  return new;
end;
$guard$;

create trigger puzzle_drafts_guard
  before insert or update on public.puzzle_drafts
  for each row
  execute function private.puzzle_drafts_guard();

-- ---------------------------------------------------------------------------
-- Privileges. Default grants on a new public table include anon and
-- authenticated; take those back, then grant only the columns a bot may send.
-- Approval columns are not client-writable. publish_keys has no client grant.
-- service_role reaches drafts only through the security-definer functions.
-- ---------------------------------------------------------------------------

alter table public.puzzle_drafts enable row level security;
alter table public.puzzle_drafts force row level security;
alter table public.publish_keys enable row level security;
alter table public.publish_keys force row level security;

revoke all on table public.puzzle_drafts from public, anon, authenticated, service_role;
revoke all on table public.publish_keys from public, anon, authenticated, service_role;

grant select on table public.puzzle_drafts to authenticated;
grant insert (game_type, target_date, payload, created_by_bot)
  on table public.puzzle_drafts to authenticated;
grant update (game_type, target_date, payload)
  on table public.puzzle_drafts to authenticated;

create policy puzzle_drafts_select
  on public.puzzle_drafts
  for select
  to authenticated
  using (
    (select private.is_puzzle_admin())
    or (
      (select private.current_bot_id()) is not null
      and created_by_bot = (select private.current_bot_id())
    )
  );

create policy puzzle_drafts_insert
  on public.puzzle_drafts
  for insert
  to authenticated
  with check (
    (select private.current_bot_id()) is not null
    and created_by_bot = (select private.current_bot_id())
    and status = 'draft'
    and approved_by is null
    and approved_at is null
    and revision = 1
  );

-- Published rows stay visible to the owning bot so the guard trigger can reject
-- the update. Hiding them in USING would make the write a silent zero-row update.
create policy puzzle_drafts_update
  on public.puzzle_drafts
  for update
  to authenticated
  using (
    (select private.current_bot_id()) is not null
    and created_by_bot = (select private.current_bot_id())
  )
  with check (
    (select private.current_bot_id()) is not null
    and created_by_bot = (select private.current_bot_id())
    and status <> 'published'
  );

-- No delete policy: clients cannot delete drafts or keys.

-- Live puzzles stay service-role writes. A later permissive insert policy
-- still cannot admit anon or authenticated because these are restrictive.
revoke insert, update, delete, truncate on table public.games from anon, authenticated;

drop policy if exists games_no_client_insert on public.games;
create policy games_no_client_insert
  on public.games
  as restrictive
  for insert
  to anon, authenticated
  with check (false);

drop policy if exists games_no_client_update on public.games;
create policy games_no_client_update
  on public.games
  as restrictive
  for update
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists games_no_client_delete on public.games;
create policy games_no_client_delete
  on public.games
  as restrictive
  for delete
  to anon, authenticated
  using (false);

-- ---------------------------------------------------------------------------
-- Server-side key and draft operations. Public wrappers are security invoker
-- and are granted only to the role that may call them. The bodies live in
-- private, which is not an exposed Data API schema.
-- ---------------------------------------------------------------------------

create or replace function private.assert_publish_key_fields(
  p_bot_id text,
  p_key_id text,
  p_key_hash text,
  p_expires_at timestamptz,
  p_label text
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if p_bot_id is null or p_bot_id !~ '^[a-z0-9][a-z0-9_-]{0,63}$' then
    raise exception 'bot_id must match ^[a-z0-9][a-z0-9_-]{0,63}$' using errcode = '22023';
  end if;
  if p_key_id is null or p_key_id !~ '^pk_[A-Za-z0-9_-]{8,64}$' then
    raise exception 'key_id must look like pk_ followed by 8-64 url-safe characters' using errcode = '22023';
  end if;
  if p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'key_hash must be 64 lowercase hex characters' using errcode = '22023';
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'expires_at must be in the future' using errcode = '22023';
  end if;
  if p_label is not null and char_length(p_label) > 120 then
    raise exception 'label must be 120 characters or fewer' using errcode = '22023';
  end if;
end;
$fn$;

create or replace function private.resolve_publish_key(p_key_hash text)
returns table (bot_id text, key_id text, key_uuid uuid)
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_bot text;
  v_key_id text;
  v_uuid uuid;
begin
  if not private.caller_is_publish_service() then
    raise exception 'publish key operations are server-side only' using errcode = '42501';
  end if;
  if p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid publish key' using errcode = '42501';
  end if;

  update public.publish_keys as keys
  set last_used_at = now()
  where keys.key_hash = p_key_hash
    and keys.revoked_at is null
    and (keys.expires_at is null or keys.expires_at > now())
  returning keys.bot_id, keys.key_id, keys.id
  into v_bot, v_key_id, v_uuid;

  if not found then
    raise exception 'invalid publish key' using errcode = '42501';
  end if;

  bot_id := v_bot;
  key_id := v_key_id;
  key_uuid := v_uuid;
  return next;
end;
$fn$;

create or replace function private.verify_publish_key(p_key_hash text)
returns table (bot_id text, key_id text)
language sql
security definer
set search_path = ''
as $fn$
  select resolved.bot_id, resolved.key_id
  from private.resolve_publish_key(p_key_hash) as resolved;
$fn$;

create or replace function private.register_publish_key(
  p_bot_id text,
  p_key_id text,
  p_key_hash text,
  p_expires_at timestamptz default null,
  p_label text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_id uuid;
begin
  if not private.caller_is_publish_service() then
    raise exception 'publish key operations are server-side only' using errcode = '42501';
  end if;
  perform private.assert_publish_key_fields(p_bot_id, p_key_id, p_key_hash, p_expires_at, p_label);
  insert into public.publish_keys (bot_id, key_id, key_hash, expires_at, label, created_by)
  values (p_bot_id, p_key_id, p_key_hash, p_expires_at, p_label, auth.uid())
  returning id into v_id;
  return v_id;
end;
$fn$;

create or replace function private.revoke_publish_key(p_key_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if not private.caller_is_publish_service() then
    raise exception 'publish key operations are server-side only' using errcode = '42501';
  end if;
  update public.publish_keys
  set revoked_at = now(),
      revoked_by = auth.uid()
  where id = p_key_id
    and revoked_at is null;
  if not found then
    raise exception 'publish key is not active' using errcode = '42501';
  end if;
end;
$fn$;

create or replace function private.rotate_publish_key(
  p_old_id uuid,
  p_new_key_id text,
  p_new_key_hash text,
  p_expires_at timestamptz default null,
  p_label text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_bot_id text;
  v_old_hash text;
  v_id uuid;
begin
  if not private.caller_is_publish_service() then
    raise exception 'publish key operations are server-side only' using errcode = '42501';
  end if;

  select keys.bot_id, keys.key_hash
  into v_bot_id, v_old_hash
  from public.publish_keys as keys
  where keys.id = p_old_id
    and keys.revoked_at is null
  for update;

  if not found then
    raise exception 'publish key is not active' using errcode = '42501';
  end if;
  if p_new_key_hash = v_old_hash then
    raise exception 'rotated key must differ from the key it replaces' using errcode = '22023';
  end if;

  perform private.assert_publish_key_fields(v_bot_id, p_new_key_id, p_new_key_hash, p_expires_at, p_label);

  update public.publish_keys
  set revoked_at = now(),
      revoked_by = auth.uid()
  where id = p_old_id;

  insert into public.publish_keys (bot_id, key_id, key_hash, expires_at, label, rotated_from, created_by)
  values (v_bot_id, p_new_key_id, p_new_key_hash, p_expires_at, p_label, p_old_id, auth.uid())
  returning id into v_id;
  return v_id;
end;
$fn$;

create or replace function private.submit_puzzle_draft(
  p_key_hash text,
  p_game_type text,
  p_target_date date,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_bot_id text;
  v_id uuid;
begin
  if not private.caller_is_publish_service() then
    raise exception 'publish key operations are server-side only' using errcode = '42501';
  end if;
  if p_game_type not in ('connections', 'crossword') then
    raise exception 'game_type must be connections or crossword' using errcode = '22023';
  end if;
  if p_target_date is null then
    raise exception 'target_date is required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'payload must be a json object' using errcode = '22023';
  end if;
  if octet_length(p_payload::text) > 65536 then
    raise exception 'payload is too large' using errcode = '22023';
  end if;

  select resolved.bot_id into v_bot_id
  from private.resolve_publish_key(p_key_hash) as resolved;

  insert into public.puzzle_drafts (game_type, target_date, payload, created_by_bot)
  values (p_game_type, p_target_date, p_payload, v_bot_id)
  returning id into v_id;
  return v_id;
end;
$fn$;

create or replace function private.update_puzzle_draft(
  p_key_hash text,
  p_draft_id uuid,
  p_game_type text,
  p_target_date date,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_bot_id text;
  v_owner text;
begin
  if not private.caller_is_publish_service() then
    raise exception 'publish key operations are server-side only' using errcode = '42501';
  end if;
  if p_game_type not in ('connections', 'crossword') then
    raise exception 'game_type must be connections or crossword' using errcode = '22023';
  end if;
  if p_target_date is null then
    raise exception 'target_date is required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'payload must be a json object' using errcode = '22023';
  end if;
  if octet_length(p_payload::text) > 65536 then
    raise exception 'payload is too large' using errcode = '22023';
  end if;

  select resolved.bot_id into v_bot_id
  from private.resolve_publish_key(p_key_hash) as resolved;

  select drafts.created_by_bot
  into v_owner
  from public.puzzle_drafts as drafts
  where drafts.id = p_draft_id
  for update;

  if not found or v_owner is distinct from v_bot_id then
    raise exception 'puzzle draft not found' using errcode = '42501';
  end if;

  update public.puzzle_drafts
  set game_type = p_game_type,
      target_date = p_target_date,
      payload = p_payload
  where id = p_draft_id;
  return p_draft_id;
end;
$fn$;

create or replace function private.review_puzzle_draft(
  p_draft_id uuid,
  p_decision text,
  p_feedback text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_status text;
begin
  if private.is_puzzle_admin() is not true or auth.uid() is null then
    raise exception 'only an admin can review puzzle drafts' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'review decision must be approved or rejected' using errcode = '22023';
  end if;
  if p_feedback is not null and char_length(p_feedback) > 4000 then
    raise exception 'feedback is too long' using errcode = '22023';
  end if;

  select drafts.status
  into v_status
  from public.puzzle_drafts as drafts
  where drafts.id = p_draft_id
  for update;

  if not found then
    raise exception 'puzzle draft not found' using errcode = '42501';
  end if;
  if v_status = 'published' then
    raise exception 'published puzzle drafts are immutable' using errcode = '55000';
  end if;

  update public.puzzle_drafts
  set status = p_decision,
      feedback = nullif(btrim(p_feedback), '')
  where id = p_draft_id;
  return p_draft_id;
end;
$fn$;

create or replace function private.mark_puzzle_draft_published(p_draft_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_status text;
begin
  if not private.caller_is_publish_service() then
    raise exception 'only the publish service can mark a draft published' using errcode = '42501';
  end if;

  select drafts.status
  into v_status
  from public.puzzle_drafts as drafts
  where drafts.id = p_draft_id
  for update;

  if not found then
    raise exception 'puzzle draft not found' using errcode = '42501';
  end if;
  if v_status <> 'approved' then
    raise exception 'approval required before publish' using errcode = '55000';
  end if;

  update public.puzzle_drafts
  set status = 'published'
  where id = p_draft_id;
  return p_draft_id;
end;
$fn$;

create or replace function public.review_puzzle_draft(
  p_draft_id uuid,
  p_decision text,
  p_feedback text
)
returns uuid
language sql
security invoker
set search_path = ''
as $fn$
  select private.review_puzzle_draft(p_draft_id, p_decision, p_feedback);
$fn$;

create or replace function public.submit_puzzle_draft(
  p_key_hash text,
  p_game_type text,
  p_target_date date,
  p_payload jsonb
)
returns uuid
language sql
security invoker
set search_path = ''
as $fn$
  select private.submit_puzzle_draft(p_key_hash, p_game_type, p_target_date, p_payload);
$fn$;

create or replace function public.update_puzzle_draft(
  p_key_hash text,
  p_draft_id uuid,
  p_game_type text,
  p_target_date date,
  p_payload jsonb
)
returns uuid
language sql
security invoker
set search_path = ''
as $fn$
  select private.update_puzzle_draft(p_key_hash, p_draft_id, p_game_type, p_target_date, p_payload);
$fn$;

create or replace function public.verify_publish_key(p_key_hash text)
returns table (bot_id text, key_id text)
language sql
security invoker
set search_path = ''
as $fn$
  select verified.bot_id, verified.key_id
  from private.verify_publish_key(p_key_hash) as verified;
$fn$;

create or replace function public.register_publish_key(
  p_bot_id text,
  p_key_id text,
  p_key_hash text,
  p_expires_at timestamptz default null,
  p_label text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $fn$
  select private.register_publish_key(p_bot_id, p_key_id, p_key_hash, p_expires_at, p_label);
$fn$;

create or replace function public.revoke_publish_key(p_key_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $fn$
begin
  perform private.revoke_publish_key(p_key_id);
end;
$fn$;

create or replace function public.rotate_publish_key(
  p_old_id uuid,
  p_new_key_id text,
  p_new_key_hash text,
  p_expires_at timestamptz default null,
  p_label text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $fn$
  select private.rotate_publish_key(p_old_id, p_new_key_id, p_new_key_hash, p_expires_at, p_label);
$fn$;

create or replace function public.mark_puzzle_draft_published(p_draft_id uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $fn$
  select private.mark_puzzle_draft_published(p_draft_id);
$fn$;

comment on function public.review_puzzle_draft(uuid, text, text) is
  'Admin review. approved_by is auth.uid() from app_metadata puzzle_role=admin. Does not publish and does not change the payload.';
comment on function public.submit_puzzle_draft(text, text, date, jsonb) is
  'Service-role draft insert. p_key_hash is a sha256 hex digest, never the plaintext key. Inserts status draft only.';
comment on function public.update_puzzle_draft(text, uuid, text, date, jsonb) is
  'Service-role content edit for the key''s own bot. Clears approval and appends history.';
comment on function public.verify_publish_key(text) is
  'Service-role hash lookup. Returns bot_id and key_id. Does not approve or write a draft.';
comment on function public.register_publish_key(text, text, text, timestamptz, text) is
  'Service-role registration of a key hash. Rejects plaintext-shaped values that are not 64 lowercase hex chars.';
comment on function public.revoke_publish_key(uuid) is
  'Service-role revocation. The row is kept. The hash cannot be used again.';
comment on function public.rotate_publish_key(uuid, text, text, timestamptz, text) is
  'Service-role rotation. Revokes the old row and inserts a new hash with rotated_from set.';
comment on function public.mark_puzzle_draft_published(uuid) is
  'Service-role transition from approved to published. Does not write public.games and does not approve.';

revoke all on function public.review_puzzle_draft(uuid, text, text) from public, anon, authenticated, service_role;
grant execute on function public.review_puzzle_draft(uuid, text, text) to authenticated;

revoke all on function public.submit_puzzle_draft(text, text, date, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.submit_puzzle_draft(text, text, date, jsonb) to service_role;

revoke all on function public.update_puzzle_draft(text, uuid, text, date, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.update_puzzle_draft(text, uuid, text, date, jsonb) to service_role;

revoke all on function public.verify_publish_key(text) from public, anon, authenticated, service_role;
grant execute on function public.verify_publish_key(text) to service_role;

revoke all on function public.register_publish_key(text, text, text, timestamptz, text) from public, anon, authenticated, service_role;
grant execute on function public.register_publish_key(text, text, text, timestamptz, text) to service_role;

revoke all on function public.revoke_publish_key(uuid) from public, anon, authenticated, service_role;
grant execute on function public.revoke_publish_key(uuid) to service_role;

revoke all on function public.rotate_publish_key(uuid, text, text, timestamptz, text) from public, anon, authenticated, service_role;
grant execute on function public.rotate_publish_key(uuid, text, text, timestamptz, text) to service_role;

revoke all on function public.mark_puzzle_draft_published(uuid) from public, anon, authenticated, service_role;
grant execute on function public.mark_puzzle_draft_published(uuid) to service_role;

revoke all on all functions in schema private from public, anon, authenticated, service_role;

grant execute on function private.puzzle_role() to authenticated, service_role;
grant execute on function private.is_puzzle_admin() to authenticated, service_role;
grant execute on function private.current_bot_id() to authenticated, service_role;
grant execute on function private.caller_is_publish_service() to authenticated, service_role;
grant execute on function private.puzzle_drafts_guard() to authenticated, service_role;
grant execute on function private.review_puzzle_draft(uuid, text, text) to authenticated;
grant execute on function private.submit_puzzle_draft(text, text, date, jsonb) to service_role;
grant execute on function private.update_puzzle_draft(text, uuid, text, date, jsonb) to service_role;
grant execute on function private.verify_publish_key(text) to service_role;
grant execute on function private.register_publish_key(text, text, text, timestamptz, text) to service_role;
grant execute on function private.revoke_publish_key(uuid) to service_role;
grant execute on function private.rotate_publish_key(uuid, text, text, timestamptz, text) to service_role;
grant execute on function private.mark_puzzle_draft_published(uuid) to service_role;
