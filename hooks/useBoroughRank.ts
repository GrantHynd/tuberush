import { leaderboard } from '@/lib/leaderboard';
import { useAuthStore } from '@/stores/auth-store';
import { useCallback, useEffect, useState } from 'react';

export interface BoroughRank {
    borough: string;
    rank: number;
}

export function useBoroughRank() {
    const user = useAuthStore(state => state.user);
    const [rank, setRank] = useState<BoroughRank | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!user?.borough) {
            setRank(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const userRank = await leaderboard.getUserRank(
                user.id,
                'connections',
                today,
                user.borough,
            );
            if (userRank !== null) {
                setRank({ borough: user.borough, rank: userRank });
            } else {
                setRank({ borough: user.borough, rank: 0 });
            }
        } catch (err) {
            console.error('Failed to load borough rank:', err);
            setRank(user.borough ? { borough: user.borough, rank: 0 } : null);
        } finally {
            setLoading(false);
        }
    }, [user?.id, user?.borough]);

    useEffect(() => {
        load();
    }, [load]);

    return { rank, loading, refresh: load };
}
