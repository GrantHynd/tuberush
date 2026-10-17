/**
 * TUB-234 integration test: clients must not be able to write premium columns on `profiles`.
 *
 * Runs against a real Supabase project with migration 20261017000000_lock_is_premium_column.sql applied.
 * Skipped (reported as skipped, not passed) unless TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY
 * and TEST_SUPABASE_SERVICE_KEY are set. The project must allow sign-up without email confirmation.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.TEST_SUPABASE_URL ?? '';
const ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY ?? '';
const SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY ?? '';

const describeIntegration = URL && ANON_KEY && SERVICE_KEY ? describe : describe.skip;

const PERMISSION_DENIED = '42501';
const PASSWORD = 'TestPassword123!';
const clientOptions = { auth: { autoRefreshToken: false, persistSession: false } };

// Untyped client: lib/database.types.ts doesn't model every profiles column (e.g. username).
type Client = SupabaseClient;

async function createSignedInUser(): Promise<{ client: Client; userId: string }> {
  const client = createClient(URL, ANON_KEY, clientOptions);
  const email = `tub234-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: PASSWORD });
  if (error || !data.user) throw new Error(`signUp failed: ${error?.message}`);
  if (!data.session) {
    const { error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD });
    if (signInError) throw new Error(`signIn failed: ${signInError.message}`);
  }
  return { client, userId: data.user.id };
}

describeIntegration('profiles premium columns are server-side only (TUB-234)', () => {
  let service: Client;
  let user: Client;
  let userId: string;

  beforeAll(async () => {
    service = createClient(URL, SERVICE_KEY, clientOptions);
    ({ client: user, userId } = await createSignedInUser());
  });

  afterAll(async () => {
    if (userId) await service.auth.admin.deleteUser(userId);
  });

  async function readPremium(): Promise<boolean | null> {
    const { data, error } = await service.from('profiles').select('is_premium').eq('id', userId).single();
    if (error) throw error;
    return data.is_premium;
  }

  it('rejects a client setting is_premium = true', async () => {
    const { error } = await user.from('profiles').update({ is_premium: true }).eq('id', userId);
    expect(error?.code).toBe(PERMISSION_DENIED);
    expect(await readPremium()).toBe(false);
  });

  it.each([
    ['expires_at', new Date(Date.now() + 365 * 864e5).toISOString()],
    ['apple_original_transaction_id', 'fake-txn'],
  ])('rejects a client writing %s', async (column, value) => {
    const { error } = await user.from('profiles').update({ [column]: value }).eq('id', userId);
    expect(error?.code).toBe(PERMISSION_DENIED);
  });

  it('still lets a client update city and borough', async () => {
    const { error } = await user.from('profiles').update({ city: 'London', borough: 'Hackney' }).eq('id', userId);
    expect(error).toBeNull();

    const { data } = await user.from('profiles').select('city, borough').eq('id', userId).single();
    expect(data).toEqual({ city: 'London', borough: 'Hackney' });
  });

  it('rejects a client inserting a profile with is_premium = true', async () => {
    const { error } = await user.from('profiles').insert({ id: userId, email: 'x@example.com', is_premium: true });
    expect(error?.code).toBe(PERMISSION_DENIED);
  });

  it('lets the service role grant and revoke premium', async () => {
    expect((await service.from('profiles').update({ is_premium: true }).eq('id', userId)).error).toBeNull();
    expect(await readPremium()).toBe(true);

    // A premium user can't downgrade/tamper either.
    const { error } = await user.from('profiles').update({ is_premium: false }).eq('id', userId);
    expect(error?.code).toBe(PERMISSION_DENIED);
    expect(await readPremium()).toBe(true);

    expect((await service.from('profiles').update({ is_premium: false }).eq('id', userId)).error).toBeNull();
    expect(await readPremium()).toBe(false);
  });
});
