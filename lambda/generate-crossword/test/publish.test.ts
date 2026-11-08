import { afterEach, before, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { handler } from '../src/index';
import { assertPublishablePuzzle } from '../../../supabase/functions/_shared/puzzle-validators';

const SECRET = JSON.stringify({
  ANTHROPIC_API_KEY: 'test-key',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
});

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
  clueFor?: (id: string) => string;
}): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (input: unknown, init?: { method?: string; body?: unknown }) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? init.body : undefined;
    calls.push({ url, method, body });
    if (url.includes('/rpc/nextval_text')) return routes.nextval();
    if (url.includes('api.anthropic.com')) {
      const prompt = JSON.parse(body!).messages[0].content as string;
      const rows = [...prompt.matchAll(/^(\d+[AD]) \| ([A-Z]+) /gm)];
      const clueFor = routes.clueFor ?? ((id: string) => `Clue for ${id}`);
      return jsonResponse({
        stop_reason: 'tool_use',
        content: [{
          type: 'tool_use',
          name: 'submit_clues',
          input: {
            title: 'Mocked Puzzle',
            clues: rows.map(([, id]) => ({ id, clue: clueFor(id) })),
            rejected: [],
          },
        }],
      });
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

test('a failed or empty nextval_text does not publish a guessed crossword id', async () => {
  for (const nextval of [
    () => jsonResponse({ message: 'permission denied' }, 500),
    () => jsonResponse(null),
    () => jsonResponse(100),
    () => jsonResponse(''),
  ]) {
    const calls = installFetch({ nextval });
    const result = await handler({} as never, {} as never);
    assert.equal(posts(calls, '/rest/v1/games').length, 0);
    assert.equal(posts(calls, 'api.anthropic.com').length, 0);
    assert.equal(result.generated, 0);
    assert.equal(result.results[0]?.status, 'error');
    assert.match(result.results[0]?.detail ?? '', /nextval_text/);
    assert.doesNotMatch(result.results[0]?.detail ?? '', /"id":"100"/);
  }
});

test('duplicate clue text is rejected before insert', async () => {
  const calls = installFetch({
    nextval: () => jsonResponse('77'),
    clueFor: () => 'Same clue text',
  });
  const result = await handler({} as never, {} as never);
  assert.equal(posts(calls, '/rest/v1/games').length, 0);
  assert.equal(result.generated, 0);
  assert.equal(result.results[0]?.status, 'error');
  assert.match(result.results[0]?.detail ?? '', /clue text repeats/);
});

test('a real assembled crossword publishes with the sequence id', async () => {
  const calls = installFetch({ nextval: () => jsonResponse('77') });
  const result = await handler({} as never, {} as never);
  const inserts = posts(calls, '/rest/v1/games');
  assert.equal(inserts.length, 1);
  const row = JSON.parse(inserts[0].body!) as {
    game_type: string;
    game_date: string;
    is_published: boolean;
    puzzle_data: { id: string; rows: number; cols: number; date: string };
  };
  assert.equal(row.game_type, 'crossword');
  assert.equal(row.is_published, true);
  assert.equal(row.puzzle_data.id, '77');
  assert.equal(row.puzzle_data.rows, 9);
  assert.equal(row.puzzle_data.cols, 9);
  assert.equal(Object.hasOwn(row.puzzle_data, 'schemaVersion'), false);
  assertPublishablePuzzle({
    gameType: 'crossword',
    targetDate: row.game_date,
    payload: row.puzzle_data,
  });
  assert.equal(result.generated, 1);
  assert.equal(result.results[0]?.status, 'created');
});
