import { leaderboard } from '@/lib/leaderboard';
import { offlineSyncManager } from '@/lib/offline-sync-manager';
import { StorageManager } from '@/lib/storage-manager';
import { useAuthStore } from '@/stores/auth-store';
import type { ConnectionsState, CrosswordState } from '@/types/game';
import {
    connectionsGameHistoryConfig,
    crosswordGameHistoryConfig,
} from '@/config/gameHistoryConfigs';
import { useCallback, useEffect, useState } from 'react';

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Check if connections state is a win */
function isConnectionsWin(state: ConnectionsState | undefined): boolean {
    return state?.status === 'won';
}

/** Check if crossword state is completed (crossword completion = win) */
function isCrosswordWin(state: CrosswordState | undefined): boolean {
    return state?.completed === true;
}

/** Format date as YYYY-MM-DD in local timezone (matches game puzzle dates) */
function toLocalDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Calculate streak from set of dates where user completed any game. Counts consecutive days from today backwards. */
function calculateStreakFromDates(completedDates: Set<string>): number {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    let streak = 0;
    let checkDate = new Date(today);

    for (let i = 0; i < 365; i++) {
        const dateStr = toLocalDateStr(checkDate);
        if (completedDates.has(dateStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

export type BestTimeGameType = 'connections' | 'crossword';

export interface UserStats {
    bestTime: string | null;
    bestTimeGameType: BestTimeGameType | null;
    streak: number;
}

export function useUserStats() {
    const user = useAuthStore(state => state.user);
    const [stats, setStats] = useState<UserStats>({
        bestTime: null,
        bestTimeGameType: null,
        streak: 0,
    });
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!user) {
            setStats({ bestTime: null, bestTimeGameType: null, streak: 0 });
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [connectionsBest, crosswordBest, streak] = await Promise.all([
                leaderboard.getUserBestScore(user.id, 'connections'),
                leaderboard.getUserBestScore(user.id, 'crossword'),
                loadUserStreak(user.id),
            ]);

            let bestTime: string | null = null;
            let bestTimeGameType: BestTimeGameType | null = null;

            if (connectionsBest !== null && crosswordBest !== null) {
                if (connectionsBest <= crosswordBest) {
                    bestTime = formatTime(connectionsBest);
                    bestTimeGameType = 'connections';
                } else {
                    bestTime = formatTime(crosswordBest);
                    bestTimeGameType = 'crossword';
                }
            } else if (connectionsBest !== null) {
                bestTime = formatTime(connectionsBest);
                bestTimeGameType = 'connections';
            } else if (crosswordBest !== null) {
                bestTime = formatTime(crosswordBest);
                bestTimeGameType = 'crossword';
            }

            setStats({
                bestTime,
                bestTimeGameType,
                streak,
            });
        } catch (err) {
            console.error('Failed to load user stats:', err);
            setStats({ bestTime: null, bestTimeGameType: null, streak: 0 });
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        load();
    }, [load]);

    return { stats, loading, refresh: load };
}

/** Load game states for both connections and crossword, compute streak from wins per day */
async function loadUserStreak(userId: string): Promise<number> {
    const DAYS_TO_CHECK = 60; // Check last 60 days for streak
    const connPuzzles = connectionsGameHistoryConfig.getPuzzlesWithOffset(
        DAYS_TO_CHECK,
        0
    );
    const crossPuzzles = crosswordGameHistoryConfig.getPuzzlesWithOffset(
        DAYS_TO_CHECK,
        0
    );

    const connGameIds = connPuzzles.map(p =>
        connectionsGameHistoryConfig.getGameId(userId, p)
    );
    const crossGameIds = crossPuzzles.map(p =>
        crosswordGameHistoryConfig.getGameId(userId, p)
    );
    const allGameIds = [...connGameIds, ...crossGameIds];

    let gameStatesMap = await StorageManager.getGameStatesBatch(allGameIds);
    const missingIds = allGameIds.filter(id => !gameStatesMap.has(id));
    if (missingIds.length > 0) {
        const loaded = await Promise.all(
            missingIds.map(id => offlineSyncManager.loadGameState(id, userId))
        );
        const nextMap = new Map(gameStatesMap);
        loaded.forEach((game, i) => {
            if (game) nextMap.set(missingIds[i], game);
        });
        gameStatesMap = nextMap;
    }

    const completedDates = new Set<string>();

    for (let i = 0; i < connPuzzles.length; i++) {
        const puzzle = connPuzzles[i];
        const gameId = connGameIds[i];
        const game = gameStatesMap.get(gameId) ?? null;
        const state = game?.state as ConnectionsState | undefined;
        if (isConnectionsWin(state)) {
            completedDates.add(connectionsGameHistoryConfig.getPuzzleDate(puzzle));
        }
    }

    for (let i = 0; i < crossPuzzles.length; i++) {
        const puzzle = crossPuzzles[i];
        const gameId = crossGameIds[i];
        const game = gameStatesMap.get(gameId) ?? null;
        const state = game?.state as CrosswordState | undefined;
        if (isCrosswordWin(state)) {
            completedDates.add(crosswordGameHistoryConfig.getPuzzleDate(puzzle));
        }
    }

    return calculateStreakFromDates(completedDates);
}
