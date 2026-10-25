import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { UpsellCard } from '@/components/ui/UpsellCard';
import TrophyScreen from '@/app/(tabs)/trophy';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'expo-router';
import { useLeaderboardOverview } from '@/hooks/useLeaderboardOverview';
import { openPaywall } from '@/lib/paywall';
jest.mock('@/lib/paywall', () => ({ openPaywall: jest.fn(() => Promise.resolve(null)) }));


jest.mock('@/stores/auth-store', () => ({ useAuthStore: jest.fn() }));
jest.mock('@/lib/posthog', () => ({ capture: jest.fn() }));
jest.mock('@/hooks/usePuzzleCarousel', () => ({
    usePuzzleCarousel: jest.fn(() => ({ items: [], loading: false, refresh: jest.fn() })),
}));
jest.mock('@/hooks/useLeaderboardOverview', () => ({ useLeaderboardOverview: jest.fn() }));

const game = (gameType: string) => ({ gameType, userRank: 3, totalPlayers: 10, nearbyEntries: [] });

describe('UpsellCard', () => {
    it('renders defaults and a single button with hint', async () => {
        const onPress = jest.fn();
        const { getByText, getByRole } = await render(
            <UpsellCard title="Crossword Puzzle" valueProp="See more" onPress={onPress} />,
        );
        expect(getByText('1st Class')).toBeTruthy();
        const btn = getByRole('button', { name: 'Upgrade to 1st Class' });
        expect(btn.props.accessibilityHint).toBe('See more');
        await fireEvent.press(btn);
        expect(onPress).toHaveBeenCalled();
    });

    it('hides the badge when badge is null and uses custom CTA', async () => {
        const { queryByText, getByText } = await render(
            <UpsellCard title="Upgrade to 1st Class" badge={null} valueProp="x" ctaLabel="See 1st Class" onPress={jest.fn()} />,
        );
        expect(queryByText('1st Class')).toBeNull();
        expect(getByText('See 1st Class')).toBeTruthy();
    });
});

describe('Trophy locked Crossword row', () => {
    const push = jest.fn();
    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue({ push });
        (useLeaderboardOverview as jest.Mock).mockReturnValue({
            games: [game('connections'), game('crossword')],
            stats: { overallRank: 1, totalScore: 10, topPercent: 5 },
            loading: false,
            error: null,
        });
    });

    it('free user sees upsell instead of a disabled Full board link', async () => {
        (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: 'u', isPremium: false } });
        const { getByTestId, getAllByText, getByText } = await render(<TrophyScreen />);
        expect(getByTestId('upsell-crossword')).toBeTruthy();
        expect(getByText('See your Crossword rank and the full weekly board')).toBeTruthy();
        expect(getAllByText(/Full board/).length).toBe(1); // Connections only
        await fireEvent.press(getByText('Upgrade to 1st Class'));
        expect(openPaywall).toHaveBeenCalledWith('trophy');
    expect(push).not.toHaveBeenCalledWith('/subscribe');
    });

    it('premium user sees the normal card', async () => {
        (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: 'u', isPremium: true } });
        const { queryByTestId, getAllByText } = await render(<TrophyScreen />);
        expect(queryByTestId('upsell-crossword')).toBeNull();
        expect(getAllByText(/Full board/).length).toBe(2);
    });
});
