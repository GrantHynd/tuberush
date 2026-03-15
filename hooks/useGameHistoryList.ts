import { offlineSyncManager } from '@/lib/offline-sync-manager';
import { StorageManager } from '@/lib/storage-manager';
import { useAuthStore } from '@/stores/auth-store';
import { useGameStore } from '@/stores/game-store';
import type { GameHistoryConfig, GameHistoryListItem, GameHistorySection, GameHistoryStats } from '@/types/game-history';
import { useCallback, useEffect, useState } from 'react';

const DAYS_PER_BATCH = 14; // 2 weeks

/** Format date label; use T12:00:00 to avoid UTC midnight off-by-one in some timezones */
function formatPuzzleLabel(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = dayNames[date.getDay()];
    const day = date.getDate();
    const month = monthNames[date.getMonth()];

    return `${dayName} ${day} ${month}`;
}

function getWeekLabel(date: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - targetDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 7) return 'THIS WEEK';
    if (diffDays < 14) return 'LAST WEEK';
    if (diffDays < 21) return '2 WEEKS AGO';
    if (diffDays < 28) return '3 WEEKS AGO';
    return '4 WEEKS AGO';
}

function groupItemsByWeek(items: GameHistoryListItem[]): Map<string, GameHistoryListItem[]> {
    const grouped = new Map<string, GameHistoryListItem[]>();
    for (const item of items) {
        const date = new Date(item.date + 'T12:00:00');
        const weekLabel = getWeekLabel(date);
        if (!grouped.has(weekLabel)) grouped.set(weekLabel, []);
        grouped.get(weekLabel)!.push(item);
    }
    return grouped;
}

function buildSections(grouped: Map<string, GameHistoryListItem[]>): GameHistorySection[] {
    const weekOrder = ['THIS WEEK', 'LAST WEEK', '2 WEEKS AGO', '3 WEEKS AGO', '4 WEEKS AGO'];
    return weekOrder
        .filter(week => grouped.has(week))
        .map(week => ({ title: week, data: grouped.get(week)! }));
}

