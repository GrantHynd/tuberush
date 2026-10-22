import { BOROUGHS, type Borough } from '@/constants/Boroughs';
import { isLondon } from '@/constants/UKCities';
import type { User } from '@/types/game';

/** Columns the auth store reads from `profiles`. */
export interface ProfileRow {
    username?: string | null;
    city?: string | null;
    borough?: string | null;
}

export function isBorough(value: string | null | undefined): value is Borough {
    return value != null && (BOROUGHS as readonly string[]).includes(value);
}

/**
 * Map a profile row onto the fields the app stores on the user.
 * Rows written before cities existed only have a borough; those are London.
 * Unknown borough strings are dropped so the type stays a real `Borough`.
 */
export function normalizeProfile(profile: ProfileRow): {
    city: string | null;
    borough: Borough | undefined;
} {
    const borough = isBorough(profile.borough) ? profile.borough : undefined;
    const city = profile.city ?? (borough ? 'London' : null);
    return { city, borough };
}

/** Build the in-memory user from an auth identity plus an optional profile row. */
export function userFromProfile(input: {
    id: string;
    email: string;
    isPremium: boolean;
    profile?: ProfileRow | null;
}): User {
    const profile = input.profile ?? {};
    return {
        id: input.id,
        email: input.email,
        username: profile.username ?? undefined,
        isPremium: input.isPremium,
        ...normalizeProfile(profile),
    };
}

/** Settings row: "Not set", "London, Camden", or the city name. */
export function formatSettingsLocation(user: {
    city?: string | null;
    borough?: string | null;
}): string {
    if (!user.city) return 'Not set';
    if (isLondon(user.city) && user.borough) {
        return `London, ${user.borough}`;
    }
    return user.city;
}
