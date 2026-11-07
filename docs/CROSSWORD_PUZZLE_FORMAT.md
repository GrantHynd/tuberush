# Crossword Puzzle Data Format

This document defines the data format for crossword puzzles in TubeRush and how puzzles are delivered. TypeScript types live in `types/game.ts`.

## Schema Reference

### CrosswordPuzzle

A complete puzzle definition (the template, not the player's progress).

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique puzzle identifier |
| `date` | `string` | Date assigned to this puzzle, `YYYY-MM-DD` |
| `title` | `string` | Display title for the puzzle |
| `rows` | `number` | Number of rows in the grid |
| `cols` | `number` | Number of columns in the grid |
| `grid` | `CrosswordCell[][]` | 2D array of cells defining layout and correct answers |
| `clues` | `{ across: CrosswordClue[]; down: CrosswordClue[] }` | Across and down clues with positions and answers |

### CrosswordCell

A single cell in the crossword grid.

| Field | Type | Description |
|-------|------|-------------|
| `letter` | `string \| null` | The correct letter for this cell, or `null` if it's a black square |
| `number` | `number` (optional) | Clue number displayed in the top-left corner of the cell. Only set on the first cell of each word |
| `isBlack` | `boolean` | Whether this cell is a black (blocked) square |

- **White cells**: `isBlack: false`, `letter` is a single uppercase letter (`A-Z`)
- **Black cells**: `isBlack: true`, `letter: null`, `number` omitted
- **Numbered cells**: Add `number` to the first cell of each across and down word

### CrosswordClue

A single clue with its position and answer for validation.

| Field | Type | Description |
|-------|------|-------------|
| `number` | `number` | Clue number as displayed in the grid |
| `clue` | `string` | The clue text shown to the player |
| `answer` | `string` | The correct answer (uppercase), used for validation |
| `row` | `number` | Starting row position (0-indexed) |
| `col` | `number` | Starting column position (0-indexed) |
| `length` | `number` | Number of cells the answer spans |

- Across clues: `row` and `col` are the leftmost cell; answer extends right
- Down clues: `row` and `col` are the topmost cell; answer extends down

## Validation Rules

Puzzles must satisfy these rules (enforced by `__tests__/CrosswordData.test.ts`):

1. **Dimensions**: `grid.length === rows` and each row has `cols` cells
2. **Cell structure**: White cells have `letter` as single `A-Z`; black cells have `letter: null` and `isBlack: true`
3. **Clues**: Both `across` and `down` arrays are non-empty
4. **Clue bounds**: Across clues satisfy `col + length <= cols`; down clues satisfy `row + length <= rows`
5. **Answer consistency**: Each clue's `answer` matches the letters in the grid at its position
6. **Numbered cells**: Every clue number appears as a `number` on a grid cell; the cell at `(row, col)` for each clue has `number === clue.number`

## Where puzzles live

Published crossword puzzles are rows in the `games` table (`game_type = 'crossword'`). `lib/daily-games.ts` loads them from the network, then from the AsyncStorage cache. Nightly generation is `lambda/generate-crossword`. `constants/CrosswordData.ts` is a bundled sample covered by `__tests__/CrosswordData.test.ts`. It is not how puzzles are delivered.
