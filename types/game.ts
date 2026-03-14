import { Borough } from '../constants/Boroughs';

export type GameType = 'connections' | 'crossword';

export interface User {
    id: string;
    email: string;
    isPremium: boolean;
    subscriptionId?: string;
    subscriptionStatus?: 'active' | 'canceled' | 'past_due';
    expiresAt?: string | null;
    appleOriginalTransactionId?: string | null;
    borough?: Borough;
}

export interface ConnectionsGroup {
    id: string;
    category: string;
    items: string[];
    color: string; // Hex code for group color
}

export interface ConnectionsState {
    completedGroups: string[]; // IDs of found groups
    mistakesRemaining: number;
    history: string[][]; // Array of previous guesses (arrays of item strings)
    startTime: number;
    endTime: number | null;
    status: 'playing' | 'won' | 'lost';
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
    state: ConnectionsState | CrosswordState;
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

export interface LeaderboardEntry {
    id: string;
    userId: string;
    borough: Borough;
    score: number; // Time taken in seconds (lower is better)
    date: string; // YYYY-MM-DD
    gameType: GameType;
    created_at: string;
}
