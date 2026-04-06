/**
 * AWS Lambda: daily 9×9 crossword generation for TubeRush.
 * Triggered by EventBridge Scheduler (cron).
 * Black-square templates are fixed in code; Claude fills clues/answers only.
 * Optional Crossword Generator Agent Skill: set ANTHROPIC_CROSSWORD_SKILL_ID (+ version) in Secrets.
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import type { ScheduledEvent, Context } from 'aws-lambda';
import wordBankData from './word-bank.json';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-6';
const CLAUDE_TIMEOUT_MS = 35_000;
const CLAUDE_SKILL_TIMEOUT_MS = 90_000;
const MAX_RETRIES = 1;
const MAX_PAUSE_TURNS = 4;
const ANTHROPIC_BETA_SKILLS = 'code-execution-2025-08-25,skills-2025-10-02';

/** Match hosted Agent Skill: bump `ANTHROPIC_CROSSWORD_SKILL_VERSION` in Secrets when the skill is republished */
const GRID_SIZE = 9;

type TemplateId = '9x9-A' | '9x9-B' | '9x9-C' | '9x9-D' | '9x9-E';

/**
 * 9×9 black-square templates. 0 = white (letter cell), 1 = black.
 *
 * | Template | Black cells | Slots (A/D) | Word lengths | Intersections | Difficulty |
 * |----------|-------------|-------------|-------------|---------------|------------|
 * | 9x9-A   | 38 (47%)    | ~8A / ~9D   | 3–9         | sparse        | easy       |
 * | 9x9-B   | 30 (37%)    | ~8A / ~7D   | 3–9         | low           | easy-med   |
 * | 9x9-C   | 17 (21%)    | ~9A / ~9D   | 3–8         | moderate      | medium     |
 * | 9x9-D   | 17 (21%)    | ~9A / ~8D   | 3–9         | dense lattice | med-hard   |
 * | 9x9-E   | 14 (17%)    | ~8A / ~7D   | 3–9         | open frame    | hard       |
 */
const TEMPLATE_MASKS: Record<TemplateId, number[][]> = {
  '9x9-A': [
    [0, 0, 0, 0, 0, 1, 0, 0, 0],
    [1, 0, 1, 1, 1, 1, 1, 0, 1],
    [0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 1, 1, 0, 1, 0, 1, 1, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 0, 1, 0, 1, 1, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 0, 1],
    [0, 0, 0, 1, 0, 0, 0, 0, 0],
  ],
  '9x9-B': [
    [0, 0, 0, 0, 0, 1, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 0, 1, 0],
    [0, 0, 0, 0, 0, 1, 0, 0, 0],
    [1, 1, 0, 1, 0, 1, 1, 1, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 0, 1, 0, 1, 1],
    [0, 0, 0, 1, 0, 0, 0, 0, 0],
    [0, 1, 0, 1, 1, 1, 1, 1, 0],
    [0, 0, 0, 1, 0, 0, 0, 0, 0],
  ],
  '9x9-C': [
    [0, 0, 0, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 1, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 1, 0],
    [1, 0, 0, 0, 0, 0, 0, 0, 1],
    [0, 1, 0, 0, 0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 1, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0],
  ],
  '9x9-D': [
    [0, 0, 0, 1, 0, 1, 0, 0, 0],
    [0, 1, 0, 1, 0, 1, 0, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 1, 0, 0, 0, 1, 0, 1],
    [0, 0, 0, 0, 1, 0, 0, 0, 0],
    [1, 0, 1, 0, 0, 0, 1, 0, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 1, 0, 1, 0, 1, 0],
    [0, 0, 0, 1, 0, 1, 0, 0, 0],
  ],
  '9x9-E': [
    [0, 0, 0, 1, 0, 0, 0, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0, 1, 0],
    [1, 0, 1, 0, 0, 0, 1, 0, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 1, 0, 0, 0, 1, 0, 1],
    [0, 1, 0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 1, 0, 0, 0],
  ],
};

