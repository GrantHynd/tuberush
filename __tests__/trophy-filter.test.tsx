import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrophyScreen from '@/app/(tabs)/trophy';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'expo-router';
import { useLeaderboardOverview } from '@/hooks/useLeaderboardOverview';
import { capture } from '@/lib/posthog';

jest.mock('@/stores/auth-store', () => ({ useAuthStore: jest.fn() }));
jest.mock('@/lib/posthog', () => ({ capture: jest.fn() }));
jest.mock('@/hooks/usePuzzleCarousel', () => ({
    usePuzzleCarousel: jest.fn(() => ({ items: [], loading: false, refresh: jest.fn() })),
}));
jest.mock('@/hooks/useLeaderboardOverview', () => ({ useLeaderboardOverview: jest.fn() }));
jest.mock('@/components/leaderboard/GameSummaryCard', () => ({ GameSummaryCard: () => null }));

const overview = (totalPlayers = 50) => ({
    games: [],
    stats: { overallRank: 2, totalScore: 100, topPercent: 10, totalPlayers },
    loading: false,
    error: null,
    refetch: jest.fn(),
});
const lastArea = () => (useLeaderboardOverview as jest.Mock).mock.calls.at(-1)[2];

describe('Leaderboard filter (TUB-265)', () => {
    const push = jest.fn();
    beforeEach(async () => {
        jest.clearAllMocks();
        await AsyncStorage.clear();
        (useRouter as jest.Mock).mockReturnValue({ push });
        (useLeaderboardOverview as jest.Mock).mockReturnValue(overview());
    });

    it('defaults to My area (borough) and scopes the whole board', async () => {
        (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: 'u1', city: 'London', borough: 'Camden' } });
        const { getByTestId, getByText } = await render(<TrophyScreen />);
        expect(getByTestId('board-filter-area').props.accessibilityState).toEqual({ selected: true });
        expect(getByTestId('board-filter-area').props.accessibilityLabel).toBe('My area, Camden');
        expect(lastArea()).toEqual({ city: 'London', borough: 'Camden' });
        expect(getByText('Commuters in Camden')).toBeTruthy();
        expect(getByText('Top 10% of commuters in Camden this week')).toBeTruthy();
    });

    it('switching to Everyone unscopes, persists and reports', async () => {
        (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: 'u1', city: 'Leeds', borough: null } });
        const { getByTestId, getByText } = await render(<TrophyScreen />);
        await fireEvent.press(getByTestId('board-filter-everyone'));
        expect(lastArea()).toBeNull();
        expect(getByText('Top 10% of commuters this week')).toBeTruthy();
        expect(capture).toHaveBeenCalledWith('leaderboard_filter_changed', { filter: 'everyone' });
        await waitFor(async () => expect(await AsyncStorage.getItem('leaderboard-filter:u1')).toBe('everyone'));
    });

    it('restores the stored choice', async () => {
        await AsyncStorage.setItem('leaderboard-filter:u2', 'everyone');
        (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: 'u2', city: 'Leeds', borough: null } });
        const { getByTestId } = await render(<TrophyScreen />);
        await waitFor(() => expect(getByTestId('board-filter-everyone').props.accessibilityState).toEqual({ selected: true }));
    });

    it('no area set: defaults to Everyone; My area shows Set your area', async () => {
        (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: 'u3', city: null, borough: null } });
        const { getByTestId, getByText } = await render(<TrophyScreen />);
        expect(getByTestId('board-filter-everyone').props.accessibilityState).toEqual({ selected: true });
        await fireEvent.press(getByTestId('board-filter-area'));
        expect(getByText('Set your area')).toBeTruthy();
        await fireEvent.press(getByText('Set area'));
        expect(push).toHaveBeenCalledWith('/profile');
    });

    it('few players caption', async () => {
        (useLeaderboardOverview as jest.Mock).mockReturnValue(overview(2));
        (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: 'u4', city: 'Leeds', borough: null } });
        const { getByText } = await render(<TrophyScreen />);
        expect(getByText('Only 2 commuters in Leeds so far this week.')).toBeTruthy();
    });

    it('signed out: no control, Everyone', async () => {
        (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: null });
        const { queryByTestId } = await render(<TrophyScreen />);
        expect(queryByTestId('board-filter')).toBeNull();
        expect(lastArea()).toBeNull();
    });
});
