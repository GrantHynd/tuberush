import { Spacing } from '@/constants/theme';
import { getTabBarBottomInset } from '@/hooks/useTabBarBottomInset';

describe('getTabBarBottomInset', () => {
    it('uses the tab bar height (which already includes the safe area) plus spacing', () => {
        expect(getTabBarBottomInset(83, 34)).toBe(83 + Spacing.xl);
    });

    it('falls back to the safe-area inset outside a tab navigator', () => {
        expect(getTabBarBottomInset(undefined, 34)).toBe(34 + Spacing.xl);
        expect(getTabBarBottomInset(0, 0)).toBe(Spacing.xl);
    });
});
