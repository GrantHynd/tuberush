import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import wordList from '../src/word-list.json';
import wordBank from '../src/word-bank.json';
import {
  TEMPLATE_IDS,
  TEMPLATE_MASKS,
  assembleCrosswordPayload,
  clueContainsAnswer,
  computeWordSlots,
  slotCells,
  slotId,
} from '../src/grid';
import { fillGrid } from '../src/solver';
import { buildPools, seededRandom, MAX_RANK } from '../src/words';
import { validateClueInput } from '../src/clues';
import { generateCrossword } from '../src/index';

const allowedWords = new Set<string>([
  ...(wordList as string[]).slice(0, MAX_RANK),
  ...Object.values(wordBank as Record<string, { word: string }[]>).flatMap(es =>
    es.map(e => e.word.toUpperCase()),
  ),
]);

function solverSlotsFor(templateId: (typeof TEMPLATE_IDS)[number]) {
  const slots = computeWordSlots(TEMPLATE_MASKS[templateId]);
  return { slots, solverSlots: slots.map(s => ({ id: slotId(s), cells: slotCells(s) })) };
}

describe('grid solver', () => {
  for (const templateId of TEMPLATE_IDS) {
    test(`${templateId}: fills 30 different seeds into valid puzzles`, () => {
      const { slots, solverSlots } = solverSlotsFor(templateId);
      for (let day = 0; day < 30; day++) {
        const seed = `2026-11-${day}#0#0`;
        const result = fillGrid(solverSlots, { pools: buildPools(seededRandom(seed)), timeLimitMs: 10_000 });
        assert.ok(result.ok, `${templateId} seed ${seed} failed: ${!result.ok && result.reason}`);

        for (const answer of result.answers.values()) {
          assert.ok(allowedWords.has(answer), `${answer} is not in the word list or bank`);
        }
        // Assembly re-checks crossings, duplicates and that every white cell is filled.
        const clues = new Map(slots.map(s => [slotId(s), 'placeholder clue']));
        assembleCrosswordPayload({
          id: '1',
          date: '2026-11-01',
          title: 'Test',
          templateId,
          difficulty: 'easy',
          mask: TEMPLATE_MASKS[templateId],
          slots,
          answers: result.answers,
          clues,
        });
      }
    });
  }

  test('same seed gives the same grid; different seeds differ', () => {
    const { solverSlots } = solverSlotsFor('9x9-C');
    const fill = (seed: string) => {
      const r = fillGrid(solverSlots, { pools: buildPools(seededRandom(seed)), timeLimitMs: 10_000 });
      assert.ok(r.ok);
      return JSON.stringify([...r.answers]);
    };
    assert.equal(fill('2026-10-18#0#0'), fill('2026-10-18#0#0'));
    assert.notEqual(fill('2026-10-18#0#0'), fill('2026-10-19#0#0'));
  });

  test('excluded words are never used', () => {
    const { solverSlots } = solverSlotsFor('9x9-E');
    const first = fillGrid(solverSlots, { pools: buildPools(seededRandom('x')), timeLimitMs: 10_000 });
    assert.ok(first.ok);
    const exclude = new Set([...first.answers.values()].slice(0, 5));
    const second = fillGrid(solverSlots, {
      pools: buildPools(seededRandom('x'), exclude),
      timeLimitMs: 10_000,
    });
    assert.ok(second.ok);
    for (const w of second.answers.values()) assert.ok(!exclude.has(w), `${w} was excluded`);
  });

  test('reports exhaustion when no fill exists', () => {
    const result = fillGrid([{ id: '1A', cells: [0, 1, 2] }], {
      pools: new Map([[3, []]]),
      timeLimitMs: 1_000,
    });
    assert.deepEqual(result.ok, false);
  });
});

describe('clue checks', () => {
  test('clueContainsAnswer catches the answer and its stem', () => {
    assert.ok(clueContainsAnswer('A stone in your shoe', 'STONE'));
    assert.ok(clueContainsAnswer('Stony ground', 'STONE'));
    assert.ok(clueContainsAnswer('Teaspoon measure', 'TEA'));
    assert.ok(!clueContainsAnswer('Unit of weight', 'STONE'));
    assert.ok(!clueContainsAnswer('Hot drink', 'TEA'));
  });

  test('validateClueInput flags missing and give-away clues, keeps only real rejects', () => {
    const entries = [
      { id: '1A', answer: 'STONE' },
      { id: '2D', answer: 'TEA' },
      { id: '3A', answer: 'REL' },
    ];
    const { result, problems } = validateClueInput(
      {
        title: 'Test',
        clues: [
          { id: '1a', clue: 'Stony ground' },
          { id: '2D', clue: 'Builder’s brew' },
        ],
        rejected: [
          { answer: 'rel', reason: 'abbreviation' },
          { answer: 'NOTINGRID', reason: 'x' },
        ],
      },
      entries,
    );
    assert.equal(result.clues.get('2D'), 'Builder’s brew');
    assert.deepEqual(result.rejected, [{ answer: 'REL', reason: 'abbreviation' }]);
    assert.equal(problems.length, 2);
    assert.match(problems.join('\n'), /1A \(STONE\): clue "Stony ground" gives away/);
    assert.match(problems.join('\n'), /3A \(REL\): clue missing/);
  });
});

describe('generateCrossword (Claude mocked)', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  /** Fake Anthropic API: clues are "Clue for <id>"; optionally rejects one answer on the first call. */
  function mockClaude(rejectFirst: boolean) {
    const prompts: string[] = [];
    globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
      const body = JSON.parse(init!.body!);
      assert.deepEqual(body.tool_choice, { type: 'tool', name: 'submit_clues' });
      const prompt: string = body.messages[0].content;
      prompts.push(prompt);
      const rows = [...prompt.matchAll(/^(\d+[AD]) \| ([A-Z]+) /gm)];
      const rejected =
        rejectFirst && prompts.length === 1 ? [{ answer: rows[0][2], reason: 'too obscure' }] : [];
      const input = {
        title: 'Mocked Puzzle',
        clues: rows.map(([, id]) => ({ id, clue: `Clue for ${id}` })),
        rejected,
      };
      return new Response(
        JSON.stringify({
          stop_reason: 'tool_use',
          content: [{ type: 'tool_use', name: 'submit_clues', input }],
        }),
        { status: 200 },
      );
    }) as typeof fetch;
    return prompts;
  }

  test('builds a complete puzzle for every day of the week', async () => {
    mockClaude(false);
    for (let d = 12; d <= 18; d++) {
      const date = `2026-10-${d}`;
      const puzzle = (await generateCrossword('test-key', date, '42')) as {
        title: string;
        grid: { letter: string | null; isBlack: boolean }[][];
        clues: { across: { clue: string }[]; down: { clue: string }[] };
      };
      assert.equal(puzzle.title, 'Mocked Puzzle');
      assert.equal(puzzle.grid.length, 9);
      assert.ok(puzzle.grid.flat().every(c => c.isBlack || /^[A-Z]$/.test(c.letter ?? '')));
      assert.ok([...puzzle.clues.across, ...puzzle.clues.down].every(c => c.clue.startsWith('Clue for')));
    }
  });

  test('re-fills the grid without an answer Claude rejects', async () => {
    const prompts = mockClaude(true);
    await generateCrossword('test-key', '2026-10-18', '42');
    assert.equal(prompts.length, 2);
    const rejected = prompts[0].match(/^\d+[AD] \| ([A-Z]+) /m)![1];
    assert.ok(!new RegExp(`\\| ${rejected} \\(`).test(prompts[1]), `${rejected} reappeared after rejection`);
  });
});
