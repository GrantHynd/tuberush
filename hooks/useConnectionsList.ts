import { getRecentPuzzles as getConnectionsRecent } from '@/constants/ConnectionsData';
import { offlineSyncManager } from '@/lib/offline-sync-manager';
import { useAuthStore } from '@/stores/auth-store';
import type { ConnectionsState } from '@/types/game';
import { useCallback, useEffect, useState } from 'react';

interface ConnectionsListItem {
    id: string;
    date: string;
    dayNumber: number;
    label: string;
    isToday: boolean;
    isLive: boolean;
    puzzleNumber: string;
    commuteCount: string;
    isCompleted: boolean;
    completionTime?: string;
    score?: string;
    isWon?: boolean;
}

interface ConnectionsListSection {
    title: string;
    data: ConnectionsListItem[];
}

interface ConnectionsStats {
    completed: number;
    total: number;
    currentStreak: number;
}

function formatPuzzleLabel(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00');
    const today = new Date();
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

function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
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

function calculateStreak(items: ConnectionsListItem[]): number {
    let streak = 0;
    const sortedItems = [...items].sort((a, b) => b.date.localeCompare(a.date));
    
    for (const item of sortedItems) {
        if (item.isCompleted && item.isWon) {
            streak++;
        } else {
            break;
        }
    }
    
    return streak;
}

export function useConnectionsList() {
    const user = useAuthStore(state => state.user);
    const [sections, setSections] = useState<ConnectionsListSection[]>([]);
    const [stats, setStats] = useState<ConnectionsStats>({ completed: 0, total: 30, currentStreak: 0 });
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!user) {
            setSections([]);
            setStats({ completed: 0, total: 30, currentStreak: 0 });
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const puzzles = getConnectionsRecent(30);
            const items: ConnectionsListItem[] = [];

            for (const puzzle of puzzles) {
                const gameId = `connections_${user.id}_${puzzle.date}`;
                const game = await offlineSyncManager.loadGameState(gameId, user.id);
                const state = game?.state as ConnectionsState | undefined;
                
                const isCompleted = state?.status === 'won' || state?.status === 'lost';
                const isWon = state?.status === 'won';
                const commuteCount = state?.history?.length || 0;

                const date = new Date(puzzle.date + 'T12:00:00');
                const today = new Date();
                const isToday = date.toDateString() === today.toDateString();

                let completionTime: string | undefined;
                let score: string | undefined;

                if (isCompleted && state?.startTime && state?.endTime) {
                    const duration = Math.floor((state.endTime - state.startTime) / 1000);
                    completionTime = formatTime(duration);
                    score = `${state.mistakesRemaining}/4`;
                }

                items.push({
                    id: puzzle.id,
                    date: puzzle.date,
                    dayNumber: date.getDate(),
                    label: formatPuzzleLabel(puzzle.date),
                    isToday,
                    isLive: isToday,
                    puzzleNumber: `Puzzle #${puzzle.id}`,
                    commuteCount: isCompleted 
                        ? `${commuteCount} commutes` 
                        : commuteCount > 0 
                            ? `${commuteCount} commutes in progress`
                            : '0 commutes',
                    isCompleted,
                    completionTime,
                    score,
                    isWon,
                });
            }

            const grouped = new Map<string, ConnectionsListItem[]>();
            for (const item of items) {
                const date = new Date(item.date + 'T12:00:00');
                const weekLabel = getWeekLabel(date);
                
                if (!grouped.has(weekLabel)) {
                    grouped.set(weekLabel, []);
                }
                grouped.get(weekLabel)!.push(item);
            }

            const weekOrder = ['THIS WEEK', 'LAST WEEK', '2 WEEKS AGO', '3 WEEKS AGO', '4 WEEKS AGO'];
            const sectionsData: ConnectionsListSection[] = weekOrder
                .filter(week => grouped.has(week))
                .map(week => ({
                    title: week,
                    data: grouped.get(week)!,
                }));

            setSections(sectionsData);

            const completedCount = items.filter(item => item.isCompleted && item.isWon).length;
            const currentStreak = calculateStreak(items);
            
            setStats({
                completed: completedCount,
                total: 30,
                currentStreak,
            });
        } catch (err) {
            console.error('Failed to load connections list:', err);
            setSections([]);
            setStats({ completed: 0, total: 30, currentStreak: 0 });
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        load();
    }, [load]);

    return { sections, stats, loading, refresh: load };
}
