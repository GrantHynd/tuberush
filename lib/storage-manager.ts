import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SyncOperation } from '@/types/game';

const STORAGE_KEYS = {
    GAME_STATE: 'game_state_',
    SYNC_QUEUE: 'sync_queue',
    USER_PREFERENCES: 'user_preferences',
    LAST_SYNC: 'last_sync_timestamp',
    DEAD_LETTER: 'sync_dead_letter',
} as const;

/** A queued op that the server rejected permanently (4xx / RLS). Kept for inspection, never retried. */
export interface DeadLetterEntry {
    operation: SyncOperation;
    error: { code?: string; message?: string; status?: number };
    failedAt: string;
}

let queueChain: Promise<unknown> = Promise.resolve();
/** Serialise every read-modify-write of the sync queue and dead-letter list (audit risk 5). */
export function withQueueLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = queueChain.then(fn, fn);
    queueChain = run.catch(() => undefined);
    return run;
}

/** Test-only. */
export function __resetQueueLockForTests(): void {
    queueChain = Promise.resolve();
}

export class StorageManager {
    /**
     * Save game state to local storage
     */
    static async saveGameState(gameId: string, state: any): Promise<void> {
        try {
            const key = `${STORAGE_KEYS.GAME_STATE}${gameId}`;
            await AsyncStorage.setItem(key, JSON.stringify(state));
        } catch (error) {
            console.error('Error saving game state:', error);
            throw error;
        }
    }

    /**
     * Get game state from local storage
     */
    static async getGameState(gameId: string): Promise<any | null> {
        try {
            const key = `${STORAGE_KEYS.GAME_STATE}${gameId}`;
            const data = await AsyncStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error getting game state:', error);
            return null;
        }
    }

    /**
     * Get multiple game states in a single batch (uses multiGet for performance)
     */
    static async getGameStatesBatch(gameIds: string[]): Promise<Map<string, any>> {
        if (gameIds.length === 0) return new Map();
        try {
            const keys = gameIds.map(id => `${STORAGE_KEYS.GAME_STATE}${id}`);
            const pairs = await AsyncStorage.multiGet(keys);
            const result = new Map<string, any>();
            pairs.forEach(([key, value], i) => {
                const gameId = gameIds[i];
                if (value) {
                    try {
                        result.set(gameId, JSON.parse(value));
                    } catch {
                        // ignore parse errors
                    }
                }
            });
            return result;
        } catch (error) {
            console.error('Error batch loading game states:', error);
            return new Map();
        }
    }

