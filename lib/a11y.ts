import { AccessibilityInfo, type AccessibilityProps } from 'react-native';

/** Announce a status message to VoiceOver / TalkBack. Safe no-op if unavailable. */
export function announce(message: string): void {
    try {
        AccessibilityInfo.announceForAccessibility?.(message);
    } catch {
        // ignore
    }
}

/**
 * Decorative icons must not enter the accessibility tree. SF Symbols expose
 * their name ("house" is spoken "home") and icon fonts expose a private-use
 * glyph. The control around the icon carries the semantic label and state.
 */
export const decorativeIconProps: AccessibilityProps = {
    accessible: false,
    accessibilityElementsHidden: true,
    importantForAccessibility: 'no-hide-descendants',
};

/**
 * Past XXXL (~1.35). Accessibility sizes stack the game header and shorten
 * the visible clue so scaled text cannot cover the mark, timer, or grid.
 * Default and XXXL stay on the single-row spec.
 */
export const LARGE_TEXT_FONT_SCALE = 1.5;

/**
 * React Navigation only builds the iOS tab label when `tabBarLabel` is a
 * string. A render function leaves the label empty, so the tree speaks the
 * icon name plus the visible title ("home, home, Games").
 */
export function tabAccessibilityLabel(title: string, index: number, count: number): string {
    return `${title}, tab, ${index + 1} of ${count}`;
}
