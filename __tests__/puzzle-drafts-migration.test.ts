import { readFileSync } from 'fs';
import { join } from 'path';

const migration = readFileSync(
  join(__dirname, '../supabase/migrations/20261107180000_puzzle_drafts_publish_keys.sql'),
  'utf8',
);

function revokeLine(signature: string): RegExp {
  const escaped = signature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `revoke all on function public\\.${escaped} from public, anon, authenticated, service_role;`,
    'i',
  );
}

describe('puzzle draft migration (TUB-331)', () => {
  it('does not authorize from user-editable metadata', () => {
    expect(migration).not.toMatch(/user_metadata/);
    expect(migration).not.toMatch(/raw_user_meta_data/);
    expect(migration).toMatch(/raw_app_meta_data ->> 'puzzle_role'/);
    expect(migration).toMatch(/private\.puzzle_role\(\) = 'admin'/);
    expect(migration).toMatch(/private\.puzzle_role\(\) = 'bot'/);
  });

  it('stores publish-key hashes and no plaintext secret column', () => {
    expect(migration).toMatch(/key_hash text not null unique/);
    expect(migration).toMatch(/hash_alg text not null default 'sha256'/);
    expect(migration).toMatch(/key_hash ~ '\^\[0-9a-f\]\{64\}\$'/);
    expect(migration).not.toMatch(/\bplaintext\s+text\b/i);
    expect(migration).not.toMatch(/\bapi_key\s+text\b/i);
    expect(migration).toMatch(/rotated_from uuid references public\.publish_keys/);
    expect(migration).toMatch(/revoked_at timestamptz/);
    expect(migration).toMatch(/comment on column public\.publish_keys\.key_hash is/);
  });

  it('enables and forces RLS, then revokes ordinary client grants', () => {
    expect(migration).toMatch(/alter table public\.puzzle_drafts enable row level security;/);
    expect(migration).toMatch(/alter table public\.puzzle_drafts force row level security;/);
    expect(migration).toMatch(/alter table public\.publish_keys enable row level security;/);
    expect(migration).toMatch(/alter table public\.publish_keys force row level security;/);
    expect(migration).toMatch(
      /revoke all on table public\.puzzle_drafts from public, anon, authenticated, service_role;/,
    );
    expect(migration).toMatch(
      /revoke all on table public\.publish_keys from public, anon, authenticated, service_role;/,
    );
    expect(migration).not.toMatch(/create policy[^;]*on public\.publish_keys/i);
    expect(migration).not.toMatch(/grant .* on table public\.publish_keys to (anon|authenticated|service_role)/i);
  });

  it('lets a bot write content columns and not approval columns', () => {
    expect(migration).toMatch(
      /grant insert \(game_type, target_date, payload, created_by_bot\)\s+on table public\.puzzle_drafts to authenticated;/,
    );
    expect(migration).toMatch(
      /grant update \(game_type, target_date, payload\)\s+on table public\.puzzle_drafts to authenticated;/,
    );
    expect(migration).not.toMatch(/grant update \([^)]*status[^)]*\) on table public\.puzzle_drafts/i);
    expect(migration).not.toMatch(/grant update \([^)]*approved_by[^)]*\) on table public\.puzzle_drafts/i);
    expect(migration).toMatch(/created_by_bot = \(select private\.current_bot_id\(\)\)/);
  });

  it('clears approval when payload, game type, or date changes and freezes published rows', () => {
    expect(migration).toMatch(/new\.payload is distinct from old\.payload/);
    expect(migration).toMatch(/new\.game_type is distinct from old\.game_type/);
    expect(migration).toMatch(/new\.target_date is distinct from old\.target_date/);
    expect(migration).toMatch(/new\.status := 'draft';/);
    expect(migration).toMatch(/new\.approved_by := null;/);
    expect(migration).toMatch(/new\.approved_at := null;/);
    expect(migration).toMatch(/new\.revision := old\.revision \+ 1;/);
    expect(migration).toMatch(/if old\.status = 'published' then/);
    expect(migration).toMatch(/raise exception 'published puzzle drafts are immutable'/);
    expect(migration).toMatch(/new\.approved_by := auth\.uid\(\);/);
  });

  it('keeps approval and publish-key RPCs on the server role that is allowed to call them', () => {
    expect(migration).toMatch(revokeLine('review_puzzle_draft(uuid, text, text)'));
    expect(migration).toMatch(
      /grant execute on function public\.review_puzzle_draft\(uuid, text, text\) to authenticated;/,
    );
    expect(migration).not.toMatch(
      /grant execute on function public\.review_puzzle_draft\(uuid, text, text\) to service_role;/,
    );

    for (const signature of [
      'submit_puzzle_draft(text, text, date, jsonb)',
      'update_puzzle_draft(text, uuid, text, date, jsonb)',
      'verify_publish_key(text)',
      'register_publish_key(text, text, text, timestamptz, text)',
      'revoke_publish_key(uuid)',
      'rotate_publish_key(uuid, text, text, timestamptz, text)',
      'mark_puzzle_draft_published(uuid)',
    ]) {
      expect(migration).toMatch(revokeLine(signature));
      expect(migration).toMatch(
        new RegExp(`grant execute on function public\\.${signature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} to service_role;`),
      );
      expect(migration).not.toMatch(
        new RegExp(
          `grant execute on function public\\.${signature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} to authenticated;`,
        ),
      );
    }

    expect(migration).toMatch(/only an admin can review puzzle drafts/);
    expect(migration).toMatch(/approval required before publish/);
    expect(migration).toMatch(/publish key operations are server-side only/);
    expect(migration).toMatch(/revoke insert, update, delete, truncate on table public\.games from anon, authenticated;/);
    expect(migration).toMatch(/create policy games_no_client_insert/);
  });

  it('pins search_path on every new function', () => {
    const bodies = migration.match(/create or replace function[\s\S]*?as \$(?:fn|guard)\$/g) ?? [];
    expect(bodies.length).toBeGreaterThan(10);
    for (const body of bodies) {
      expect(body).toMatch(/set search_path = ''/);
    }
  });
});
