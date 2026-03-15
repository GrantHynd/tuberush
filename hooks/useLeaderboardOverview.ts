import { useCallback, useEffect, useState } from 'react';
import { leaderboard } from '@/lib/leaderboard';
import { GameType, WeeklyLeaderboardEntry, GameOverviewData } from '@/types/game';
import { GAMES, GameId } from '@/constants/Games';
import { useAuthStore } from '@/stores/auth-store';

interface OverviewStats {
    overallRank: number | null;
    totalScore: number;
    topPercent: number | null;
    totalPlayers: number;
}

interface UseLeaderboardOverviewResult {
    games: GameOverviewData[];
    stats: OverviewStats;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

function getNearbyEntries(
    entries: WeeklyLeaderboardEntry[],
    userId: string,
    windowSize: number = 3
): WeeklyLeaderboardEntry[] {
    const idx = entries.findIndex((e) => e.userId === userId);
    if (idx === -1) return entries.slice(0, windowSize * 2 + 1);
    const start = Math.max(0, idx - windowSize);
    const end = Math.min(entries.length, idx + windowSize + 1);
    return entries.slice(start, end);
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

            let combinedScore = 0;
            let maxPlayers = 0;
            const avgRanks: number[] = [];

            const gameData: GameOverviewData[] = gameIds.map((gt, i) => {
                const { entries, totalPlayers } = results[i];
                const userEntry = user
                    ? entries.find((e) => e.userId === user.id)
                    : undefined;

                if (userEntry) {
                    combinedScore += userEntry.totalScore;
                    avgRanks.push(userEntry.rank);
                }

                if (totalPlayers > maxPlayers) maxPlayers = totalPlayers;

                return {
                    gameType: gt as GameType,
                    userRank: userEntry?.rank ?? null,
                    totalPlayers,
                    userScore: userEntry?.totalScore ?? null,
                    nearbyEntries: user
                        ? getNearbyEntries(entries, user.id)
                        : entries.slice(0, 7),
                };
            });

            const overallRank =
                avgRanks.length > 0
                    ? Math.round(
                          avgRanks.reduce((a, b) => a + b, 0) / avgRanks.length
                      )
                    : null;

            const topPercent =
                overallRank != null && maxPlayers > 0
                    ? Math.max(1, Math.round((overallRank / maxPlayers) * 100))
                    : null;

            setGames(gameData);
            setStats({
                overallRank,
                totalScore: combinedScore,
                topPercent,
                totalPlayers: maxPlayers,
            });
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load overview');
        } finally {
            setLoading(false);
        }
    }, [weekStart, weekEnd, user]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { games, stats, loading, error, refetch: fetch };
}
