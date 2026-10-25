/**
 * Crossword grid sizing (TUB-298). Mirrors game-ui-review/tools/grid_sizing.py:
 * cell = clamp(floor((min(availW, availH) − (n+1)·LINE) / n), MIN, MAX).
 * The grid never scrolls; it shrinks to fit between the header and the clue bar + keyboard.
 */
export const GRID_LINE = 1;
export const MIN_CELL = 36;
export const MAX_CELL = 64;
/** Below this, cells are too small to be individual targets; taps snap to the nearest open cell. */
export const MIN_TARGET_CELL = 44;

export interface LayoutParams {
    w: number;
    h: number;
    safeTop: number;
    safeBottom: number;
    header: number;
    clue: number;
    clueMargin: number;
    kbKey: number;
    kbGap: number;
    kbPad: number;
    gridPadV: number;
    gridPadH: number;
}

export function keyboardHeightFor(p: Pick<LayoutParams, 'kbKey' | 'kbGap' | 'kbPad'>): number {
    return 3 * p.kbKey + 2 * p.kbGap + 2 * p.kbPad;
}

export function availableArea(p: LayoutParams): { availW: number; availH: number } {
    return {
        availW: p.w - p.gridPadH,
        availH: p.h - p.safeTop - p.safeBottom - p.header - p.clue - p.clueMargin - keyboardHeightFor(p) - p.gridPadV,
    };
}

/** Unclamped cell size; used to decide whether to compact the keyboard/clue bar first. */
export function rawCellSize(availW: number, availH: number, n: number): number {
    return Math.floor((Math.min(availW, availH) - (n + 1) * GRID_LINE) / n);
}

export function cellSize(availW: number, availH: number, n: number): number {
    return Math.max(MIN_CELL, Math.min(MAX_CELL, rawCellSize(availW, availH, n)));
}

export function letterSize(cell: number): number {
    return Math.round(0.55 * cell);
}

export function numberSize(cell: number): number {
    return Math.max(9, Math.round(0.24 * cell));
}

export function gridExtent(cell: number, n: number): number {
    return cell * n + (n + 1) * GRID_LINE;
}
