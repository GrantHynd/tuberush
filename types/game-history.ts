/** Base puzzle shape - all game types have at least id and date */
export interface BasePuzzle {
    id: string;
    date: string;
}

export interface GameHistoryListItem {
    id: string;
    date: string;
    dayNumber: number;
    label: string;
    isToday: boolean;
    sublabel: string;
    isCompleted: boolean;
    completionTime?: string;
    score?: string;
    isWon?: boolean;
    /** Game-specific: e.g. date for connections, puzzleId for crossword */
    navigateKey: string;
}

export interface GameHistorySection {
    title: string;
    data: GameHistoryListItem[];
}

export interface GameHistoryStats {
    completed: number;
    total: number;
    currentStreak: number;
}

export interface GameHistoryConfig<P extends BasePuzzle = BasePuzzle> {
    gameType: 'connections' | 'crossword';
    totalPuzzleCount: number;
    getPuzzlesWithOffset: (limit: number, offset: number) => P[] | Promise<P[]>;
    getGameId: (userId: string, puzzle: P) => string;
    getPuzzleDate: (puzzle: P) => string;
    /** Parse game state to extract completion info */
    parseState: (game: { state: unknown } | null) => {
        isCompleted: boolean;
        isWon?: boolean;
        completionTime?: string;
        score?: string;
    };
    /** Optional: fetch play counts. identifiers come from getPlayCountIdentifier if set, else getPuzzleDate */
    getPlayCounts?: (identifiers: string[]) => Promise<number[]>;
    /** Optional: when getPlayCounts is set, use this to get the identifier per puzzle (e.g. puzzle.id for crossword) */
    getPlayCountIdentifier?: (puzzle: P) => string;
    /** If true, shows win (check) vs loss (X) in badge. If false, only completed (check) */
    hasWinLoss: boolean;
}