    /**
     * Get all game states
     */
    static async getAllGameStates(): Promise<any[]> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const gameKeys = keys.filter(key => key.startsWith(STORAGE_KEYS.GAME_STATE));
            const states = await AsyncStorage.multiGet(gameKeys);
            return states
                .map(([_, value]) => value ? JSON.parse(value) : null)
                .filter(state => state !== null);
        } catch (error) {
            console.error('Error getting all game states:', error);
            return [];
        }
    }

    /**
     * Delete game state
     */
    static async deleteGameState(gameId: string): Promise<void> {
        try {
            const key = `${STORAGE_KEYS.GAME_STATE}${gameId}`;
            await AsyncStorage.removeItem(key);
        } catch (error) {
            console.error('Error deleting game state:', error);
            throw error;
        }
    }

    private static async readQueue(): Promise<SyncOperation[]> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
            const parsed = data ? JSON.parse(data) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('Error getting sync queue:', error);
            return [];
        }
    }

    private static async writeQueue(queue: SyncOperation[]): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    }

    /**
     * Queue a game snapshot. There is at most one op per game: a newer snapshot replaces the
     * queued one (it already contains the earlier progress) and resets its retry schedule.
     * Returns the new queue length.
     */
    static addToSyncQueue(operation: SyncOperation): Promise<number> {
        return withQueueLock(async () => {
            try {
                const queue = await this.readQueue();
                const gameId = operation.data?.id;
                const idx = gameId ? queue.findIndex(op => op.data?.id === gameId) : -1;
                if (idx >= 0) queue[idx] = operation;
                else queue.push(operation);
                await this.writeQueue(queue);
                return queue.length;
            } catch (error) {
                console.error('Error adding to sync queue:', error);
                throw error;
            }
        });
    }

    /**
     * Get sync queue
     */
    static getSyncQueue(): Promise<SyncOperation[]> {
        return withQueueLock(() => this.readQueue());
    }

    /**
     * Clear sync queue
     */
    static clearSyncQueue(): Promise<void> {
        return withQueueLock(async () => {
            try {
                await this.writeQueue([]);
            } catch (error) {
                console.error('Error clearing sync queue:', error);
                throw error;
            }
        });
    }

    /**
     * Remove specific operation from sync queue
     */
    static async removeFromSyncQueue(operationId: string): Promise<void> {
        await this.removeFromSyncQueueBatch([operationId]);
    }

    /**
     * Remove ops by id. If `onlyIfTimestamp` is given, an op is kept when it was replaced by a
     * newer snapshot (different timestamp) after it was read, so progress made mid-sync isn't lost.
     */
    static removeFromSyncQueueBatch(operationIds: string[], onlyIfTimestamp?: Record<string, string>): Promise<void> {
        return withQueueLock(async () => {
            try {
                const queue = await this.readQueue();
                const idSet = new Set(operationIds);
                const filtered = queue.filter(op => {
                    if (!idSet.has(op.id)) return true;
                    const ts = onlyIfTimestamp?.[op.id];
                    return ts !== undefined && ts !== op.timestamp;
                });
                await this.writeQueue(filtered);
            } catch (error) {
                console.error('Error removing from sync queue batch:', error);
                throw error;
            }
        });
    }

    /** Persist retry bookkeeping for an op, unless it has since been replaced by a newer snapshot. */
    static updateSyncOperation(
        operationId: string,
        expectedTimestamp: string,
        patch: Pick<SyncOperation, 'retryCount' | 'nextAttemptAt' | 'lastError'>,
    ): Promise<void> {
        return withQueueLock(async () => {
            const queue = await this.readQueue();
            const idx = queue.findIndex(op => op.id === operationId && op.timestamp === expectedTimestamp);
            if (idx < 0) return;
            queue[idx] = { ...queue[idx], ...patch };
            await this.writeQueue(queue);
        });
    }

    /** Move an op to the dead-letter list and out of the queue (atomically). */
    static moveToDeadLetter(operation: SyncOperation, error: DeadLetterEntry['error']): Promise<void> {
        return withQueueLock(async () => {
            const queue = await this.readQueue();
            await this.writeQueue(queue.filter(op => !(op.id === operation.id && op.timestamp === operation.timestamp)));
            const dead = await this.readDeadLetter();
            dead.push({ operation, error, failedAt: new Date().toISOString() });
            await AsyncStorage.setItem(STORAGE_KEYS.DEAD_LETTER, JSON.stringify(dead.slice(-50)));
        });
    }

    private static async readDeadLetter(): Promise<DeadLetterEntry[]> {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEYS.DEAD_LETTER);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    static getDeadLetter(): Promise<DeadLetterEntry[]> {
        return withQueueLock(() => this.readDeadLetter());
    }

    /**
     * Save user preferences
     */
    static async saveUserPreferences(preferences: any): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferences));
        } catch (error) {
            console.error('Error saving user preferences:', error);
            throw error;
        }
    }

    /**
     * Get user preferences
     */
    static async getUserPreferences(): Promise<any> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error getting user preferences:', error);
            return {};
        }
    }

    /**
     * Update last sync timestamp
     */
    static async updateLastSyncTimestamp(): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
        } catch (error) {
            console.error('Error updating last sync timestamp:', error);
            throw error;
        }
    }

    /**
     * Drop this device's copy of the signed-in player's games and pending uploads.
     * Called after the server account is deleted so a later signup cannot sync them back.
     */
    static async clearLocalAccountData(): Promise<void> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const gameKeys = keys.filter((key) => key.startsWith(STORAGE_KEYS.GAME_STATE));
            const toRemove = [...gameKeys, STORAGE_KEYS.SYNC_QUEUE, STORAGE_KEYS.LAST_SYNC, STORAGE_KEYS.DEAD_LETTER];
            if (toRemove.length > 0) {
                await AsyncStorage.multiRemove(toRemove);
            }
        } catch (error) {
            console.error('Error clearing local account data:', error);
            throw error;
        }
    }

    /**
     * Get last sync timestamp
     */
    static async getLastSyncTimestamp(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
        } catch (error) {
            console.error('Error getting last sync timestamp:', error);
            return null;
        }
    }
}