function calculateStreak(items: GameHistoryListItem[], hasWinLoss: boolean): number {
    let streak = 0;
    const sortedItems = [...items].sort((a, b) => b.date.localeCompare(a.date));

    for (const item of sortedItems) {
        const counts = hasWinLoss ? (item.isCompleted && item.isWon) : item.isCompleted;
        if (counts) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
}

function formatSublabel(playCount: number | undefined): string {
    if (playCount === undefined) return '— commuters played';
    return playCount > 0 ? `${playCount} commuters played` : '0 commuters played';
}

export function useGameHistoryList(config: GameHistoryConfig) {
    const user = useAuthStore(state => state.user);
    const currentGame = useGameStore(state => state.currentGame);
    const [sections, setSections] = useState<GameHistorySection[]>([]);
    const [stats, setStats] = useState<GameHistoryStats>({
        completed: 0,
        total: config.totalPuzzleCount,
        currentStreak: 0,
    });
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loadedCount, setLoadedCount] = useState(0);

    const load = useCallback(async () => {
        if (!user) {
            setSections([]);
            setStats({ completed: 0, total: config.totalPuzzleCount, currentStreak: 0 });
            setLoadedCount(0);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const puzzles = config.getPuzzlesWithOffset(DAYS_PER_BATCH, 0);
            const gameIds = puzzles.map(p => config.getGameId(user.id, p));
            let gameStatesMap = await StorageManager.getGameStatesBatch(gameIds);
            // Fallback: load any missing games via offlineSyncManager (catches server-synced data)
            const missingIds = gameIds.filter(id => !gameStatesMap.has(id));
            if (missingIds.length > 0 && user.id) {
                const loaded = await Promise.all(
                    missingIds.map(id => offlineSyncManager.loadGameState(id, user.id))
                );
                const nextMap = new Map(gameStatesMap);
                loaded.forEach((game, i) => {
                    if (game) nextMap.set(missingIds[i], game);
                });
                gameStatesMap = nextMap;
            }

            const buildItems = (playCounts: (number | undefined)[]) => {
                const items: GameHistoryListItem[] = [];
                for (let i = 0; i < puzzles.length; i++) {
                    const puzzle = puzzles[i];
                    const playCount = config.getPlayCounts ? playCounts[i] : undefined;
                    const gameId = gameIds[i];
                    const gameFromStore = currentGame?.id === gameId ? currentGame : null;
                    const game = gameFromStore ?? gameStatesMap.get(gameId) ?? null;
                    const parsed = config.parseState(game);

                    const date = new Date(config.getPuzzleDate(puzzle) + 'T12:00:00');
                    const today = new Date();
                    const isToday = date.toDateString() === today.toDateString();

                    const sublabel = config.getPlayCounts
                        ? formatSublabel(playCount)
                        : '';

                    const navigateKey = config.gameType === 'connections'
                        ? config.getPuzzleDate(puzzle)
                        : (puzzle as { id: string }).id;

                    items.push({
                        id: puzzle.id,
                        date: config.getPuzzleDate(puzzle),
                        dayNumber: date.getDate(),
                        label: formatPuzzleLabel(config.getPuzzleDate(puzzle)),
                        isToday,
                        isLive: isToday,
                        sublabel,
                        isCompleted: parsed.isCompleted,
                        completionTime: parsed.completionTime,
                        score: parsed.score,
                        isWon: parsed.isWon,
                        navigateKey,
                    });
                }
                return items;
            };

            const initialItems = buildItems(
                config.getPlayCounts ? puzzles.map(() => undefined) : []
            );
            setSections(buildSections(groupItemsByWeek(initialItems)));
            setStats({
                completed: initialItems.filter(i => i.isCompleted).length,
                total: config.totalPuzzleCount,
                currentStreak: calculateStreak(initialItems, config.hasWinLoss),
            });
            setLoadedCount(puzzles.length);
            setLoading(false);

            if (config.getPlayCounts) {
                const identifiers = config.getPlayCountIdentifier
                    ? puzzles.map(p => config.getPlayCountIdentifier!(p))
                    : puzzles.map(p => config.getPuzzleDate(p));
                config.getPlayCounts(identifiers).then(counts => {
                    const items = buildItems(counts);
                    setSections(buildSections(groupItemsByWeek(items)));
                });
            }
        } catch (err) {
            console.error('Failed to load game history:', err);
            setSections([]);
            setStats({ completed: 0, total: config.totalPuzzleCount, currentStreak: 0 });
            setLoadedCount(0);
        } finally {
            setLoading(false);
        }
    }, [user?.id, currentGame, config]);

    const loadMore = useCallback(async () => {
        if (!user || loadingMore || loadedCount >= config.totalPuzzleCount) return;

        setLoadingMore(true);
        try {
            const puzzles = config.getPuzzlesWithOffset(DAYS_PER_BATCH, loadedCount);
            if (puzzles.length === 0) return;

            const gameIds = puzzles.map(p => config.getGameId(user.id, p));
            let gameStatesMap = await StorageManager.getGameStatesBatch(gameIds);
            const missingIds = gameIds.filter(id => !gameStatesMap.has(id));
            if (missingIds.length > 0 && user.id) {
                const loaded = await Promise.all(
                    missingIds.map(id => offlineSyncManager.loadGameState(id, user.id))
                );
                const nextMap = new Map(gameStatesMap);
                loaded.forEach((game, i) => {
                    if (game) nextMap.set(missingIds[i], game);
                });
                gameStatesMap = nextMap;
            }

            const buildItems = (playCounts: (number | undefined)[]) => {
                const items: GameHistoryListItem[] = [];
                for (let i = 0; i < puzzles.length; i++) {
                    const puzzle = puzzles[i];
                    const playCount = config.getPlayCounts ? playCounts[i] : undefined;
                    const gameId = gameIds[i];
                    const gameFromStore = currentGame?.id === gameId ? currentGame : null;
                    const game = gameFromStore ?? gameStatesMap.get(gameId) ?? null;
                    const parsed = config.parseState(game);

                    const date = new Date(config.getPuzzleDate(puzzle) + 'T12:00:00');
                    const today = new Date();
                    const isToday = date.toDateString() === today.toDateString();

                    const sublabel = config.getPlayCounts
                        ? formatSublabel(playCount)
                        : '';

                    const navigateKey = config.gameType === 'connections'
                        ? config.getPuzzleDate(puzzle)
                        : (puzzle as { id: string }).id;

                    items.push({
                        id: puzzle.id,
                        date: config.getPuzzleDate(puzzle),
                        dayNumber: date.getDate(),
                        label: formatPuzzleLabel(config.getPuzzleDate(puzzle)),
                        isToday,
                        isLive: isToday,
                        sublabel,
                        isCompleted: parsed.isCompleted,
                        completionTime: parsed.completionTime,
                        score: parsed.score,
                        isWon: parsed.isWon,
                        navigateKey,
                    });
                }
                return items;
            };

            const newItems = buildItems(config.getPlayCounts ? puzzles.map(() => undefined) : []);
            setSections(prev => {
                const existingItems = prev.flatMap(s => s.data);
                const combined = [...existingItems, ...newItems].sort((a, b) =>
                    b.date.localeCompare(a.date)
                );
                return buildSections(groupItemsByWeek(combined));
            });
            setStats(prev => {
                const existingItems = sections.flatMap(s => s.data);
                const combined = [...existingItems, ...newItems].sort((a, b) =>
                    b.date.localeCompare(a.date)
                );
                return {
                    ...prev,
                    completed: combined.filter(i => i.isCompleted).length,
                    currentStreak: calculateStreak(combined, config.hasWinLoss),
                };
            });
            setLoadedCount(c => c + puzzles.length);

            if (config.getPlayCounts) {
                const identifiers = config.getPlayCountIdentifier
                    ? puzzles.map(p => config.getPlayCountIdentifier!(p))
                    : puzzles.map(p => config.getPuzzleDate(p));
                config.getPlayCounts(identifiers).then(counts => {
                    const itemsWithCounts = buildItems(counts);
                    setSections(prev => {
                        const existingItems = prev.flatMap(s => s.data);
                        const existingIds = new Set(existingItems.map(i => i.id));
                        const newIds = new Set(itemsWithCounts.map(i => i.id));
                        const updatedExisting = existingItems.map(item =>
                            newIds.has(item.id) ? itemsWithCounts.find(n => n.id === item.id)! : item
                        );
                        const added = itemsWithCounts.filter(i => !existingIds.has(i.id));
                        const combined = [...updatedExisting, ...added].sort((a, b) =>
                            b.date.localeCompare(a.date)
                        );
                        return buildSections(groupItemsByWeek(combined));
                    });
                });
            }
        } catch (err) {
            console.error('Failed to load more:', err);
        } finally {
            setLoadingMore(false);
        }
    }, [user?.id, currentGame, config, loadingMore, loadedCount, sections]);

    useEffect(() => {
        load();
    }, [load]);

    return {
        sections,
        stats,
        loading,
        refresh: load,
        hasMore: loadedCount < config.totalPuzzleCount,
        loadMore,
        loadingMore,
    };
}
