import { usePuzzleCarousel } from '@/hooks/usePuzzleCarousel';
import { getTodaysNextGame } from '@/lib/today-puzzles';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'expo-router';

/** Press handler for empty-state "Play" CTAs, or undefined when there's nothing left today. */
export function useTodaysNextGame(): (() => void) | undefined {
    const router = useRouter();
    const { user } = useAuthStore();
    const { items: connections } = usePuzzleCarousel('connections');
    const { items: crossword } = usePuzzleCarousel('crossword');
    const next = getTodaysNextGame(user, { connections, crossword });
    if (!next) return undefined;
    return () => router.push(next.route as never);
}
