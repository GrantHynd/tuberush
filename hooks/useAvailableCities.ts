import { useCallback, useEffect, useState } from 'react';
import { leaderboard } from '@/lib/leaderboard';
import { CityPlayerCount, GameType } from '@/types/game';

interface UseAvailableCitiesResult {
    cities: CityPlayerCount[];
    loading: boolean;
    error: string | null;
}

export function useAvailableCities(
    gameType: GameType,
    weekStart: string,
    weekEnd: string
): UseAvailableCitiesResult {
    const [cities, setCities] = useState<CityPlayerCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await leaderboard.getAvailableCities(
                gameType,
                weekStart,
                weekEnd
            );
            setCities(data);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load cities');
        } finally {
            setLoading(false);
        }
    }, [gameType, weekStart, weekEnd]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { cities, loading, error };
}
