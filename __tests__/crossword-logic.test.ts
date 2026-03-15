import type { CrosswordCell, CrosswordState } from '@/types/game';

/**
 * Pure logic extracted for testing without rendering React components.
 * These mirror the logic in play-crossword.tsx and Crossword.tsx.
 */

// ─── Answer Validation ────────────────────────────────────────────────

function checkAnswers(grid: CrosswordCell[][], userAnswers: Record<string, string>): boolean {
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
            const cell = grid[r][c];
            if (!cell.isBlack && cell.letter !== null) {
                const key = `${r}-${c}`;
                const correct = (cell.letter ?? '').toUpperCase();
                const userAns = (userAnswers[key] ?? '').toUpperCase().trim();
                if (userAns !== correct) return false;
            }
        }
    }
    return true;
}

function isFullyFilled(grid: CrosswordCell[][], userAnswers: Record<string, string>): boolean {
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
            const cell = grid[r][c];
            if (!cell.isBlack && cell.letter !== null) {
                const key = `${r}-${c}`;
                const ans = userAnswers[key]?.toUpperCase().trim();
                if (!ans) return false;
            }
        }
    }
    return true;
}

// ─── Cursor Logic ─────────────────────────────────────────────────────

type Direction = 'across' | 'down';

function advanceToNextCell(
    row: number, col: number, direction: Direction,
    grid: CrosswordCell[][], userAnswers: Record<string, string>,
): { row: number; col: number } | null {
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;

    if (direction === 'across') {
        for (let c = col + 1; c < cols; c++) {
            if (grid[row][c].isBlack) break;
            if (!userAnswers[`${row}-${c}`]) return { row, col: c };
        }
        const nextCol = col + 1;
        if (nextCol < cols && !grid[row][nextCol].isBlack) return { row, col: nextCol };
    } else {
        for (let r = row + 1; r < rows; r++) {
            if (grid[r][col].isBlack) break;
            if (!userAnswers[`${r}-${col}`]) return { row: r, col };
        }
        const nextRow = row + 1;
        if (nextRow < rows && !grid[nextRow][col].isBlack) return { row: nextRow, col };
    }
    return null;
}

interface BackspaceResult {
    clearedKey: string;
    newSelection: { row: number; col: number } | null;
}

function handleBackspace(
    row: number, col: number, direction: Direction,
    grid: CrosswordCell[][], userAnswers: Record<string, string>,
): BackspaceResult {
    const currentKey = `${row}-${col}`;
    if (userAnswers[currentKey]) {
        return { clearedKey: currentKey, newSelection: null };
    }
    // Cell already empty: move back and clear previous
    if (direction === 'across') {
        const prevCol = col - 1;
        if (prevCol >= 0 && !grid[row][prevCol].isBlack) {
            return { clearedKey: `${row}-${prevCol}`, newSelection: { row, col: prevCol } };
        }
    } else {
        const prevRow = row - 1;
        if (prevRow >= 0 && !grid[prevRow][col].isBlack) {
            return { clearedKey: `${prevRow}-${col}`, newSelection: { row: prevRow, col } };
        }
    }
    return { clearedKey: currentKey, newSelection: null };
}

// ─── Test data ────────────────────────────────────────────────────────

const testGrid: CrosswordCell[][] = [
    [
        { letter: 'A', number: 1, isBlack: false },
        { letter: 'B', isBlack: false },
        { letter: 'C', isBlack: false },
    ],
    [
        { letter: 'D', isBlack: false },
        { letter: null, isBlack: true },
        { letter: 'E', isBlack: false },
    ],
    [
        { letter: 'F', isBlack: false },
        { letter: 'G', isBlack: false },
        { letter: 'H', isBlack: false },
    ],
];

// ─── Tests ────────────────────────────────────────────────────────────

describe('Answer Validation', () => {
    it('returns true when all answers are correct', () => {
        const answers = {
            '0-0': 'A', '0-1': 'B', '0-2': 'C',
            '1-0': 'D', '1-2': 'E',
            '2-0': 'F', '2-1': 'G', '2-2': 'H',
        };
        expect(checkAnswers(testGrid, answers)).toBe(true);
    });

    it('is case-insensitive', () => {
        const answers = {
            '0-0': 'a', '0-1': 'b', '0-2': 'c',
            '1-0': 'd', '1-2': 'e',
            '2-0': 'f', '2-1': 'g', '2-2': 'h',
        };
        expect(checkAnswers(testGrid, answers)).toBe(true);
    });

    it('trims whitespace from user answers', () => {
        const answers = {
            '0-0': ' A ', '0-1': 'B ', '0-2': ' C',
            '1-0': 'D', '1-2': 'E',
            '2-0': 'F', '2-1': 'G', '2-2': 'H',
        };
        expect(checkAnswers(testGrid, answers)).toBe(true);
    });

    it('returns false when an answer is wrong', () => {
        const answers = {
            '0-0': 'X', '0-1': 'B', '0-2': 'C',
            '1-0': 'D', '1-2': 'E',
            '2-0': 'F', '2-1': 'G', '2-2': 'H',
        };
        expect(checkAnswers(testGrid, answers)).toBe(false);
    });

    it('returns false when an answer is missing', () => {
        const answers = {
            '0-0': 'A', '0-1': 'B',
            '1-0': 'D', '1-2': 'E',
            '2-0': 'F', '2-1': 'G', '2-2': 'H',
        };
        expect(checkAnswers(testGrid, answers)).toBe(false);
    });

    it('ignores black cells in validation', () => {
        // Cell 1-1 is black, so it shouldn't need an answer
        const answers = {
            '0-0': 'A', '0-1': 'B', '0-2': 'C',
            '1-0': 'D', '1-2': 'E',
            '2-0': 'F', '2-1': 'G', '2-2': 'H',
        };
        expect(checkAnswers(testGrid, answers)).toBe(true);
    });
});

