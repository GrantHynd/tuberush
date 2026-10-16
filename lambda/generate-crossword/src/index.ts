/**
 * AWS Lambda: daily 9×9 crossword generation for TubeRush.
 * Triggered by EventBridge Scheduler (cron).
 *
 * 1. The black-square template is picked by day of week (grid.ts).
 * 2. A seeded solver fills the grid from the word bank + common British words (solver.ts, words.ts),
 *    so every crossing is correct by construction.
 * 3. Claude writes the title and clues via a forced tool call (clues.ts). Answers it rejects as
 *    unsuitable are excluded and the grid is re-filled.
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import type { ScheduledEvent, Context } from 'aws-lambda';
import {
  assembleCrosswordPayload,
  computeWordSlots,
  getCrosswordTemplateForDate,
  slotCells,
  slotId,
} from './grid';
import { fillGrid, type SolverSlot } from './solver';
import { buildPools, seededRandom } from './words';
import { CLAUDE_MODEL, writeClues } from './clues';

/** Grid re-fills allowed when Claude rejects answers. */
const MAX_FILL_ROUNDS = 4;
/** Different shuffles to try per round if the solver times out. */
const SEEDS_PER_ROUND = 5;
const FILL_TIME_LIMIT_MS = 10_000;

// ---------------------------------------------------------------------------
// Secrets
// ---------------------------------------------------------------------------

interface Secrets {
  ANTHROPIC_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const secretsClient = new SecretsManagerClient({});
let cachedSecrets: Secrets | null = null;

async function getSecrets(): Promise<Secrets> {
  if (cachedSecrets) return cachedSecrets;
  const secretArn = process.env.SECRET_ARN;
  if (!secretArn) throw new Error('SECRET_ARN env var not set');
  const res = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretArn }));
  if (!res.SecretString) throw new Error('Secret has no string value');
  cachedSecrets = JSON.parse(res.SecretString) as Secrets;
  return cachedSecrets;
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(step: string, detail?: unknown) {
  try {
    console.log(JSON.stringify({ step, detail, ts: new Date().toISOString() }));
  } catch {
    console.log(`[${step}]`);
  }
}

// ---------------------------------------------------------------------------
// PostgREST helpers
// ---------------------------------------------------------------------------

function baseUrl(raw: string): string {
  return raw.replace(/\/$/, '');
}

function restHeaders(
  serviceKey: string,
  extra?: Record<string, string>,
): Record<string, string> {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function restGameExists(
  supabaseUrl: string,
  serviceKey: string,
  gameDate: string,
): Promise<boolean> {
  const q = new URLSearchParams({
    select: 'id',
    game_type: 'eq.crossword',
    game_date: `eq.${gameDate}`,
    limit: '1',
  });
  const url = `${baseUrl(supabaseUrl)}/rest/v1/games?${q.toString()}`;
  const res = await fetch(url, { headers: restHeaders(serviceKey) });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    log('rest_select_warn', { status: res.status, body: t.slice(0, 200) });
    return false;
  }
  const rows: unknown = await res.json().catch(() => []);
  return Array.isArray(rows) && rows.length > 0;
}

