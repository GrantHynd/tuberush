import { useEffect, useMemo, useState } from 'react';
import { getDailyPuzzle, getPuzzleById } from '@/constants/CrosswordData';
import { getDailyGame, getGameByDate } from '@/lib/daily-games';
import type { CrosswordPuzzle } from '@/types/game';

/**
 * Hook that loads and exposes crossword puzzle data.
 * Pass a puzzleId to load a specific puzzle, or omit it to get today's daily puzzle.
 *
 * Loads from the daily_games DB/cache first, falls back to constants.
 */
export function usePuzzle(puzzleId?: string): { puzzle: CrosswordPuzzle | null; loading: boolean } {
    // Synchronous fallback for immediate render
    const fallback = useMemo(() => {
        if (puzzleId) {
            return getPuzzleById(puzzleId) ?? getDailyPuzzle();
        }
        return getDailyPuzzle();
    }, [puzzleId]);

    const [puzzle, setPuzzle] = useState<CrosswordPuzzle | null>(fallback);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                let result: CrosswordPuzzle;
                if (puzzleId) {
                    // Try to find by looking up the puzzle's date from the fallback
                    const fb = getPuzzleById(puzzleId);
                    if (fb) {
                        const dbPuzzle = await getGameByDate('crossword', fb.date);
                        result = (dbPuzzle as CrosswordPuzzle) ?? fb;
                    } else {
                        result = fallback;
                    }
                } else {
                    result = (await getDailyGame('crossword')) as CrosswordPuzzle;
                }
                if (!cancelled) {
                    setPuzzle(result);
                }
            } catch {
                // Keep fallback
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        load();
        return () => { cancelled = true; };
    }, [puzzleId, fallback]);

    return { puzzle, loading };
}