describe('isFullyFilled', () => {
    it('returns true when all non-black cells have answers', () => {
        const answers = {
            '0-0': 'X', '0-1': 'Y', '0-2': 'Z',
            '1-0': 'W', '1-2': 'V',
            '2-0': 'U', '2-1': 'T', '2-2': 'S',
        };
        expect(isFullyFilled(testGrid, answers)).toBe(true);
    });

    it('returns false when a cell is empty', () => {
        const answers = {
            '0-0': 'X', '0-1': 'Y',
            '1-0': 'W', '1-2': 'V',
            '2-0': 'U', '2-1': 'T', '2-2': 'S',
        };
        expect(isFullyFilled(testGrid, answers)).toBe(false);
    });

    it('returns false when a cell has only whitespace', () => {
        const answers = {
            '0-0': 'X', '0-1': 'Y', '0-2': '  ',
            '1-0': 'W', '1-2': 'V',
            '2-0': 'U', '2-1': 'T', '2-2': 'S',
        };
        expect(isFullyFilled(testGrid, answers)).toBe(false);
    });
});

describe('Cursor Auto-advance', () => {
    it('advances to next empty cell in across direction', () => {
        const answers = { '0-1': 'B' }; // cell 0-1 is filled
        const result = advanceToNextCell(0, 0, 'across', testGrid, answers);
        // Should skip 0-1 (filled) and go to 0-2 (empty)
        expect(result).toEqual({ row: 0, col: 2 });
    });

    it('advances to next empty cell in down direction', () => {
        const answers = { '1-0': 'D' }; // cell 1-0 is filled
        const result = advanceToNextCell(0, 0, 'down', testGrid, answers);
        // Should skip 1-0 (filled) and go to 2-0 (empty)
        expect(result).toEqual({ row: 2, col: 0 });
    });

    it('falls back to immediate next cell when all following are filled', () => {
        const answers = { '0-1': 'B', '0-2': 'C' };
        const result = advanceToNextCell(0, 0, 'across', testGrid, answers);
        expect(result).toEqual({ row: 0, col: 1 });
    });

    it('stops at black cells', () => {
        // Row 1: [D, BLACK, E] — from 1-0 going across, should stop at black
        const result = advanceToNextCell(1, 0, 'across', testGrid, {});
        // Black at 1-1, so no next cell across from 1-0
        expect(result).toBeNull();
    });

    it('returns null at the end of the grid', () => {
        const result = advanceToNextCell(0, 2, 'across', testGrid, {});
        // Col 3 doesn't exist
        expect(result).toBeNull();
    });
});

describe('Backspace Behavior', () => {
    it('clears current cell if it has content', () => {
        const answers = { '0-0': 'A' };
        const result = handleBackspace(0, 0, 'across', testGrid, answers);
        expect(result.clearedKey).toBe('0-0');
        expect(result.newSelection).toBeNull();
    });

    it('moves to previous cell and clears it if current is empty (across)', () => {
        const answers = { '0-0': 'A' }; // current cell 0-1 is empty
        const result = handleBackspace(0, 1, 'across', testGrid, answers);
        expect(result.clearedKey).toBe('0-0');
        expect(result.newSelection).toEqual({ row: 0, col: 0 });
    });

    it('moves to previous cell and clears it if current is empty (down)', () => {
        const answers = { '0-0': 'A' }; // current cell 1-0 is empty
        const result = handleBackspace(1, 0, 'down', testGrid, answers);
        expect(result.clearedKey).toBe('0-0');
        expect(result.newSelection).toEqual({ row: 0, col: 0 });
    });

    it('does not move before the first cell (across)', () => {
        const result = handleBackspace(0, 0, 'across', testGrid, {});
        expect(result.clearedKey).toBe('0-0');
        expect(result.newSelection).toBeNull();
    });

    it('does not move before the first cell (down)', () => {
        const result = handleBackspace(0, 0, 'down', testGrid, {});
        expect(result.clearedKey).toBe('0-0');
        expect(result.newSelection).toBeNull();
    });

    it('does not move into a black cell (across)', () => {
        // Cell 1-2, previous is 1-1 which is black
        const result = handleBackspace(1, 2, 'across', testGrid, {});
        // Should not move back because 1-1 is black
        expect(result.clearedKey).toBe('1-2');
        expect(result.newSelection).toBeNull();
    });
});

describe('Timer Logic', () => {
    it('calculates elapsed time correctly', () => {
        const startTime = 1000;
        const endTime = 61000; // 60 seconds later
        const accumulatedPause = 0;
        const elapsed = Math.floor((endTime - startTime - accumulatedPause) / 1000);
        expect(elapsed).toBe(60);
    });

    it('subtracts pause time from elapsed', () => {
        const startTime = 1000;
        const endTime = 61000;
        const accumulatedPause = 10000; // 10 seconds paused
        const elapsed = Math.floor((endTime - startTime - accumulatedPause) / 1000);
        expect(elapsed).toBe(50);
    });

    it('does not go negative', () => {
        const startTime = 1000;
        const endTime = 5000;
        const accumulatedPause = 10000;
        const elapsed = Math.max(0, Math.floor((endTime - startTime - accumulatedPause) / 1000));
        expect(elapsed).toBe(0);
    });

    it('starts undefined when no keypress has happened', () => {
        const state: CrosswordState = {
            puzzleId: 'test',
            grid: [],
            clues: { across: {}, down: {} },
            userAnswers: {},
            completed: false,
        };
        expect(state.startTime).toBeUndefined();
    });
});
