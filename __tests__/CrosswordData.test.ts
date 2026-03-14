import { CROSSWORD_DATA, getDailyPuzzle, getPuzzleById } from '@/constants/CrosswordData';
import type { CrosswordPuzzle, CrosswordCell, CrosswordClue } from '@/types/game';

describe('CrosswordData', () => {
  describe('CROSSWORD_DATA format validation', () => {
    it('contains at least one puzzle', () => {
      expect(CROSSWORD_DATA.length).toBeGreaterThanOrEqual(1);
    });

    it.each(CROSSWORD_DATA)('puzzle "$id" has required top-level fields', (puzzle) => {
      expect(puzzle.id).toBeDefined();
      expect(typeof puzzle.id).toBe('string');
      expect(puzzle.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof puzzle.title).toBe('string');
      expect(puzzle.title.length).toBeGreaterThan(0);
      expect(typeof puzzle.rows).toBe('number');
      expect(typeof puzzle.cols).toBe('number');
      expect(puzzle.rows).toBeGreaterThan(0);
      expect(puzzle.cols).toBeGreaterThan(0);
    });

    it.each(CROSSWORD_DATA)('puzzle "$id" grid dimensions match rows/cols', (puzzle) => {
      expect(puzzle.grid.length).toBe(puzzle.rows);
      puzzle.grid.forEach((row, rowIndex) => {
        expect(row.length).toBe(puzzle.cols);
      });
    });

    it.each(CROSSWORD_DATA)('puzzle "$id" grid cells have valid structure', (puzzle) => {
      puzzle.grid.forEach((row) => {
        row.forEach((cell: CrosswordCell) => {
          expect(typeof cell.isBlack).toBe('boolean');

          if (cell.isBlack) {
            expect(cell.letter).toBeNull();
          } else {
            expect(typeof cell.letter).toBe('string');
            expect(cell.letter).toMatch(/^[A-Z]$/);
          }

          if (cell.number !== undefined) {
            expect(typeof cell.number).toBe('number');
            expect(cell.number).toBeGreaterThan(0);
          }
        });
      });
    });

    it.each(CROSSWORD_DATA)('puzzle "$id" has across and down clues', (puzzle) => {
      expect(Array.isArray(puzzle.clues.across)).toBe(true);
      expect(Array.isArray(puzzle.clues.down)).toBe(true);
      expect(puzzle.clues.across.length).toBeGreaterThan(0);
      expect(puzzle.clues.down.length).toBeGreaterThan(0);
    });

    it.each(CROSSWORD_DATA)('puzzle "$id" clues have valid structure', (puzzle) => {
      const validateClue = (clue: CrosswordClue, direction: 'across' | 'down') => {
        expect(typeof clue.number).toBe('number');
        expect(clue.number).toBeGreaterThan(0);
        expect(typeof clue.clue).toBe('string');
        expect(clue.clue.length).toBeGreaterThan(0);
        expect(typeof clue.answer).toBe('string');
        expect(clue.answer).toMatch(/^[A-Z]+$/);
        expect(clue.answer.length).toBe(clue.length);
        expect(clue.row).toBeGreaterThanOrEqual(0);
        expect(clue.row).toBeLessThan(puzzle.rows);
        expect(clue.col).toBeGreaterThanOrEqual(0);
        expect(clue.col).toBeLessThan(puzzle.cols);
      };

      puzzle.clues.across.forEach((clue) => validateClue(clue, 'across'));
      puzzle.clues.down.forEach((clue) => validateClue(clue, 'down'));
    });

    it.each(CROSSWORD_DATA)('puzzle "$id" across clues fit within grid bounds', (puzzle) => {
      puzzle.clues.across.forEach((clue) => {
        expect(clue.col + clue.length).toBeLessThanOrEqual(puzzle.cols);
      });
    });

    it.each(CROSSWORD_DATA)('puzzle "$id" down clues fit within grid bounds', (puzzle) => {
      puzzle.clues.down.forEach((clue) => {
        expect(clue.row + clue.length).toBeLessThanOrEqual(puzzle.rows);
      });
    });

    it.each(CROSSWORD_DATA)('puzzle "$id" clue answers match grid letters (across)', (puzzle) => {
      puzzle.clues.across.forEach((clue) => {
        for (let i = 0; i < clue.length; i++) {
          const cell = puzzle.grid[clue.row][clue.col + i];
          expect(cell.isBlack).toBe(false);
          expect(cell.letter).toBe(clue.answer[i]);
        }
      });
    });

    it.each(CROSSWORD_DATA)('puzzle "$id" clue answers match grid letters (down)', (puzzle) => {
      puzzle.clues.down.forEach((clue) => {
        for (let i = 0; i < clue.length; i++) {
          const cell = puzzle.grid[clue.row + i][clue.col];
          expect(cell.isBlack).toBe(false);
          expect(cell.letter).toBe(clue.answer[i]);
        }
      });
    });

    it.each(CROSSWORD_DATA)('puzzle "$id" numbered cells correspond to clue start positions', (puzzle) => {
      const clueNumbers = new Set<number>();
      [...puzzle.clues.across, ...puzzle.clues.down].forEach((clue) => {
        clueNumbers.add(clue.number);
      });

      // Every clue number should appear as a cell number in the grid
      const gridNumbers = new Set<number>();
      puzzle.grid.forEach((row) => {
        row.forEach((cell) => {
          if (cell.number) gridNumbers.add(cell.number);
        });
      });

      clueNumbers.forEach((num) => {
        expect(gridNumbers.has(num)).toBe(true);
      });
    });

    it.each(CROSSWORD_DATA)('puzzle "$id" clue start positions have matching cell numbers', (puzzle) => {
      [...puzzle.clues.across, ...puzzle.clues.down].forEach((clue) => {
        const cell = puzzle.grid[clue.row][clue.col];
        expect(cell.number).toBe(clue.number);
      });
    });
  });

  describe('Puzzle 1 specific data', () => {
    const puzzle1 = CROSSWORD_DATA[0];

    it('has correct metadata', () => {
      expect(puzzle1.id).toBe('1');
      expect(puzzle1.title).toBe('London Mini');
      expect(puzzle1.rows).toBe(5);
      expect(puzzle1.cols).toBe(5);
    });

    it('has correct across answers', () => {
      const acrossAnswers = puzzle1.clues.across.map((c) => c.answer);
      expect(acrossAnswers).toEqual(['TABS', 'BAKER', 'ASKS']);
    });

    it('has correct down answers', () => {
      const downAnswers = puzzle1.clues.down.map((c) => c.answer);
      expect(downAnswers).toEqual(['TUBE', 'BIKES', 'ARTS']);
    });

    it('has correct black cell positions', () => {
      const blackCells: [number, number][] = [];
      puzzle1.grid.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell.isBlack) blackCells.push([r, c]);
        });
      });

      expect(blackCells).toEqual([
        [0, 4],
        [1, 1],
        [1, 3],
        [3, 1],
        [3, 3],
        [4, 0],
      ]);
    });
  });

  describe('getDailyPuzzle', () => {
    it('returns a valid CrosswordPuzzle', () => {
      const puzzle = getDailyPuzzle();
      expect(puzzle).toBeDefined();
      expect(puzzle.id).toBeDefined();
      expect(puzzle.grid).toBeDefined();
      expect(puzzle.clues).toBeDefined();
    });

    it('returns the first puzzle as fallback when no date matches', () => {
      // Since CROSSWORD_DATA[0].date is set to today's date dynamically,
      // getDailyPuzzle should always return the first puzzle
      const puzzle = getDailyPuzzle();
      expect(puzzle.id).toBe(CROSSWORD_DATA[0].id);
    });
  });

  describe('getPuzzleById', () => {
    it('returns the puzzle with the matching id', () => {
      const puzzle = getPuzzleById('1');
      expect(puzzle).toBeDefined();
      expect(puzzle!.id).toBe('1');
      expect(puzzle!.title).toBe('London Mini');
    });

    it('returns undefined for a non-existent id', () => {
      const puzzle = getPuzzleById('non-existent-id');
      expect(puzzle).toBeUndefined();
    });

    it('returns undefined for an empty string id', () => {
      const puzzle = getPuzzleById('');
      expect(puzzle).toBeUndefined();
    });
  });
});
