/**
 * Claude writes the title and clues for a grid the solver has already filled.
 *
 * Output goes through a forced tool call (`submit_clues`), so the API returns structured input
 * matching the schema rather than free text to parse. Claude can also reject unsuitable answers;
 * the caller then re-fills the grid without them.
 */

import { clueContainsAnswer } from './grid';
import { bankClue } from './words';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
export const CLAUDE_MODEL = 'claude-sonnet-4-6';
const CLAUDE_TIMEOUT_MS = 90_000;
const MAX_TOKENS = 4096;
const MAX_CLUE_LENGTH = 100;

export interface ClueEntry {
  /** Slot id, e.g. "4A" */
  id: string;
  answer: string;
}

export interface ClueResult {
  title: string;
  clues: Map<string, string>;
  /** Answers Claude considers unsuitable (obscure, offensive, abbreviation, proper noun…). */
  rejected: { answer: string; reason: string }[];
}

const SYSTEM = `You write clues for TubeRush, a British daily quick crossword played by commuters.
The grid is already filled; you only write the title and one clue per answer.

Clue rules:
- Quick/definition clues only, no cryptic wordplay. Under 12 words each.
- Mix: about 60% plain definition, 20% fill-in-the-blank (use ___), 20% light misdirection or pun.
- Never use the answer or any form of it (root, plural, tense) in its clue.
- British English spelling and references (fair to a general UK audience).
- If a vetted clue is supplied for an answer, use it unless it clashes with another clue.
- Match the difficulty: easy = straightforward definitions; hard = less obvious senses and more misdirection.

Reject an answer only if it is unsuitable for a family-friendly daily puzzle: an abbreviation, a proper
noun, an American spelling, a foreign or dialect word, crosswordese (ALEE, ESNE), offensive, or too
obscure for most adults. Still write a clue for every answer, rejected or not.`;

const TOOL = {
  name: 'submit_clues',
  description: 'Submit the puzzle title, one clue per answer id, and any rejected answers.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Short, playful puzzle title (2-5 words).' },
      clues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Answer id exactly as given, e.g. "4A".' },
            clue: { type: 'string' },
          },
          required: ['id', 'clue'],
        },
      },
      rejected: {
        type: 'array',
        description: 'Answers unsuitable for the puzzle. Usually empty.',
        items: {
          type: 'object',
          properties: {
            answer: { type: 'string' },
            reason: { type: 'string' },
          },
          required: ['answer', 'reason'],
        },
      },
    },
    required: ['title', 'clues', 'rejected'],
  },
} as const;

function buildPrompt(
  date: string,
  difficulty: string,
  entries: ClueEntry[],
  feedback?: string,
): string {
  const lines = entries.map(e => {
    const hint = bankClue(e.answer);
    return `${e.id} | ${e.answer} (${e.answer.length})${hint ? ` | vetted clue: ${hint}` : ''}`;
  });
  return [
    `Date: ${date}. Difficulty: ${difficulty}.`,
    feedback ? `\nFix these problems from your previous attempt:\n${feedback}\n` : '',
    'Answers (id | answer (length) | optional vetted clue):',
    ...lines,
    '\nCall submit_clues with a title and a clue for every id.',
  ].join('\n');
}

/** Call Claude once and return its raw tool input. */
async function requestClues(apiKey: string, prompt: string): Promise<unknown> {
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
        max_tokens: MAX_TOKENS,
        system: SYSTEM,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: TOOL.name },
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '(unreadable body)');
      throw new Error(`Claude ${res.status}: ${body.slice(0, 400)}`);
    }
    const data = (await res.json()) as {
      stop_reason?: string;
      content?: { type: string; name?: string; input?: unknown }[];
    };
    if (data.stop_reason === 'max_tokens') {
      throw new Error(`Claude response truncated at max_tokens (${MAX_TOKENS})`);
    }
    const call = data.content?.find(b => b.type === 'tool_use' && b.name === TOOL.name);
    if (!call) throw new Error(`Claude did not call ${TOOL.name} (stop_reason=${data.stop_reason})`);
    return call.input;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Check Claude's tool input against the entries. Returns the parsed result plus a list of
 * problems (missing ids, clues giving the answer away) to feed back on a retry.
 */
export function validateClueInput(
  input: unknown,
  entries: ClueEntry[],
): { result: ClueResult; problems: string[] } {
  const o = (input ?? {}) as { title?: unknown; clues?: unknown; rejected?: unknown };
  const problems: string[] = [];

  const title = typeof o.title === 'string' ? o.title.trim() : '';
  if (!title) problems.push('- title is missing');

  const clues = new Map<string, string>();
  for (const item of Array.isArray(o.clues) ? o.clues : []) {
    const { id, clue } = (item ?? {}) as { id?: unknown; clue?: unknown };
    if (typeof id === 'string' && typeof clue === 'string' && clue.trim()) {
      clues.set(id.trim().toUpperCase(), clue.trim());
    }
  }

  for (const e of entries) {
    const clue = clues.get(e.id);
    if (!clue) problems.push(`- ${e.id} (${e.answer}): clue missing`);
    else if (clueContainsAnswer(clue, e.answer)) {
      problems.push(`- ${e.id} (${e.answer}): clue "${clue}" gives away the answer`);
    } else if (clue.length > MAX_CLUE_LENGTH) {
      problems.push(`- ${e.id} (${e.answer}): clue too long, keep it under 12 words`);
    }
  }

  const answers = new Set(entries.map(e => e.answer));
  const rejected = (Array.isArray(o.rejected) ? o.rejected : [])
    .map(r => (r ?? {}) as { answer?: unknown; reason?: unknown })
    .filter(r => typeof r.answer === 'string' && answers.has(r.answer.trim().toUpperCase()))
    .map(r => ({ answer: String(r.answer).trim().toUpperCase(), reason: String(r.reason ?? '') }));

  return { result: { title, clues, rejected }, problems };
}

/**
 * Ask Claude for clues, retrying with specific feedback when clues are missing or give the
 * answer away. Returns early when Claude rejects answers so the grid can be re-filled.
 */
export async function writeClues(
  apiKey: string,
  date: string,
  difficulty: string,
  entries: ClueEntry[],
  opts: {
    maxAttempts?: number;
    /** Keep going even if Claude rejects answers (used on the final re-fill round). */
    ignoreRejects?: boolean;
    log?: (step: string, detail?: unknown) => void;
  } = {},
): Promise<ClueResult> {
  const { maxAttempts = 3, ignoreRejects = false, log = () => {} } = opts;
  let feedback: string | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const input = await requestClues(apiKey, buildPrompt(date, difficulty, entries, feedback));
    const { result, problems } = validateClueInput(input, entries);
    if (result.rejected.length > 0 && !ignoreRejects) return result;
    if (problems.length === 0) return result;
    feedback = problems.join('\n');
    log('clue_problems', { attempt, problems });
  }
  throw new Error(`clues still invalid after ${maxAttempts} attempts: ${feedback}`);
}
