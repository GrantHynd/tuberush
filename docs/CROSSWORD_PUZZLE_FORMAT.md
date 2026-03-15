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

## How to Add Puzzles

1. **Design the grid**: Decide rows, cols, and black square positions
2. **Build the grid**: Create a 2D array of `CrosswordCell`. For each white cell, set `letter`, `isBlack: false`, and `number` on the first cell of each word. For black cells, set `letter: null`, `isBlack: true`
3. **Add clues**: For each word, add a `CrosswordClue` with `number`, `clue`, `answer` (uppercase), `row`, `col`, and `length`. Across clues extend right; down clues extend down
4. **Append to data**: Add the puzzle object to `CROSSWORD_DATA` in `constants/CrosswordData.ts`
5. **Assign a date**: Use `YYYY-MM-DD` for `date` (e.g. `'2025-03-16'` for a specific day, or `new Date().toISOString().split('T')[0]` for today)
6. **Verify**: Run `npm test -- CrosswordData.test` to ensure validation passes

## Storage and Delivery

### Current (MVP)

Puzzles are **bundled locally** in `constants/CrosswordData.ts`. There is no backend or remote fetch for puzzle content.

- **API**: `getDailyPuzzle()` returns the puzzle for today's date, or the first puzzle as fallback
- **API**: `getPuzzleById(id)` returns a puzzle by ID, or `undefined` if not found
- **Benefits**: No backend complexity, works offline, fast load

### Future Option (Remote)

If remote delivery is needed later:

1. Create a Supabase table `crossword_puzzles` with columns: `id`, `date`, `title`, `rows`, `cols`, `grid` (JSONB), `clues` (JSONB)
2. Add RLS policy allowing public `SELECT` for puzzle content (read-only)
3. Game progress continues to use the existing `game_states` table
4. Update `usePuzzle` and `getDailyPuzzle`/`getPuzzleById` to fetch from Supabase when remote is enabled
