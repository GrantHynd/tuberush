/**
 * Word sources for the grid solver.
 *
 * - word-bank.json: ~290 hand-picked words with vetted clues (always preferred).
 * - word-list.json: ~28k common British English words, most frequent first.
 *   Built by scripts/build-word-list.py from wordfreq (CC-BY-SA 4.0) + the en_GB Hunspell dictionary.
 */

import wordBankData from './word-bank.json';
import wordListData from './word-list.json';

type WordBankEntry = { word: string; clue: string };

/** Words beyond this frequency rank are never used: the tail gets obscure (COULOMB, CONJUNCT). */
export const MAX_RANK = 22_000;
/** Frequency rank boundaries for preference tiers after the word bank. */
const TIER_BOUNDARIES = [6_000, 14_000];

const BANK_CLUES = new Map<string, string>();
for (const entries of Object.values(wordBankData as Record<string, WordBankEntry[]>)) {
  for (const e of entries) {
    const w = e.word.trim().toUpperCase();
    if (/^[A-Z]{3,9}$/.test(w)) BANK_CLUES.set(w, e.clue);
  }
}

const WORD_LIST: readonly string[] = (wordListData as string[]).slice(0, MAX_RANK);

/** The vetted clue for a word-bank word, if any (used as a hint for Claude). */
export function bankClue(word: string): string | undefined {
  return BANK_CLUES.get(word);
}

/** Seeded PRNG (mulberry32) so a given date always produces the same fill. */
export function seededRandom(seedText: string): () => number {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/**
 * Candidate pools per word length, best first: word-bank words, then common words in
 * frequency tiers. Each tier is shuffled with the seed so every day gets a different grid.
 */
export function buildPools(
  rand: () => number,
  exclude: ReadonlySet<string> = new Set(),
): Map<number, string[]> {
  const tiers = new Map<number, string[][]>();
  const seen = new Set<string>();
  const add = (word: string, tier: number) => {
    if (seen.has(word) || exclude.has(word)) return;
    seen.add(word);
    const byTier = tiers.get(word.length) ?? [];
    (byTier[tier] ??= []).push(word);
    tiers.set(word.length, byTier);
  };

  for (const word of BANK_CLUES.keys()) add(word, 0);
  WORD_LIST.forEach((word, rank) => {
    const tier = 1 + TIER_BOUNDARIES.filter(b => rank >= b).length;
    add(word, tier);
  });

  const pools = new Map<number, string[]>();
  for (const [len, byTier] of tiers) {
    pools.set(len, byTier.flatMap(t => (t ? shuffle(t, rand) : [])));
  }
  return pools;
}
