import { usePuzzleCarousel } from '@/hooks/usePuzzleCarousel';
import { getTodaysNextGame, type TodayGameType } from '@/lib/today-puzzles';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'expo-router';

/** Press handler for empty-state "Play" CTAs, or undefined when there's nothing left today. */
export function useTodaysNextGame(only?: TodayGameType): (() => void) | undefined {
    const router = useRouter();
    const { user } = useAuthStore();
    const { items: connections } = usePuzzleCarousel('connections');
    const { items: crossword } = usePuzzleCarousel('crossword');
    const next = getTodaysNextGame(user, { connections, crossword }, new Date(), only);
    if (!next) return undefined;
    return () => router.push(next.route as never);
}
