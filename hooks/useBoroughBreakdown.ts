import { useCallback, useEffect, useState } from 'react';
import { leaderboard } from '@/lib/leaderboard';
import { BoroughBreakdownEntry, GameType } from '@/types/game';

interface UseBoroughBreakdownResult {
    boroughs: BoroughBreakdownEntry[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useBoroughBreakdown(
    gameType: GameType,
    weekStart: string,
    weekEnd: string
): UseBoroughBreakdownResult {
    const [boroughs, setBoroughs] = useState<BoroughBreakdownEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await leaderboard.getBoroughBreakdown(
                gameType,
                weekStart,
                weekEnd
            );
            setBoroughs(data);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load boroughs');
        } finally {
            setLoading(false);
        }
    }, [gameType, weekStart, weekEnd]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { boroughs, loading, error, refetch: fetch };
}
