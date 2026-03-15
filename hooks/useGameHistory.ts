import { supabase } from '@/lib/supabase-client';
import { useAuthStore } from '@/stores/auth-store';
import { GameType } from '@/types/game';
import { useCallback, useEffect, useState } from 'react';

export interface GameHistoryEntry {
    id: string;
    gameType: GameType;
    date: string;
    score: number;
    result: 'win' | 'loss';
    points: number;
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function calculatePoints(score: number, gameType: GameType): number {
    if (score < 60) return 32;
    if (score < 120) return 18;
    if (score < 180) return 8;
    if (score < 240) return 4;
    if (score < 300) return 3;
    return 2;
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

            const historyEntries: GameHistoryEntry[] = (data || []).map((entry: any) => {
                const timeString = formatTime(entry.score);
                const result: 'win' | 'loss' = entry.score < 600 ? 'win' : 'loss';
                const points = calculatePoints(entry.score, entry.game_type);

                return {
                    id: entry.id,
                    gameType: entry.game_type,
                    date: entry.game_date,
                    score: entry.score,
                    result,
                    points,
                };
            });

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
