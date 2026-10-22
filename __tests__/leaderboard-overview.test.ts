import { buildLeaderboardOverview, getNearbyEntries } from '@/lib/leaderboard-overview';
import type { WeeklyLeaderboardEntry } from '@/types/game';

function entry(userId: string, rank: number, totalScore: number): WeeklyLeaderboardEntry {
    return {
        userId,
        username: userId,
        city: 'London',
        borough: 'Camden',
        totalScore,
        gamesPlayed: 3,
        rank,
    };
}

const board = [1, 2, 3, 4, 5, 6, 7, 8].map((rank) => entry(`user-${rank}`, rank, rank * 10));

describe('getNearbyEntries', () => {
    it('returns a window around the player', () => {
        expect(getNearbyEntries(board, 'user-5').map((row) => row.userId)).toEqual([
            'user-2',
            'user-3',
            'user-4',
            'user-5',
            'user-6',
            'user-7',
            'user-8',
        ]);
    });

    it('clamps the window at the top of the board', () => {
        expect(getNearbyEntries(board, 'user-1').map((row) => row.rank)).toEqual([1, 2, 3, 4]);
    });

    it('returns the top of the board when the player is absent', () => {
        expect(getNearbyEntries(board, 'missing')).toHaveLength(7);
        expect(getNearbyEntries(board, 'missing')[0].rank).toBe(1);
    });
});

describe('buildLeaderboardOverview', () => {
    it('averages ranks, sums scores, and uses the busiest player count', () => {
        const overview = buildLeaderboardOverview(
            ['connections', 'crossword'],
            [
                { entries: [entry('me', 2, 40), entry('other', 1, 20)], totalPlayers: 10 },
                { entries: [entry('me', 4, 15)], totalPlayers: 20 },
            ],
            'me',
        );

        expect(overview.stats).toEqual({
            overallRank: 3,
            totalScore: 55,
            topPercent: 15,
            totalPlayers: 20,
        });
        expect(overview.games.map((game) => game.userRank)).toEqual([2, 4]);
        expect(overview.games[0].nearbyEntries.map((row) => row.userId)).toEqual(['me', 'other']);
    });

    it('leaves rank empty and shows the top rows when nobody is signed in', () => {
        const overview = buildLeaderboardOverview(
            ['connections'],
            [{ entries: board, totalPlayers: 8 }],
            undefined,
        );

        expect(overview.stats.overallRank).toBeNull();
        expect(overview.stats.topPercent).toBeNull();
        expect(overview.stats.totalScore).toBe(0);
        expect(overview.games[0].nearbyEntries).toHaveLength(7);
        expect(overview.games[0].userRank).toBeNull();
    });

    it('floors top percent at 1 when the player is first of many', () => {
        const overview = buildLeaderboardOverview(
            ['connections'],
            [{ entries: [entry('me', 1, 10)], totalPlayers: 500 }],
            'me',
        );

        expect(overview.stats.topPercent).toBe(1);
    });
});
