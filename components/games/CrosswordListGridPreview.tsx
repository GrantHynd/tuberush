import { CrosswordGridPreview } from '@/components/games/CrosswordGridPreview';
import { getCrosswordByPuzzleId } from '@/lib/daily-games';
import type { CrosswordCell } from '@/types/game';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

/**
 * Loads grid from `games` (network/cache) for history list previews — no bundled CrosswordData.
 */
export function CrosswordListGridPreview({ puzzleId, size = 36 }: { puzzleId: string; size?: number }) {
    const [grid, setGrid] = useState<CrosswordCell[][] | null>(null);

    useEffect(() => {
        let cancelled = false;
        getCrosswordByPuzzleId(puzzleId).then((result) => {
            if (!cancelled && result?.puzzle_data?.grid) setGrid(result.puzzle_data.grid);
        });
        return () => { cancelled = true; };
    }, [puzzleId]);

    if (!grid) return null;

    return (
        <View style={{ marginRight: 8 }}>
            <CrosswordGridPreview grid={grid} size={size} />
        </View>
    );
}
