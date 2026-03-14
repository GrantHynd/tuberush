import { useMemo } from 'react';
import { getDailyPuzzle, getPuzzleById } from '@/constants/CrosswordData';
import type { CrosswordPuzzle } from '@/types/game';

/**
 * Hook that loads and exposes crossword puzzle data.
 * Pass a puzzleId to load a specific puzzle, or omit it to get today's daily puzzle.
 */
export function usePuzzle(puzzleId?: string): CrosswordPuzzle {
    const puzzle = useMemo(() => {
        if (puzzleId) {
            return getPuzzleById(puzzleId) ?? getDailyPuzzle();
        }
        return getDailyPuzzle();
    }, [puzzleId]);

    return puzzle;
}
