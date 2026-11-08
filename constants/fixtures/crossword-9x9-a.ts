import type { CrosswordCell, CrosswordClue, CrosswordPuzzle } from '@/types/game';

/**
 * Deterministic 9×9-A crossword for tests and the dev rebrand preview.
 * Not a daily puzzle and not loaded by the game client.
 *
 * Mask matches lambda/generate-crossword TEMPLATE_MASKS['9x9-A'].
 * Every crossing was checked by hand and is re-checked in
 * __tests__/crossword-9x9-fixture.test.ts.
 */
const ROWS = [
    'TRAIN#BUS',
    '#A#####S#',
    'STOP#THE#',
    '###A#O###',
    'CROSSWORD',
    '###T#E###',
    '#PEA#RED#',
    '#E#####O#',
    'ATE#PLATE',
];

const CLUE_TEXT: Record<string, string> = {
    '1A': 'Commuter service on rails',
    '3A': 'Road passenger vehicle',
    '5A': 'Halt a vehicle',
    '7A': 'Definite article',
    '8A': 'Word grid puzzle',
    '9A': 'Green pod vegetable',
    '10A': 'Post-box colour',
    '12A': 'Consumed a meal',
    '13A': 'Dish for a meal',
    '2D': 'Large rodent',
    '4D': 'Employ something',
    '6D': 'Italian dough shapes',
    '7D': 'Tall structure',
    '9D': 'Household animal',
    '11D': 'Small round mark',
};

function open(r: number, c: number): boolean {
    return ROWS[r]?.[c] !== undefined && ROWS[r][c] !== '#';
}

function runLength(r: number, c: number, dir: 'across' | 'down'): number {
    let n = 0;
    let rr = r;
    let cc = c;
    while (open(rr, cc)) {
        n += 1;
        if (dir === 'across') cc += 1;
        else rr += 1;
    }
    return n;
}

function starts(r: number, c: number, dir: 'across' | 'down'): boolean {
    if (!open(r, c) || runLength(r, c, dir) < 2) return false;
    if (dir === 'across') return !open(r, c - 1);
    return !open(r - 1, c);
}

function word(r: number, c: number, dir: 'across' | 'down'): string {
    let out = '';
    let rr = r;
    let cc = c;
    while (open(rr, cc)) {
        out += ROWS[rr][cc];
        if (dir === 'across') cc += 1;
        else rr += 1;
    }
    return out;
}

const numbered: { number: number; r: number; c: number }[] = [];
const numberAt: number[][] = ROWS.map((row) => row.split('').map(() => 0));
let next = 1;
for (let r = 0; r < ROWS.length; r++) {
    for (let c = 0; c < ROWS[r].length; c++) {
        if (starts(r, c, 'across') || starts(r, c, 'down')) {
            numberAt[r][c] = next;
            numbered.push({ number: next, r, c });
            next += 1;
        }
    }
}

function clues(dir: 'across' | 'down'): CrosswordClue[] {
    const key = dir === 'across' ? 'A' : 'D';
    return numbered
        .filter(({ r, c }) => starts(r, c, dir))
        .map(({ number, r, c }) => {
            const answer = word(r, c, dir);
            return {
                number,
                clue: CLUE_TEXT[`${number}${key}`],
                answer,
                row: r,
                col: c,
                length: answer.length,
            };
        });
}

const grid: CrosswordCell[][] = ROWS.map((row, r) =>
    row.split('').map((ch, c) => ({
        letter: ch === '#' ? null : ch,
        isBlack: ch === '#',
        ...(numberAt[r][c] ? { number: numberAt[r][c] } : {}),
    })),
);

export const CROSSWORD_9X9_A: CrosswordPuzzle = {
    id: 'fixture-9x9-a',
    date: '2026-10-25',
    title: '9×9 geometry fixture',
    rows: 9,
    cols: 9,
    grid,
    clues: { across: clues('across'), down: clues('down') },
};
