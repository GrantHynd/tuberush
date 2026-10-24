import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { TodayHeroCard } from '@/components/home/TodayHeroCard';
import { getConnectionsStatus, getCrosswordSolveSeconds, getCrosswordStatus } from '@/hooks/usePuzzleCarousel';
import { buildTodayRows, formatCountdown, getNextPuzzleAt } from '@/lib/today-puzzles';
import { toLocalDateString } from '@/lib/week-utils';

const now = new Date(2026, 9, 24, 19, 48);
const today = toLocalDateString(now);
const item = (over: object) => ({ label: 'Today', isNew: true, isCompleted: false, status: 'unplayed', date: today, puzzleId: 'p1', ...over }) as any;
const handlers = { onConnections: jest.fn(), onCrossword: jest.fn(), onSignIn: jest.fn(), onUnlock: jest.fn(), now };

describe('status helpers', () => {
    it('connections', () => {
        expect(getConnectionsStatus(undefined)).toBe('unplayed');
        expect(getConnectionsStatus({ status: 'playing', history: [] } as any)).toBe('unplayed');
        expect(getConnectionsStatus({ status: 'playing', history: [['a']] } as any)).toBe('inProgress');
        expect(getConnectionsStatus({ status: 'lost', history: [] } as any)).toBe('completed');
    });
    it('crossword', () => {
        expect(getCrosswordStatus({ completed: false, userAnswers: { '0-0': 'A' } } as any)).toBe('inProgress');
        expect(getCrosswordStatus({ completed: false, userAnswers: {} } as any)).toBe('unplayed');
        expect(getCrosswordSolveSeconds({ completed: true, startTime: 0, endTime: 200_000, accumulatedPause: 66_000 } as any)).toBe(134);
    });
});

describe('buildTodayRows', () => {
    it('signed out → Sign in for both', () => {
        const rows = buildTodayRows({ user: null, connections: [], crossword: [], ...handlers });
        expect(rows.map((r) => r.state)).toEqual(['signedOut', 'signedOut']);
    });
    it('non-premium crossword is locked; unplayed shows commuters', () => {
        const rows = buildTodayRows({ user: { isPremium: false }, connections: [item({ commuteCount: 312 })], crossword: [item({})], ...handlers });
        expect(rows[0]).toMatchObject({ state: 'unplayed', statusText: '312 commuters played' });
        expect(rows[1].state).toBe('locked');
    });
    it('premium: completed, in progress, unavailable', () => {
        const rows = buildTodayRows({ user: { isPremium: true }, connections: [item({ status: 'completed', completionTime: '2:14' })], crossword: [], ...handlers });
        expect(rows[0]).toMatchObject({ state: 'completed', statusText: 'Solved in 2:14' });
        expect(rows[1].state).toBe('unavailable');
        const r2 = buildTodayRows({ user: { isPremium: true }, connections: [item({ status: 'inProgress' })], crossword: [item({})], ...handlers });
        expect(r2[0].state).toBe('inProgress');
        expect(r2[1].statusText).toBe('New today');
    });
});

it('countdown to local midnight', () => {
    expect(formatCountdown(getNextPuzzleAt(now), now)).toEqual({ text: '4h 12m', label: '4 hours 12 minutes' });
});

describe('TodayHeroCard', () => {
    it('renders CTAs, combined a11y label and handles press', async () => {
        const onPress = jest.fn();
        const { getByTestId, getByText } = await render(
            <TodayHeroCard rows={[
                { gameType: 'connections', state: 'unplayed', statusText: '312 commuters played', onPress },
                { gameType: 'crossword', state: 'locked', statusText: '1st Class puzzle', onPress: jest.fn() },
            ]} />,
        );
        expect(getByText('Play')).toBeTruthy();
        expect(getByText('Unlock')).toBeTruthy();
        expect(getByTestId('today-hero-connections').props.accessibilityLabel).toBe('Connections, today, 312 commuters played, Play');
        await fireEvent.press(getByTestId('today-hero-connections'));
        expect(onPress).toHaveBeenCalled();
    });
    it('shows next-puzzles countdown when all completed', async () => {
        const { getByTestId, getAllByTestId } = await render(
            <TodayHeroCard nextPuzzleAt={new Date(Date.now() + 3 * 3600_000)} rows={[
                { gameType: 'connections', state: 'completed', statusText: 'Solved in 2:14' },
                { gameType: 'crossword', state: 'completed', statusText: 'Solved in 9:01' },
            ]} />,
        );
        expect(getByTestId('today-hero-next').props.children.join('')).toMatch(/^Next puzzles in \d+h \d+m$/);
        expect(getAllByTestId('today-hero-tick')).toHaveLength(2);
    });
    it('shows skeletons while loading', async () => {
        const { getAllByTestId } = await render(<TodayHeroCard rows={[]} loading />);
        expect(getAllByTestId('today-hero-skeleton')).toHaveLength(2);
    });
});
