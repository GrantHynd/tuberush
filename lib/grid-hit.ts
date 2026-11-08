export interface CellIndex {
    row: number;
    col: number;
}

export interface GridTouchPoint {
    locationX: number;
    locationY: number;
    pageX?: number;
    pageY?: number;
    /**
     * Deepest React-managed view under the finger. On iOS this is
     * `nativeEvent.target` (RCTTouchHandler walks to that view and then sets
     * locationX/Y with `locationInView`).
     */
    target?: unknown;
    /** View whose handler is running. */
    currentTarget?: unknown;
}

/** Window origin of the grid view (`measureInWindow`). Changes when the board scrolls. */
export interface GridOrigin {
    x: number;
    y: number;
}

function clamp(n: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, n));
}

/**
 * Map a point in the grid view's coordinate space to a cell.
 *
 * Live cells are laid out edge to edge. The 1pt playable outline is a border
 * inside the cell, not a gutter, so the step is the cell size. `GRID_LINE` is
 * the design extent used for scroll decisions and is not a layout gap.
 */
export function cellIndexAt(
    x: number,
    y: number,
    cell: number,
    rows: number,
    cols: number,
): CellIndex {
    const span = Math.max(cell, 1);
    return {
        row: clamp(Math.floor(y / span), 0, Math.max(0, rows - 1)),
        col: clamp(Math.floor(x / span), 0, Math.max(0, cols - 1)),
    };
}

/** Centre of a cell in grid-local coordinates. */
export function cellCenter(row: number, col: number, cell: number): { x: number; y: number } {
    return { x: (col + 0.5) * cell, y: (row + 0.5) * cell };
}

/**
 * Recover grid-local coordinates from a native touch.
 *
 * iOS `locationX`/`locationY` are relative to the deepest React view, not the
 * view whose handler runs. A tap in the middle of any cell therefore reports
 * a point inside that cell (~0..cell). Feeding that to `cellIndexAt` always
 * returns row 0, column 0. `pageX`/`pageY` are root-view coordinates; subtract
 * the grid's window origin (which moves when the board is offset or scrolled).
 *
 * When the handler view is the touch target, `locationX`/`locationY` are
 * already grid-local. A child target with no page position and no origin
 * returns null so the caller does not guess row 0, column 0.
 */
export function gridLocalPoint(
    touch: GridTouchPoint,
    origin: GridOrigin | null,
): { x: number; y: number } | null {
    const childTarget =
        touch.target != null &&
        touch.currentTarget != null &&
        touch.target !== touch.currentTarget;
    if (!childTarget) {
        return { x: touch.locationX, y: touch.locationY };
    }
    if (origin && typeof touch.pageX === 'number' && typeof touch.pageY === 'number') {
        return { x: touch.pageX - origin.x, y: touch.pageY - origin.y };
    }
    return null;
}

/**
 * Open cells select themselves. A blocked cell selects the nearest open cell
 * by Manhattan distance. Ties keep the first cell in row-major order.
 */
export function nearestOpenCell(
    row: number,
    col: number,
    rows: number,
    cols: number,
    isOpen: (r: number, c: number) => boolean,
): CellIndex | null {
    if (isOpen(row, col)) return { row, col };
    let best: { row: number; col: number; d: number } | null = null;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!isOpen(r, c)) continue;
            const d = Math.abs(r - row) + Math.abs(c - col);
            if (!best || d < best.d) best = { row: r, col: c, d };
        }
    }
    return best ? { row: best.row, col: best.col } : null;
}

/** Cell index for a native touch, or null when the touch cannot be mapped. */
export function cellFromGridTouch(
    touch: GridTouchPoint,
    origin: GridOrigin | null,
    cell: number,
    rows: number,
    cols: number,
    isOpen: (r: number, c: number) => boolean,
): CellIndex | null {
    const point = gridLocalPoint(touch, origin);
    if (!point) return null;
    const hit = cellIndexAt(point.x, point.y, cell, rows, cols);
    return nearestOpenCell(hit.row, hit.col, rows, cols, isOpen);
}
