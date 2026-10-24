import type { GameHistoryEntry } from '@/lib/game-history';
import {
    bestStreak, bestTime, calendarWeeks, currentStreak, mistakeDistribution, rollingAverage,
    streakDates, timeDistribution, trendSeries, trendSummary,
} from '@/lib/stats';
import { areaSegmentLabel, defaultBoardFilter, getUserArea } from '@/lib/leaderboard-filter';

const NOW = new Date('2026-10-24T12:00:00');
let n = 0;
const h = (date: string, gameType: 'connections' | 'crossword', score: number, result: 'win' | 'loss' = 'win', mistakes: number | null = null): GameHistoryEntry =>
    ({ id: String(n++), date, gameType, score, result, points: 0, mistakes });

const HISTORY = [
    h('2026-10-24', 'connections', 70, 'win', 1),
    h('2026-10-23', 'connections', 40, 'loss', 4),
    h('2026-10-23', 'crossword', 200),
    h('2026-10-22', 'connections', 90, 'win', 0),
    h('2026-10-21', 'connections', 80, 'win', 3),
    h('2026-10-10', 'crossword', 50),
];

describe('streaks', () => {
    it('All = any game; per game = wins only', () => {
        expect(currentStreak(streakDates(HISTORY, 'all'), NOW)).toBe(4);
        expect(currentStreak(streakDates(HISTORY, 'connections'), NOW)).toBe(1); // 23rd was a loss
        expect(currentStreak(streakDates(HISTORY, 'crossword'), NOW)).toBe(1); // yesterday counts
        expect(bestStreak(streakDates(HISTORY, 'connections'))).toBe(2);
    });
    it('counts from yesterday when today is unplayed', () => {
        expect(currentStreak(new Set(['2026-10-23', '2026-10-22']), NOW)).toBe(2);
    });
});

describe('bestTime', () => {
    it('ignores losses', () => expect(bestTime(HISTORY.filter((x) => x.gameType === 'connections'))).toBe(70));
});

describe('trend', () => {
    it('one winning time per day in the 30-day window', () => {
        const s = trendSeries(HISTORY, 'connections', NOW);
        expect(s.map((p) => p.date)).toEqual(['2026-10-21', '2026-10-22', '2026-10-24']);
        expect(rollingAverage(s).map((p) => p.seconds)).toEqual([80, 85, 80]);
        expect(trendSummary(s)).toMatch(/^best 1:10, average 1:20, /);
        expect(trendSummary(s.slice(0, 1))).toMatch(/Not enough/);
    });
});

describe('distributions', () => {
    it('Connections mistakes incl. Lost; latest highlighted', () => {
        const { buckets, recorded } = mistakeDistribution(HISTORY);
        expect(recorded).toBe(4);
        expect(buckets.map((b) => b.count)).toEqual([1, 1, 0, 1, 1]);
        expect(buckets.find((b) => b.isLatest)?.label).toBe('1');
        expect(buckets[2].accessibilityLabel).toBe('2 mistakes, 0 games');
    });
    it('Crossword time bands', () => {
        const b = timeDistribution(HISTORY);
        expect(b.find((x) => x.label === '<1m')?.count).toBe(1);
        expect(b.find((x) => x.label === '3–4m')?.count).toBe(1);
    });
});

describe('calendar', () => {
    it('12 Monday-first weeks ending this week, with both-games marker', () => {
        const weeks = calendarWeeks(HISTORY, 'all', NOW);
        expect(weeks).toHaveLength(12);
        expect(new Date(weeks[0][0].date + 'T12:00:00').getDay()).toBe(1);
        const cells = weeks.flat();
        expect(cells.find((c) => c.date === '2026-10-23')?.both).toBe(true);
        expect(cells.find((c) => c.date === '2026-10-24')?.isToday).toBe(true);
        expect(cells.find((c) => c.date === '2026-10-25')?.isFuture).toBe(true);
    });
});

describe('leaderboard filter helpers (TUB-265)', () => {
    it('area = London borough, else city', () => {
        expect(getUserArea({ id: 'u', city: 'London', borough: 'Barking and Dagenham' })?.name).toBe('Barking and Dagenham');
        expect(getUserArea({ id: 'u', city: 'Leeds', borough: null })).toEqual({ city: 'Leeds', borough: null, name: 'Leeds' });
        expect(getUserArea({ id: 'u', city: null })).toBeNull();
    });
    it('defaults to My area only when an area is set', () => {
        expect(defaultBoardFilter({ id: 'u', city: 'Leeds' })).toBe('area');
        expect(defaultBoardFilter({ id: 'u' })).toBe('everyone');
    });
    it('truncates long names', () => {
        expect(areaSegmentLabel('Leeds')).toBe('Leeds');
        expect(areaSegmentLabel('Barking and Dagenham')).toBe('Barking and…');
    });
});
