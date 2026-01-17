import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
    GAME_STATE: 'game_state_',
    SYNC_QUEUE: 'sync_queue',
    USER_PREFERENCES: 'user_preferences',
    LAST_SYNC: 'last_sync_timestamp',
} as const;

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

    /**
     * Add operation to sync queue
     */
    static async addToSyncQueue(operation: any): Promise<void> {
        try {
            const queue = await this.getSyncQueue();
            queue.push(operation);
            await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
        } catch (error) {
            console.error('Error adding to sync queue:', error);
            throw error;
        }
    }

    /**
     * Get sync queue
     */
    static async getSyncQueue(): Promise<any[]> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error getting sync queue:', error);
            return [];
        }
    }

    /**
     * Clear sync queue
     */
    static async clearSyncQueue(): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify([]));
        } catch (error) {
            console.error('Error clearing sync queue:', error);
            throw error;
        }
    }

    /**
     * Remove specific operation from sync queue
     */
    static async removeFromSyncQueue(operationId: string): Promise<void> {
        try {
            const queue = await this.getSyncQueue();
            const filtered = queue.filter(op => op.id !== operationId);
            await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(filtered));
        } catch (error) {
            console.error('Error removing from sync queue:', error);
            throw error;
        }
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
