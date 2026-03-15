import { TFL } from './theme';

export interface ConnectionsGroup {
    category: string;
    items: string[];
    color: string;
    difficulty: 1 | 2 | 3 | 4;
}

export interface ConnectionsPuzzle {
    id: string;
    date: string; // YYYY-MM-DD
    groups: ConnectionsGroup[];
}

export const CONNECTIONS_DATA: ConnectionsPuzzle[] = [
    {
        id: '1',
        date: new Date().toISOString().split('T')[0], // Today's puzzle
        groups: [
            {
                category: 'TUBE LINES',
                items: ['BAKERLOO', 'CENTRAL', 'DISTRICT', 'NORTHERN'],
                color: TFL.red,
                difficulty: 1,
            },
            {
                category: 'ROYAL PARKS',
                items: ['HYDE', 'REGENT', 'GREEN', 'ST JAMES'],
                color: TFL.green,
                difficulty: 2,
            },
            {
                category: 'LONDON AIRPORTS',
                items: ['HEATHROW', 'GATWICK', 'STANSTED', 'LUTON'],
                color: TFL.blue,
                difficulty: 3,
            },
            {
                category: 'MONOPOLY STREETS',
                items: ['VINE', 'BOW', 'FLEET', 'STRAND'],
                color: TFL.yellow,
                difficulty: 4,
            },
        ],
    },
    {
        id: '2',
        date: '2025-01-01', // Example fallback
        groups: [
            {
                category: 'TEA TYPES',
                items: ['EARL GREY', 'CHAMOMILE', 'PEPPERMINT', 'MATCHA'],
                color: TFL.green,
                difficulty: 1,
            },
            {
                category: 'CURRENCY',
                items: ['POUND', 'DOLLAR', 'YEN', 'EURO'],
                color: TFL.blue,
                difficulty: 2,
            },
            {
                category: 'CARD SUITS',
                items: ['HEARTS', 'CLUBS', 'DIAMONDS', 'SPADES'],
                color: TFL.red,
                difficulty: 3,
            },
            {
                category: 'BEATLES',
                items: ['JOHN', 'PAUL', 'GEORGE', 'RINGO'],
                color: TFL.yellow,
                difficulty: 4,
            },
        ],
    }
];

export const getDailyPuzzle = (): ConnectionsPuzzle => {
    const today = new Date().toISOString().split('T')[0];
    const puzzle = CONNECTIONS_DATA.find(p => p.date === today);
    return puzzle || CONNECTIONS_DATA[0]; // Fallback to first puzzle if none found for today
};

/** Returns a puzzle by date, or undefined if not found */
export const getPuzzleByDate = (date: string): ConnectionsPuzzle | undefined => {
    return CONNECTIONS_DATA.find(p => p.date === date);
};

/** Returns recent puzzles sorted by date (most recent first), for carousel display */
export const getRecentPuzzles = (limit = 7): ConnectionsPuzzle[] => {
    return [...CONNECTIONS_DATA]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, limit);
};
