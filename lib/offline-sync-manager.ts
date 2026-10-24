import type { GameState, SyncOperation } from '@/types/game';
import NetInfo from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';
import { mergeGameStates } from './game-merge';
import { StorageManager } from './storage-manager';
import { supabase } from './supabase-client';

/** Backoff: 2s, 4s, 8s ... capped at 5 min. */
export const BACKOFF_BASE_MS = 2000;
export const BACKOFF_MAX_MS = 5 * 60 * 1000;
export function backoffDelay(retryCount: number): number {
    return Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, retryCount - 1));
}

/** Errors the server will keep returning (RLS, constraint, bad request): dead-letter, don't retry. */
export function isPermanentSyncError(error: unknown): boolean {
    const e = error as { code?: string; status?: number } | null;
    if (!e) return false;
    if (typeof e.status === 'number' && e.status >= 400 && e.status < 500 && e.status !== 408 && e.status !== 429) return true;
    const code = e.code ?? '';
    return code === '42501' || /^2[23]\d{3}$/.test(code) || code === 'PGRST301';
}

function rowToGameState(row: any): GameState {
    return {
        id: row.id,
        userId: row.user_id,
        gameType: row.game_type,
        state: row.state,
        lastUpdated: row.last_updated,
        syncStatus: 'synced',
        version: row.version,
    };
}

