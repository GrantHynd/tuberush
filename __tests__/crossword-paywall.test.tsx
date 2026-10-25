import PlayCrossword from '@/app/games/play-crossword';
import { GamePuzzleListItem } from '@/components/games/GamePuzzleListItem';
import { useAuthStore } from '@/stores/auth-store';
import { useGameStore } from '@/stores/game-store';
import { fireEvent, render } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';

jest.mock('@/stores/auth-store', () => ({ useAuthStore: jest.fn() }));
jest.mock('@/stores/game-store', () => ({ useGameStore: jest.fn() }));
jest.mock('@/lib/posthog', () => ({ capture: jest.fn() }));
jest.mock('@/hooks/usePuzzle', () => ({
    usePuzzle: jest.fn(() => ({ puzzle: null, gameDate: null, loading: false })),
}));

describe('Crossword paywall (TUB-301)', () => {
    const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(router);
        const user = { id: 'u1', isPremium: false };
        (useAuthStore as unknown as jest.Mock).mockImplementation((sel?: (s: unknown) => unknown) =>
            sel ? sel({ user }) : { user },
        );
        (useGameStore as unknown as jest.Mock).mockReturnValue({
            loadGame: jest.fn(), saveGame: jest.fn(), createNewGame: jest.fn(),
        });
    });

    it('renders the Upsell in the game shell instead of a blank screen + Alert', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert');
        const { getByTestId, getByText, getByRole } = await render(<PlayCrossword />);
        expect(getByTestId('crossword-upsell')).toBeTruthy();
        expect(getByText("This one's First Class")).toBeTruthy();
        expect(alertSpy).not.toHaveBeenCalled();

        await fireEvent.press(getByRole('button', { name: 'See Premium' }));
        expect(router.push).toHaveBeenCalledWith('/subscribe');

        await fireEvent.press(getByTestId('crossword-upsell-free'));
        expect(router.replace).toHaveBeenCalledWith('/games/play-connections');

        await fireEvent.press(getByRole('button', { name: 'Go back' }));
        expect(router.back).toHaveBeenCalled();
    });

    it('list item shows a lock marker for locked puzzles', async () => {
        const { getByTestId, getByLabelText } = await render(
            <GamePuzzleListItem
                dayNumber={1} label="Mon 1 Jan" isToday={false} isLive={false}
                isCompleted={false} accentColor="#A4161A" hasWinLoss={false}
                isLocked onPress={jest.fn()}
            />,
        );
        expect(getByTestId('puzzle-locked')).toBeTruthy();
        expect(getByLabelText('Mon 1 Jan, locked, 1st Class')).toBeTruthy();
    });
});
