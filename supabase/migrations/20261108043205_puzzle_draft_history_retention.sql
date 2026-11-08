-- Discard puzzle_drafts.history snapshots older than the eight newest.
-- This deletes those snapshots. They are not archived, and rolling this
-- migration back does not restore them. revision, payload, status, feedback,
-- approval, and authorship are left as they were. updated_at moves on a row
-- that was over the cap, because the guard already stamps every update.

create or replace function private.puzzle_drafts_retain_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
begin
  while jsonb_array_length(new.history) > 8 loop
    new.history := new.history - 0;
  end loop;
  return new;
end;
$fn$;

revoke all on function private.puzzle_drafts_retain_history() from public, anon, authenticated, service_role;
grant execute on function private.puzzle_drafts_retain_history() to authenticated, service_role;

-- Same event as puzzle_drafts_guard. BEFORE triggers run in name order, so
-- this name must stay after puzzle_drafts_guard and the guard must append first.
create trigger puzzle_drafts_retain_history
  before insert or update on public.puzzle_drafts
  for each row
  execute function private.puzzle_drafts_retain_history();

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
  'At most the eight newest previous revisions, newest last. Older snapshots are discarded.';
