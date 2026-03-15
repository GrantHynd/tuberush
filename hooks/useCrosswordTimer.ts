import type { CrosswordState } from '@/types/game';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

interface UseCrosswordTimerResult {
    /** Elapsed play-time in seconds (excludes paused time) */
    elapsedSeconds: number;
    /** Formatted as M:SS */
    formatted: string;
    /** Whether the timer is actively running */
    isRunning: boolean;
    /** Current accumulated pause in ms (to persist on save) */
    accumulatedPause: number;
}

export function useCrosswordTimer(state: CrosswordState): UseCrosswordTimerResult {
    const { startTime, endTime, completed, accumulatedPause: savedPause = 0 } = state;
    const [now, setNow] = useState(Date.now());
    const [accumulatedPause, setAccumulatedPause] = useState(savedPause);
    const pausedAtRef = useRef<number | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isRunning = !!startTime && !completed && !endTime;

    const startInterval = useCallback(() => {
        if (intervalRef.current) return;
        intervalRef.current = setInterval(() => setNow(Date.now()), 1000);
    }, []);

    const stopInterval = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (isRunning) {
            startInterval();
        } else {
            stopInterval();
        }
        return stopInterval;
    }, [isRunning, startInterval, stopInterval]);

    useEffect(() => {
        setAccumulatedPause(savedPause);
    }, [savedPause]);

    useEffect(() => {
        if (!isRunning) return;

        const handleAppState = (nextState: AppStateStatus) => {
            if (nextState === 'active') {
                if (pausedAtRef.current) {
                    const pauseDuration = Date.now() - pausedAtRef.current;
                    setAccumulatedPause((prev) => prev + pauseDuration);
                    pausedAtRef.current = null;
                }
                startInterval();
            } else {
                pausedAtRef.current = Date.now();
                stopInterval();
            }
        };

        const subscription = AppState.addEventListener('change', handleAppState);
        return () => subscription.remove();
    }, [isRunning, startInterval, stopInterval]);

    let elapsedMs = 0;
    if (startTime) {
        const end = endTime ?? now;
        elapsedMs = Math.max(0, end - startTime - accumulatedPause);
    }
    const elapsedSeconds = Math.floor(elapsedMs / 1000);

    const minutes = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    const formatted = `${minutes}:${secs.toString().padStart(2, '0')}`;

    return { elapsedSeconds, formatted, isRunning, accumulatedPause };
}
