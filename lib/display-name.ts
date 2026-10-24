import AsyncStorage from '@react-native-async-storage/async-storage';

export const DISPLAY_NAME_MIN = 3;
export const DISPLAY_NAME_MAX = 20;
export const DISPLAY_NAME_HELPER = "This is how you'll appear on leaderboards.";
export const DISPLAY_NAME_ERROR = 'Use 3–20 letters or numbers.';
export const DISPLAY_NAME_SAVE_ERROR = "Couldn't save. Try again.";

// Letters (any script), numbers, spaces, underscore and hyphen. Emoji are not \p{L}/\p{N}.
const ALLOWED = /^[\p{L}\p{N} _-]+$/u;

/** Returns null when valid, otherwise the inline error message. Input is trimmed first. */
export function validateDisplayName(raw: string): string | null {
    const name = raw.trim();
    const length = Array.from(name).length;
    if (length < DISPLAY_NAME_MIN || length > DISPLAY_NAME_MAX) return DISPLAY_NAME_ERROR;
    if (!ALLOWED.test(name)) return DISPLAY_NAME_ERROR;
    return null;
}

export const displayNamePromptKey = (userId: string) => `display-name-prompt-seen:${userId}`;

export async function hasSeenDisplayNamePrompt(userId: string): Promise<boolean> {
    return (await AsyncStorage.getItem(displayNamePromptKey(userId))) === '1';
}

export async function markDisplayNamePromptSeen(userId: string): Promise<void> {
    await AsyncStorage.setItem(displayNamePromptKey(userId), '1');
}
