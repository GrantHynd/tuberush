export type GameType = 'tictactoe' | 'crossword';

export interface User {
    id: string;
    email: string;
    isPremium: boolean;
    subscriptionId?: string;
    subscriptionStatus?: 'active' | 'canceled' | 'past_due';
}

export interface TicTacToeState {
    board: (string | null)[];
    currentPlayer: 'X' | 'O';
    winner: string | null;
    isDraw: boolean;
    moveHistory: number[];
}

export interface CrosswordState {
    grid: CrosswordCell[][];
    clues: {
        across: { [key: number]: string };
        down: { [key: number]: string };
    };
    userAnswers: { [key: string]: string };
    completed: boolean;
}

export interface CrosswordCell {
    letter: string | null;
    number?: number;
    isBlack: boolean;
}

export interface GameState {
    id: string;
    userId: string;
    gameType: GameType;
    state: TicTacToeState | CrosswordState;
    lastUpdated: string;
    syncStatus: 'synced' | 'pending' | 'conflict';
    version: number;
}

export interface SyncOperation {
    id: string;
    type: 'create' | 'update' | 'delete';
    entity: 'game_state';
    data: any;
    timestamp: string;
    retryCount: number;
}
