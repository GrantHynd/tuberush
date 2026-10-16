/**
 * Deterministic crossword grid filler.
 *
 * Backtracking search with "most constrained slot first": at each step it fills the slot with
 * the fewest matching words, so dead ends are found early. Crossing letters are guaranteed to
 * agree by construction, which is the part Claude was unreliable at.
 */

export interface SolverSlot {
  id: string;
  /** Cell indices in reading order; a cell shared by two slots is a crossing. */
  cells: number[];
}

export interface SolverOptions {
  /** Candidate words per length, in preference order (best first). */
  pools: ReadonlyMap<number, readonly string[]>;
  /** Give up after this long; the caller can retry with another shuffle. */
  timeLimitMs: number;
  /** Max words tried per slot before backtracking further up. Keeps search breadth bounded. */
  maxBranch?: number;
}

export type SolverResult =
  | { ok: true; answers: Map<string, string>; nodes: number }
  | { ok: false; reason: 'exhausted' | 'timeout'; nodes: number };

class TimeoutSignal extends Error {}

export function fillGrid(slots: readonly SolverSlot[], opts: SolverOptions): SolverResult {
  const deadline = Date.now() + opts.timeLimitMs;
  const maxBranch = opts.maxBranch ?? 60;
  const letters = new Map<number, string>();
  const used = new Set<string>();
  const assigned = new Map<string, string>();
  const patternCache = new Map<string, readonly string[]>();
  let nodes = 0;

  const patternOf = (slot: SolverSlot): string =>
    slot.cells.map(cell => letters.get(cell) ?? '.').join('');

  /** All words of the right length matching the fixed letters (ignores `used`; cached per pattern). */
  const matching = (pattern: string): readonly string[] => {
    const cached = patternCache.get(pattern);
    if (cached) return cached;
    const pool = opts.pools.get(pattern.length) ?? [];
    const fixed: [number, string][] = [];
    for (let i = 0; i < pattern.length; i++) if (pattern[i] !== '.') fixed.push([i, pattern[i]]);
    const result = fixed.length === 0 ? pool : pool.filter(w => fixed.every(([i, ch]) => w[i] === ch));
    patternCache.set(pattern, result);
    return result;
  };

  const search = (remaining: SolverSlot[]): boolean => {
    if (remaining.length === 0) return true;
    if (++nodes % 256 === 0 && Date.now() > deadline) throw new TimeoutSignal();

    // Most-constrained slot first.
    let best: SolverSlot | null = null;
    let bestCands: string[] = [];
    for (const slot of remaining) {
      const cands = matching(patternOf(slot)).filter(w => !used.has(w));
      if (cands.length === 0) return false;
      if (!best || cands.length < bestCands.length) {
        best = slot;
        bestCands = cands;
        if (cands.length === 1) break;
      }
    }
    if (!best) return false;
    const rest = remaining.filter(s => s !== best);

    for (const word of bestCands.slice(0, maxBranch)) {
      const placed: number[] = [];
      best.cells.forEach((cell, i) => {
        if (!letters.has(cell)) {
          letters.set(cell, word[i]);
          placed.push(cell);
        }
      });
      used.add(word);
      assigned.set(best.id, word);

      if (search(rest)) return true;

      assigned.delete(best.id);
      used.delete(word);
      for (const cell of placed) letters.delete(cell);
    }
    return false;
  };

  try {
    const ok = search([...slots]);
    return ok
      ? { ok: true, answers: new Map(assigned), nodes }
      : { ok: false, reason: 'exhausted', nodes };
  } catch (e) {
    if (e instanceof TimeoutSignal) return { ok: false, reason: 'timeout', nodes };
    throw e;
  }
}
