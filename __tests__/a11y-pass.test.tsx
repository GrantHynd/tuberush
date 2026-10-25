/** TUB-295: accessibility pass — feedback has a VoiceOver equivalent, selection is not colour-only. */
import { Connections } from '@/components/games/Connections';
import type { ConnectionsPuzzle } from '@/constants/ConnectionsData';
import type { ConnectionsState } from '@/types/game';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo } from 'react-native';

jest.mock('expo-haptics', () => ({
    impactAsync: jest.fn(),
    notificationAsync: jest.fn(),
    ImpactFeedbackStyle: { Light: 0 },
    NotificationFeedbackType: { Success: 1, Error: 3 },
}));

const puzzle: ConnectionsPuzzle = {
    id: '1',
    date: '2026-10-25',
    groups: [
        { category: 'A', items: ['A1', 'A2', 'A3', 'A4'], color: '#000', difficulty: 1 },
        { category: 'B', items: ['B1', 'B2', 'B3', 'B4'], color: '#000', difficulty: 2 },
        { category: 'C', items: ['C1', 'C2', 'C3', 'C4'], color: '#000', difficulty: 3 },
        { category: 'D', items: ['D1', 'D2', 'D3', 'D4'], color: '#000', difficulty: 4 },
    ],
} as ConnectionsPuzzle;

const base = {
    puzzleId: '1',
    status: 'playing',
    mistakesRemaining: 4,
    completedGroups: [],
    guesses: [],
} as unknown as ConnectionsState;

describe('TUB-295 accessibility', () => {
    let spy: jest.SpyInstance;
    beforeEach(() => {
        spy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    });
    afterEach(() => spy.mockRestore());

    it('selection uses accessibilityState + a shape cue, and announces the count', async () => {
        const r = await render(<Connections puzzle={puzzle} gameState={base} onSubmitGuess={jest.fn()} />);
        const tile = await r.findByTestId('tile-A1');
        expect(tile.props.accessibilityLabel).toBe('A1');
        await fireEvent.press(tile);
        expect(r.getByTestId('tile-A1').props.accessibilityState.selected).toBe(true);
        expect(r.getByTestId('tile-A1-dot')).toBeTruthy();
        expect(spy).toHaveBeenCalledWith('1 of 4 selected');
        expect(r.getByText('Submit 1/4')).toBeTruthy();
    });

    it('wrong guess is announced with tries left', async () => {
        const r = await render(<Connections puzzle={puzzle} gameState={base} onSubmitGuess={jest.fn()} />);
        await r.rerender(
            <Connections puzzle={puzzle} gameState={{ ...base, mistakesRemaining: 3 }} onSubmitGuess={jest.fn()} />,
        );
        expect(spy).toHaveBeenCalledWith('Mind the gap: not a line. 3 tries left.');
        expect(r.getByLabelText('3 tries left')).toBeTruthy();
    });

    it('correct line is announced', async () => {
        const r = await render(<Connections puzzle={puzzle} gameState={base} onSubmitGuess={jest.fn()} />);
        await r.rerender(
            <Connections puzzle={puzzle} gameState={{ ...base, completedGroups: ['A'] }} onSubmitGuess={jest.fn()} />,
        );
        expect(spy).toHaveBeenCalledWith('Line found: A');
    });
});
