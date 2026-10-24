import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import StatsScreen from '@/app/(tabs)/stats';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'expo-router';
import { useGameHistory } from '@/hooks/useGameHistory';
import { toLocalDateString } from '@/lib/week-utils';

jest.mock('@/stores/auth-store', () => ({ useAuthStore: jest.fn() }));
jest.mock('@/hooks/usePuzzleCarousel', () => ({
    usePuzzleCarousel: jest.fn(() => ({ items: [], loading: false, refresh: jest.fn() })),
}));
jest.mock('@/hooks/useGameHistory', () => ({ useGameHistory: jest.fn() }));

const day = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return toLocalDateString(d);
};
const entry = (i: number, gameType: string, score: number, result = 'win', mistakes: number | null = 1) => ({
    id: `${gameType}-${i}`, gameType, date: day(i), score, result, points: 10, mistakes,
});

describe('Stats segments (TUB-260/257)', () => {
    const push = jest.fn();
    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue({ push });
        (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: 'u', isPremium: false } });
        (useGameHistory as jest.Mock).mockReturnValue({
            history: [entry(0, 'connections', 70), entry(1, 'connections', 40, 'loss', 4), entry(2, 'connections', 90)],
            gamesPlayed: 3,
            loading: false,
        });
    });

    it('All: 2 tiles (no combined best time), breakdown + calendar, badges in history', async () => {
        const { getByText, queryByText, getByTestId, getAllByText } = await render(<StatsScreen />);
        expect(getByTestId('stats-segment')).toBeTruthy();
        expect(getByText('Games played')).toBeTruthy();
        expect(getByText('Day streak')).toBeTruthy();
        expect(queryByText('Best time')).toBeNull();
        expect(getByTestId('stats-breakdown')).toBeTruthy();
        expect(getByTestId('breakdown-upsell')).toBeTruthy(); // free user, no crossword history
        expect(getByTestId('stats-calendar')).toBeTruthy();
        expect(queryByText('Mistakes per game')).toBeNull();
        expect(getAllByText('CON').length).toBe(3);
        expect(getByText('Loss')).toBeTruthy(); // real result, not time-based
    });

    it('Connections: per-game tiles, distribution, no badges; tab state', async () => {
        const { getByText, getByTestId, queryByText, queryByTestId } = await render(<StatsScreen />);
        await fireEvent.press(getByTestId('stats-segment-connections'));
        expect(getByTestId('stats-segment-connections').props.accessibilityState).toEqual({ selected: true });
        expect(getByText('Win streak')).toBeTruthy();
        expect(getByText('Best time')).toBeTruthy();
        expect(getByTestId('stats-summary')).toHaveTextContent(/1:10/);
        expect(getByText('Mistakes per game')).toBeTruthy();
        expect(queryByTestId('stats-breakdown')).toBeNull();
        expect(queryByText('CON')).toBeNull();
    });

    it('Crossword with no games: upsell for free users', async () => {
        const { getByTestId } = await render(<StatsScreen />);
        await fireEvent.press(getByTestId('stats-segment-crossword'));
        expect(getByTestId('stats-crossword-upsell')).toBeTruthy();
    });

    it('Crossword with no games: per-game empty state for premium', async () => {
        (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: 'u', isPremium: true } });
        const { getByTestId, getByText } = await render(<StatsScreen />);
        await fireEvent.press(getByTestId('stats-segment-crossword'));
        expect(getByTestId('stats-segment-empty')).toBeTruthy();
        expect(getByText('No Crossword games yet')).toBeTruthy();
    });

    it('trend toggles to an accessible list', async () => {
        const { getByTestId, getByText } = await render(<StatsScreen />);
        await fireEvent.press(getByTestId('trend-list-toggle'));
        expect(getByTestId('trend-list')).toBeTruthy();
        expect(getByText('View as chart')).toBeTruthy();
    });

    it('hides the control when there is no history at all', async () => {
        (useGameHistory as jest.Mock).mockReturnValue({ history: [], gamesPlayed: 0, loading: false });
        const { queryByTestId, getByTestId } = await render(<StatsScreen />);
        expect(getByTestId('stats-empty')).toBeTruthy();
        expect(queryByTestId('stats-segment')).toBeNull();
    });
});
