import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ConnectionsPuzzle } from '@/constants/ConnectionsData';
import type { CrosswordPuzzle } from '@/types/game';
import { supabase } from './supabase-client';

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

function cacheKey(gameType: GameType): string {
  return `${CACHE_KEY_PREFIX}${gameType}`;
}

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

async function writeCache(gameType: GameType, games: DailyGameRow[]): Promise<void> {
  try {
    const entry: CacheEntry = { games, fetchedAt: Date.now() };
    await AsyncStorage.setItem(cacheKey(gameType), JSON.stringify(entry));
  } catch {
    // Silently fail — cache is best-effort
  }
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
    const today = toLocalDateStr(new Date());
    const future = new Date();
    future.setDate(future.getDate() + days);
    const futureStr = toLocalDateStr(future);

    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('game_type', gameType)
      .eq('is_published', true)
      .gte('game_date', today)
      .lte('game_date', futureStr)
      .order('game_date', { ascending: true });

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
    const pastStr = toLocalDateStr(past);

    const future = new Date();
    future.setDate(future.getDate() + futureDays);
    const futureStr = toLocalDateStr(future);

    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('game_type', gameType)
      .eq('is_published', true)
      .gte('game_date', pastStr)
      .lte('game_date', futureStr)
      .order('game_date', { ascending: false });

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
  days: number = 7,
): Promise<void> {
  try {
    const games = await fetchFromSupabase(gameType, days);
    if (games && games.length > 0) {
      await writeCache(gameType, games);
    }
  } catch {
    // Best-effort prefetch — failures are silent
  }
}

/**
 * Get today's game. Network first, then cache. No bundled fallbacks.
 */
export async function getDailyGame(
  gameType: GameType,
): Promise<ConnectionsPuzzle | CrosswordPuzzle | undefined> {
  const today = toLocalDateStr(new Date());

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
  const pastStr = toLocalDateStr(past);

  const future = new Date();
  future.setDate(future.getDate() + futureDays);
  const futureStr = toLocalDateStr(future);

  const games = await fetchRecentAndUpcoming(gameType, pastDays, futureDays);
  if (games && games.length > 0) {
    return games.map(g => ({ game_date: g.game_date, puzzle_data: g.puzzle_data }));
  }

  const cached = await readCache(gameType);
  if (cached?.games?.length) {
    return filterCachedByDateRange(cached, pastStr, futureStr).map(g => ({ game_date: g.game_date, puzzle_data: g.puzzle_data }));
  }

  return [];
}
