/** Extract display name from email (part before @). */
export function getDisplayName(email: string): string {
  const local = email.split('@')[0] || '';
  return local
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || 'Anonymous';
}

/** First letter of display name, uppercased. Handles emoji / empty edge cases. */
export function getAvatarInitial(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return '?';
  const first = trimmed[0];
  if (/[a-zA-Z]/.test(first)) return first.toUpperCase();
  return first;
}

/** Format seconds as M:SS */
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
