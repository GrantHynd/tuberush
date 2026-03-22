import { offlineSyncManager, SyncStatus } from '@/lib/offline-sync-manager';
import { StorageManager } from '@/lib/storage-manager';
import { CrosswordPuzzle, GameState, GameType, ConnectionsState, CrosswordState } from '@/types/game';
import { create } from 'zustand';

interface GameStoreState {
    currentGame: GameState | null;
    gameHistory: GameState[];
    syncStatus: SyncStatus;
    loadGame: (gameId: string, userId: string) => Promise<GameState | null>;
    saveGame: (gameState: GameState) => Promise<void>;
    createNewGame: (userId: string, gameType: GameType, gameId?: string, crosswordPuzzle?: CrosswordPuzzle) => GameState;
    deleteGame: (gameId: string) => Promise<void>;
    syncNow: () => Promise<void>;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
    currentGame: null,
    gameHistory: [],
    syncStatus: { status: 'synced', message: 'All changes synced' },

    loadGame: async (gameId: string, userId: string) => {
        const gameState = await offlineSyncManager.loadGameState(gameId, userId);
        if (gameState) {
            set({ currentGame: gameState });
            return gameState;
        }
        return null;
    },

    saveGame: async (gameState: GameState) => {
        // Optimistic update
        set({ currentGame: gameState });
        await offlineSyncManager.saveGameState(gameState);
    },

    createNewGame: (userId: string, gameType: GameType, gameId?: string, crosswordPuzzle?: CrosswordPuzzle) => {
        const id = gameId || `${gameType}_${userId}_${Date.now()}`;

        let initialState: ConnectionsState | CrosswordState;

        if (gameType === 'connections') {
            initialState = {
                completedGroups: [],
                mistakesRemaining: 4,
                history: [],
                startTime: Date.now(),
                endTime: null,
                status: 'playing',
            };
        } else {
            if (!crosswordPuzzle) {
                throw new Error('createNewGame(crossword): crosswordPuzzle is required');
            }
            const cluesMap = {
                across: Object.fromEntries(crosswordPuzzle.clues.across.map(c => [c.number, c.clue])),
                down: Object.fromEntries(crosswordPuzzle.clues.down.map(c => [c.number, c.clue])),
            };
            initialState = {
                puzzleId: crosswordPuzzle.id,
                grid: crosswordPuzzle.grid,
                clues: cluesMap,
                userAnswers: {},
                completed: false,
            };
        }

        const newGame: GameState = {
            id,
            userId,
            gameType,
            state: initialState,
            lastUpdated: new Date().toISOString(),
            syncStatus: 'pending',
            version: 1,
        };

        set({ currentGame: newGame });
        return newGame;
    },

    deleteGame: async (gameId: string) => {
        await StorageManager.deleteGameState(gameId);
        const { currentGame, gameHistory } = get();
        set({
            gameHistory: gameHistory.filter(g => g.id !== gameId),
            currentGame: currentGame?.id === gameId ? null : currentGame,
        });
    },

    syncNow: async () => {
        await offlineSyncManager.forceSync();
    },
}));

// Subscribe to sync status changes
offlineSyncManager.addSyncListener((status) => {
    useGameStore.setState({ syncStatus: status });
});