async function restNextval(
  supabaseUrl: string,
  serviceKey: string,
  fallback: number,
): Promise<string> {
  const url = `${baseUrl(supabaseUrl)}/rest/v1/rpc/nextval_text`;
  const res = await fetch(url, {
    method: 'POST',
    headers: restHeaders(serviceKey),
    body: JSON.stringify({ seq_name: 'crossword_puzzle_id_seq' }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    log('rest_rpc_warn', { status: res.status, body: t.slice(0, 200) });
    return String(fallback);
  }
  const val: unknown = await res.json().catch(() => null);
  if (val != null && val !== '') return String(val);
  return String(fallback);
}

type InsertResult = 'inserted' | 'duplicate';

async function restInsertGame(
  supabaseUrl: string,
  serviceKey: string,
  row: {
    game_date: string;
    puzzle_data: unknown;
    is_published: boolean;
  },
): Promise<InsertResult> {
  const url = `${baseUrl(supabaseUrl)}/rest/v1/games`;
  const res = await fetch(url, {
    method: 'POST',
    headers: restHeaders(serviceKey, { Prefer: 'return=minimal' }),
    body: JSON.stringify({ ...row, game_type: 'crossword' }),
  });
  if (res.status === 201 || res.status === 200) return 'inserted';
  if (res.status === 409) return 'duplicate';
  const t = await res.text().catch(() => '');
  throw new Error(`REST insert games ${res.status}: ${t.slice(0, 500)}`);
}

// ---------------------------------------------------------------------------
// Crossword generation
// ---------------------------------------------------------------------------

function fillWithRetries(
  slots: SolverSlot[],
  seedBase: string,
  exclude: ReadonlySet<string>,
): Map<string, string> {
  for (let k = 0; k < SEEDS_PER_ROUND; k++) {
    const seed = `${seedBase}#${k}`;
    const result = fillGrid(slots, {
      pools: buildPools(seededRandom(seed), exclude),
      timeLimitMs: FILL_TIME_LIMIT_MS,
    });
    log('grid_fill', { seed, ok: result.ok, nodes: result.nodes, ...(result.ok ? {} : { reason: result.reason }) });
    if (result.ok) return result.answers;
  }
  throw new Error(`grid fill failed after ${SEEDS_PER_ROUND} seeds (${seedBase})`);
}

export async function generateCrossword(
  apiKey: string,
  date: string,
  id: string,
): Promise<Record<string, unknown>> {
  const { templateId, difficulty, mask } = getCrosswordTemplateForDate(date);
  const slots = computeWordSlots(mask);
  const solverSlots = slots.map(s => ({ id: slotId(s), cells: slotCells(s) }));
  const exclude = new Set<string>();

  for (let round = 0; round < MAX_FILL_ROUNDS; round++) {
    const answers = fillWithRetries(solverSlots, `${date}#${round}`, exclude);
    const entries = slots.map(s => ({ id: slotId(s), answer: answers.get(slotId(s))! }));
    log('grid_filled', { date, templateId, round, answers: entries.map(e => `${e.id}:${e.answer}`) });

    const lastRound = round === MAX_FILL_ROUNDS - 1;
    const clues = await writeClues(apiKey, date, difficulty, entries, { ignoreRejects: lastRound, log });

    if (clues.rejected.length > 0 && !lastRound) {
      // Worth reviewing: add agreed words to scripts/word-blocklist.txt and rebuild the list.
      log('clue_rejects', { date, round, rejected: clues.rejected });
      for (const r of clues.rejected) exclude.add(r.answer);
      continue;
    }

    return assembleCrosswordPayload({
      id,
      date,
      title: clues.title,
      templateId,
      difficulty,
      mask,
      slots,
      answers,
      clues: clues.clues,
    });
  }
  throw new Error('unreachable: final round always returns or throws');
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

async function findNextMissingDate(
  supabaseUrl: string,
  serviceKey: string,
  maxDaysAhead: number,
): Promise<string | null> {
  const today = new Date();
  for (let i = 0; i < maxDaysAhead; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = formatDate(d);
    if (!(await restGameExists(supabaseUrl, serviceKey, dateStr))) return dateStr;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Lambda handler
// ---------------------------------------------------------------------------

interface LambdaEvent extends Partial<ScheduledEvent> {
  days_ahead?: number;
  count?: number;
}

interface HandlerResult {
  success: boolean;
  generated: number;
  elapsed_ms: number;
  results: { date: string; game_type: string; status: string; detail?: string }[];
  had_errors: boolean;
  error?: string;
}

export async function handler(
  event: LambdaEvent,
  _context: Context,
): Promise<HandlerResult> {
  const startMs = Date.now();

  try {
    const secrets = await getSecrets();

    const daysAhead =
      typeof event.days_ahead === 'number' && event.days_ahead > 0 ? event.days_ahead : 8;
    const count =
      typeof event.count === 'number' && event.count > 0 ? Math.min(event.count, 3) : 1;

    log('start', { game_type: 'crossword', daysAhead, count, model: CLAUDE_MODEL });

    const {
      ANTHROPIC_API_KEY: anthropicApiKey,
      SUPABASE_URL: supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: serviceKey,
    } = secrets;

    const results: { date: string; game_type: string; status: string; detail?: string }[] = [];
    let generated = 0;

    for (let round = 0; round < count; round++) {
      const date = await findNextMissingDate(supabaseUrl, serviceKey, daysAhead);

      if (!date) {
        log('all_filled', { game_type: 'crossword', daysAhead });
        break;
      }

      try {
        const id = await restNextval(supabaseUrl, serviceKey, generated + round + 100);
        log('generating', { type: 'crossword', date, id });
        const puzzle = await generateCrossword(anthropicApiKey, date, id);
        const ins = await restInsertGame(supabaseUrl, serviceKey, {
          game_date: date,
          puzzle_data: puzzle,
          is_published: true,
        });
        results.push({
          date,
          game_type: 'crossword',
          status: ins === 'duplicate' ? 'skipped_duplicate' : 'created',
        });
        if (ins === 'inserted') generated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log('failed', { type: 'crossword', date, error: msg.slice(0, 500) });
        results.push({ date, game_type: 'crossword', status: 'error', detail: msg.slice(0, 500) });
      }
    }

    const elapsed = Date.now() - startMs;
    const errors = results.filter(r => r.status === 'error').length;
    log('done', { game_type: 'crossword', generated, elapsed, errors });

    return { success: true, generated, elapsed_ms: elapsed, results, had_errors: errors > 0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log('fatal', { error: msg.slice(0, 1500) });
    return {
      success: false,
      generated: 0,
      elapsed_ms: Date.now() - startMs,
      results: [],
      had_errors: true,
      error: msg.slice(0, 2000),
    };
  }
}
