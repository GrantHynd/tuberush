import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useContext } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

/**
 * Bottom padding for scrollable tab-root content so the last item scrolls
 * fully clear of the tab bar and home indicator.
 *
 * Inside a bottom-tab navigator the measured tab bar height already includes
 * the bottom safe-area inset; outside one (or before layout) we fall back to
 * the safe-area inset alone. Standard spacing is always added on top.
 */
export function getTabBarBottomInset(tabBarHeight: number | undefined, safeAreaBottom: number): number {
    const chrome = tabBarHeight && tabBarHeight > 0 ? tabBarHeight : safeAreaBottom;
    return chrome + Spacing.xl;
}

export function useTabBarBottomInset(): number {
    const tabBarHeight = useContext(BottomTabBarHeightContext);
    const insets = useSafeAreaInsets();
    return getTabBarBottomInset(tabBarHeight, insets.bottom);
}
