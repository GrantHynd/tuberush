import { errorMarkColors } from '@/components/games/Crossword';
import { crosswordCells, FontFamily, interchangeGroup, interchangeGroups, lightCrosswordCells, palette, Typography } from '@/constants/theme';

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
        expect(theme.Colors).toBeUndefined();
        expect(theme.GameColors).toBeUndefined();
        expect(theme.gameColors).toBeUndefined();
        expect(theme.CardSurface).toBeUndefined();
    });

    it('keeps dark V3 cells and the approved light-tuned V3', () => {
        expect(interchangeGroups.map((g) => g.fill)).toEqual(['#18332D', '#1E3D35', '#24463D', '#2A4F45']);
        expect(crosswordCells).toEqual({
            cellIdleFill: '#526E64',
            cellBlockedFill: '#060B09',
            cellOutline: '#7E9B90',
            cellIdleText: '#F0F5F3',
            cellWordFill: '#A8E8DC',
            cellWordText: '#0C1614',
            cellSelectedFill: '#C3EADF',
            cellSelectedText: '#0C1614',
            cellSelectedRing: '#527E70',
            cellCursor: '#0C1614',
        });
        expect(lightCrosswordCells).toEqual({
            cellIdleFill: '#FFFFFF',
            cellBlockedFill: '#1E3A35',
            cellOutline: '#9DB3AC',
            cellIdleText: '#10201E',
            cellWordFill: '#D5EBE6',
            cellWordText: '#10201E',
            cellSelectedFill: '#B4DDD3',
            cellSelectedText: '#10201E',
            cellSelectedRing: '#0D5C55',
            cellCursor: '#10201E',
        });
        expect(palette.dark.cellIdleFill).toBe(crosswordCells.cellIdleFill);
        expect(palette.dark.cellSelectedRing).toBe(crosswordCells.cellSelectedRing);
        expect(palette.dark.cellCursor).toBe(crosswordCells.cellCursor);
        expect(palette.light.cellIdleFill).toBe(lightCrosswordCells.cellIdleFill);
        expect(palette.light.cellSelectedRing).toBe('#0D5C55');
        expect(palette.light.cellCursor).toBe('#10201E');
        expect(palette.light.cellSelectedRing).not.toBe(palette.light.cellCursor);
        expect(palette.light.gameCrossword).toBe('#8B3A2F');
        expect(palette.dark.gameCrossword).toBe('#A8E8DC');
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
        expect(palette.light.gameCrossword).not.toBe(palette.light.error);
        expect(palette.dark.gameCrossword).not.toBe(palette.light.gameCrossword);
        expect(palette.dark.gameInterchange).not.toBe(palette.light.gameInterchange);
        expect(ratio(palette.light.onGameCrossword, palette.light.gameCrossword)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.dark.onGameCrossword, palette.dark.gameCrossword)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.light.onGameInterchange, palette.light.gameInterchange)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.dark.onGameInterchange, palette.dark.gameInterchange)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.light.premiumText, palette.light.premium)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.dark.premiumText, palette.dark.premium)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.light.tabInactive, palette.light.surface)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.dark.tabInactive, palette.dark.surface)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.dark.cellIdleText, palette.dark.cellIdleFill)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.dark.cellSelectedText, palette.dark.cellSelectedFill)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.dark.cellCursor, palette.dark.cellSelectedFill)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.dark.cellSelectedRing, palette.dark.cellSelectedFill)).toBeGreaterThanOrEqual(3);
        expect(ratio(palette.light.toastText, palette.light.toast)).toBeGreaterThanOrEqual(4.5);
    });

    it('records the approved light crossword contrast sheet', () => {
        const light = palette.light;
        const sheet = (a: string, b: string) => ratio(a, b).toFixed(2);
        expect(sheet(light.cellIdleText, light.cellIdleFill)).toBe('16.84');
        expect(sheet(light.cellWordText, light.cellWordFill)).toBe('13.51');
        expect(sheet(light.cellSelectedText, light.cellSelectedFill)).toBe('11.40');
        expect(sheet(light.cellCursor, light.cellSelectedFill)).toBe('11.40');
        expect(sheet(light.cellSelectedRing, light.cellSelectedFill)).toBe('5.31');
        expect(sheet(light.cellIdleFill, light.cellBlockedFill)).toBe('12.27');
        expect(sheet(light.cellOutline, light.cellBlockedFill)).toBe('5.54');
        expect(sheet(light.cellIdleFill, light.background)).toBe('1.07');
        expect(sheet(light.cellSelectedFill, light.cellWordFill)).toBe('1.18');
        // Approved outline on white. The blocked fill and the selected ring carry the stronger edges.
        expect(sheet(light.cellOutline, light.cellIdleFill)).toBe('2.22');
        expect(ratio(light.cellOutline, light.cellIdleFill)).toBeLessThan(3);
    });

    it('applies light-tuned cells only in light mode', () => {
        expect(palette.light.cellIdleFill).toBe('#FFFFFF');
        expect(palette.dark.cellIdleFill).toBe('#526E64');
        expect(palette.light.cellBlockedFill).not.toBe(palette.dark.cellBlockedFill);
        expect(palette.light.cellWordFill).not.toBe(palette.dark.cellWordFill);
        expect(palette.light.cellSelectedFill).not.toBe(palette.dark.cellSelectedFill);
        expect(palette.dark.cellBlockedFill).toBe('#060B09');
        expect(palette.dark.cellWordFill).toBe('#A8E8DC');
        expect(palette.dark.cellSelectedFill).toBe('#C3EADF');
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
        expect(ratio(dark.disc, palette.dark.cellSelectedFill)).toBeGreaterThanOrEqual(3);
        expect(ratio(dark.ink, palette.dark.cellIdleFill)).toBeGreaterThanOrEqual(3);
        expect(light.disc).toBe(palette.light.error);
        expect(light.ink).toBe(palette.light.onError);
        expect(ratio(light.ink, light.disc)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(light.disc, palette.light.cellIdleFill)).toBeGreaterThanOrEqual(3);
        expect(ratio(light.disc, palette.light.cellSelectedFill)).toBeGreaterThanOrEqual(3);
    });

    it('points each text role at the loaded Fira cut for that weight', () => {
        expect(Typography.h1).toMatchObject({ fontFamily: FontFamily.bold, fontWeight: '700' });
        expect(Typography.h2).toMatchObject({ fontFamily: FontFamily.semibold, fontWeight: '600' });
        expect(Typography.h3).toMatchObject({ fontFamily: FontFamily.semibold, fontWeight: '600' });
        expect(Typography.body).toMatchObject({ fontFamily: FontFamily.regular, fontSize: 16, lineHeight: 24 });
        expect(Typography.body).not.toHaveProperty('fontWeight');
        expect(Typography.caption).toMatchObject({ fontFamily: FontFamily.regular });
        expect(Typography.label).toMatchObject({ fontFamily: FontFamily.medium, fontWeight: '500' });
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
