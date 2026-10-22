import { leaderboard } from '@/lib/leaderboard';
import { offlineSyncManager } from '@/lib/offline-sync-manager';
import { StorageManager } from '@/lib/storage-manager';
import {
    calculateStreakFromDates,
    selectBestTime,
    type BestTimeGameType,
} from '@/lib/user-stats';
import { useAuthStore } from '@/stores/auth-store';
import type { ConnectionsState, CrosswordState } from '@/types/game';
import {
    connectionsGameHistoryConfig,
    crosswordGameHistoryConfig,
} from '@/config/gameHistoryConfigs';
import { useCallback, useEffect, useState } from 'react';

export type { BestTimeGameType };

export interface UserStats {
    bestTime: string | null;
    bestTimeGameType: BestTimeGameType | null;
    streak: number;
}

function isConnectionsWin(state: ConnectionsState | undefined): boolean {
    return state?.status === 'won';
}

function isCrosswordWin(state: CrosswordState | undefined): boolean {
    return state?.completed === true;
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

            setStats({
                ...selectBestTime(connectionsBest, crosswordBest),
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

/** Wins across both games over the last 60 published puzzles, counted as a daily streak. */
async function loadUserStreak(userId: string): Promise<number> {
    const DAYS_TO_CHECK = 60;
    const connPuzzles = await Promise.resolve(connectionsGameHistoryConfig.getPuzzlesWithOffset(
        DAYS_TO_CHECK,
        0
    ));
    const crossPuzzles = await Promise.resolve(crosswordGameHistoryConfig.getPuzzlesWithOffset(
        DAYS_TO_CHECK,
        0
    ));

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
