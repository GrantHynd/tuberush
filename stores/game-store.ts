import { offlineSyncManager, type SyncStatus } from '@/lib/offline-sync-manager';
import type { GameState, GameType } from '@/types/game';
import { create } from 'zustand';

interface GameStoreState {
    currentGame: GameState | null;
    gameHistory: GameState[];
    syncStatus: SyncStatus;
    loadGame: (gameId: string, userId: string) => Promise<void>;
    saveGame: (gameState: GameState) => Promise<void>;
    createNewGame: (userId: string, gameType: GameType) => GameState;
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
        }
    },

    saveGame: async (gameState: GameState) => {
        await offlineSyncManager.saveGameState(gameState);
        set({ currentGame: gameState });
    },

    createNewGame: (userId: string, gameType: GameType) => {
        const gameId = `${gameType}_${userId}_${Date.now()}`;

        let initialState: any;
        if (gameType === 'tictactoe') {
            initialState = {
                board: Array(9).fill(null),
                currentPlayer: 'X',
                winner: null,
                isDraw: false,
                moveHistory: [],
            };
        } else {
            // Crossword - will be populated with actual puzzle data
            initialState = {
                grid: [],
                clues: { across: {}, down: {} },
                userAnswers: {},
                completed: false,
            };
        }

        const newGame: GameState = {
            id: gameId,
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
        // Implementation for deleting games
        const history = get().gameHistory.filter(g => g.id !== gameId);
        set({ gameHistory: history });
    },

    syncNow: async () => {
        await offlineSyncManager.forceSync();
    },
}));

// Subscribe to sync status changes
offlineSyncManager.addSyncListener((status) => {
    useGameStore.setState({ syncStatus: status });
});
