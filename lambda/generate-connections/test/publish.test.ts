import { afterEach, before, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { handler } from '../src/index';

const SECRET = JSON.stringify({
  ANTHROPIC_API_KEY: 'test-key',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
});

const VALID_GROUPS = {
  groups: [
    { category: 'TUBE LINES', items: ['BAKERLOO', 'CENTRAL', 'DISTRICT', 'NORTHERN'], difficulty: 1 },
    { category: 'ROYAL PARKS', items: ['HYDE', 'REGENT', 'GREEN', 'ST JAMES'], difficulty: 2 },
    { category: 'LONDON AIRPORTS', items: ['HEATHROW', 'GATWICK', 'STANSTED', 'LUTON'], difficulty: 3 },
    { category: 'MONOPOLY STREETS', items: ['VINE', 'BOW', 'FLEET', 'STRAND'], difficulty: 4 },
  ],
};

interface Call {
  url: string;
  method: string;
  body?: string;
}

before(() => {
  process.env.SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:123:secret:test';
  const proto = Object.getPrototypeOf(SecretsManagerClient.prototype) as { send: (...args: unknown[]) => unknown };
  mock.method(proto, 'send', async () => ({ SecretString: SECRET }));
});

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function installFetch(routes: {
  nextval: () => Response;
  claudeText?: string;
}): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (input: unknown, init?: { method?: string; body?: unknown }) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? init.body : undefined;
    calls.push({ url, method, body });
    if (url.includes('/rpc/nextval_text')) return routes.nextval();
    if (url.includes('api.anthropic.com')) {
      return jsonResponse({ content: [{ type: 'text', text: routes.claudeText ?? '{}' }] });
    }
    if (url.includes('/rest/v1/games') && method === 'POST') return new Response(null, { status: 201 });
    if (url.includes('/rest/v1/games')) return jsonResponse([]);
    throw new Error(`unexpected fetch ${method} ${url}`);
  }) as typeof fetch;
  return calls;
}

function posts(calls: Call[], needle: string): Call[] {
  return calls.filter(call => call.method === 'POST' && call.url.includes(needle));
}

test('a failed or empty nextval_text does not publish a guessed id', async () => {
  for (const nextval of [
    () => jsonResponse({ message: 'permission denied' }, 500),
    () => jsonResponse(null),
    () => jsonResponse(1),
    () => jsonResponse(''),
  ]) {
    const calls = installFetch({ nextval });
    const result = await handler({} as never, {} as never);
    assert.equal(posts(calls, '/rest/v1/games').length, 0);
    assert.equal(posts(calls, 'api.anthropic.com').length, 0);
    assert.equal(result.generated, 0);
    assert.equal(result.results[0]?.status, 'error');
    assert.match(result.results[0]?.detail ?? '', /nextval_text/);
  }
});

test('normalized duplicate words and repeated difficulties are not published', async () => {
  const duplicateWords = structuredClone(VALID_GROUPS);
  duplicateWords.groups[1].items[0] = 'bakerloo';
  const repeatedDifficulty = structuredClone(VALID_GROUPS);
  repeatedDifficulty.groups[1].difficulty = 1;

  for (const [payload, message] of [
    [duplicateWords, /after normalization/],
    [repeatedDifficulty, /1, 2, 3 and 4/],
  ] as const) {
    const calls = installFetch({
      nextval: () => jsonResponse('501'),
      claudeText: JSON.stringify(payload),
    });
    const result = await handler({} as never, {} as never);
    assert.equal(posts(calls, '/rest/v1/games').length, 0);
    assert.equal(posts(calls, 'api.anthropic.com').length, 2);
    assert.equal(result.generated, 0);
    assert.equal(result.results[0]?.status, 'error');
    assert.match(result.results[0]?.detail ?? '', message);
  }
});

test('a valid Interchange payload publishes with the sequence id', async () => {
  const calls = installFetch({
    nextval: () => jsonResponse('501'),
    claudeText: JSON.stringify(VALID_GROUPS),
  });
  const result = await handler({} as never, {} as never);
  const inserts = posts(calls, '/rest/v1/games');
  assert.equal(inserts.length, 1);
  const row = JSON.parse(inserts[0].body!) as {
    game_type: string;
    is_published: boolean;
    puzzle_data: { id: string; groups: { color: string }[] };
  };
  assert.equal(row.game_type, 'connections');
  assert.equal(row.is_published, true);
  assert.equal(row.puzzle_data.id, '501');
  assert.deepEqual(
    row.puzzle_data.groups.map(group => group.color),
    ['#DC241F', '#007D32', '#0019A8', '#FFD329'],
  );
  assert.equal(result.generated, 1);
  assert.equal(result.results[0]?.status, 'created');
});
