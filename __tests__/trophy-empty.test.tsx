import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TrophyScreen from '@/app/(tabs)/trophy';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'expo-router';
import { useLeaderboardOverview } from '@/hooks/useLeaderboardOverview';
import { getRankingPrompt } from '@/lib/today-puzzles';

jest.mock('@/stores/auth-store', () => ({ useAuthStore: jest.fn() }));
jest.mock('@/lib/posthog', () => ({ capture: jest.fn() }));
jest.mock('@/hooks/usePuzzleCarousel', () => ({
    usePuzzleCarousel: jest.fn(() => ({
        items: [{ label: 'Today', isNew: true, isCompleted: false, status: 'unplayed', date: '2026-10-24', puzzleId: '1' }],
        loading: false,
        refresh: jest.fn(),
    })),
}));
jest.mock('@/hooks/useLeaderboardOverview', () => ({ useLeaderboardOverview: jest.fn() }));
jest.mock('@/components/leaderboard/GameSummaryCard', () => ({ GameSummaryCard: () => null }));

const overview = (stats: object) => ({ games: [], stats, loading: false, error: null, refetch: jest.fn() });

describe('getRankingPrompt', () => {
    it('prefers London borough, then city, then generic', () => {
        expect(getRankingPrompt({ city: 'London', borough: 'Camden' })).toBe(
            "Play today's puzzle to get ranked against commuters in Camden.",
        );
        expect(getRankingPrompt({ city: 'Manchester', borough: null })).toBe(
            "Play today's puzzle to get ranked against commuters in Manchester.",
        );
        expect(getRankingPrompt({ city: null, borough: null })).toBe(
            "Play today's puzzle to get ranked against other commuters.",
        );
    });
});

describe('TrophyScreen personal summary', () => {
    const push = jest.fn();
    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue({ push });
        (useAuthStore as unknown as jest.Mock).mockReturnValue({
            user: { id: 'u1', isPremium: false, city: 'London', borough: 'Hackney' },
        });
    });

    it('shows the unranked EmptyState instead of the summary card', async () => {
        (useLeaderboardOverview as jest.Mock).mockReturnValue(
            overview({ overallRank: null, totalScore: 0, topPercent: null }),
        );
        const { getByText, queryByText } = await render(<TrophyScreen />);
        expect(getByText("You're not on the board yet")).toBeTruthy();
        expect(getByText("Play today's puzzle to get ranked against commuters in Hackney.")).toBeTruthy();
        expect(queryByText('Total Score')).toBeNull();
        await fireEvent.press(getByText("Play today's puzzle"));
        expect(push).toHaveBeenCalledWith(expect.stringContaining('/games/play-connections'));
    });

    it('shows tiles and the Top % sentence when ranked', async () => {
        (useLeaderboardOverview as jest.Mock).mockReturnValue(
            overview({ overallRank: 4, totalScore: 1200, topPercent: 12 }),
        );
        const { getByText, queryByText } = await render(<TrophyScreen />);
        expect(getByText('#4')).toBeTruthy();
        expect(getByText('Top 12% of commuters in Hackney this week')).toBeTruthy();
        expect(queryByText('Top %')).toBeNull();
        expect(queryByText('—')).toBeNull();
        expect(queryByText("You're not on the board yet")).toBeNull();
    });
});
