import { GAMES } from '@/constants/Games';
import { Colors, GameColors, palette } from '@/constants/theme';

function luminance(hex: string): number {
    const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

describe('game colours (TUB-325)', () => {
    it('uses the light crossword fill, distinct from the error colour', () => {
        expect(GameColors.crossword).toBe('#8B3A2F');
        expect(GameColors.crossword).not.toBe(palette.light.error);
        expect(GameColors.interchange).toBe(palette.light.gameInterchange);
    });

    it('on-colour text meets AA against each game fill', () => {
        expect(contrast(palette.light.onGameCrossword, GameColors.crossword)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(palette.light.onGameInterchange, GameColors.interchange)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(palette.dark.onGameCrossword, palette.dark.gameCrossword)).toBeGreaterThanOrEqual(4.5);
    });

    it('GAMES colours match the light fills Home can fall back to', () => {
        expect(GAMES.connections.color).toBe(GameColors.interchange);
        expect(GAMES.crossword.color).toBe(GameColors.crossword);
        expect(Colors.light.tabBarBackground).toBe(palette.light.surface);
        expect(Colors.dark.tabBarBackground).toBe(palette.dark.surface);
    });
});