const CROSSWORD_TEMPLATE_BY_DAY: Record<number, { templateId: TemplateId; difficulty: string }> = {
  0: { templateId: '9x9-C', difficulty: 'medium' },
  1: { templateId: '9x9-A', difficulty: 'easy' },
  2: { templateId: '9x9-B', difficulty: 'easy' },
  3: { templateId: '9x9-C', difficulty: 'medium' },
  4: { templateId: '9x9-D', difficulty: 'medium' },
  5: { templateId: '9x9-D', difficulty: 'hard' },
  6: { templateId: '9x9-E', difficulty: 'hard' },
};

// ---------------------------------------------------------------------------
// Secrets
// ---------------------------------------------------------------------------

interface Secrets {
  ANTHROPIC_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  /** Hosted Crossword Generator Agent Skill id (Messages API container.skills) */
  ANTHROPIC_CROSSWORD_SKILL_ID?: string;
  /** Pin when publishing a new skill revision; omit or `latest` to track newest */
  ANTHROPIC_CROSSWORD_SKILL_VERSION?: string;
  /** Set to `1` to disable skill path and use plain Messages only */
  DISABLE_CLAUDE_SKILL?: string;
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
// Claude
// ---------------------------------------------------------------------------

function getSkillConfig(
  secrets: Secrets,
): { skillId: string; version: string } | null {
  if (secrets.DISABLE_CLAUDE_SKILL === '1') return null;
  const skillId = secrets.ANTHROPIC_CROSSWORD_SKILL_ID?.trim();
  if (!skillId) return null;
  const version = secrets.ANTHROPIC_CROSSWORD_SKILL_VERSION?.trim() || 'latest';
  return { skillId, version };
}

function joinTextFromContentBlocks(content: unknown): string {
  if (!Array.isArray(content)) return '';
  const parts: string[] = [];
  for (const block of content) {
    if (block && typeof block === 'object' && 'type' in block) {
      const b = block as { type: string; text?: string };
      if (b.type === 'text' && typeof b.text === 'string') parts.push(b.text);
    }
  }
  return parts.join('\n');
}

async function callClaudeSimple(apiKey: string, system: string, prompt: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);
  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 2048,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '(unreadable body)');
      throw new Error(`Claude ${res.status}: ${body.slice(0, 400)}`);
    }
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      throw new Error('Claude response was not valid JSON');
    }
    if (data == null || typeof data !== 'object') {
      throw new Error('Claude JSON was empty or not an object');
    }
    const text = joinTextFromContentBlocks((data as { content?: unknown }).content);
    if (!text.trim()) {
      throw new Error(`Empty Claude text; keys=${Object.keys(data as object).join(',')}`);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function callClaudeWithSkill(
  apiKey: string,
  system: string,
  userPrompt: string,
  skill: { skillId: string; version: string },
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLAUDE_SKILL_TIMEOUT_MS);

  const tools = [{ type: 'code_execution_20250825', name: 'code_execution' }];
  const skillEntry = { type: 'custom' as const, skill_id: skill.skillId, version: skill.version };

  type Msg = { role: 'user' | 'assistant'; content: unknown };
  const messages: Msg[] = [{ role: 'user', content: userPrompt }];
  let container: Record<string, unknown> = { skills: [skillEntry] };

  try {
    for (let turn = 0; turn < MAX_PAUSE_TURNS; turn++) {
      const res = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': ANTHROPIC_BETA_SKILLS,
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 2048,
          system,
          messages,
          tools,
          container,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '(unreadable body)');
        throw new Error(`Claude (skills) ${res.status}: ${body.slice(0, 500)}`);
      }

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        throw new Error('Claude (skills) response was not valid JSON');
      }
      if (data == null || typeof data !== 'object') {
        throw new Error('Claude (skills) JSON was empty or not an object');
      }

      const payload = data as {
        stop_reason?: string;
        content?: unknown;
        container?: { id?: string };
      };
      const stopReason = payload.stop_reason;
      const text = joinTextFromContentBlocks(payload.content);

      log('claude_skill_turn', {
        turn,
        stop_reason: stopReason,
        text_len: text.length,
        container_id: payload.container?.id,
      });

      if (stopReason !== 'pause_turn') {
        if (!text.trim()) {
          throw new Error(
            `Empty Claude (skills) stop_reason=${stopReason} snippet=${JSON.stringify(data).slice(0, 300)}`,
          );
        }
        return text;
      }

      const cid = payload.container?.id;
      if (!cid) throw new Error('pause_turn but missing container.id');

      messages.push({ role: 'assistant', content: payload.content });
      container = { id: cid, skills: [skillEntry] };
    }
    throw new Error(`Exceeded MAX_PAUSE_TURNS (${MAX_PAUSE_TURNS})`);
  } finally {
    clearTimeout(timer);
  }
}

