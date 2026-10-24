import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';
import type { Borough } from '@/constants/Boroughs';
import type { GameType } from '@/types/game';
import { leaderboard, shouldReplaceScore, type GameResult } from './leaderboard';

/**
 * Durable outbox for leaderboard submissions (offline-sync audit risks 1 & 2; TUB-237).
 *
 * Every finished game is written here first, then drained. Entries survive app kills and are
 * retried on NetInfo reconnect, AppState foreground and at launch. One entry per
 * user + game type + puzzle date: a better result replaces a worse one before it is sent,
 * and the server write is itself idempotent (see leaderboard.submitScore).
 */
export const SCORE_OUTBOX_KEY = 'score_outbox_v1';

export interface ScoreSubmission {
    /** Client-generated id, stable across retries. */
    submissionId: string;
    userId: string;
    city: string;
    borough: Borough | null;
    score: number;
    gameType: GameType;
    /** The puzzle's date (YYYY-MM-DD), never the submission date. */
    gameDate: string;
    result: GameResult;
    mistakes: number | null;
    createdAt: string;
    attempts: number;
}

export type NewScoreSubmission = Omit<ScoreSubmission, 'submissionId' | 'createdAt' | 'attempts' | 'result' | 'mistakes'> & {
    result?: GameResult;
    mistakes?: number | null;
};

/** Entries the server keeps rejecting are dropped after this many attempts. */
export const MAX_SCORE_ATTEMPTS = 8;

function dedupeKey(s: Pick<ScoreSubmission, 'userId' | 'gameType' | 'gameDate'>): string {
    return `${s.userId}|${s.gameType}|${s.gameDate}`;
}

function newSubmissionId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 4xx-style rejections (RLS, CHECK, bad payload) will never succeed on retry. */
export function isPermanentError(error: unknown): boolean {
    const e = error as { code?: string; status?: number } | null;
    if (!e) return false;
    if (typeof e.status === 'number') return e.status >= 400 && e.status < 500 && e.status !== 408 && e.status !== 429;
    const code = e.code ?? '';
    // 42501 insufficient_privilege (RLS), 23xxx integrity violations, 22xxx data exceptions.
    return code === '42501' || /^2[23]\d{3}$/.test(code);
}

let chain: Promise<unknown> = Promise.resolve();
/** Serialise every read-modify-write of the outbox. */
function withLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = chain.then(fn, fn);
    chain = run.catch(() => undefined);
    return run;
}

async function read(): Promise<ScoreSubmission[]> {
    try {
        const raw = await AsyncStorage.getItem(SCORE_OUTBOX_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

async function write(entries: ScoreSubmission[]): Promise<void> {
    await AsyncStorage.setItem(SCORE_OUTBOX_KEY, JSON.stringify(entries));
}

let draining: Promise<void> | null = null;

export const scoreOutbox = {
    getPending(): Promise<ScoreSubmission[]> {
        return withLock(read);
    },

    /** Persist a submission. Keeps only the best result per user/game/puzzle date. */
    enqueue(input: NewScoreSubmission): Promise<ScoreSubmission | null> {
        return withLock(async () => {
            const entry: ScoreSubmission = {
                ...input,
                result: input.result ?? 'won',
                mistakes: input.mistakes ?? null,
                submissionId: newSubmissionId(),
                createdAt: new Date().toISOString(),
                attempts: 0,
            };
            const entries = await read();
            const idx = entries.findIndex((e) => dedupeKey(e) === dedupeKey(entry));
            if (idx >= 0) {
                if (!shouldReplaceScore(entries[idx], entry)) return null;
                entries[idx] = entry;
            } else {
                entries.push(entry);
            }
            await write(entries);
            return entry;
        });
    },

    /** Send every pending entry. Concurrent calls share one drain. */
    drain(): Promise<void> {
        if (draining) return draining;
        draining = (async () => {
            try {
                const pending = await withLock(read);
                for (const entry of pending) {
                    let outcome: 'sent' | 'retry' | 'drop';
                    try {
                        await leaderboard.submitScore(entry.userId, entry.city, entry.borough, entry.score, entry.gameType, {
                            result: entry.result,
                            mistakes: entry.mistakes,
                            gameDate: entry.gameDate,
                        });
                        outcome = 'sent';
                    } catch (error) {
                        outcome = isPermanentError(error) || entry.attempts + 1 >= MAX_SCORE_ATTEMPTS ? 'drop' : 'retry';
                        if (outcome === 'drop') console.error('Dropping score submission', entry, error);
                    }
                    await withLock(async () => {
                        const entries = await read();
                        const idx = entries.findIndex((e) => e.submissionId === entry.submissionId);
                        if (idx < 0) return; // replaced by a better result meanwhile; keep the new one
                        if (outcome === 'retry') entries[idx] = { ...entries[idx], attempts: entries[idx].attempts + 1 };
                        else entries.splice(idx, 1);
                        await write(entries);
                    });
                    if (outcome === 'retry') break; // probably offline; wait for the next trigger
                }
            } finally {
                draining = null;
            }
        })();
        return draining;
    },

    /** Enqueue then try to send straight away. Never throws. */
    async submit(input: NewScoreSubmission): Promise<void> {
        try {
            await scoreOutbox.enqueue(input);
            await scoreOutbox.drain();
        } catch (error) {
            console.error('Failed to queue score', error);
        }
    },
};

/** Drain at launch, on reconnect and when the app returns to the foreground. Returns an unsubscribe. */
export function startScoreOutbox(): () => void {
    let online = false;
    const kick = () => {
        scoreOutbox.drain().catch(() => {});
    };
    const unsubNet = NetInfo.addEventListener((state) => {
        const nowOnline = state.isConnected ?? false;
        if (nowOnline && !online) kick();
        online = nowOnline;
    });
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
        if (s === 'active') kick();
    });
    kick();
    return () => {
        unsubNet();
        sub.remove();
    };
}

/** Test-only: reset module state. */
export function __resetScoreOutboxForTests(): void {
    chain = Promise.resolve();
    draining = null;
}
