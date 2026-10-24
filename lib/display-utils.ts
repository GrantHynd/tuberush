/** Shown on public surfaces when a player has no display name. Never derived from email. */
export const FALLBACK_NAME_PREFIX = 'Commuter';

/** Stable 4-digit suffix (1000–9999) from a seed such as the user id (FNV-1a hash). */
export function getFallbackSuffix(seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return String(1000 + (h % 9000));
}

/**
 * Public display name for a player (TUB-268).
 * Uses the trimmed username; otherwise "Commuter 4821" with a suffix that is
 * stable for the given seed (normally the user id). Never derives a name from
 * an email address.
 */
export function getDisplayName(username: string | null | undefined, seed?: string | null): string {
  const trimmed = username?.trim();
  if (trimmed) return trimmed;
  return seed ? `${FALLBACK_NAME_PREFIX} ${getFallbackSuffix(seed)}` : FALLBACK_NAME_PREFIX;
}

/**
 * Display name for the signed-in user. Treats a username equal to the email
 * local part as unset, because the DB trigger historically backfilled it that way.
 */
export function getOwnDisplayName(user: { id: string; username?: string | null; email?: string | null }): string {
  const local = user.email?.split('@')[0]?.trim().toLowerCase();
  const name = user.username?.trim();
  const leaked = !!name && !!local && name.toLowerCase() === local;
  return getDisplayName(leaked ? null : name, user.id);
}

/** First letter of display name, uppercased. Handles emoji / empty edge cases. */
export function getAvatarInitial(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return '?';
  const first = trimmed[0];
  if (/[a-zA-Z]/.test(first)) return first.toUpperCase();
  return first;
}

/** Format a duration in seconds as M:SS. Shared by stats, games, and leaderboards. */
export function formatScore(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Format large player counts: 1234 → "1.2k", 12345 → "12.3k" */
export function formatPlayerCount(count: number): string {
  if (count >= 1000) {
    const k = count / 1000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return count.toLocaleString();
}

/** The single glyph used app-wide for a missing / not-yet-available value. */
export const EMPTY_VALUE = '—';

/**
 * Format a possibly-missing value. Returns EMPTY_VALUE for null, undefined or
 * empty strings; otherwise applies the optional formatter (or String()).
 */
export function formatMaybe<T>(
  value: T | null | undefined,
  format: (v: T) => string = (v) => String(v),
): string {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return EMPTY_VALUE;
  }
  return format(value);
}
