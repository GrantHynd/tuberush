import type { GameOverviewData, GameType, WeeklyLeaderboardEntry } from '@/types/game';

export interface OverviewStats {
    overallRank: number | null;
    totalScore: number;
    topPercent: number | null;
    totalPlayers: number;
}

export interface WeeklyGameSlice {
    entries: WeeklyLeaderboardEntry[];
    totalPlayers: number;
}

/** Rows around the signed-in player, or the top of the list when they have no rank. */
export function getNearbyEntries(
    entries: WeeklyLeaderboardEntry[],
    userId: string,
    windowSize = 3,
): WeeklyLeaderboardEntry[] {
    const idx = entries.findIndex((entry) => entry.userId === userId);
    if (idx === -1) return entries.slice(0, windowSize * 2 + 1);
    const start = Math.max(0, idx - windowSize);
    const end = Math.min(entries.length, idx + windowSize + 1);
    return entries.slice(start, end);
}

/**
 * Roll per-game weekly boards into the trophy-tab overview.
 * Overall rank is the average of the games the player appeared in.
 * Top percent uses the busiest game's player count.
 */
export function buildLeaderboardOverview(
    gameIds: GameType[],
    results: WeeklyGameSlice[],
    userId: string | undefined,
): { games: GameOverviewData[]; stats: OverviewStats } {
    let combinedScore = 0;
    let maxPlayers = 0;
    const ranks: number[] = [];

    const games: GameOverviewData[] = gameIds.map((gameType, index) => {
        const { entries, totalPlayers } = results[index];
        const userEntry = userId
            ? entries.find((entry) => entry.userId === userId)
            : undefined;

        if (userEntry) {
            combinedScore += userEntry.totalScore;
            ranks.push(userEntry.rank);
        }
        if (totalPlayers > maxPlayers) maxPlayers = totalPlayers;

        return {
            gameType,
            userRank: userEntry?.rank ?? null,
            totalPlayers,
            userScore: userEntry?.totalScore ?? null,
            nearbyEntries: userId
                ? getNearbyEntries(entries, userId)
                : entries.slice(0, 7),
        };
    });

    const overallRank =
        ranks.length > 0
            ? Math.round(ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length)
            : null;

    const topPercent =
        overallRank != null && maxPlayers > 0
            ? Math.max(1, Math.round((overallRank / maxPlayers) * 100))
            : null;

    return {
        games,
        stats: {
            overallRank,
            totalScore: combinedScore,
            topPercent,
            totalPlayers: maxPlayers,
        },
    };
}
