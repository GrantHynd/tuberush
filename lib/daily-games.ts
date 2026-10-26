import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';
import type { ConnectionsPuzzle } from '@/constants/ConnectionsData';
import type { CrosswordPuzzle } from '@/types/game';
import { supabase } from './supabase-client';
import { toLocalDateString } from './week-utils';

type GameType = 'connections' | 'crossword';

interface DailyGameRow {
  id: string;
  game_type: string;
  game_date: string;
  puzzle_data: ConnectionsPuzzle | CrosswordPuzzle;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

/** Bump when cache shape or source-of-truth changes (invalidates old AsyncStorage rows). */
const CACHE_KEY_PREFIX = 'games_cache_v3_';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface CacheEntry {
  games: DailyGameRow[];
  fetchedAt: number;
}

/** Puzzle fetches give up after this so weak connections fall back to the cache quickly (TUB-285). */
export const PUZZLE_FETCH_TIMEOUT_MS = 3000;

/** Abort signal that fires after PUZZLE_FETCH_TIMEOUT_MS. */
function fetchTimeoutSignal(): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PUZZLE_FETCH_TIMEOUT_MS);
  // Don't keep Node (tests) alive for the timer.
  (timer as { unref?: () => void }).unref?.();
  return controller.signal;
}

function cacheKey(gameType: GameType): string {
  return `${CACHE_KEY_PREFIX}${gameType}`;
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

async function readCache(gameType: GameType): Promise<CacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(gameType));
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

/** Days of puzzles kept either side of today (offline-sync audit risk 3). */
export const CACHE_PAST_DAYS = 7;
export const CACHE_FUTURE_DAYS = 7;

function offsetDate(days: number, now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return toLocalDateString(d);
}

/**
 * Union cached and fresh rows by game_date (fresh wins), then keep only
 * today-CACHE_PAST_DAYS..today+CACHE_FUTURE_DAYS. Never drops a still-in-window
 * puzzle just because the latest fetch covered a different range.
 */
export function mergeCacheRows(
  existing: DailyGameRow[],
  incoming: DailyGameRow[],
  now: Date = new Date(),
): DailyGameRow[] {
  const from = offsetDate(-CACHE_PAST_DAYS, now);
  const to = offsetDate(CACHE_FUTURE_DAYS, now);
  const byDate = new Map<string, DailyGameRow>();
  for (const row of existing) byDate.set(row.game_date, row);
  for (const row of incoming) byDate.set(row.game_date, row);
  return [...byDate.values()]
    .filter(g => g.game_date >= from && g.game_date <= to)
    .sort((a, b) => a.game_date.localeCompare(b.game_date));
}

const writeChains: Partial<Record<GameType, Promise<void>>> = {};

/** Merge rows into the cache. Writes per game type are serialised so concurrent fetches can't clobber each other. */
function writeCache(gameType: GameType, games: DailyGameRow[]): Promise<void> {
  const run = (writeChains[gameType] ?? Promise.resolve()).then(async () => {
    try {
      const existing = await readCache(gameType);
      const entry: CacheEntry = {
        games: mergeCacheRows(existing?.games ?? [], games),
        fetchedAt: Date.now(),
      };
      await AsyncStorage.setItem(cacheKey(gameType), JSON.stringify(entry));
    } catch {
      // Silently fail — cache is best-effort
    }
  });
  writeChains[gameType] = run;
  return run;
}

function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

// ---------------------------------------------------------------------------
// Network fetch
// ---------------------------------------------------------------------------

async function fetchFromSupabase(
  gameType: GameType,
  days: number,
): Promise<DailyGameRow[] | null> {
  try {
    const today = toLocalDateString(new Date());
    const future = new Date();
    future.setDate(future.getDate() + days);
    const futureStr = toLocalDateString(future);

    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('game_type', gameType)
      .eq('is_published', true)
      .gte('game_date', today)
      .lte('game_date', futureStr)
      .order('game_date', { ascending: true })
      .abortSignal(fetchTimeoutSignal());

    if (error || !data) return null;
    return data as DailyGameRow[];
  } catch {
    return null;
  }
}

async function fetchRecentAndUpcoming(
  gameType: GameType,
  pastDays: number,
  futureDays: number,
): Promise<DailyGameRow[] | null> {
  try {
    const past = new Date();
    past.setDate(past.getDate() - pastDays);
    const pastStr = toLocalDateString(past);

    const future = new Date();
    future.setDate(future.getDate() + futureDays);
    const futureStr = toLocalDateString(future);

    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('game_type', gameType)
      .eq('is_published', true)
      .gte('game_date', pastStr)
      .lte('game_date', futureStr)
      .order('game_date', { ascending: false })
      .abortSignal(fetchTimeoutSignal());

    if (error || !data) return null;
    return data as DailyGameRow[];
  } catch {
    return null;
  }
}

