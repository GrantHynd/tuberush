/**
 * Delete the signed-in user's account.
 *
 * The caller is identified from their JWT (`GET /auth/v1/user`). The body is
 * ignored so a client cannot name a different user. Associated rows are removed
 * with the service role, then the auth user is hard-deleted.
 *
 * Deploy with the platform JWT check left on (verify_jwt = true, the default).
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Tables that hold a player's own data, deleted before the auth user. */
const USER_TABLES: { table: string; column: string }[] = [
  { table: 'leaderboard', column: 'user_id' },
  { table: 'game_states', column: 'user_id' },
  { table: 'custom_puzzles', column: 'user_id' },
  { table: 'profiles', column: 'id' },
];

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function log(step: string, detail?: unknown) {
  try {
    console.log(JSON.stringify({ step, detail, ts: new Date().toISOString() }));
  } catch {
    console.log(`[${step}]`);
  }
}

function baseUrl(raw: string): string {
  return raw.replace(/\/$/, '');
}

function serviceHeaders(serviceKey: string, extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Accept: 'application/json',
    ...extra,
  };
}

async function deleteUserRows(
  supabaseUrl: string,
  serviceKey: string,
  table: string,
  column: string,
  userId: string,
): Promise<void> {
  const filter = `${column}=eq.${encodeURIComponent(userId)}`;
  const url = `${baseUrl(supabaseUrl)}/rest/v1/${table}?${filter}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: serviceHeaders(serviceKey, { Prefer: 'return=minimal' }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    log('delete_rows_failed', { table, status: res.status, body: body.slice(0, 200) });
    throw new Error(`delete ${table} failed`);
  }
}

serve((req: Request) => {
  return (async () => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY');
    const anonKey =
      Deno.env.get('SUPABASE_ANON_KEY') ??
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ??
      serviceKey;

    if (!supabaseUrl || !serviceKey || !anonKey) {
      log('missing_env', {
        hasUrl: Boolean(supabaseUrl),
        hasServiceKey: Boolean(serviceKey),
        hasAnonKey: Boolean(anonKey),
      });
      return json({ error: 'Could not delete your account. Please try again.' }, 500);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return json({ error: 'You need to be signed in to delete your account.' }, 401);
    }

    const userRes = await fetch(`${baseUrl(supabaseUrl)}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: authHeader,
      },
    });
    if (!userRes.ok) {
      log('get_user_failed', { status: userRes.status });
      return json({ error: 'You need to be signed in to delete your account.' }, 401);
    }

    const user = await userRes.json().catch(() => null) as { id?: unknown; role?: unknown } | null;
    const userId = typeof user?.id === 'string' ? user.id : '';
    const role = typeof user?.role === 'string' ? user.role : null;
    // `/auth/v1/user` already proved the bearer token. Reject service-role callers
    // when a role is present; a missing role still belongs to the signed-in user.
    if (!UUID_RE.test(userId) || (role !== null && role !== 'authenticated')) {
      log('invalid_user', { hasId: Boolean(userId), role });
      return json({ error: 'You need to be signed in to delete your account.' }, 401);
    }

    // Drop refresh tokens before the user row disappears. Access tokens are
    // stateless until they expire; the client discards its session after this.
    const logoutRes = await fetch(`${baseUrl(supabaseUrl)}/auth/v1/logout?scope=global`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });
    if (!logoutRes.ok) {
      log('logout_warn', { status: logoutRes.status });
    }

    try {
      for (const { table, column } of USER_TABLES) {
        await deleteUserRows(supabaseUrl, serviceKey, table, column, userId);
      }
    } catch {
      return json({ error: 'Could not delete your account. Please try again.' }, 500);
    }

    const deleteUserRes = await fetch(
      `${baseUrl(supabaseUrl)}/auth/v1/admin/users/${userId}`,
      {
        method: 'DELETE',
        headers: serviceHeaders(serviceKey, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ should_soft_delete: false }),
      },
    );
    if (!deleteUserRes.ok) {
      const body = await deleteUserRes.text().catch(() => '');
      log('delete_auth_user_failed', { status: deleteUserRes.status, body: body.slice(0, 200) });
      return json({ error: 'Could not delete your account. Please try again.' }, 500);
    }

    log('deleted', { userId });
    return json({ ok: true }, 200);
  })().catch((error: unknown) => {
    log('unhandled', { message: error instanceof Error ? error.message : 'unknown' });
    return json({ error: 'Could not delete your account. Please try again.' }, 500);
  });
});
