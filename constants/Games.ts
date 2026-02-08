import { TFL } from './theme';

export const GAMES = {
    connections: {
        id: 'connections',
        name: 'Connections',
        description: 'Find groups of 4 related items',
        isPremium: false,
        icon: '🔗',
        color: TFL.red, // Central Line
    },
    crossword: {
        id: 'crossword',
        name: 'Crossword Puzzle',
        description: 'Daily premium crossword',
        isPremium: true,
        icon: '📝',
        color: TFL.blue, // Piccadilly Line
    },
} as const;

export type GameId = keyof typeof GAMES;
