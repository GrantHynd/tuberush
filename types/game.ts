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
    city?: string | null;
    borough?: Borough | null;
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
    puzzleId: string;
    grid: CrosswordCell[][];
    clues: {
        across: { [key: number]: string };
        down: { [key: number]: string };
    };
    userAnswers: { [key: string]: string };
    completed: boolean;
}

/** A single cell in the crossword grid */
export interface CrosswordCell {
    /** The correct letter for this cell, or null if it's a black square */
    letter: string | null;
    /** The clue number displayed in the top-left corner of the cell */
    number?: number;
    /** Whether this cell is a black (blocked) square */
    isBlack: boolean;
}

/** A single clue with its position and answer for validation */
export interface CrosswordClue {
    /** The clue number as displayed in the grid */
    number: number;
    /** The clue text shown to the player */
    clue: string;
    /** The correct answer (uppercase), used for validation */
    answer: string;
    /** Starting row position (0-indexed) */
    row: number;
    /** Starting column position (0-indexed) */
    col: number;
    /** Number of cells the answer spans */
    length: number;
}

/** A complete crossword puzzle definition (the template, not the player's progress) */
export interface CrosswordPuzzle {
    /** Unique puzzle identifier */
    id: string;
    /** Date this puzzle is assigned to, in YYYY-MM-DD format */
    date: string;
    /** Display title for the puzzle */
    title: string;
    /** Number of rows in the grid */
    rows: number;
    /** Number of columns in the grid */
    cols: number;
    /** 2D array of cells defining the grid layout and correct answers */
    grid: CrosswordCell[][];
    /** Across and down clues with positions and answers */
    clues: {
        across: CrosswordClue[];
        down: CrosswordClue[];
    };
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
    city: string;
    borough: string | null;
    score: number; // Time taken in seconds (lower is better)
    date: string; // YYYY-MM-DD
    gameType: GameType;
    created_at: string;
}
