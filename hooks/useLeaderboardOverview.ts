import { useCallback, useEffect, useState } from 'react';
import { leaderboard } from '@/lib/leaderboard';
import { buildLeaderboardOverview, type OverviewStats } from '@/lib/leaderboard-overview';
import { GameType, GameOverviewData } from '@/types/game';
import { GAMES, GameId } from '@/constants/Games';
import { useAuthStore } from '@/stores/auth-store';

interface UseLeaderboardOverviewResult {
    games: GameOverviewData[];
    stats: OverviewStats;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useLeaderboardOverview(
    weekStart: string,
    weekEnd: string
): UseLeaderboardOverviewResult {
    const { user } = useAuthStore();
    const [games, setGames] = useState<GameOverviewData[]>([]);
    const [stats, setStats] = useState<OverviewStats>({
        overallRank: null,
        totalScore: 0,
        topPercent: null,
        totalPlayers: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const gameIds = Object.keys(GAMES) as GameId[];
            const results = await Promise.all(
                gameIds.map((gt) =>
                    leaderboard.getWeeklyLeaderboard(
                        gt as GameType,
                        weekStart,
                        weekEnd
                    )
                )
            );

            const overview = buildLeaderboardOverview(
                gameIds as GameType[],
                results,
                user?.id,
            );

            setGames(overview.games);
            setStats(overview.stats);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Failed to load overview';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [weekStart, weekEnd, user]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { games, stats, loading, error, refetch: fetch };
}