async function callClaude(
  apiKey: string,
  secrets: Secrets,
  system: string,
  prompt: string,
): Promise<string> {
  const skill = getSkillConfig(secrets);
  if (skill) {
    log('claude_mode', { mode: 'skill', skill_id: skill.skillId });
    const systemWithSkill =
      `The "Crossword Generator" Agent Skill is active. Use it for quality, then output ONLY JSON (no markdown).\n\n${system}`;
    const userWithSkill = `Apply the skill, then output only this JSON task:\n\n${prompt}`;
    try {
      return await callClaudeWithSkill(apiKey, systemWithSkill, userWithSkill, skill);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log('claude_skill_fallback', { reason: msg.slice(0, 200) });
      return callClaudeSimple(apiKey, system, prompt);
    }
  }
  log('claude_mode', { mode: 'messages_only' });
  return callClaudeSimple(apiKey, system, prompt);
}

function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const braces = text.match(/\{[\s\S]*\}/);
  if (braces) return braces[0].trim();
  return text.trim();
}

// ---------------------------------------------------------------------------
// Crossword puzzle (9×9, template fixed in code)
// ---------------------------------------------------------------------------

interface WordSlot {
  number: number;
  direction: 'across' | 'down';
  row: number;
  col: number;
  length: number;
}

interface RawClue {
  number: number;
  row: number;
  col: number;
  length: number;
  answer: string;
  clue: string;
}

interface CanonicalClue {
  number: number;
  row: number;
  col: number;
  length: number;
  answer: string;
  clue: string;
}

function getCrosswordTemplateForDate(date: string): {
  templateId: TemplateId;
  difficulty: string;
  mask: number[][];
} {
  const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
  const pick =
    CROSSWORD_TEMPLATE_BY_DAY[dayOfWeek] ?? ({ templateId: '9x9-D', difficulty: 'medium' } as const);
  return {
    templateId: pick.templateId,
    difficulty: pick.difficulty,
    mask: TEMPLATE_MASKS[pick.templateId],
  };
}

function maskToPromptLines(mask: number[][]): string {
  return mask.map(row => row.map(c => (c === 1 ? '#' : '.')).join('')).join('\n');
}

/** Word slots with length >= 3; numbers match reading-order starts (shared across/down start = one number). */
function computeWordSlots(mask: number[][]): WordSlot[] {
  const size = mask.length;
  const raw: Omit<WordSlot, 'number'>[] = [];

  for (let r = 0; r < size; r++) {
    let c = 0;
    while (c < size) {
      if (mask[r][c] === 0) {
        const start = c;
        while (c < size && mask[r][c] === 0) c++;
        const len = c - start;
        if (len >= 3) raw.push({ direction: 'across', row: r, col: start, length: len });
      } else c++;
    }
  }

  for (let col = 0; col < size; col++) {
    let r = 0;
    while (r < size) {
      if (mask[r][col] === 0) {
        const start = r;
        while (r < size && mask[r][col] === 0) r++;
        const len = r - start;
        if (len >= 3) raw.push({ direction: 'down', row: start, col, length: len });
      } else r++;
    }
  }

  const startCells = new Set(raw.map(s => `${s.row},${s.col}`));
  const numbered = new Map<string, number>();
  let num = 1;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (startCells.has(`${r},${c}`)) numbered.set(`${r},${c}`, num++);
    }
  }

  const slots: WordSlot[] = raw.map(s => ({
    ...s,
    number: numbered.get(`${s.row},${s.col}`)!,
  }));

  slots.sort(
    (a, b) =>
      a.number - b.number || (a.direction === 'across' ? 0 : 1) - (b.direction === 'across' ? 0 : 1),
  );
  return slots;
}

