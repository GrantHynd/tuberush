import type { GameState, SyncOperation } from '@/types/game';
import NetInfo from '@react-native-community/netinfo';
import { StorageManager } from './storage-manager';
import { supabase } from './supabase-client';

class OfflineSyncManager {
    private isOnline: boolean = false;
    private isSyncing: boolean = false;
    private syncListeners: Array<(status: SyncStatus) => void> = [];

    constructor() {
        this.initializeNetworkListener();
    }

    /**
     * Initialize network status listener
     */
    private initializeNetworkListener() {
        NetInfo.addEventListener(state => {
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
     * Queue a sync operation for later
     */
    private async queueSyncOperation(gameState: GameState): Promise<void> {
        const operation: SyncOperation = {
            id: `${gameState.id}_${Date.now()}`,
            type: 'update',
            entity: 'game_state',
            data: gameState,
            timestamp: new Date().toISOString(),
            retryCount: 0,
        };

        await StorageManager.addToSyncQueue(operation);

        // Update game state sync status
        gameState.syncStatus = 'pending';
        await StorageManager.saveGameState(gameState.id, gameState);

        this.notifyListeners({
            status: 'pending',
            message: `${await this.getPendingOperationsCount()} changes pending`,
        });
    }

    /**
     * Sync all pending operations
     */
    async syncPendingOperations(): Promise<void> {
        if (this.isSyncing || !this.isOnline) {
            return;
        }

        this.isSyncing = true;
        const queue = await StorageManager.getSyncQueue();

        if (queue.length === 0) {
            this.isSyncing = false;
            this.notifyListeners({ status: 'synced', message: 'All changes synced' });
            return;
        }

        this.notifyListeners({ status: 'syncing', message: `Syncing ${queue.length} changes...` });

        const operationsToRemove: string[] = [];

        for (const operation of queue) {
            try {
                await this.processSyncOperation(operation);
                operationsToRemove.push(operation.id);
            } catch (error) {
                console.error('Failed to process sync operation:', error);
                // Increment retry count
                operation.retryCount += 1;

                // If too many retries, skip for now
                if (operation.retryCount > 3) {
                    console.error('Operation failed after 3 retries, removing from queue:', operation);
                    operationsToRemove.push(operation.id);
                }
            }
        }

        if (operationsToRemove.length > 0) {
            await StorageManager.removeFromSyncQueueBatch(operationsToRemove);
        }

        await StorageManager.updateLastSyncTimestamp();
        this.isSyncing = false;
        this.notifyListeners({ status: 'synced', message: 'All changes synced' });
    }

    /**
     * Process a single sync operation
     */
    private async processSyncOperation(operation: SyncOperation): Promise<void> {
        const gameState = operation.data as GameState;

        // Fetch current server version
        const { data: serverData, error: fetchError } = await supabase
            .from('game_states')
            .select('*')
            .eq('id', gameState.id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }

        // Check for conflicts
        if (serverData && serverData.version > gameState.version) {
            // Server has newer version - conflict!
            await this.handleConflict(gameState, serverData);
            return;
        }

        // No conflict, proceed with upsert
        const { error } = await supabase
            .from('game_states')
            .upsert({
                id: gameState.id,
                user_id: gameState.userId,
                game_type: gameState.gameType,
                state: gameState.state,
                last_updated: new Date().toISOString(),
                version: gameState.version + 1,
            });

        if (error) {
            throw error;
        }

        // Update local version
        gameState.version += 1;
        gameState.syncStatus = 'synced';
        await StorageManager.saveGameState(gameState.id, gameState);
    }

    /**
     * Handle sync conflicts (last-write-wins strategy)
     */
    private async handleConflict(localState: GameState, serverState: any): Promise<void> {
        const localTimestamp = new Date(localState.lastUpdated).getTime();
        const serverTimestamp = new Date(serverState.last_updated).getTime();

        if (localTimestamp > serverTimestamp) {
            // Local is newer, force update server
            const { error } = await supabase
                .from('game_states')
                .update({
                    state: localState.state,
                    last_updated: localState.lastUpdated,
                    version: serverState.version + 1,
                })
                .eq('id', localState.id);

            if (error) {
                throw error;
            }

            localState.version = serverState.version + 1;
            localState.syncStatus = 'synced';
        } else {
            // Server is newer, update local
            localState.state = serverState.state;
            localState.version = serverState.version;
            localState.lastUpdated = serverState.last_updated;
            localState.syncStatus = 'synced';
        }

        await StorageManager.saveGameState(localState.id, localState);
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
                    gameState = {
                        id: data.id,
                        userId: data.user_id,
                        gameType: data.game_type,
                        state: data.state,
                        lastUpdated: data.last_updated,
                        syncStatus: 'synced',
                        version: data.version,
                    };

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
