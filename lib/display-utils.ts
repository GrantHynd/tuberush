/** 
 * Get display name for a user.
 * @param username - The user's username
 * @param email - Optional fallback email (for backwards compatibility)
 */
export function getDisplayName(username: string, email?: string): string {
  // If username is provided and not empty, use it
  if (username && username.trim()) {
    return username.trim();
  }
  
  // Fallback to email extraction for backwards compatibility
  if (email) {
    const local = email.split('@')[0] || '';
    return local
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim() || 'Anonymous';
  }
  
  return 'Anonymous';
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
