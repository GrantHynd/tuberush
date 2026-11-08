-- Bound puzzle_drafts.history to the eight most recent snapshots.
--
-- The live payload is already capped at 65536 bytes. private.puzzle_drafts_guard
-- copies that payload into history on every content edit and review, and the
-- previous check only required history to be a jsonb array. Eight snapshots
-- cover a few review cycles and keep the copies near 8 * 64 KiB instead of
-- growing on every update. Older snapshots are dropped from the front. Newest
-- stays last. revision keeps increasing.
--
-- Authorship, approval, publish-key checks, and the state machine are unchanged.
-- The guard stays security invoker with an empty search_path. This grants nothing.

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
    while jsonb_array_length(new.history) > 8 loop
      new.history := new.history - 0;
    end loop;
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
    while jsonb_array_length(new.history) > 8 loop
      new.history := new.history - 0;
    end loop;
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
  while jsonb_array_length(new.history) > 8 loop
    new.history := new.history - 0;
  end loop;
  new.revision := old.revision + 1;
  return new;
end;
$guard$;

-- Trim rows that already stored more than eight snapshots. The no-op branch
-- above drops from the front and leaves revision, payload, status, and approval
-- alone. updated_at moves because the row changed.
update public.puzzle_drafts
set history = history
where jsonb_array_length(history) > 8;

alter table public.puzzle_drafts
  add constraint puzzle_drafts_history_retention
  check (
    case
      when jsonb_typeof(history) = 'array' then jsonb_array_length(history) <= 8
      else false
    end
  );

comment on column public.puzzle_drafts.history is
  'Previous revisions, newest last, at most 8 snapshots. Each entry is the row from before that change.';
