import { toGameHistoryEntry, type GameHistoryEntry } from '@/lib/game-history';
import { supabase } from '@/lib/supabase-client';
import { useAuthStore } from '@/stores/auth-store';
import type { GameType } from '@/types/game';
import { useCallback, useEffect, useState } from 'react';

export type { GameHistoryEntry };

interface LeaderboardHistoryRow {
    id: string;
    game_type: GameType;
    game_date: string;
    score: number;
}

export function useGameHistory() {
    const user = useAuthStore(state => state.user);
    const [history, setHistory] = useState<GameHistoryEntry[]>([]);
    const [gamesPlayed, setGamesPlayed] = useState(0);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!user) {
            setHistory([]);
            setGamesPlayed(0);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('leaderboard')
                .select('*')
                .eq('user_id', user.id)
                .order('game_date', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;

            const historyEntries = ((data ?? []) as LeaderboardHistoryRow[]).map(toGameHistoryEntry);

            setHistory(historyEntries);
            setGamesPlayed(historyEntries.length);
        } catch (err) {
            console.error('Failed to load game history:', err);
            setHistory([]);
            setGamesPlayed(0);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        load();
    }, [load]);

    return { history, gamesPlayed, loading, refresh: load };
}
