import { formatScore } from '@/lib/display-utils';
import { toLocalDateString } from '@/lib/week-utils';

export type BestTimeGameType = 'connections' | 'crossword';

const STREAK_LOOKBACK_DAYS = 365;

/**
 * Consecutive days with a win, ending today or yesterday.
 * Today stays open: a streak is not broken until a full day passes with no win.
 */
export function calculateStreakFromDates(
    completedDates: ReadonlySet<string>,
    now: Date = new Date(),
): number {
    const cursor = new Date(now);
    cursor.setHours(12, 0, 0, 0);

    if (!completedDates.has(toLocalDateString(cursor))) {
        cursor.setDate(cursor.getDate() - 1);
    }

    let streak = 0;
    for (let i = 0; i < STREAK_LOOKBACK_DAYS; i++) {
        if (!completedDates.has(toLocalDateString(cursor))) break;
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}

/**
 * Best (lowest) time across the two games.
 * A tie keeps Connections, matching the previous comparison order.
 */
export function selectBestTime(
    connectionsSeconds: number | null,
    crosswordSeconds: number | null,
): { bestTime: string | null; bestTimeGameType: BestTimeGameType | null } {
    const candidates: { seconds: number; gameType: BestTimeGameType }[] = [];
    if (connectionsSeconds !== null) {
        candidates.push({ seconds: connectionsSeconds, gameType: 'connections' });
    }
    if (crosswordSeconds !== null) {
        candidates.push({ seconds: crosswordSeconds, gameType: 'crossword' });
    }
    if (candidates.length === 0) {
        return { bestTime: null, bestTimeGameType: null };
    }

    const best = candidates.reduce((current, next) =>
        current.seconds <= next.seconds ? current : next,
    );
    return {
        bestTime: formatScore(best.seconds),
        bestTimeGameType: best.gameType,
    };
}
