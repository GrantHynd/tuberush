import { render } from '@testing-library/react-native';
import React from 'react';
import { getCompletionPresentation, PuzzleCard } from '@/components/home/PuzzleCard';
import { sortTodayFirst } from '@/hooks/usePuzzleCarousel';

describe('sortTodayFirst', () => {
    it('orders by date descending regardless of input order', () => {
        const out = sortTodayFirst([{ date: '2026-10-22' }, { date: '2026-10-24' }, { date: '2026-10-23' }]);
        expect(out.map((i) => i.date)).toEqual(['2026-10-24', '2026-10-23', '2026-10-22']);
    });
});

describe('getCompletionPresentation', () => {
    it('connections shows time · score', () => {
        expect(getCompletionPresentation('connections', { completionTime: '2:14', score: '3/4' })).toEqual({
            completionText: '2:14 · 3/4',
            completionLabel: 'completed in 2 minutes 14 seconds, 3 of 4 lives left',
        });
    });
    it('crossword shows Solved in', () => {
        expect(getCompletionPresentation('crossword', { completionTime: '9:01' }).completionText).toBe('Solved in 9:01');
    });
});

describe('PuzzleCard states', () => {
    const base = { label: 'Today', backgroundColor: '#003688', onPress: jest.fn(), accessibilityGame: 'Connections' };
    it('unplayed: count + NEW, hides 0 count', async () => {
        const r = await render(<PuzzleCard {...base} isNew status="unplayed" commuteCount={312} />);
        expect(r.getByText('312 commuters played')).toBeTruthy();
        expect(r.getByText('NEW')).toBeTruthy();
        expect(r.getByLabelText('Today, Connections, not played')).toBeTruthy();
        const r0 = await render(<PuzzleCard {...base} status="unplayed" commuteCount={0} />);
        expect(r0.queryByText(/commuters played/)).toBeNull();
        expect(r0.queryByText('—')).toBeNull();
    });
    it('in progress', async () => {
        const r = await render(<PuzzleCard {...base} isNew status="inProgress" />);
        expect(r.getByText('In progress')).toBeTruthy();
        expect(r.queryByText('NEW')).toBeNull();
        expect(r.getByLabelText('Today, Connections, in progress')).toBeTruthy();
    });
    it('completed', async () => {
        const r = await render(
            <PuzzleCard {...base} isNew status="completed" {...getCompletionPresentation('connections', { completionTime: '2:14', score: '3/4' })} />,
        );
        expect(r.getByText('2:14 · 3/4')).toBeTruthy();
        expect(r.queryByText('NEW')).toBeNull();
        expect(r.getByLabelText('Today, Connections, completed in 2 minutes 14 seconds, 3 of 4 lives left')).toBeTruthy();
    });
});
