import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ConnectionsPuzzle } from '@/constants/ConnectionsData';
import {
  getDailyPuzzle as getConnectionsDailyFallback,
  getPuzzleByDate as getConnectionsByDateFallback,
  getRecentPuzzlesWithOffset as getConnectionsRecentFallback,
} from '@/constants/ConnectionsData';
import {
  getDailyPuzzle as getCrosswordDailyFallback,
  getPuzzleByDate as getCrosswordByDateFallback,
  getRecentPuzzlesWithOffset as getCrosswordRecentFallback,
} from '@/constants/CrosswordData';
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

const CACHE_KEY_PREFIX = 'daily_games_cache_';
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
      .from('daily_games')
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
      .from('daily_games')
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
 * Get today's game. Cache-first, falls back to network, then constants.
 */
export async function getDailyGame(
  gameType: GameType,
): Promise<ConnectionsPuzzle | CrosswordPuzzle> {
  const today = toLocalDateStr(new Date());

  // 1. Try cache
  const cached = await readCache(gameType);
  if (cached) {
    const match = cached.games.find(g => g.game_date === today);
    if (match) {
      // Refresh cache in background if stale
      if (!isCacheValid(cached)) {
        prefetchDailyGames(gameType).catch(() => {});
      }
      return match.puzzle_data;
    }
  }

  // 2. Try network
  const games = await fetchFromSupabase(gameType, 7);
  if (games && games.length > 0) {
    writeCache(gameType, games).catch(() => {});
    const match = games.find(g => g.game_date === today);
    if (match) return match.puzzle_data;
  }

  // 3. Fallback to constants
  if (gameType === 'connections') {
    return getConnectionsDailyFallback();
  }
  return getCrosswordDailyFallback();
}

/**
 * Get a game by specific date.
 */
export async function getGameByDate(
  gameType: GameType,
  date: string,
): Promise<ConnectionsPuzzle | CrosswordPuzzle | undefined> {
  // 1. Try cache
  const cached = await readCache(gameType);
  if (cached) {
    const match = cached.games.find(g => g.game_date === date);
    if (match) return match.puzzle_data;
  }

  // 2. Try network
  try {
    const { data, error } = await supabase
      .from('daily_games')
      .select('puzzle_data')
      .eq('game_type', gameType)
      .eq('game_date', date)
      .eq('is_published', true)
      .maybeSingle();

    if (!error && data) {
      return data.puzzle_data as ConnectionsPuzzle | CrosswordPuzzle;
    }
  } catch {
    // Fall through to constants
  }

  // 3. Fallback to constants
  if (gameType === 'connections') {
    return getConnectionsByDateFallback(date);
  }
  return getCrosswordByDateFallback(date);
}

/**
 * Get recent past and upcoming games for carousel display.
 * Returns puzzles sorted most-recent-first.
 */
export async function getRecentAndUpcomingGames(
  gameType: GameType,
  pastDays: number = 7,
  futureDays: number = 0,
): Promise<(ConnectionsPuzzle | CrosswordPuzzle)[]> {
  // 1. Try network
  const games = await fetchRecentAndUpcoming(gameType, pastDays, futureDays);
  if (games && games.length > 0) {
    return games.map(g => g.puzzle_data);
  }

  // 2. Fallback to constants
  const limit = pastDays + futureDays;
  if (gameType === 'connections') {
    return getConnectionsRecentFallback(limit, 0);
  }
  return getCrosswordRecentFallback(limit, 0);
}
