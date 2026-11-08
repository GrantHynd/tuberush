/**
 * Crossword grid sizing (TUB-298). Mirrors game-ui-review/tools/grid_sizing.py:
 * cell = clamp(floor((min(availW, availH) − (n+1)·LINE) / n), MIN, MAX).
 *
 * `cellSize` is that design clamp (36–64). The live grid uses `cellSizeToFit`:
 * the same clamp when the measured area can hold 36pt cells, and a smaller
 * cell down to `MIN_FIT_CELL` when it cannot. Forcing 36pt into a shorter
 * area clips the bottom rows once Dynamic Type grows the clue and keyboard.
 * Cells under `MIN_TARGET_CELL` already use nearest-cell taps. If the area is
 * shorter than `MIN_FIT_CELL`, the board scrolls instead of clipping.
 */
export const GRID_LINE = 1;
export const MIN_CELL = 36;
export const MAX_CELL = 64;
/** Smallest cell that still shows a letter when the 36pt floor will not fit. */
export const MIN_FIT_CELL = 18;
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

/** Live grid size. Matches `cellSize` when the area can hold `MIN_CELL`. */
export function cellSizeToFit(availW: number, availH: number, n: number): number {
    const raw = rawCellSize(Math.max(0, availW), Math.max(0, availH), n);
    if (raw >= MIN_CELL) return Math.min(MAX_CELL, raw);
    if (raw <= 0) return MIN_FIT_CELL;
    return Math.max(MIN_FIT_CELL, raw);
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