function countSlotsByDirection(slots: WordSlot[]): { across: number; down: number } {
  let across = 0;
  let down = 0;
  for (const s of slots) {
    if (s.direction === 'across') across++;
    else down++;
  }
  return { across, down };
}

// ---------------------------------------------------------------------------
// Intersection map — explicit crossing constraints for the prompt
// ---------------------------------------------------------------------------

interface Intersection {
  row: number;
  col: number;
  acrossSlot: WordSlot;
  acrossLetterIndex: number;
  downSlot: WordSlot;
  downLetterIndex: number;
}

function computeIntersections(mask: number[][], slots: WordSlot[]): Intersection[] {
  const cellToSlot = new Map<string, { slot: WordSlot; letterIndex: number }[]>();

  for (const slot of slots) {
    for (let i = 0; i < slot.length; i++) {
      const r = slot.direction === 'across' ? slot.row : slot.row + i;
      const c = slot.direction === 'across' ? slot.col + i : slot.col;
      const key = `${r},${c}`;
      if (!cellToSlot.has(key)) cellToSlot.set(key, []);
      cellToSlot.get(key)!.push({ slot, letterIndex: i });
    }
  }

  const intersections: Intersection[] = [];
  for (const [key, entries] of cellToSlot) {
    if (entries.length < 2) continue;
    const across = entries.find(e => e.slot.direction === 'across');
    const down = entries.find(e => e.slot.direction === 'down');
    if (!across || !down) continue;
    const [row, col] = key.split(',').map(Number);
    intersections.push({
      row,
      col,
      acrossSlot: across.slot,
      acrossLetterIndex: across.letterIndex,
      downSlot: down.slot,
      downLetterIndex: down.letterIndex,
    });
  }
  return intersections;
}

function formatSlotTable(slots: WordSlot[]): string {
  const lines: string[] = ['SLOTS (num-dir: r,c len):'];
  for (const s of slots) {
    lines.push(`  ${s.number}${s.direction === 'across' ? 'A' : 'D'}: ${s.row},${s.col} ${s.length}`);
  }
  return lines.join('\n');
}

