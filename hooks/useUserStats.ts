import { leaderboard } from '@/lib/leaderboard';
import { useAuthStore } from '@/stores/auth-store';
import { useCallback, useEffect, useState } from 'react';

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export interface UserStats {
    bestTime: string | null;
    streak: number;
}

export function useUserStats() {
    const user = useAuthStore(state => state.user);
    const [stats, setStats] = useState<UserStats>({ bestTime: null, streak: 0 });
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!user) {
            setStats({ bestTime: null, streak: 0 });
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [connectionsBest, crosswordBest] = await Promise.all([
                leaderboard.getUserBestScore(user.id, 'connections'),
                leaderboard.getUserBestScore(user.id, 'crossword'),
            ]);

            const best =
                connectionsBest !== null && crosswordBest !== null
                    ? Math.min(connectionsBest, crosswordBest)
                    : connectionsBest ?? crosswordBest;

            setStats({
                bestTime: best !== null ? formatTime(best) : null,
                streak: 0,
            });
        } catch (err) {
            console.error('Failed to load user stats:', err);
            setStats({ bestTime: null, streak: 0 });
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        load();
    }, [load]);

    return { stats, loading, refresh: load };
}
