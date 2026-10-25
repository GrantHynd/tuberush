import { DifficultyLines, difficultyLine, LineColors, StateColors } from '@/constants/theme';

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

describe('Mind the Gap tokens (TUB-293)', () => {
    it('game line colours carry white text at AA', () => {
        for (const c of Object.values(LineColors)) expect(ratio(c, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    });
    it('difficulty lines meet AA with their text colour', () => {
        for (const d of DifficultyLines) expect(ratio(d.color, d.text)).toBeGreaterThanOrEqual(4.5);
        expect(DifficultyLines.map((d) => d.color)).toEqual(['#EE7C0E', '#00A4A7', '#6950A1', '#9B0056']);
    });
    it('state pairs meet contrast table', () => {
        expect(ratio(StateColors.inactiveText, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
        expect(ratio(StateColors.inactiveBorder, '#FFFFFF')).toBeGreaterThanOrEqual(3);
        expect(ratio(StateColors.gridLine, '#FFFFFF')).toBeGreaterThanOrEqual(3);
        expect(ratio(StateColors.premiumText, StateColors.premium)).toBeGreaterThanOrEqual(4.5);
        expect(ratio('#FFFFFF', StateColors.toast)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(StateColors.found, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
        expect(ratio(StateColors.error, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
        expect(ratio(StateColors.selectedText, StateColors.selected)).toBeGreaterThanOrEqual(4.5);
    });
    it('difficultyLine clamps to 1..4', () => {
        expect(difficultyLine(0).level).toBe(1);
        expect(difficultyLine(9).level).toBe(4);
    });
    it('no state colour uses #D1D5DB', () => {
        expect(Object.values(StateColors)).not.toContain('#D1D5DB');
    });
});
