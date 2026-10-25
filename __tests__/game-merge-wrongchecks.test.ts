import { mergeCrossword } from '@/lib/game-merge';
import type { CrosswordState } from '@/types/game';

describe('mergeCrossword wrongChecks (TUB-300)', () => {
    const base: CrosswordState = { puzzleId: 'p', grid: [], clues: { across: {}, down: {} }, userAnswers: {}, completed: false };
    it('keeps the higher wrong-check count', () => {
        expect(mergeCrossword({ ...base, wrongChecks: 2 }, { ...base, wrongChecks: 1 }).wrongChecks).toBe(2);
        expect(mergeCrossword(base, base).wrongChecks).toBeUndefined();
    });
});