function filterCachedByDateRange(
  cached: CacheEntry,
  pastStr: string,
  futureStr: string,
): DailyGameRow[] {
  return cached.games
    .filter(g => g.game_date >= pastStr && g.game_date <= futureStr)
    .sort((a, b) => b.game_date.localeCompare(a.game_date));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Prefetch upcoming games and cache them in AsyncStorage.
 * Fire-and-forget — never blocks the UI.
 */
export async function prefetchDailyGames(
  gameType: GameType,
  days: number = CACHE_FUTURE_DAYS,
  pastDays: number = CACHE_PAST_DAYS,
): Promise<void> {
  try {
    const games = await fetchRecentAndUpcoming(gameType, pastDays, days);
    if (games && games.length > 0) {
      await writeCache(gameType, games);
    }
  } catch {
    // Best-effort prefetch — failures are silent
  }
}

/**
 * Prefetch both game types now, whenever the app returns to the foreground,
 * and whenever the network comes back. Returns an unsubscribe.
 */
export function startDailyGamesPrefetch(): () => void {
  const prefetchAll = () => {
    prefetchDailyGames('connections').catch(() => {});
    prefetchDailyGames('crossword').catch(() => {});
  };
  let online: boolean | null = null;
  const unsubNet = NetInfo.addEventListener(state => {
    const nowOnline = state.isConnected ?? false;
    if (online === false && nowOnline) prefetchAll();
    online = nowOnline;
  });
  const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
    if (s === 'active') prefetchAll();
  });
  prefetchAll();
  return () => {
    unsubNet();
    sub.remove();
  };
}

/**
 * Get today's game. Network first, then cache. No bundled fallbacks.
 */
export async function getDailyGame(
  gameType: GameType,
): Promise<ConnectionsPuzzle | CrosswordPuzzle | undefined> {
  const today = toLocalDateString(new Date());

  const games = await fetchFromSupabase(gameType, 7);
  if (games && games.length > 0) {
    writeCache(gameType, games).catch(() => {});
    const match = games.find(g => g.game_date === today);
    if (match) return match.puzzle_data;
  }

  const cached = await readCache(gameType);
  if (cached) {
    const match = cached.games.find(g => g.game_date === today);
    if (match) {
      if (!isCacheValid(cached)) {
        prefetchDailyGames(gameType).catch(() => {});
      }
      return match.puzzle_data;
    }
  }

  return undefined;
}

/**
 * Get a game by specific date. Network first, then cache. No bundled fallbacks.
 */
export async function getGameByDate(
  gameType: GameType,
  date: string,
): Promise<ConnectionsPuzzle | CrosswordPuzzle | undefined> {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('puzzle_data')
      .eq('game_type', gameType)
      .eq('game_date', date)
      .eq('is_published', true)
      .abortSignal(fetchTimeoutSignal())
      .maybeSingle();

    if (!error && data) {
      return data.puzzle_data as ConnectionsPuzzle | CrosswordPuzzle;
    }
  } catch {
    // Fall through
  }

  const cached = await readCache(gameType);
  if (cached) {
    const match = cached.games.find(g => g.game_date === date);
    if (match) return match.puzzle_data;
  }

  return undefined;
}

/**
 * Load a crossword by puzzle_data.id (DB / carousel). Network, then cache scan.
 */
export async function getCrosswordByPuzzleId(
  puzzleId: string,
): Promise<GameWithDate<CrosswordPuzzle> | undefined> {
  if (!puzzleId) return undefined;
  try {
    const { data, error } = await supabase
      .from('games')
      .select('game_date, puzzle_data')
      .eq('game_type', 'crossword')
      .eq('is_published', true)
      .contains('puzzle_data', { id: puzzleId })
      .abortSignal(fetchTimeoutSignal())
      .maybeSingle();

    if (!error && data?.puzzle_data) {
      return { game_date: data.game_date, puzzle_data: data.puzzle_data as CrosswordPuzzle };
    }
  } catch {
    // Fall through to cache
  }

  const cached = await readCache('crossword');
  if (cached?.games) {
    for (const row of cached.games) {
      const p = row.puzzle_data as CrosswordPuzzle;
      if (p?.id === puzzleId) return { game_date: row.game_date, puzzle_data: p };
    }
  }

  return undefined;
}

/**
 * Recent / upcoming puzzles for carousels. Network, then cache slice. Empty if neither.
 */
export interface GameWithDate<T = ConnectionsPuzzle | CrosswordPuzzle> {
  game_date: string;
  puzzle_data: T;
}

export async function getRecentAndUpcomingGames(
  gameType: GameType,
  pastDays: number = 7,
  futureDays: number = 0,
): Promise<GameWithDate[]> {
  const past = new Date();
  past.setDate(past.getDate() - pastDays);
  const pastStr = toLocalDateString(past);

  const future = new Date();
  future.setDate(future.getDate() + futureDays);
  const futureStr = toLocalDateString(future);

  const games = await fetchRecentAndUpcoming(gameType, pastDays, futureDays);
  if (games && games.length > 0) {
    writeCache(gameType, games).catch(() => {});
    return games.map(g => ({ game_date: g.game_date, puzzle_data: g.puzzle_data }));
  }

  const cached = await readCache(gameType);
  if (cached?.games?.length) {
    return filterCachedByDateRange(cached, pastStr, futureStr).map(g => ({ game_date: g.game_date, puzzle_data: g.puzzle_data }));
  }

  return [];
}
