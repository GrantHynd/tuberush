import { GAMES } from '@/constants/Games';
import { Colors, GameColors, TFL } from '@/constants/theme';

function luminance(hex: string): number {
    const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrastOnWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05);

describe('game colours (TUB-254)', () => {
    it('uses a muted crossword red that is not the error red', () => {
        expect(GameColors.crossword).toBe('#A4161A');
        expect(GameColors.crossword).not.toBe(TFL.red);
        expect(GameColors.crossword).not.toBe(Colors.light.error);
    });

    it('white card text meets AA against the crossword fill', () => {
        expect(contrastOnWhite(GameColors.crossword)).toBeGreaterThanOrEqual(7.5);
    });

    it('GAMES colours match what Home renders (connections blue, crossword red)', () => {
        expect(GAMES.connections.color).toBe(GameColors.connections);
        expect(GAMES.crossword.color).toBe(GameColors.crossword);
    });
});
