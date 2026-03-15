import { useCallback, useEffect, useState } from 'react';
import { leaderboard } from '@/lib/leaderboard';
import { WeeklyLeaderboardEntry, GameType } from '@/types/game';

interface UseWeeklyLeaderboardResult {
    entries: WeeklyLeaderboardEntry[];
    totalPlayers: number;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useWeeklyLeaderboard(
    gameType: GameType,
    weekStart: string,
    weekEnd: string,
    city?: string | null
): UseWeeklyLeaderboardResult {
    const [entries, setEntries] = useState<WeeklyLeaderboardEntry[]>([]);
    const [totalPlayers, setTotalPlayers] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaderboard.getWeeklyLeaderboard(
                gameType,
                weekStart,
                weekEnd,
                city
            );
            setEntries(result.entries);
            setTotalPlayers(result.totalPlayers);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load leaderboard');
        } finally {
            setLoading(false);
        }
    }, [gameType, weekStart, weekEnd, city]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { entries, totalPlayers, loading, error, refetch: fetch };
}
