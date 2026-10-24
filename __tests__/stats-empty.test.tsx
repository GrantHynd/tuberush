import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import StatsScreen from '@/app/(tabs)/stats';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'expo-router';
import { useGameHistory } from '@/hooks/useGameHistory';

jest.mock('@/stores/auth-store', () => ({ useAuthStore: jest.fn() }));
jest.mock('@/hooks/usePuzzleCarousel', () => ({
    usePuzzleCarousel: jest.fn(() => ({
        items: [{ label: 'Today', isNew: true, isCompleted: false, status: 'unplayed', date: '2026-10-24', puzzleId: '1' }],
        loading: false,
        refresh: jest.fn(),
    })),
}));
jest.mock('@/hooks/useUserStats', () => ({
    useUserStats: jest.fn(() => ({ stats: { bestTime: null, bestTimeGameType: null, streak: 0 }, loading: false })),
}));
jest.mock('@/hooks/useGameHistory', () => ({ useGameHistory: jest.fn() }));

describe('StatsScreen empty state', () => {
    const push = jest.fn();
    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue({ push });
        (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: 'u1', isPremium: false } });
    });

    it('shows only the header and EmptyState when there is no history', async () => {
        (useGameHistory as jest.Mock).mockReturnValue({ history: [], gamesPlayed: 0, loading: false });
        const { getByText, queryByText, getByTestId } = await render(<StatsScreen />);
        expect(getByText('Stats')).toBeTruthy();
        expect(getByTestId('stats-empty')).toBeTruthy();
        expect(getByText('No games yet')).toBeTruthy();
        expect(
            getByText('Solve a puzzle on your next journey and your times, streaks and scores will appear here.'),
        ).toBeTruthy();
        expect(queryByText('GAME HISTORY')).toBeNull();
        expect(queryByText('Games played')).toBeNull();
        await fireEvent.press(getByText('Play now'));
        expect(push).toHaveBeenCalledWith(expect.stringContaining('/games/play-connections'));
    });

    it('shows tiles and history when games exist', async () => {
        (useGameHistory as jest.Mock).mockReturnValue({
            history: [{ id: 'h1', gameType: 'connections', date: '2026-10-23', score: 90, result: 'win', points: 10 }],
            gamesPlayed: 1,
            loading: false,
        });
        const { getByText, queryByTestId } = await render(<StatsScreen />);
        expect(getByText('GAME HISTORY')).toBeTruthy();
        expect(getByText('Games played')).toBeTruthy();
        expect(queryByTestId('stats-empty')).toBeNull();
    });
});
