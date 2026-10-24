import type { PuzzleCarouselItem } from '@/hooks/usePuzzleCarousel';
import { toLocalDateString } from '@/lib/week-utils';

export type TodayGameType = 'connections' | 'crossword';
export type TodayRowState = 'unplayed' | 'inProgress' | 'completed' | 'signedOut' | 'locked' | 'unavailable';

export interface TodayGameRow {
    gameType: TodayGameType;
    state: TodayRowState;
    statusText: string;
    onPress?: () => void;
}

type UserLike = { isPremium?: boolean } | null | undefined;

/** Next local midnight (same day boundary as toLocalDateString). */
export function getNextPuzzleAt(now: Date = new Date()): Date {
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    return next;
}

export function formatCountdown(target: Date, now: Date = new Date()): { text: string; label: string } {
    const totalMin = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 60000));
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
    return { text: `${h}h ${m}m`, label: `${plural(h, 'hour')} ${plural(m, 'minute')}` };
}

export function findToday<T extends PuzzleCarouselItem>(items: T[], now: Date = new Date()): T | undefined {
    const today = toLocalDateString(now);
    return items.find((i) => i.date === today);
}

function rowFor(
    gameType: TodayGameType,
    user: UserLike,
    item: PuzzleCarouselItem | undefined,
    onPress: (item: PuzzleCarouselItem) => void,
    onSignIn: () => void,
    onUnlock: () => void,
): TodayGameRow {
    if (!user) return { gameType, state: 'signedOut', statusText: 'Sign in to play', onPress: onSignIn };
    if (gameType === 'crossword' && !user.isPremium) {
        return { gameType, state: 'locked', statusText: '1st Class puzzle', onPress: onUnlock };
    }
    if (!item) return { gameType, state: 'unavailable', statusText: "Today's puzzle isn't available yet" };
    const press = () => onPress(item);
    switch (item.status) {
        case 'completed':
            return {
                gameType,
                state: 'completed',
                statusText: item.completionTime ? `Solved in ${item.completionTime}` : 'Solved',
                onPress: press,
            };
        case 'inProgress':
            return { gameType, state: 'inProgress', statusText: 'In progress', onPress: press };
        default:
            return {
                gameType,
                state: 'unplayed',
                statusText: item.commuteCount ? `${item.commuteCount.toLocaleString('en-GB')} commuters played` : 'New today',
                onPress: press,
            };
    }
}

export function buildTodayRows(args: {
    user: UserLike;
    connections: PuzzleCarouselItem[];
    crossword: PuzzleCarouselItem[];
    onConnections: (item: PuzzleCarouselItem) => void;
    onCrossword: (item: PuzzleCarouselItem) => void;
    onSignIn: () => void;
    onUnlock: () => void;
    now?: Date;
}): TodayGameRow[] {
    const { user, now } = args;
    return [
        rowFor('connections', user, findToday(args.connections, now), args.onConnections, args.onSignIn, args.onUnlock),
        rowFor('crossword', user, findToday(args.crossword, now), args.onCrossword, args.onSignIn, args.onUnlock),
    ];
}

/**
 * Shared CTA rule (TUB-255/259/261): today's first unplayed game.
 * Connections first; Crossword only for premium. In-progress counts as unplayed (resume).
 * Signed out → /auth. Returns null when everything available today is done (hide the button).
 */
export function getTodaysNextGame(
    user: UserLike,
    items: { connections: PuzzleCarouselItem[]; crossword: PuzzleCarouselItem[] },
    now: Date = new Date(),
): { route: string; gameType: TodayGameType | null } | null {
    if (!user) return { route: '/auth', gameType: null };
    const today = toLocalDateString(now);
    const conn = findToday(items.connections, now);
    if (!conn || conn.status !== 'completed') {
        return { route: `/games/play-connections?date=${conn?.date ?? today}`, gameType: 'connections' };
    }
    if (user.isPremium) {
        const cw = findToday(items.crossword, now);
        if (cw && cw.status !== 'completed') {
            return { route: `/games/play-crossword?puzzleId=${cw.puzzleId}`, gameType: 'crossword' };
        }
    }
    return null;
}

/** Trophy empty-state body: borough when a London borough is set, else city, else generic. */
export function getRankingPrompt(user: { city?: string | null; borough?: string | null } | null): string {
    const area = user?.city === 'London' && user?.borough ? user.borough : user?.city || null;
    return area
        ? `Play today's puzzle to get ranked against commuters in ${area}.`
        : "Play today's puzzle to get ranked against other commuters.";
}
