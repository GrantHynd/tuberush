import { palette } from '@/constants/theme';

function luminance(hex: string): number {
    const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

describe('tab bar contrast (TUB-270, TUB-330)', () => {
    it('uses the scheme surface, not a forced white bar in dark mode', () => {
        expect(palette.light.surface).toBe('#FFFFFF');
        expect(palette.dark.surface).toBe('#15201D');
        expect(palette.dark.surface).not.toBe(palette.light.surface);
    });

    it('inactive and active icons meet WCAG AA 4.5:1 on that surface', () => {
        for (const scheme of ['light', 'dark'] as const) {
            const colors = palette[scheme];
            expect(contrast(colors.tabInactive, colors.surface)).toBeGreaterThanOrEqual(4.5);
            expect(contrast(colors.tabActive, colors.surface)).toBeGreaterThanOrEqual(4.5);
        }
    });
});
