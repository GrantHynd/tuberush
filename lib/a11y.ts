import { AccessibilityInfo } from 'react-native';

/** Announce a status message to VoiceOver / TalkBack. Safe no-op if unavailable. */
export function announce(message: string): void {
    try {
        AccessibilityInfo.announceForAccessibility?.(message);
    } catch {
        // ignore
    }
}
