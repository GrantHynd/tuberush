import { errorMarkColors } from '@/components/games/Crossword';
import { crosswordCells, interchangeGroup, interchangeGroups, palette } from '@/constants/theme';

function lum(hex: string) {
    const n = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map((i) => {
        const c = parseInt(n.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a: string, b: string) {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
}

const TFL = ['#E32017', '#003688', '#FFD300', '#00782A', '#DC241F', '#0019A8', '#EE7C0E', '#00A4A7', '#6950A1', '#9B0056'];

describe('Platform tokens (TUB-325)', () => {
    it('names no TfL or NAVY alias', () => {
        const theme = require('@/constants/theme') as Record<string, unknown>;
        expect(theme.TFL).toBeUndefined();
        expect(theme.NAVY).toBeUndefined();
        expect(theme.LineColors).toBeUndefined();
        expect(theme.DifficultyLines).toBeUndefined();
        expect(theme.StateColors).toBeUndefined();
    });

    it('keeps Option A group fills and V3 cell hexes', () => {
        expect(interchangeGroups.map((g) => g.fill)).toEqual(['#18332D', '#1E3D35', '#24463D', '#2A4F45']);
        expect(crosswordCells.cellIdleFill).toBe('#526E64');
        expect(crosswordCells.cellBlockedFill).toBe('#060B09');
        expect(crosswordCells.cellOutline).toBe('#7E9B90');
        expect(crosswordCells.cellSelectedFill).toBe('#C3EADF');
        expect(crosswordCells.cellSelectedRing).toBe('#527E70');
        expect(crosswordCells.cellCursor).toBe('#0C1614');
        expect(crosswordCells.cellWordFill).toBe('#A8E8DC');
    });

    it('interchangeGroup clamps to 1..4', () => {
        expect(interchangeGroup(0).level).toBe(1);
        expect(interchangeGroup(9).level).toBe(4);
    });

    it('text and group pairs meet WCAG AA', () => {
        for (const g of interchangeGroups) expect(ratio(g.text, g.fill)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.light.text, palette.light.background)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.dark.text, palette.dark.background)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.light.onPrimary, palette.light.primary)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.dark.onPrimary, palette.dark.primary)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.light.onGameCrossword, palette.light.gameCrossword)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.dark.onGameCrossword, palette.dark.gameCrossword)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.light.premiumText, palette.light.premium)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.dark.premiumText, palette.dark.premium)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.light.tabInactive, palette.light.surface)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.dark.tabInactive, palette.dark.surface)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(crosswordCells.cellIdleText, crosswordCells.cellIdleFill)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(crosswordCells.cellSelectedText, crosswordCells.cellSelectedFill)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(crosswordCells.cellCursor, crosswordCells.cellSelectedFill)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(crosswordCells.cellSelectedRing, crosswordCells.cellSelectedFill)).toBeGreaterThanOrEqual(3);
        expect(ratio(palette.light.toastText, palette.light.toast)).toBeGreaterThanOrEqual(4.5);
    });

    it('keeps V3 crossword cells in both schemes until light is confirmed separately', () => {
        expect(palette.light.cellIdleFill).toBe(crosswordCells.cellIdleFill);
        expect(palette.dark.cellIdleFill).toBe(crosswordCells.cellIdleFill);
        expect(palette.light.cellSelectedFill).toBe(palette.dark.cellSelectedFill);
        expect(palette.light.cellBlockedFill).toBe(palette.dark.cellBlockedFill);
    });

    it('does not treat the light border as a text colour', () => {
        expect(palette.light.border).toBe('#7A8B85');
        expect(ratio(palette.light.border, '#FFFFFF')).toBeLessThan(4.5);
        expect(palette.light.text).not.toBe(palette.light.border);
        expect(palette.light.textSecondary).not.toBe(palette.light.border);
        expect(ratio(palette.light.text, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.light.textSecondary, palette.light.background)).toBeGreaterThanOrEqual(4.5);
    });

    it('gives a crossword error mark a contrasting X when error shares the text colour', () => {
        expect(palette.dark.error).toBe(palette.dark.text);
        expect(palette.dark.textDisabled).toBe(palette.dark.textSecondary);
        const dark = errorMarkColors(palette.dark);
        const light = errorMarkColors(palette.light);
        expect(dark.disc).not.toBe(palette.dark.text);
        expect(ratio(dark.ink, dark.disc)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(dark.disc, crosswordCells.cellSelectedFill)).toBeGreaterThanOrEqual(3);
        expect(ratio(dark.ink, crosswordCells.cellIdleFill)).toBeGreaterThanOrEqual(3);
        expect(light.disc).toBe(palette.light.error);
        expect(light.ink).toBe(palette.light.onError);
        expect(ratio(light.ink, light.disc)).toBeGreaterThanOrEqual(4.5);
    });

    it('does not use the retired tube-line colour set', () => {
        const values = [
            ...Object.values(palette.light),
            ...Object.values(palette.dark),
            ...interchangeGroups.flatMap((g) => [g.fill, g.text]),
        ];
        for (const hex of TFL) expect(values).not.toContain(hex);
    });
});
