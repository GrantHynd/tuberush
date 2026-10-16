// Benchmark: fill each template with 20 seeds. Run: npx tsx scripts/bench-solver.ts
import { TEMPLATE_IDS, TEMPLATE_MASKS, computeWordSlots, slotCells, slotId } from '../src/grid';
import { fillGrid } from '../src/solver';
import { buildPools, seededRandom } from '../src/words';
for (const tid of TEMPLATE_IDS) {
  const slots = computeWordSlots(TEMPLATE_MASKS[tid]).map(s => ({ id: slotId(s), cells: slotCells(s) }));
  let ok = 0, ms = 0, worst = 0; const N = 20;
  for (let i = 0; i < N; i++) {
    const t0 = Date.now();
    const r = fillGrid(slots, { pools: buildPools(seededRandom(`2026-10-${i}`)), timeLimitMs: 10_000 });
    const d = Date.now() - t0; ms += d; worst = Math.max(worst, d);
    if (r.ok) ok++;
  }
  console.log(tid, 'slots', slots.length, 'ok', `${ok}/${N}`, 'avg_ms', Math.round(ms / N), 'worst_ms', worst);
}
