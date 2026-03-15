import type { CrosswordPuzzle } from '@/types/game';

/**
 * Crossword puzzle data store.
 *
 * Grid layout reference for puzzle 1 (5x5):
 *
 *       0 1 2 3 4
 *   0 [ T A B S ■ ]
 *   1 [ U ■ I ■ A ]
 *   2 [ B A K E R ]
 *   3 [ E ■ E ■ T ]
 *   4 [ ■ A S K S ]
 */
export const CROSSWORD_DATA: CrosswordPuzzle[] = [
    {
        id: '1',
        date: new Date().toISOString().split('T')[0],
        title: 'London Mini',
        rows: 5,
        cols: 5,
        grid: [
            // Row 0
            [
                { letter: 'T', number: 1, isBlack: false },
                { letter: 'A', isBlack: false },
                { letter: 'B', number: 2, isBlack: false },
                { letter: 'S', isBlack: false },
                { letter: null, isBlack: true },
            ],
            // Row 1
            [
                { letter: 'U', isBlack: false },
                { letter: null, isBlack: true },
                { letter: 'I', isBlack: false },
                { letter: null, isBlack: true },
                { letter: 'A', number: 3, isBlack: false },
            ],
            // Row 2
            [
                { letter: 'B', number: 4, isBlack: false },
                { letter: 'A', isBlack: false },
                { letter: 'K', isBlack: false },
                { letter: 'E', isBlack: false },
                { letter: 'R', isBlack: false },
            ],
            // Row 3
            [
                { letter: 'E', isBlack: false },
                { letter: null, isBlack: true },
                { letter: 'E', isBlack: false },
                { letter: null, isBlack: true },
                { letter: 'T', isBlack: false },
            ],
            // Row 4
            [
                { letter: null, isBlack: true },
                { letter: 'A', number: 5, isBlack: false },
                { letter: 'S', isBlack: false },
                { letter: 'K', isBlack: false },
                { letter: 'S', isBlack: false },
            ],
        ],
        clues: {
            across: [
                {
                    number: 1,
                    clue: 'Keep these open in your browser',
                    answer: 'TABS',
                    row: 0,
                    col: 0,
                    length: 4,
                },
                {
                    number: 4,
                    clue: '___ Street, home of Sherlock Holmes',
                    answer: 'BAKER',
                    row: 2,
                    col: 0,
                    length: 5,
                },
                {
                    number: 5,
                    clue: 'Poses questions',
                    answer: 'ASKS',
                    row: 4,
                    col: 1,
                    length: 4,
                },
            ],
            down: [
                {
                    number: 1,
                    clue: "London's Underground railway",
                    answer: 'TUBE',
                    row: 0,
                    col: 0,
                    length: 4,
                },
                {
                    number: 2,
                    clue: "Boris ___: London's cycle hire scheme",
                    answer: 'BIKES',
                    row: 0,
                    col: 2,
                    length: 5,
                },
                {
                    number: 3,
                    clue: "South Bank is London's centre for the ___",
                    answer: 'ARTS',
                    row: 1,
                    col: 4,
                    length: 4,
                },
            ],
        },
    },
    {
        id: '2',
        date: '2025-03-16',
        title: 'London Parks',
        rows: 5,
        cols: 5,
        grid: [
            [
                { letter: 'P', number: 1, isBlack: false },
                { letter: 'A', isBlack: false },
                { letter: 'R', number: 2, isBlack: false },
                { letter: 'K', isBlack: false },
                { letter: null, isBlack: true },
            ],
            [
                { letter: 'I', isBlack: false },
                { letter: null, isBlack: true },
                { letter: 'I', isBlack: false },
                { letter: null, isBlack: true },
                { letter: 'P', number: 3, isBlack: false },
            ],
            [
                { letter: 'N', number: 4, isBlack: false },
                { letter: 'A', isBlack: false },
                { letter: 'V', isBlack: false },
                { letter: 'E', isBlack: false },
                { letter: 'L', isBlack: false },
            ],
            [
                { letter: 'T', isBlack: false },
                { letter: null, isBlack: true },
                { letter: 'E', isBlack: false },
                { letter: null, isBlack: true },
                { letter: 'U', isBlack: false },
            ],
            [
                { letter: null, isBlack: true },
                { letter: 'D', number: 5, isBlack: false },
                { letter: 'R', isBlack: false },
                { letter: 'U', isBlack: false },
                { letter: 'G', isBlack: false },
            ],
        ],
        clues: {
            across: [
                { number: 1, clue: 'Green space in the city', answer: 'PARK', row: 0, col: 0, length: 4 },
                { number: 4, clue: 'Belly button', answer: 'NAVEL', row: 2, col: 0, length: 5 },
                { number: 5, clue: 'Pharmacy purchase', answer: 'DRUG', row: 4, col: 1, length: 4 },
            ],
            down: [
                { number: 1, clue: 'Beer measure in a London pub', answer: 'PINT', row: 0, col: 0, length: 4 },
                { number: 2, clue: 'Thames, for one', answer: 'RIVER', row: 0, col: 2, length: 5 },
                { number: 3, clue: 'Connect to charge', answer: 'PLUG', row: 1, col: 4, length: 4 },
            ],
        },
    },
];

/** Returns the puzzle matching the given date, or the first puzzle as a fallback */
export const getDailyPuzzle = (): CrosswordPuzzle => {
    const today = new Date().toISOString().split('T')[0];
    const puzzle = CROSSWORD_DATA.find(p => p.date === today);
    return puzzle || CROSSWORD_DATA[0];
};

/** Returns a puzzle by its ID, or undefined if not found */
export const getPuzzleById = (id: string): CrosswordPuzzle | undefined => {
    return CROSSWORD_DATA.find(p => p.id === id);
};
