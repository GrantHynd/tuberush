export const GAMES = {
    tictactoe: {
        id: 'tictactoe',
        name: 'Tic Tac Toe',
        description: 'Classic 3x3 grid game',
        isPremium: false,
        icon: '⭕',
    },
    crossword: {
        id: 'crossword',
        name: 'Crossword Puzzle',
        description: 'Premium crossword challenges',
        isPremium: true,
        icon: '📝',
    },
} as const;

export type GameId = keyof typeof GAMES;
