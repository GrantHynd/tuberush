import { leaderboard } from '@/lib/leaderboard';
import { useAuthStore } from '@/stores/auth-store';
import { useCallback, useEffect, useState } from 'react';

export interface LocationRank {
    location: string;
    rank: number;
}

export function useLocationRank() {
    const user = useAuthStore((state) => state.user);
    const [rank, setRank] = useState<LocationRank | null>(null);
    const [loading, setLoading] = useState(true);

    const getLocationDisplay = () => {
        if (!user?.city) return null;
        if (user.city === 'London' && user.borough) return user.borough;
        return user.city;
    };

    const load = useCallback(async () => {
        if (!user?.city) {
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
                'area',
                user
            );
            const location = getLocationDisplay();
            if (userRank !== null && location) {
                setRank({ location, rank: userRank });
            } else if (location) {
                setRank({ location, rank: 0 });
            } else {
                setRank(null);
            }
        } catch (err) {
            console.error('Failed to load location rank:', err);
            const location = getLocationDisplay();
            setRank(location ? { location, rank: 0 } : null);
        } finally {
            setLoading(false);
        }
    }, [user?.id, user?.city, user?.borough]);

    useEffect(() => {
        load();
    }, [load]);

    return { rank, loading, refresh: load };
}
