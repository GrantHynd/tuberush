import type { GameHistoryEntry } from '@/lib/game-history';
import { toLocalDateString } from '@/lib/week-utils';
import type { GameType } from '@/types/game';

export type StatsSegment = 'all' | GameType;

export const TREND_DAYS = 30;
export const CALENDAR_WEEKS = 12;

export function filterHistory(history: GameHistoryEntry[], segment: StatsSegment): GameHistoryEntry[] {
    return segment === 'all' ? history : history.filter((h) => h.gameType === segment);
}

/** Dates that count towards a streak: All = any game played, per game = wins/completions only. */
export function streakDates(history: GameHistoryEntry[], segment: StatsSegment): Set<string> {
    const rows = filterHistory(history, segment);
    return new Set(segment === 'all' ? rows.map((h) => h.date) : rows.filter((h) => h.result === 'win').map((h) => h.date));
}

function addDays(date: string, days: number): string {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return toLocalDateString(d);
}

/** Consecutive days ending today (or yesterday, if today isn't played yet). */
export function currentStreak(dates: ReadonlySet<string>, now: Date = new Date()): number {
    let cursor = toLocalDateString(now);
    if (!dates.has(cursor)) cursor = addDays(cursor, -1);
    let n = 0;
    while (dates.has(cursor)) {
        n += 1;
        cursor = addDays(cursor, -1);
    }
    return n;
}

export function bestStreak(dates: ReadonlySet<string>): number {
    let best = 0;
    for (const d of dates) {
        if (dates.has(addDays(d, -1))) continue; // not the start of a run
        let n = 0;
        let cursor = d;
        while (dates.has(cursor)) {
            n += 1;
            cursor = addDays(cursor, 1);
        }
        best = Math.max(best, n);
    }
    return best;
}

/** Best (lowest) winning time; losses never count. */
export function bestTime(rows: GameHistoryEntry[]): number | null {
    const wins = rows.filter((r) => r.result === 'win');
    return wins.length ? Math.min(...wins.map((r) => r.score)) : null;
}

export function averageTime(rows: GameHistoryEntry[]): number | null {
    const wins = rows.filter((r) => r.result === 'win');
    return wins.length ? Math.round(wins.reduce((a, r) => a + r.score, 0) / wins.length) : null;
}

export function lastNDays(n: number, now: Date = new Date()): string[] {
    const today = toLocalDateString(now);
    return Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
}

export function withinDays(rows: GameHistoryEntry[], n: number, now: Date = new Date()): GameHistoryEntry[] {
    const from = lastNDays(n, now)[0];
    return rows.filter((r) => r.date >= from);
}

export interface TrendPoint {
    date: string;
    seconds: number;
}

/** One winning time per day for a game over the trend window (gaps = unplayed days). */
export function trendSeries(history: GameHistoryEntry[], game: GameType, now: Date = new Date()): TrendPoint[] {
    const days = new Set(lastNDays(TREND_DAYS, now));
    const byDay = new Map<string, number>();
    for (const h of history) {
        if (h.gameType !== game || h.result !== 'win' || !days.has(h.date)) continue;
        byDay.set(h.date, Math.min(byDay.get(h.date) ?? Infinity, h.score));
    }
    return [...byDay.entries()].map(([date, seconds]) => ({ date, seconds })).sort((a, b) => a.date.localeCompare(b.date));
}

/** 7-day trailing average at each played point. */
export function rollingAverage(points: TrendPoint[], windowDays = 7): TrendPoint[] {
    return points.map((p) => {
        const from = addDays(p.date, -(windowDays - 1));
        const win = points.filter((q) => q.date >= from && q.date <= p.date);
        return { date: p.date, seconds: Math.round(win.reduce((a, q) => a + q.seconds, 0) / win.length) };
    });
}

export function trendSummary(points: TrendPoint[]): string {
    if (points.length < 2) return 'Not enough games for a trend yet';
    const secs = points.map((p) => p.seconds);
    const avg = Math.round(secs.reduce((a, b) => a + b, 0) / secs.length);
    const half = Math.floor(points.length / 2);
    const early = secs.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const late = secs.slice(half).reduce((a, b) => a + b, 0) / (secs.length - half);
    const direction = late < early ? 'improving' : late > early ? 'slowing' : 'steady';
    return `best ${fmt(Math.min(...secs))}, average ${fmt(avg)}, ${direction}`;
}

function fmt(s: number): string {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export interface DistributionBucket {
    label: string;
    count: number;
    accessibilityLabel: string;
    isLatest: boolean;
}

/** Connections: mistakes per game (0-3 for wins, "Lost"); rows without a stored count are skipped. */
export function mistakeDistribution(history: GameHistoryEntry[]): { buckets: DistributionBucket[]; recorded: number } {
    const rows = history.filter((h) => h.gameType === 'connections' && (h.mistakes != null || h.result === 'loss'));
    const keyOf = (h: GameHistoryEntry) => (h.result === 'loss' ? 'Lost' : String(Math.min(3, h.mistakes ?? 0)));
    const latest = rows[0] ? keyOf(rows[0]) : null; // history is newest first
    const keys = ['0', '1', '2', '3', 'Lost'];
    return {
        recorded: rows.length,
        buckets: keys.map((k) => {
            const count = rows.filter((r) => keyOf(r) === k).length;
            const what = k === 'Lost' ? 'Lost' : `${k} mistake${k === '1' ? '' : 's'}`;
            return { label: k, count, accessibilityLabel: `${what}, ${count} game${count === 1 ? '' : 's'}`, isLatest: k === latest };
        }),
    };
}

const TIME_BANDS = [
    { label: '<1m', under: 60 },
    { label: '1–2m', under: 120 },
    { label: '2–3m', under: 180 },
    { label: '3–4m', under: 240 },
    { label: '4–5m', under: 300 },
    { label: '5m+', under: Infinity },
];

/** Crossword: solve-time bands matching the points bands. */
export function timeDistribution(history: GameHistoryEntry[]): DistributionBucket[] {
    const rows = history.filter((h) => h.gameType === 'crossword' && h.result === 'win');
    const bandOf = (s: number) => TIME_BANDS.find((b) => s < b.under)!.label;
    const latest = rows[0] ? bandOf(rows[0].score) : null;
    return TIME_BANDS.map((b) => {
        const count = rows.filter((r) => bandOf(r.score) === b.label).length;
        return { label: b.label, count, accessibilityLabel: `${b.label}, ${count} game${count === 1 ? '' : 's'}`, isLatest: b.label === latest };
    });
}

export interface CalendarCell {
    date: string;
    played: boolean;
    both: boolean;
    isToday: boolean;
    isFuture: boolean;
}

/** 12 Monday-first week columns ending with the current week. */
export function calendarWeeks(history: GameHistoryEntry[], segment: StatsSegment, now: Date = new Date()): CalendarCell[][] {
    const today = toLocalDateString(now);
    const dow = (new Date(today + 'T12:00:00').getDay() + 6) % 7; // Mon=0
    const start = addDays(today, -dow - (CALENDAR_WEEKS - 1) * 7);
    const rows = filterHistory(history, segment);
    const games = new Map<string, Set<GameType>>();
    for (const r of rows) games.set(r.date, (games.get(r.date) ?? new Set()).add(r.gameType));
    return Array.from({ length: CALENDAR_WEEKS }, (_, w) =>
        Array.from({ length: 7 }, (_, d) => {
            const date = addDays(start, w * 7 + d);
            const g = games.get(date);
            return { date, played: !!g, both: segment === 'all' && (g?.size ?? 0) > 1, isToday: date === today, isFuture: date > today };
        }),
    );
}
