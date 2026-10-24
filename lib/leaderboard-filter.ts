import AsyncStorage from '@react-native-async-storage/async-storage';

export type BoardFilter = 'everyone' | 'area';

export interface AreaUser {
    id: string;
    city?: string | null;
    borough?: string | null;
}

/** My-area board scope: London → borough (if set), otherwise the city. */
export function getUserArea(user: AreaUser | null | undefined): { city: string; borough: string | null; name: string } | null {
    if (!user?.city) return null;
    const borough = user.city === 'London' && user.borough ? user.borough : null;
    return { city: user.city, borough, name: borough ?? user.city };
}

export function defaultBoardFilter(user: AreaUser | null | undefined): BoardFilter {
    return getUserArea(user) ? 'area' : 'everyone';
}

const key = (userId: string) => `leaderboard-filter:${userId}`;

export async function loadBoardFilter(userId: string): Promise<BoardFilter | null> {
    try {
        const v = await AsyncStorage.getItem(key(userId));
        return v === 'everyone' || v === 'area' ? v : null;
    } catch {
        return null;
    }
}

export async function saveBoardFilter(userId: string, filter: BoardFilter): Promise<void> {
    try {
        await AsyncStorage.setItem(key(userId), filter);
    } catch {
        // non-fatal: falls back to the default next launch
    }
}

/** Segment label: short area names as-is, long ones truncated (full name in the caption / a11y label). */
export function areaSegmentLabel(name: string, max = 12): string {
    return name.length <= max ? name : `${name.slice(0, max - 1).trimEnd()}…`;
}
