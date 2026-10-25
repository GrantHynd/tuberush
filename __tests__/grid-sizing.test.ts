import { availableArea, cellSize, gridExtent, keyboardHeightFor, letterSize, numberSize, rawCellSize, type LayoutParams } from '@/lib/grid-sizing';
import { keyboardHeight } from '@/components/game-ui/GameKeyboard';

// Values copied from game-ui-review/tools/grid_sizing.py (TUB-298).
const IPHONE_15: LayoutParams = { w: 390, h: 844, safeTop: 47, safeBottom: 34, header: 56, clue: 64, clueMargin: 16, kbKey: 46, kbGap: 8, kbPad: 8, gridPadV: 16, gridPadH: 32 };
const IPHONE_SE: LayoutParams = { w: 375, h: 667, safeTop: 20, safeBottom: 0, header: 52, clue: 56, clueMargin: 12, kbKey: 42, kbGap: 6, kbPad: 8, gridPadV: 12, gridPadH: 32 };

describe('grid sizing (TUB-298)', () => {
    it('matches the calculator keyboard height and available area', () => {
        expect(keyboardHeightFor(IPHONE_15)).toBe(170);
        expect(keyboardHeight(46, 8, 8)).toBe(170);
        expect(availableArea(IPHONE_15)).toEqual({ availW: 358, availH: 441 });
        expect(keyboardHeightFor(IPHONE_SE)).toBe(154);
        expect(availableArea(IPHONE_SE)).toEqual({ availW: 343, availH: 361 });
    });

    it.each([
        [IPHONE_15, 5, 70, 64, 326],
        [IPHONE_15, 7, 50, 50, 358],
        [IPHONE_15, 9, 38, 38, 352],
        [IPHONE_SE, 5, 67, 64, 326],
        [IPHONE_SE, 7, 47, 47, 337],
        [IPHONE_SE, 9, 37, 37, 343],
    ])('%#: %dx%d → raw %d, cell %d, grid %d', (d, n, raw, cell, grid) => {
        const { availW, availH } = availableArea(d);
        expect(rawCellSize(availW, availH, n)).toBe(raw);
        expect(cellSize(availW, availH, n)).toBe(cell);
        expect(gridExtent(cell, n)).toBe(grid);
        expect(grid).toBeLessThanOrEqual(availW);
    });

    it('clamps to 36..64 and scales type', () => {
        expect(cellSize(200, 200, 9)).toBe(36);
        expect(cellSize(1000, 1000, 5)).toBe(64);
        expect(letterSize(64)).toBe(35);
        expect(numberSize(64)).toBe(15);
        expect(numberSize(36)).toBe(9);
    });
});

describe('wrongLettersMessage (TUB-299)', () => {
    const { wrongLettersMessage } = require('@/lib/crossword-feedback');
    it('pluralises', () => {
        expect(wrongLettersMessage(2)).toBe("2 letters aren't right yet");
        expect(wrongLettersMessage(1)).toBe("1 letter isn't right yet");
    });
});
