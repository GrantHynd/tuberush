import { CROSSWORD_9X9_A } from '@/constants/fixtures/crossword-9x9-a';
import { CROSSWORD_DATA } from '@/constants/CrosswordData';
import { playableOutline } from '@/components/games/Crossword';

function clueGivesAnswer(clue: string, answer: string): boolean {
    const c = clue.toUpperCase();
    const a = answer.toUpperCase();
    if (c.includes(a)) return true;
    if (a.length < 5) return false;
    const stem = a.slice(0, 4);
    return (c.match(/[A-Z]+/g) ?? []).some((token) => token.length >= 4 && token.startsWith(stem));
}

describe('9x9-A QA fixture', () => {
    const puzzle = CROSSWORD_9X9_A;

    it('matches the 9x9-A mask and is not a production daily', () => {
        expect(puzzle.rows).toBe(9);
        expect(puzzle.cols).toBe(9);
        const blacks = puzzle.grid.flat().filter((cell) => cell.isBlack).length;
        // 9x9-A mask: 35 blocked cells of 81.
        expect(blacks).toBe(35);
        expect(CROSSWORD_DATA.some((p) => p.id === puzzle.id)).toBe(false);
    });

    it('numbers the fifteen slots and keeps every crossing', () => {
        const across = puzzle.clues.across.map((c) => c.number);
        const down = puzzle.clues.down.map((c) => c.number);
        expect(across).toEqual([1, 3, 5, 7, 8, 9, 10, 12, 13]);
        expect(down).toEqual([2, 4, 6, 7, 9, 11]);
        for (const clue of [...puzzle.clues.across, ...puzzle.clues.down]) {
            expect(clue.clue).toBeTruthy();
            expect(clueGivesAnswer(clue.clue, clue.answer)).toBe(false);
            for (let i = 0; i < clue.length; i++) {
                const r = clue.row + (clue.answer && puzzle.clues.down.includes(clue) ? i : 0);
                const row = puzzle.clues.down.includes(clue) ? clue.row + i : clue.row;
                const col = puzzle.clues.down.includes(clue) ? clue.col : clue.col + i;
                expect(puzzle.grid[row][col].letter).toBe(clue.answer[i]);
                expect(puzzle.grid[row][col].isBlack).toBe(false);
                void r;
            }
        }
    });

    it('draws a playable outline only on outer edges and never inside a blocked region', () => {
        const grid = puzzle.grid;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const edge = playableOutline(grid, r, c);
                if (grid[r][c].isBlack) {
                    expect(edge).toEqual({ borderTopWidth: 0, borderRightWidth: 0, borderBottomWidth: 0, borderLeftWidth: 0 });
                } else {
                    expect(edge.borderBottomWidth).toBe(1);
                    expect(edge.borderRightWidth).toBe(1);
                    if (!grid[r - 1]?.[c]?.isBlack && grid[r - 1]?.[c]) expect(edge.borderTopWidth).toBe(0);
                    if (!grid[r][c - 1]?.isBlack && grid[r][c - 1]) expect(edge.borderLeftWidth).toBe(0);
                }
            }
        }
    });
});
