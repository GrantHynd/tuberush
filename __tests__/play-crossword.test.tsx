import PlayCrossword from '@/app/games/play-crossword';
import { usePuzzle } from '@/hooks/usePuzzle';
import { useAuthStore } from '@/stores/auth-store';
import { useGameStore } from '@/stores/game-store';
import type { CrosswordCell, CrosswordPuzzle, GameState } from '@/types/game';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';

jest.mock('@/stores/auth-store', () => ({ useAuthStore: jest.fn() }));
jest.mock('@/stores/game-store', () => ({ useGameStore: jest.fn() }));
jest.mock('@/lib/posthog', () => ({ capture: jest.fn() }));
jest.mock('@/lib/score-outbox', () => ({ scoreOutbox: { submit: jest.fn() } }));
jest.mock('@/hooks/usePuzzle', () => ({ usePuzzle: jest.fn() }));
jest.mock('@/lib/a11y', () => ({ announce: jest.fn() }));
jest.mock('@/hooks/useUserStats', () => ({ useUserStats: () => ({ stats: { streak: 4 } }) }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { announce } = require('@/lib/a11y');

// 1x2 grid: "AB"
const grid: CrosswordCell[][] = [[{ letter: 'A', number: 1, isBlack: false }, { letter: 'B', isBlack: false }]];
const puzzle: CrosswordPuzzle = {
    id: 'p1', date: '2026-10-25', title: 'Mini', rows: 1, cols: 2, grid,
    clues: { across: [{ number: 1, clue: 'Letters', answer: 'AB', row: 0, col: 0, length: 2 }], down: [] },
};

describe('play-crossword (TUB-298/299)', () => {
    const saveGame = jest.fn();
    let answers: Record<string, string> = { '0-0': 'X', '0-1': 'B' };
    let completedSave: Record<string, unknown> = {};
    beforeEach(() => {
        jest.clearAllMocks();
        answers = { '0-0': 'X', '0-1': 'B' };
        completedSave = {};
        (useRouter as jest.Mock).mockReturnValue({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true });
        const user = { id: 'u1', isPremium: true };
        (useAuthStore as unknown as jest.Mock).mockImplementation((sel?: (s: unknown) => unknown) => (sel ? sel({ user }) : { user }));
        (usePuzzle as jest.Mock).mockReturnValue({ puzzle, gameDate: '2026-10-25', loading: false });
        const game: GameState = {
            id: 'g1', userId: 'u1', gameType: 'crossword', puzzleId: 'p1',
            state: { puzzleId: 'p1', grid, clues: { across: { 1: 'Letters' }, down: {} }, userAnswers: answers, completed: false, startTime: 1, ...completedSave },
            lastUpdated: '', syncStatus: 'synced', version: 1,
        } as unknown as GameState;
        (useGameStore as unknown as jest.Mock).mockReturnValue({
            loadGame: jest.fn(async () => ({ ...game, state: { ...game.state, userAnswers: answers, ...completedSave } })), saveGame, createNewGame: jest.fn(),
        });
    });

    it('a wrong Check shows a toast, marks the wrong cell and never Alerts; editing clears the mark', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert');
        const { getByTestId, findByTestId, getByText } = await render(<PlayCrossword />);
        await findByTestId('game-keyboard');
        await act(async () => {
            fireEvent.press(getByTestId('key-check'));
        });
        await waitFor(() => expect(getByText("1 letter isn't right yet")).toBeTruthy());
        expect(alertSpy).not.toHaveBeenCalled();
        expect(getByTestId('cell-0-0').props.accessibilityValue).toEqual(expect.objectContaining({ text: 'incorrect' }));
        expect(getByTestId('cell-0-1').props.accessibilityValue?.text).toBeUndefined();

        // First across clue is selected on load → typing edits 0-0 and clears its mark.
        await act(async () => {
            fireEvent.press(getByTestId('key-A'));
        });
        expect(getByTestId('cell-0-0').props.accessibilityValue?.text).toBeUndefined();
    });

    it('TUB-300: solving shows the permanent finished view with stats, announced once', async () => {
        const { getByTestId, findByTestId, getByText, getByLabelText, queryByTestId } = await render(<PlayCrossword />);
        await findByTestId('game-keyboard');
        await act(async () => { fireEvent.press(getByTestId('key-check')); }); // wrong → Mistakes 1
        await act(async () => { fireEvent.press(getByTestId('key-A')); });
        await act(async () => { fireEvent.press(getByTestId('key-check')); });
        await findByTestId('finished-game-view');
        expect(getByText('Journey complete')).toBeTruthy();
        expect(getByText('Mini solved')).toBeTruthy();
        expect(queryByTestId('game-keyboard')).toBeNull();
        expect(queryByTestId('key-check')).toBeNull();
        expect(getByTestId('header-share')).toBeTruthy();
        expect(getByTestId('solved-clue-across-1').props.accessibilityLabel).toBe('1 Across: Letters. Answer AB, solved');
        expect(getByLabelText('Mistakes, 1')).toBeTruthy();
        expect(getByLabelText('Day streak, 4')).toBeTruthy();
        expect(announce).toHaveBeenCalledWith(expect.stringMatching(/^Journey complete\./));
    });

    it('TUB-300: reopening a solved puzzle renders the same view without announcing', async () => {
        answers = { '0-0': 'A', '0-1': 'B' };
        completedSave = { completed: true, endTime: 61001, wrongChecks: 0 };
        const { findByTestId, getByText, queryByTestId } = await render(<PlayCrossword />);
        await findByTestId('finished-game-view');
        expect(getByText('Journey complete')).toBeTruthy();
        expect(queryByTestId('game-keyboard')).toBeNull();
        expect(announce).not.toHaveBeenCalledWith(expect.stringMatching(/^Journey complete/));
    });
});
