import type { ConnectionsPuzzle } from '@/constants/ConnectionsData';
import type { CrosswordPuzzle } from '@/types/game';
import { getRecentAndUpcomingGames } from '@/lib/daily-games';
import { offlineSyncManager } from '@/lib/offline-sync-manager';
import { supabase } from '@/lib/supabase-client';
import { useAuthStore } from '@/stores/auth-store';
import type { ConnectionsState, CrosswordState, GameState } from '@/types/game';
import { useCallback, useEffect, useState } from 'react';

async function getConnectionsPlayCount(date: string): Promise<number> {
    try {
        const { data, error } = await supabase.rpc('get_connections_play_count', {
            puzzle_date: date,
        });
        if (error) return 0;
        return typeof data === 'number' ? data : 0;
    } catch {
        return 0;
    }
}

type GameType = 'connections' | 'crossword';

function formatPuzzleDate(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export interface PuzzleCarouselItem {
    label: string;
    isNew: boolean;
    isCompleted: boolean;
    commuteCount?: number;
    date: string;
    puzzleId: string;
    completionTime?: string;
    score?: string;
    isWon?: boolean;
}

export interface ConnectionsCarouselItem extends PuzzleCarouselItem {
    puzzle: ConnectionsPuzzle;
}

export interface CrosswordCarouselItem extends PuzzleCarouselItem {
    puzzle: CrosswordPuzzle;
}

function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function toLocalDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

async function loadConnectionsCarousel(
    userId: string,
    limit: number = 7,
): Promise<ConnectionsCarouselItem[]> {
    const games = await getRecentAndUpcomingGames('connections', limit, 0);
    const sliced = games.slice(0, limit);
    const playCounts = await Promise.all(
        sliced.map(g => getConnectionsPlayCount(g.game_date))
    );
    const today = toLocalDateStr(new Date());
    const items: ConnectionsCarouselItem[] = [];

    for (let i = 0; i < sliced.length; i++) {
        const { game_date, puzzle_data } = sliced[i];
        const puzzle = puzzle_data as ConnectionsPuzzle;
        const playCount = playCounts[i];
        const gameId = `connections_${userId}_${game_date}`;
        const game = await offlineSyncManager.loadGameState(gameId, userId);
        const state = game?.state as ConnectionsState | undefined;
        const isCompleted = state?.status === 'won' || state?.status === 'lost';
        const isWon = state?.status === 'won';

        let completionTime: string | undefined;
        let score: string | undefined;

        if (isCompleted && state?.startTime && state?.endTime) {
            const duration = Math.floor((state.endTime - state.startTime) / 1000);
            completionTime = formatTime(duration);
            score = `${state.mistakesRemaining}/4`;
        }

        items.push({
            puzzle,
            label: formatPuzzleDate(game_date),
            isNew: game_date === today,
            isCompleted,
            commuteCount: isCompleted ? undefined : playCount,
            date: game_date,
            puzzleId: puzzle.id,
            completionTime,
            score,
            isWon,
        });
    }
    return items;
}

async function loadCrosswordCarousel(userId: string): Promise<CrosswordCarouselItem[]> {
    const games = await getRecentAndUpcomingGames('crossword', 7, 0);
    const sliced = games.slice(0, 7);
    const today = toLocalDateStr(new Date());
    const items: CrosswordCarouselItem[] = [];

    for (let i = 0; i < sliced.length; i++) {
        const { game_date, puzzle_data } = sliced[i];
        const puzzle = puzzle_data as CrosswordPuzzle;
        const gameId = `crossword_${userId}_${puzzle.id}`;
        const game = await offlineSyncManager.loadGameState(gameId, userId);
        const state = game?.state as CrosswordState | undefined;
        const isCompleted = state?.completed ?? false;

        items.push({
            puzzle,
            label: formatPuzzleDate(game_date),
            isNew: game_date === today,
            isCompleted,
            commuteCount: isCompleted ? undefined : 0,
            date: game_date,
            puzzleId: puzzle.id,
        });
    }
    return items;
}

export function usePuzzleCarousel(gameType: GameType) {
    const user = useAuthStore(state => state.user);
    const [items, setItems] = useState<
        ConnectionsCarouselItem[] | CrosswordCarouselItem[]
    >([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!user) {
            setItems([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            if (gameType === 'connections') {
                const data = await loadConnectionsCarousel(user.id);
                setItems(data);
            } else {
                const data = await loadCrosswordCarousel(user.id);
                setItems(data);
            }
        } catch (err) {
            console.error('Failed to load puzzle carousel:', err);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [user?.id, gameType]);

    useEffect(() => {
        load();
    }, [load]);

    return { items, loading, refresh: load };
}