class OfflineSyncManager {
    private isOnline: boolean = false;
    private isSyncing: boolean = false;
    private syncListeners: ((status: SyncStatus) => void)[] = [];
    private unsubscribeNetworkListener: (() => void) | null = null;
    private appStateSub: { remove: () => void } | null = null;
    private retryTimer: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        this.initializeNetworkListener();
    }

    /**
     * Remove the NetInfo listener. Call this when the manager is no longer needed.
     */
    destroy() {
        this.unsubscribeNetworkListener?.();
        this.unsubscribeNetworkListener = null;
        this.appStateSub?.remove();
        this.appStateSub = null;
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.retryTimer = null;
    }

    /**
     * Initialize network status listener
     */
    private initializeNetworkListener() {
        this.unsubscribeNetworkListener = NetInfo.addEventListener(state => {
            const wasOffline = !this.isOnline;
            this.isOnline = state.isConnected ?? false;

            // If we just came online, trigger sync
            if (wasOffline && this.isOnline) {
                this.notifyListeners({ status: 'syncing', message: 'Connection restored, syncing...' });
                this.syncPendingOperations();
            } else if (!this.isOnline) {
                this.notifyListeners({ status: 'offline', message: 'Offline mode' });
            }
        });
        this.appStateSub = AppState.addEventListener('change', (s: AppStateStatus) => {
            if (s === 'active' && this.isOnline) this.syncPendingOperations();
        });
    }


    /**
     * Get current network status
     */
    getNetworkStatus(): boolean {
        return this.isOnline;
    }

    /**
     * Add sync status listener
     */
    addSyncListener(listener: (status: SyncStatus) => void) {
        this.syncListeners.push(listener);
    }

    /**
     * Remove sync status listener
     */
    removeSyncListener(listener: (status: SyncStatus) => void) {
        this.syncListeners = this.syncListeners.filter(l => l !== listener);
    }

    /**
     * Notify all listeners of sync status change
     */
    private notifyListeners(status: SyncStatus) {
        this.syncListeners.forEach(listener => listener(status));
    }

    /**
     * Save game state with optimistic update
     */
    async saveGameState(gameState: GameState): Promise<void> {
        // Save locally first (optimistic update)
        await StorageManager.saveGameState(gameState.id, gameState);

        if (this.isOnline) {
            try {
                // Try to sync immediately if online
                const { error } = await supabase
                    .from('game_states')
                    .upsert({
                        id: gameState.id,
                        user_id: gameState.userId,
                        game_type: gameState.gameType,
                        state: gameState.state,
                        last_updated: gameState.lastUpdated,
                        version: gameState.version,
                    });

                if (error) {
                    throw error;
                }

                // Mark as synced
                gameState.syncStatus = 'synced';
                await StorageManager.saveGameState(gameState.id, gameState);
            } catch (error) {
                console.error('Failed to sync game state:', error);
                await this.queueSyncOperation(gameState);
            }
        } else {
            // Queue for later sync if offline
            await this.queueSyncOperation(gameState);
        }
    }

    /**
     * Queue a sync operation for later. One op per game (id = game id); a newer snapshot replaces
     * the queued one.
     */
    private async queueSyncOperation(gameState: GameState): Promise<void> {
        const operation: SyncOperation = {
            id: gameState.id,
            type: 'update',
            entity: 'game_state',
            data: { ...gameState, syncStatus: 'pending' },
            timestamp: new Date().toISOString(),
            retryCount: 0,
        };

        const pendingCount = await StorageManager.addToSyncQueue(operation);

        // Update game state sync status
        gameState.syncStatus = 'pending';
        await StorageManager.saveGameState(gameState.id, gameState);

        this.notifyListeners({
            status: 'pending',
            message: `${pendingCount} change${pendingCount !== 1 ? 's' : ''} pending`,
        });
    }

    private scheduleRetry(queue: SyncOperation[]) {
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.retryTimer = null;
        const next = queue.map(op => op.nextAttemptAt ?? 0).filter(t => t > Date.now());
        if (next.length === 0) return;
        const delay = Math.max(0, Math.min(...next) - Date.now());
        this.retryTimer = setTimeout(() => {
            this.retryTimer = null;
            this.syncPendingOperations();
        }, delay);
    }

    /**
     * Sync all due operations. Loops until nothing due is left, so ops queued mid-sync are
     * picked up. Failed ops get a persisted retry count and exponential backoff; ops the
     * server rejects permanently go to the dead-letter list.
     */
    async syncPendingOperations(): Promise<void> {
        if (this.isSyncing || !this.isOnline) {
            return;
        }

        this.isSyncing = true;
        let failedCount = 0;
        let deadCount = 0;
        const attempted = new Set<string>();
        try {
            for (;;) {
                const queue = await StorageManager.getSyncQueue();
                const now = Date.now();
                const due = queue.filter(op => (op.nextAttemptAt ?? 0) <= now && !attempted.has(`${op.id}@${op.timestamp}`));
                if (due.length === 0) {
                    this.scheduleRetry(queue);
                    break;
                }
                this.notifyListeners({ status: 'syncing', message: `Syncing ${queue.length} changes...` });

                for (const operation of due) {
                    attempted.add(`${operation.id}@${operation.timestamp}`);
                    try {
                        await this.processSyncOperation(operation);
                        await StorageManager.removeFromSyncQueueBatch([operation.id], { [operation.id]: operation.timestamp });
                    } catch (error) {
                        console.error('Failed to process sync operation:', error);
                        if (isPermanentSyncError(error)) {
                            const e = error as { code?: string; message?: string; status?: number };
                            await StorageManager.moveToDeadLetter(operation, { code: e.code, message: e.message, status: e.status });
                            deadCount += 1;
                        } else {
                            const retryCount = operation.retryCount + 1;
                            await StorageManager.updateSyncOperation(operation.id, operation.timestamp, {
                                retryCount,
                                nextAttemptAt: Date.now() + backoffDelay(retryCount),
                                lastError: (error as Error)?.message ?? String(error),
                            });
                            failedCount += 1;
                        }
                    }
                }
            }
            await StorageManager.updateLastSyncTimestamp();
        } finally {
            this.isSyncing = false;
        }

        if (deadCount > 0) {
            this.notifyListeners({
                status: 'error',
                message: `${deadCount} change${deadCount > 1 ? 's' : ''} could not be synced`,
            });
        } else if (failedCount > 0) {
            const pending = (await StorageManager.getSyncQueue()).length;
            this.notifyListeners({ status: 'pending', message: `${pending} change${pending !== 1 ? 's' : ''} pending, retrying` });
        } else {
            this.notifyListeners({ status: 'synced', message: 'All changes synced' });
        }
    }

    /**
     * Process a single sync operation: merge the queued snapshot with the server copy by game
     * rules, write the merge to the server, then merge it into the *current* local state
     * (never write the queued snapshot back over newer local progress).
     */
    private async processSyncOperation(operation: SyncOperation): Promise<void> {
        const queued = operation.data as GameState;

        const { data: serverData, error: fetchError } = await supabase
            .from('game_states')
            .select('*')
            .eq('id', queued.id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }

        const merged = serverData ? mergeGameStates(queued, rowToGameState(serverData)) : { ...queued };
        const nextVersion = Math.max(queued.version ?? 0, serverData?.version ?? 0) + 1;

        const { error } = await supabase
            .from('game_states')
            .upsert({
                id: queued.id,
                user_id: queued.userId,
                game_type: queued.gameType,
                state: merged.state,
                last_updated: merged.lastUpdated,
                version: nextVersion,
            });

        if (error) {
            throw error;
        }

        const current = (await StorageManager.getGameState(queued.id)) as GameState | null;
        const synced: GameState = { ...merged, version: nextVersion, syncStatus: 'synced' };
        if (!current) {
            await StorageManager.saveGameState(queued.id, synced);
            return;
        }
        const local = mergeGameStates(current, synced);
        // If local moved on since this snapshot was queued, its own queued op will sync it.
        const unchanged = current.lastUpdated === queued.lastUpdated;
        await StorageManager.saveGameState(queued.id, {
            ...local,
            version: nextVersion,
            syncStatus: unchanged ? 'synced' : current.syncStatus,
        });
    }

    /**
     * Load game state (local-first approach)
     */
    async loadGameState(gameId: string, userId: string): Promise<GameState | null> {
        // Try local first
        let gameState = await StorageManager.getGameState(gameId);

        // If online and not found locally, try server
        if (!gameState && this.isOnline) {
            try {
                const { data, error } = await supabase
                    .from('game_states')
                    .select('*')
                    .eq('id', gameId)
                    .eq('user_id', userId)
                    .single();

                if (data && !error) {
                    gameState = rowToGameState(data);

                    // Cache locally
                    await StorageManager.saveGameState(gameId, gameState);
                }
            } catch (error) {
                console.error('Error loading from server:', error);
            }
        }

        return gameState;
    }

    /**
     * Get count of pending operations
     */
    async getDeadLetterCount(): Promise<number> {
        return (await StorageManager.getDeadLetter()).length;
    }

    async getPendingOperationsCount(): Promise<number> {
        const queue = await StorageManager.getSyncQueue();
        return queue.length;
    }

    /**
     * Force sync now
     */
    async forceSync(): Promise<void> {
        if (this.isOnline) {
            await this.syncPendingOperations();
        }
    }
}

export interface SyncStatus {
    status: 'online' | 'offline' | 'syncing' | 'synced' | 'pending' | 'error';
    message: string;
}

export const offlineSyncManager = new OfflineSyncManager();
