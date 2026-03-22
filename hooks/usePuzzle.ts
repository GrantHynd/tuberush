import { useEffect, useState } from 'react';
import {
    getCrosswordByPuzzleId,
    getDailyGame,
} from '@/lib/daily-games';
import type { CrosswordPuzzle } from '@/types/game';

function normalizePuzzleId(puzzleId?: string | string[]): string | undefined {
    if (puzzleId == null) return undefined;
    return Array.isArray(puzzleId) ? puzzleId[0] : puzzleId;
}

/**
 * Loads crossword puzzle from `games` (network + cache). No bundled puzzle fallbacks.
 */
export function usePuzzle(puzzleId?: string | string[]): { puzzle: CrosswordPuzzle | null; gameDate: string | null; loading: boolean } {
    const id = normalizePuzzleId(puzzleId);
    const [puzzle, setPuzzle] = useState<CrosswordPuzzle | null>(null);
    const [gameDate, setGameDate] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            try {
                if (id) {
                    const result = await getCrosswordByPuzzleId(id);
                    if (!cancelled) {
                        setPuzzle(result?.puzzle_data ?? null);
                        setGameDate(result?.game_date ?? null);
                    }
                } else {
                    const result = (await getDailyGame('crossword')) as CrosswordPuzzle | undefined;
                    if (!cancelled) {
                        setPuzzle(result ?? null);
                        setGameDate(result ? new Date().toISOString().split('T')[0] : null);
                    }
                }
            } catch {
                if (!cancelled) {
                    setPuzzle(null);
                    setGameDate(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [id]);

    return { puzzle, gameDate, loading };
}
