import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { getTodaysNextGame } from '@/lib/today-puzzles';
import { toLocalDateString } from '@/lib/week-utils';

const now = new Date(2026, 9, 24, 12);
const today = toLocalDateString(now);
const it_ = (status: string, puzzleId = 'p') => ({ date: today, status, puzzleId }) as any;

describe('EmptyState', () => {
    it('renders header, body and a single action', async () => {
        const onAction = jest.fn();
        const r = await render(<EmptyState testID="e" title="T" body="B" actionLabel="Go" onAction={onAction} />);
        expect(r.getByRole('header')).toBeTruthy();
        await fireEvent.press(r.getByTestId('e-action'));
        expect(onAction).toHaveBeenCalled();
    });
    it('hides the button without onAction', async () => {
        const r = await render(<EmptyState testID="e" title="T" body="B" actionLabel="Go" />);
        expect(r.queryByTestId('e-action')).toBeNull();
    });
});

describe('getTodaysNextGame', () => {
    it('signed out → auth', () => {
        expect(getTodaysNextGame(null, { connections: [], crossword: [] }, now)?.route).toBe('/auth');
    });
    it('connections first, including in-progress', () => {
        expect(getTodaysNextGame({ isPremium: true }, { connections: [it_('inProgress')], crossword: [it_('unplayed', 'cw')] }, now)?.route)
            .toBe(`/games/play-connections?date=${today}`);
    });
    it('crossword next only for premium', () => {
        const items = { connections: [it_('completed')], crossword: [it_('unplayed', 'cw1')] };
        expect(getTodaysNextGame({ isPremium: true }, items, now)?.route).toBe('/games/play-crossword?puzzleId=cw1');
        expect(getTodaysNextGame({ isPremium: false }, items, now)).toBeNull();
    });
    it('all done → null', () => {
        expect(getTodaysNextGame({ isPremium: true }, { connections: [it_('completed')], crossword: [it_('completed')] }, now)).toBeNull();
    });
});
