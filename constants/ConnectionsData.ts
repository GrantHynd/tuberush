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

// Generate puzzle data for the last 30 days
function generatePuzzleData(): ConnectionsPuzzle[] {
    const puzzles: ConnectionsPuzzle[] = [];
    const today = new Date();
    
    const puzzleThemes = [
        [
            { category: 'TUBE LINES', items: ['BAKERLOO', 'CENTRAL', 'DISTRICT', 'NORTHERN'], difficulty: 1 as const },
            { category: 'ROYAL PARKS', items: ['HYDE', 'REGENT', 'GREEN', 'ST JAMES'], difficulty: 2 as const },
            { category: 'LONDON AIRPORTS', items: ['HEATHROW', 'GATWICK', 'STANSTED', 'LUTON'], difficulty: 3 as const },
            { category: 'MONOPOLY STREETS', items: ['VINE', 'BOW', 'FLEET', 'STRAND'], difficulty: 4 as const },
        ],
        [
            { category: 'TEA TYPES', items: ['EARL GREY', 'CHAMOMILE', 'PEPPERMINT', 'MATCHA'], difficulty: 1 as const },
            { category: 'CURRENCY', items: ['POUND', 'DOLLAR', 'YEN', 'EURO'], difficulty: 2 as const },
            { category: 'CARD SUITS', items: ['HEARTS', 'CLUBS', 'DIAMONDS', 'SPADES'], difficulty: 3 as const },
            { category: 'BEATLES', items: ['JOHN', 'PAUL', 'GEORGE', 'RINGO'], difficulty: 4 as const },
        ],
        [
            { category: 'WEATHER', items: ['SUNNY', 'RAINY', 'CLOUDY', 'WINDY'], difficulty: 1 as const },
            { category: 'SEASONS', items: ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'], difficulty: 2 as const },
            { category: 'PLANETS', items: ['MARS', 'VENUS', 'SATURN', 'JUPITER'], difficulty: 3 as const },
            { category: 'PRIME MINISTERS', items: ['BLAIR', 'BROWN', 'CAMERON', 'MAY'], difficulty: 4 as const },
        ],
        [
            { category: 'FRUITS', items: ['APPLE', 'ORANGE', 'BANANA', 'GRAPE'], difficulty: 1 as const },
            { category: 'COLORS', items: ['RED', 'BLUE', 'GREEN', 'YELLOW'], difficulty: 2 as const },
            { category: 'SHAPES', items: ['CIRCLE', 'SQUARE', 'TRIANGLE', 'OVAL'], difficulty: 3 as const },
            { category: 'NUMBERS', items: ['ONE', 'TWO', 'THREE', 'FOUR'], difficulty: 4 as const },
        ],
    ];

    const colors = [TFL.red, TFL.green, TFL.blue, TFL.yellow];

    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const themeIndex = i % puzzleThemes.length;
        const theme = puzzleThemes[themeIndex];

        puzzles.push({
            id: String(247 - i),
            date: dateStr,
            groups: theme.map((group, idx) => ({
                ...group,
                color: colors[idx],
            })),
        });
    }

    return puzzles;
}

export const CONNECTIONS_DATA: ConnectionsPuzzle[] = generatePuzzleData();

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

/** Returns recent puzzles with offset for pagination (most recent first) */
export const getRecentPuzzlesWithOffset = (limit: number, offset: number): ConnectionsPuzzle[] => {
    return [...CONNECTIONS_DATA]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(offset, offset + limit);
};

/** Total number of puzzles available (30 days) */
export const CONNECTIONS_PUZZLE_COUNT = 30;
