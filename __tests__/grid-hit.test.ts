import { cellCenter, cellFromGridTouch, cellIndexAt, gridLocalPoint } from '@/lib/grid-hit';

/**
 * iOS reports locationX/Y relative to the deepest React view (RCTTouchHandler
 * locationInView). A grid overlay that treats those values as grid coordinates
 * maps every cell tap to row 0, column 0. pageX/Y are root-view coordinates.
 */
const childTouch = (locationX: number, locationY: number, pageX: number, pageY: number) => ({
    locationX,
    locationY,
    pageX,
    pageY,
    target: 41,
    currentTarget: 2,
});

const alwaysOpen = () => true;

describe('crossword hit coordinates', () => {
    it('treats a cell-local point as row 1 column 1', () => {
        expect(cellIndexAt(18, 18, 37, 9, 9)).toEqual({ row: 0, col: 0 });
        expect(cellIndexAt(11, 11, 23, 9, 9)).toEqual({ row: 0, col: 0 });
        expect(cellIndexAt(32, 32, 64, 5, 5)).toEqual({ row: 0, col: 0 });
    });

    it.each([
        ['default 9×9 37pt row 9 col 9', 37, 9, 8, 8, { x: 16, y: -120 }],
        ['XXXL 9×9 35pt row 9 col 9', 35, 9, 8, 8, { x: 20, y: 48 }],
        ['AX5 9×9 23pt row 5 col 5', 23, 9, 4, 4, { x: 8, y: -240 }],
        ['AX5 5×5 43pt row 5 col 5', 43, 5, 4, 4, { x: 12, y: 64 }],
        ['default 5×5 64pt row 3 col 3', 64, 5, 2, 2, { x: 16, y: 0 }],
    ])('%s follows page coordinates minus the grid origin', (_label, cell, n, row, col, origin) => {
        const local = cellCenter(row, col, cell);
        const selected = cellFromGridTouch(
            childTouch(cell / 2, cell / 2, origin.x + local.x, origin.y + local.y),
            origin,
            cell,
            n,
            n,
            alwaysOpen,
        );
        expect(selected).toEqual({ row, col });
    });

    it('keeps the same cell when the board scrolls and the window origin moves', () => {
        const cell = 23;
        const local = cellCenter(4, 4, cell);
        const origins = [
            { x: 0, y: 0 },
            { x: 21, y: 88 },
            { x: 16, y: -180 },
        ];
        for (const origin of origins) {
            expect(
                cellFromGridTouch(
                    childTouch(6, 6, origin.x + local.x, origin.y + local.y),
                    origin,
                    cell,
                    9,
                    9,
                    alwaysOpen,
                ),
            ).toEqual({ row: 4, col: 4 });
        }
    });

    it('uses locationX when the grid itself is the touch target', () => {
        const cell = 64;
        const local = cellCenter(2, 2, cell);
        expect(
            cellFromGridTouch(
                {
                    locationX: local.x,
                    locationY: local.y,
                    pageX: 0,
                    pageY: 0,
                    target: 'grid',
                    currentTarget: 'grid',
                },
                { x: 400, y: 400 },
                cell,
                5,
                5,
                alwaysOpen,
            ),
        ).toEqual({ row: 2, col: 2 });
    });

    it('does not guess a cell when a child target has no page position', () => {
        expect(gridLocalPoint({ locationX: 4, locationY: 4, target: 1, currentTarget: 2 }, null)).toBeNull();
        expect(
            cellFromGridTouch(
                { locationX: 4, locationY: 4, target: 1, currentTarget: 2 },
                null,
                37,
                9,
                9,
                alwaysOpen,
            ),
        ).toBeNull();
    });

    it('snaps a blocked cell to the nearest open cell in row-major order', () => {
        // 3×3: black squares at (0,2), (1,1), (2,0). (1,1) ties four neighbours at distance 1.
        const black = new Set(['0-2', '1-1', '2-0']);
        const isOpen = (r: number, c: number) => !black.has(`${r}-${c}`);
        const local = cellCenter(1, 1, 39);
        expect(
            cellFromGridTouch(
                { locationX: local.x, locationY: local.y, target: 'grid', currentTarget: 'grid' },
                null,
                39,
                3,
                3,
                isOpen,
            ),
        ).toEqual({ row: 0, col: 1 });
        expect(cellFromGridTouch(
            { locationX: cellCenter(2, 1, 39).x, locationY: cellCenter(2, 1, 39).y, target: 'grid', currentTarget: 'grid' },
            null,
            39,
            3,
            3,
            isOpen,
        )).toEqual({ row: 2, col: 1 });
    });
});