function formatIntersections(intersections: Intersection[]): string {
  if (intersections.length === 0) return '';
  const lines: string[] = ['CROSSINGS (letter MUST match):'];
  for (const ix of intersections) {
    lines.push(`  (${ix.row},${ix.col}): ${ix.acrossSlot.number}A[${ix.acrossLetterIndex}]=${ix.downSlot.number}D[${ix.downLetterIndex}]`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Word bank helpers
// ---------------------------------------------------------------------------

type WordBankEntry = { word: string; clue: string };
const wordBank: Record<string, WordBankEntry[]> = wordBankData as Record<string, WordBankEntry[]>;

const WORD_BANK_PER_LENGTH = 10;

function getWordBankForSlots(slots: WordSlot[]): string {
  const neededLengths = new Set(slots.map(s => s.length));
  const sections: string[] = [];
  for (const len of [...neededLengths].sort((a, b) => a - b)) {
    const entries = wordBank[String(len)];
    if (!entries || entries.length === 0) continue;
    const selected = entries.slice(0, WORD_BANK_PER_LENGTH);
    const words = selected.map(e => `${e.word}—${e.clue}`).join('; ');
    sections.push(`  ${len}: ${words}`);
  }
  if (sections.length === 0) return '';
  return 'WORD BANK (prefer these; invent only if none fit):\n' + sections.join('\n');
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const CROSSWORD_SYSTEM = `You fill a FIXED 9×9 crossword template for TubeRush (British daily word game). Black squares are given — do not change them.

Rules:
- British English spelling (COLOUR not COLOR). Words >= 3 letters, common vocabulary only.
- No crosswordese (ALEE, SNEE, ESNE). No duplicates. No offensive words.
- CRITICAL: every crossing cell must have the SAME letter in both across and down words.
- Clues: concise (<12 words), mix of definition/fill-in-blank/wordplay. Never include the answer in the clue.
- Use the WORD BANK when provided. Fill most-constrained slots first.
- VERIFY all crossings match before outputting.

Output ONLY JSON (no markdown). No "grid" field. Each clue: {number, row, col, length, answer (uppercase), clue}. row/col 0-based.`;

function crosswordPrompt(
  date: string,
  id: string,
  templateId: TemplateId,
  difficulty: string,
  maskLines: string,
  slots: WordSlot[],
  slotCounts: { across: number; down: number },
  intersections: Intersection[],
  previousError?: string,
): string {
  const parts: string[] = [];

  parts.push(`${date} #${id}, ${templateId}, ${difficulty}.`);

  if (previousError) {
    parts.push(`\nFIX: ${previousError}`);
  }

  parts.push(`\nGrid (#=black .=white):\n${maskLines}`);
  parts.push(`\n${formatSlotTable(slots)}`);
  parts.push(`\n${formatIntersections(intersections)}`);

  const bankText = getWordBankForSlots(slots);
  if (bankText) parts.push(`\n${bankText}`);

  parts.push(`\nExactly ${slotCounts.across} across + ${slotCounts.down} down. Return ONLY JSON:
{"title":"...","clues":{"across":[{"number":1,"row":0,"col":0,"length":3,"answer":"CAT","clue":"Feline"},...],"down":[...]}}`);

  return parts.join('\n');
}

function parseRawClue(cl: Record<string, unknown>): RawClue | null {
  if (typeof cl.number !== 'number' || !Number.isInteger(cl.number)) return null;
  if (typeof cl.clue !== 'string' || !cl.clue.trim()) return null;
  if (typeof cl.answer !== 'string') return null;
  const ans = cl.answer.trim().toUpperCase();
  if (ans.length < 3 || !/^[A-Z]+$/.test(ans)) return null;
  if (typeof cl.row !== 'number' || typeof cl.col !== 'number' || typeof cl.length !== 'number')
    return null;
  if (!Number.isInteger(cl.row) || !Number.isInteger(cl.col) || !Number.isInteger(cl.length))
    return null;
  if (cl.length < 3 || cl.length !== ans.length) return null;
  return {
    number: cl.number,
    row: cl.row,
    col: cl.col,
    length: cl.length,
    answer: ans,
    clue: cl.clue.trim(),
  };
}

/** Match model clues to template slots by geometry; canonical clue numbers come from the template. */
function matchCluesToSlots(
  slots: WordSlot[],
  acrossIn: RawClue[],
  downIn: RawClue[],
): { across: CanonicalClue[]; down: CanonicalClue[] } | null {
  const poolAcross = [...acrossIn];
  const poolDown = [...downIn];
  const acrossOut: CanonicalClue[] = [];
  const downOut: CanonicalClue[] = [];

  for (const slot of slots) {
    const pool = slot.direction === 'across' ? poolAcross : poolDown;
    const idx = pool.findIndex(
      c => c.row === slot.row && c.col === slot.col && c.length === slot.length,
    );
    if (idx === -1) return null;
    const m = pool.splice(idx, 1)[0];
    const canonical: CanonicalClue = {
      number: slot.number,
      row: slot.row,
      col: slot.col,
      length: slot.length,
      answer: m.answer,
      clue: m.clue,
    };
    if (slot.direction === 'across') acrossOut.push(canonical);
    else downOut.push(canonical);
  }

  if (poolAcross.length > 0 || poolDown.length > 0) return null;

  const sortKey = (a: CanonicalClue, b: CanonicalClue) =>
    a.number - b.number || a.row - b.row || a.col - b.col;
  acrossOut.sort(sortKey);
  downOut.sort(sortKey);
  return { across: acrossOut, down: downOut };
}

function clueContainsAnswer(clue: string, answer: string): boolean {
  return clue.toUpperCase().includes(answer.toUpperCase());
}

function buildGridFromMaskAndClues(
  mask: number[][],
  slots: WordSlot[],
  byKey: Map<string, CanonicalClue>,
): { grid: Record<string, unknown>[][]; error?: string } {
  const size = GRID_SIZE;
  const letters: (string | null)[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null),
  );

  for (const slot of slots) {
    const key = `${slot.direction}-${slot.row}-${slot.col}-${slot.length}`;
    const cl = byKey.get(key);
    if (!cl) return { grid: [], error: `internal: missing clue for slot ${key}` };
    const ans = cl.answer;
    if (ans.length !== slot.length) return { grid: [], error: 'answer length mismatch' };

    for (let i = 0; i < slot.length; i++) {
      const r = slot.direction === 'across' ? slot.row : slot.row + i;
      const c = slot.direction === 'across' ? slot.col + i : slot.col;
      if (r < 0 || r >= size || c < 0 || c >= size) return { grid: [], error: 'slot out of bounds' };
      if (mask[r][c] !== 0) return { grid: [], error: 'letter on black cell' };
      const ch = ans[i]!;
      const prev = letters[r][c];
      if (prev !== null && prev !== ch) {
        return {
          grid: [],
          error: `crossing mismatch at (${r},${c}): ${prev} vs ${ch}`,
        };
      }
      letters[r][c] = ch;
    }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (mask[r][c] === 0 && letters[r][c] === null) {
        return { grid: [], error: `unfilled white cell (${r},${c})` };
      }
      if (mask[r][c] === 1 && letters[r][c] !== null) {
        return { grid: [], error: 'letter on black' };
      }
    }
  }

  const numberAt = new Map<string, number>();
  for (const slot of slots) {
    const k = `${slot.row},${slot.col}`;
    numberAt.set(k, slot.number);
  }

  const grid: Record<string, unknown>[][] = [];
  for (let r = 0; r < size; r++) {
    const row: Record<string, unknown>[] = [];
    for (let c = 0; c < size; c++) {
      if (mask[r][c] === 1) {
        row.push({ letter: null, isBlack: true });
        continue;
      }
      const num = numberAt.get(`${r},${c}`);
      const cell: Record<string, unknown> = {
        letter: letters[r][c],
        isBlack: false,
      };
      if (num != null) cell.number = num;
      row.push(cell);
    }
    grid.push(row);
  }

  return { grid };
}

function assembleCrosswordPayload(
  id: string,
  date: string,
  title: string,
  templateId: TemplateId,
  difficulty: string,
  mask: number[][],
  slots: WordSlot[],
  acrossIn: RawClue[],
  downIn: RawClue[],
): Record<string, unknown> {
  const matched = matchCluesToSlots(slots, acrossIn, downIn);
  if (!matched) throw new Error('clues do not match template slots (row/col/length/direction)');

  const all = [...matched.across, ...matched.down];
  const answers = all.map(c => c.answer);
  if (new Set(answers).size !== answers.length) throw new Error('duplicate answers');

  for (const cl of all) {
    if (clueContainsAnswer(cl.clue, cl.answer)) {
      throw new Error(`clue text contains answer fragment: ${cl.answer}`);
    }
  }

  const byKey = new Map<string, CanonicalClue>();
  for (const slot of slots) {
    const key = `${slot.direction}-${slot.row}-${slot.col}-${slot.length}`;
    const list = slot.direction === 'across' ? matched.across : matched.down;
    const cl = list.find(
      x => x.row === slot.row && x.col === slot.col && x.length === slot.length,
    );
    if (!cl) throw new Error('internal match failure');
    byKey.set(key, cl);
  }

  const { grid, error } = buildGridFromMaskAndClues(mask, slots, byKey);
  if (error || !grid.length) throw new Error(error || 'grid build failed');

  return {
    id,
    date,
    title,
    rows: GRID_SIZE,
    cols: GRID_SIZE,
    templateId,
    difficulty,
    grid,
    clues: { across: matched.across, down: matched.down },
  };
}

function parseClueResponse(d: unknown, expectedAcross: number, expectedDown: number): RawClue[][] {
  if (!d || typeof d !== 'object') throw new Error('not an object');
  const o = d as Record<string, unknown>;
  if (typeof o.title !== 'string' || !o.title.trim()) throw new Error('missing title');
  if ('grid' in o) throw new Error('grid must not be present; template is fixed in code');

  const c = o.clues as Record<string, unknown> | undefined;
  if (!c || !Array.isArray(c.across) || !Array.isArray(c.down)) {
    throw new Error('missing clues.across / clues.down');
  }
  if (c.across.length !== expectedAcross || c.down.length !== expectedDown) {
    throw new Error(
      `clue count mismatch: expected ${expectedAcross} across, ${expectedDown} down; got ${c.across.length}, ${c.down.length}`,
    );
  }

  const across: RawClue[] = [];
  for (const item of c.across as unknown[]) {
    if (!item || typeof item !== 'object') throw new Error('invalid across clue');
    const p = parseRawClue(item as Record<string, unknown>);
    if (!p) throw new Error('invalid across clue fields');
    across.push(p);
  }
  const down: RawClue[] = [];
  for (const item of c.down as unknown[]) {
    if (!item || typeof item !== 'object') throw new Error('invalid down clue');
    const p = parseRawClue(item as Record<string, unknown>);
    if (!p) throw new Error('invalid down clue fields');
    down.push(p);
  }
  return [across, down];
}

async function generateCrossword(
  apiKey: string,
  secrets: Secrets,
  date: string,
  id: string,
): Promise<Record<string, unknown>> {
  const { templateId, difficulty, mask } = getCrosswordTemplateForDate(date);
  const slots = computeWordSlots(mask);
  const slotCounts = countSlotsByDirection(slots);
  const maskLines = maskToPromptLines(mask);
  const intersections = computeIntersections(mask, slots);

  let lastErr: unknown;
  let previousError: string | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      log('claude_call', {
        type: 'crossword',
        date,
        attempt,
        templateId,
        difficulty,
        slots: slotCounts,
        intersections: intersections.length,
      });
      const prompt = crosswordPrompt(
        date, id, templateId, difficulty, maskLines,
        slots, slotCounts, intersections, previousError,
      );
      const raw = await callClaude(apiKey, secrets, CROSSWORD_SYSTEM, prompt);
      const parsed = JSON.parse(extractJSON(raw));
      const [acrossIn, downIn] = parseClueResponse(
        parsed,
        slotCounts.across,
        slotCounts.down,
      );
      const payload = assembleCrosswordPayload(
        id,
        date,
        (parsed as { title: string }).title.trim(),
        templateId,
        difficulty,
        mask,
        slots,
        acrossIn,
        downIn,
      );
      return payload;
    } catch (err) {
      lastErr = err;
      previousError = err instanceof Error ? err.message : String(err);
      log('claude_error', { type: 'crossword', date, attempt, error: previousError.slice(0, 300) });
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
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

    const skillCfg = getSkillConfig(secrets);
    log('start', {
      game_type: 'crossword',
      daysAhead,
      count,
      skill: skillCfg ? { id: skillCfg.skillId, version: skillCfg.version } : null,
    });

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
        const puzzle = await generateCrossword(anthropicApiKey, secrets, date, id);
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
