/**
 * 9×9 crossword templates, slot geometry and final payload assembly.
 * Pure functions only, so they can be unit tested without AWS or network access.
 */

export const GRID_SIZE = 9;

export type TemplateId = '9x9-A' | '9x9-B' | '9x9-C' | '9x9-D' | '9x9-E';

/**
 * 9×9 black-square templates. 0 = white (letter cell), 1 = black.
 *
 * | Template | Black cells | Slots | Difficulty |
 * |----------|-------------|-------|------------|
 * | 9x9-A    | 38 (47%)    | 15    | easy       |
 * | 9x9-B    | 30 (37%)    | 18    | easy-med   |
 * | 9x9-C    | 17 (21%)    | 26    | medium     |
 * | 9x9-D    | 17 (21%)    | 24    | med-hard   |
 * | 9x9-E    | 14 (17%)    | 26    | hard       |
 */
export const TEMPLATE_MASKS: Record<TemplateId, number[][]> = {
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

export const TEMPLATE_IDS = Object.keys(TEMPLATE_MASKS) as TemplateId[];

const CROSSWORD_TEMPLATE_BY_DAY: Record<number, { templateId: TemplateId; difficulty: string }> = {
  0: { templateId: '9x9-C', difficulty: 'medium' },
  1: { templateId: '9x9-A', difficulty: 'easy' },
  2: { templateId: '9x9-B', difficulty: 'easy' },
  3: { templateId: '9x9-C', difficulty: 'medium' },
  4: { templateId: '9x9-D', difficulty: 'medium' },
  5: { templateId: '9x9-D', difficulty: 'hard' },
  6: { templateId: '9x9-E', difficulty: 'hard' },
};

export interface WordSlot {
  number: number;
  direction: 'across' | 'down';
  row: number;
  col: number;
  length: number;
}

export interface CanonicalClue {
  number: number;
  row: number;
  col: number;
  length: number;
  answer: string;
  clue: string;
}

export function getCrosswordTemplateForDate(date: string): {
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

/** Word slots with length >= 3; numbers match reading-order starts (shared across/down start = one number). */
export function computeWordSlots(mask: number[][]): WordSlot[] {
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

/** Stable id used between solver, Claude and payload, e.g. "4A" or "7D". */
export function slotId(slot: WordSlot): string {
  return `${slot.number}${slot.direction === 'across' ? 'A' : 'D'}`;
}

/** Cell indices (row * GRID_SIZE + col) covered by a slot, in reading order. */
export function slotCells(slot: WordSlot): number[] {
  const cells: number[] = [];
  for (let i = 0; i < slot.length; i++) {
    const r = slot.direction === 'across' ? slot.row : slot.row + i;
    const c = slot.direction === 'across' ? slot.col + i : slot.col;
    cells.push(r * GRID_SIZE + c);
  }
  return cells;
}

/**
 * True when the clue gives the answer away: the answer appears inside the clue, or (for
 * answers of 5+ letters) a clue word shares the answer's first four letters, e.g. STONE / "stony".
 */
export function clueContainsAnswer(clue: string, answer: string): boolean {
  const c = clue.toUpperCase();
  const a = answer.toUpperCase();
  if (c.includes(a)) return true;
  if (a.length < 5) return false;
  const stem = a.slice(0, 4);
  return (c.match(/[A-Z]+/g) ?? []).some(token => token.length >= 4 && token.startsWith(stem));
}

/**
 * Build the stored puzzle payload from solver answers and Claude clues (both keyed by slotId).
 * Re-checks every crossing so a solver bug can never ship a broken grid.
 */
export function assembleCrosswordPayload(input: {
  id: string;
  date: string;
  title: string;
  templateId: TemplateId;
  difficulty: string;
  mask: number[][];
  slots: WordSlot[];
  answers: ReadonlyMap<string, string>;
  clues: ReadonlyMap<string, string>;
}): Record<string, unknown> {
  const { id, date, title, templateId, difficulty, mask, slots, answers, clues } = input;
  const letters: (string | null)[] = new Array(GRID_SIZE * GRID_SIZE).fill(null);
  const across: CanonicalClue[] = [];
  const down: CanonicalClue[] = [];

  for (const slot of slots) {
    const sid = slotId(slot);
    const answer = answers.get(sid);
    const clue = clues.get(sid)?.trim();
    if (!answer || answer.length !== slot.length || !/^[A-Z]+$/.test(answer)) {
      throw new Error(`invalid answer for ${sid}`);
    }
    if (!clue) throw new Error(`missing clue for ${sid}`);
    slotCells(slot).forEach((cell, i) => {
      const prev = letters[cell];
      if (prev !== null && prev !== answer[i]) {
        throw new Error(`crossing mismatch at ${sid}[${i}]: ${prev} vs ${answer[i]}`);
      }
      letters[cell] = answer[i];
    });
    const entry: CanonicalClue = {
      number: slot.number,
      row: slot.row,
      col: slot.col,
      length: slot.length,
      answer,
      clue,
    };
    (slot.direction === 'across' ? across : down).push(entry);
  }

  const all = [...answers.values()];
  if (new Set(all).size !== all.length) throw new Error('duplicate answers');

  const numberAt = new Map<number, number>();
  for (const slot of slots) numberAt.set(slot.row * GRID_SIZE + slot.col, slot.number);

  const grid: Record<string, unknown>[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row: Record<string, unknown>[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = r * GRID_SIZE + c;
      if (mask[r][c] === 1) {
        if (letters[cell] !== null) throw new Error(`letter on black cell (${r},${c})`);
        row.push({ letter: null, isBlack: true });
        continue;
      }
      if (letters[cell] === null) throw new Error(`unfilled white cell (${r},${c})`);
      const out: Record<string, unknown> = { letter: letters[cell], isBlack: false };
      const num = numberAt.get(cell);
      if (num != null) out.number = num;
      row.push(out);
    }
    grid.push(row);
  }

  return {
    id,
    date,
    title,
    rows: GRID_SIZE,
    cols: GRID_SIZE,
    templateId,
    difficulty,
    grid,
    clues: { across, down },
  };
}
