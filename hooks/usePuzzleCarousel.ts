import {
    getRecentPuzzles as getConnectionsRecent,
    type ConnectionsPuzzle,
} from '@/constants/ConnectionsData';
import { getRecentPuzzles as getCrosswordRecent } from '@/constants/CrosswordData';
import type { CrosswordPuzzle } from '@/types/game';
import { offlineSyncManager } from '@/lib/offline-sync-manager';
import { useAuthStore } from '@/stores/auth-store';
import type { ConnectionsState, CrosswordState, GameState } from '@/types/game';
import { useCallback, useEffect, useState } from 'react';

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
    puzzleNumber: string;
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

async function loadConnectionsCarousel(
    userId: string,
    limit: number = 7,
): Promise<ConnectionsCarouselItem[]> {
    const puzzles = getConnectionsRecent(limit);
    const today = new Date().toISOString().split('T')[0];
    const items: ConnectionsCarouselItem[] = [];

    for (let i = 0; i < puzzles.length; i++) {
        const puzzle = puzzles[i];
        const gameId = `connections_${userId}_${puzzle.date}`;
        const game = await offlineSyncManager.loadGameState(gameId, userId);
        const state = game?.state as ConnectionsState | undefined;
        const isCompleted = state?.status === 'won' || state?.status === 'lost';
        const isWon = state?.status === 'won';
        const commuteCount = state?.history?.length;

        let completionTime: string | undefined;
        let score: string | undefined;

        if (isCompleted && state?.startTime && state?.endTime) {
            const duration = Math.floor((state.endTime - state.startTime) / 1000);
            completionTime = formatTime(duration);
            score = `${state.mistakesRemaining}/4`;
        }

        items.push({
            puzzle,
            puzzleNumber: `#${puzzle.id}`,
            label: formatPuzzleDate(puzzle.date),
            isNew: puzzle.date === today,
            isCompleted,
            commuteCount: isCompleted ? undefined : commuteCount,
            date: puzzle.date,
            puzzleId: puzzle.id,
            completionTime,
            score,
            isWon,
        });
    }
    return items;
}

async function loadCrosswordCarousel(userId: string): Promise<CrosswordCarouselItem[]> {
    const puzzles = getCrosswordRecent(7);
    const today = new Date().toISOString().split('T')[0];
    const items: CrosswordCarouselItem[] = [];

    for (let i = 0; i < puzzles.length; i++) {
        const puzzle = puzzles[i];
        const gameId = `crossword_${userId}_${puzzle.id}`;
        const game = await offlineSyncManager.loadGameState(gameId, userId);
        const state = game?.state as CrosswordState | undefined;
        const isCompleted = state?.completed ?? false;

        items.push({
            puzzle,
            puzzleNumber: `#${puzzle.id}`,
            label: formatPuzzleDate(puzzle.date),
            isNew: puzzle.date === today,
            isCompleted,
            commuteCount: isCompleted ? undefined : 0,
            date: puzzle.date,
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
