/**
 * Shared Crossword and Interchange puzzle contract (TUB-332).
 *
 * No npm imports and no Deno URL imports. Each Lambda imports `./puzzle-validators`,
 * a symlink to this file, because `sam build` copies only the function directory
 * before esbuild runs. Jest imports this file directly. `assertPublishablePuzzle`
 * is the publish boundary: call it on the final payload and do not insert on throw.
 *
 *   Lambda: import { assertPublishablePuzzle } from './puzzle-validators';
 *   Node:   import { validatePuzzleSubmission } from '@/supabase/functions/_shared/puzzle-validators';
 *
 * Game types are the stored ids. Interchange is the user-facing name of the
 * connections-style game; its game_type is `connections`.
 *
 * Schema version 1 is the payload shape already stored by the app and by the
 * AWS Lambda generators (`lambda/generate-crossword`, `lambda/generate-connections`).
 * A missing `schemaVersion` means version 1 so those existing payloads stay valid.
 * Any other version is rejected. Passing validation is not approval — a person
 * still reviews every revision.
 *
 * Publish keys are not accepted here. Hash them with `hashPublishKey` (SHA-256
 * over the raw UTF-8 key, lowercase hex, no trim and no newline) and let the
 * database compare the hash. Never send or log the plaintext key.
 */

export const PUZZLE_SCHEMA_VERSION = 1;
export const SUPPORTED_PUZZLE_SCHEMA_VERSIONS = [1] as const;

export const CROSSWORD_GAME_TYPE = 'crossword' as const;
/** Stored id for Interchange. */
export const INTERCHANGE_GAME_TYPE = 'connections' as const;
export const GAME_TYPES = [CROSSWORD_GAME_TYPE, INTERCHANGE_GAME_TYPE] as const;
export type PuzzleGameType = (typeof GAME_TYPES)[number];

export const DRAFT_STATUSES = ['draft', 'approved', 'rejected', 'published'] as const;
export type DraftStatus = (typeof DRAFT_STATUSES)[number];

export const PUBLISH_KEY_HASH = {
  algorithm: 'SHA-256',
  encoding: 'hex',
  input: 'raw UTF-8 key bytes, without trimming or appending a newline',
} as const;

/** Largest grid the app's crossword payloads use is 9; 21 leaves room for a larger mini. */
export const MAX_GRID_DIMENSION = 21;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;
const MAX_ERRORS = 40;
const MAX_QUOTE = 40;

export type PuzzleErrorCode =
  | 'required'
  | 'invalid_type'
  | 'invalid_value'
  | 'out_of_bounds'
  | 'mismatch'
  | 'duplicate'
  | 'unsupported_version';

export interface PuzzleFieldError {
  field: string;
  code: PuzzleErrorCode;
  message: string;
}

export interface PuzzleValidationResult {
  ok: boolean;
  errors: PuzzleFieldError[];
}

export interface PuzzleSubmission {
  gameType: unknown;
  targetDate: unknown;
  payload: unknown;
}

/**
 * SHA-256 hex digest of a publish key. The database stores only this digest.
 * Comparison stays in SQL (`verify_publish_key`); this function does not look
 * keys up and does not log the secret.
 */
export async function hashPublishKey(secret: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function formatPuzzleErrors(errors: readonly PuzzleFieldError[]): string {
  return errors.map((error) => `${error.field}: ${error.message}`).join('\n');
}

export function validatePuzzleSubmission(input: PuzzleSubmission): PuzzleValidationResult {
  const errors: PuzzleFieldError[] = [];
  const gameType = readGameType(input.gameType, errors);
  const targetDate = readDate(input.targetDate, 'targetDate', errors);

  if (!isRecord(input.payload)) {
    push(errors, 'payload', 'invalid_type', 'payload must be a JSON object');
    return finish(errors);
  }

  if (gameType === 'crossword') {
    validateCrosswordPayload(input.payload, errors, targetDate);
  } else if (gameType === 'connections') {
    validateConnectionsPayload(input.payload, errors, targetDate);
  }

  return finish(errors);
}

export function assertPublishablePuzzle(input: PuzzleSubmission): void {
  const result = validatePuzzleSubmission(input);
  if (!result.ok) throw new Error(formatPuzzleErrors(result.errors));
}

export function validateCrosswordPayload(
  payload: unknown,
  errors?: PuzzleFieldError[],
  targetDate: string | null = null,
): PuzzleValidationResult {
  const ownErrors = errors ?? [];
  if (!isRecord(payload)) {
    push(ownErrors, 'payload', 'invalid_type', 'payload must be a JSON object');
    return finish(ownErrors);
  }
  validateCrosswordObject(payload, ownErrors, targetDate);
  return finish(ownErrors);
}

export function validateConnectionsPayload(
  payload: unknown,
  errors?: PuzzleFieldError[],
  targetDate: string | null = null,
): PuzzleValidationResult {
  const ownErrors = errors ?? [];
  if (!isRecord(payload)) {
    push(ownErrors, 'payload', 'invalid_type', 'payload must be a JSON object');
    return finish(ownErrors);
  }
  validateConnectionsObject(payload, ownErrors, targetDate);
  return finish(ownErrors);
}

function validateCrosswordObject(
  payload: Record<string, unknown>,
  errors: PuzzleFieldError[],
  targetDate: string | null,
): void {
  if (!acceptSchemaVersion(payload, errors)) return;

  readId(payload, errors);
  const payloadDate = readDate(payload.date, 'payload.date', errors);
  if (targetDate && payloadDate && payloadDate !== targetDate) {
    push(errors, 'targetDate', 'mismatch', 'targetDate must match payload.date');
    push(errors, 'payload.date', 'mismatch', 'payload.date must match targetDate');
  }
  readNonEmptyString(payload.title, 'payload.title', errors, 'title');
  readOptionalString(payload, 'templateId', errors);
  readOptionalString(payload, 'difficulty', errors);

  const rows = readDimension(payload.rows, 'payload.rows', errors);
  const cols = readDimension(payload.cols, 'payload.cols', errors);
  const grid = readGrid(payload.grid, rows, cols, errors);
  if (!grid || rows == null || cols == null) return;

  const clues = payload.clues;
  if (!isRecord(clues)) {
    push(errors, 'payload.clues', 'invalid_type', 'clues must be an object with across and down arrays');
    return;
  }

  const covered: boolean[][] = grid.map((row) => row.map(() => false));
  const seenClues = new Map<string, string>();
  const seenNumbers = new Set<string>();
  const starts = new Map<string, number>();

  validateClueList(clues.across, 'across', grid, rows, cols, covered, seenClues, seenNumbers, starts, errors);
  validateClueList(clues.down, 'down', grid, rows, cols, covered, seenClues, seenNumbers, starts, errors);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cell = grid[row][col];
      const field = `payload.grid[${row}][${col}]`;
      if (!cell.isBlack && !covered[row][col]) {
        push(errors, field, 'invalid_value', 'white cell is not covered by a clue');
      }
      if (cell.number != null) {
        const startNumber = starts.get(`${row},${col}`);
        if (startNumber == null) {
          push(errors, `${field}.number`, 'mismatch', 'cell number does not start a clue');
        } else if (startNumber !== cell.number) {
          push(errors, `${field}.number`, 'mismatch', 'cell number does not match the clue that starts here');
        }
      }
    }
  }
}

function validateConnectionsObject(
  payload: Record<string, unknown>,
  errors: PuzzleFieldError[],
  targetDate: string | null,
): void {
  if (!acceptSchemaVersion(payload, errors)) return;

  readId(payload, errors);
  const payloadDate = readDate(payload.date, 'payload.date', errors);
  if (targetDate && payloadDate && payloadDate !== targetDate) {
    push(errors, 'targetDate', 'mismatch', 'targetDate must match payload.date');
    push(errors, 'payload.date', 'mismatch', 'payload.date must match targetDate');
  }

  if (!Array.isArray(payload.groups)) {
    push(errors, 'payload.groups', 'invalid_type', 'groups must be an array of four categories');
    return;
  }
  if (payload.groups.length !== 4) {
    push(errors, 'payload.groups', 'invalid_value', 'Interchange needs exactly four groups');
  }

  const seenWords = new Map<string, string>();
  const seenCategories = new Map<string, string>();
  const difficulties: number[] = [];

  payload.groups.forEach((group, groupIndex) => {
    const base = `payload.groups[${groupIndex}]`;
    if (!isRecord(group)) {
      push(errors, base, 'invalid_type', 'group must be an object');
      return;
    }

    if (typeof group.category !== 'string' || group.category.trim() === '') {
      push(errors, `${base}.category`, 'required', 'category must be a non-empty string');
    } else {
      const categoryKey = group.category.trim();
      const prior = seenCategories.get(categoryKey);
      if (prior) {
        push(errors, `${base}.category`, 'duplicate', `category repeats ${prior}`);
      } else {
        seenCategories.set(categoryKey, `${base}.category`);
      }
    }

    if (!isInteger(group.difficulty) || group.difficulty < 1 || group.difficulty > 4) {
      push(errors, `${base}.difficulty`, 'invalid_value', 'difficulty must be an integer from 1 to 4');
    } else {
      difficulties.push(group.difficulty);
    }

    if (typeof group.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(group.color)) {
      push(errors, `${base}.color`, 'invalid_value', 'color must be a #RRGGBB hex string');
    }

    if (!Array.isArray(group.items)) {
      push(errors, `${base}.items`, 'invalid_type', 'items must be an array of four words');
      return;
    }
    if (group.items.length !== 4) {
      push(errors, `${base}.items`, 'invalid_value', 'each group needs exactly four words');
    }

    group.items.forEach((item, itemIndex) => {
      const field = `${base}.items[${itemIndex}]`;
      if (typeof item !== 'string') {
        push(errors, field, 'invalid_type', 'word must be a string');
        return;
      }
      const normalized = normalizeWord(item);
      if (!normalized) {
        push(errors, field, 'required', 'word must not be empty');
        return;
      }
      if (normalized.length > 40) {
        push(errors, field, 'invalid_value', 'word must be 40 characters or fewer');
      }
      const prior = seenWords.get(normalized);
      if (prior) {
        push(errors, field, 'duplicate', `word repeats ${prior} after normalization`);
      } else {
        seenWords.set(normalized, field);
      }
    });
  });

  if (payload.groups.length === 4 && difficulties.length === 4) {
    const unique = new Set(difficulties);
    if (unique.size !== 4 || ![1, 2, 3, 4].every((level) => unique.has(level))) {
      push(errors, 'payload.groups', 'invalid_value', 'the four groups must use difficulties 1, 2, 3 and 4 once each');
    }
  }
}

function validateClueList(
  list: unknown,
  direction: 'across' | 'down',
  grid: GridCell[][],
  rows: number,
  cols: number,
  covered: boolean[][],
  seenClues: Map<string, string>,
  seenNumbers: Set<string>,
  starts: Map<string, number>,
  errors: PuzzleFieldError[],
): void {
  const field = `payload.clues.${direction}`;
  if (!Array.isArray(list)) {
    push(errors, field, 'invalid_type', `${direction} clues must be an array`);
    return;
  }

  list.forEach((entry, index) => {
    const base = `${field}[${index}]`;
    if (!isRecord(entry)) {
      push(errors, base, 'invalid_type', 'clue must be an object');
      return;
    }

    const clueNumber = isInteger(entry.number) && entry.number >= 1 ? entry.number : null;
    if (clueNumber == null) {
      push(errors, `${base}.number`, 'invalid_value', 'clue number must be a positive integer');
    } else {
      const key = `${direction}:${clueNumber}`;
      if (seenNumbers.has(key)) {
        push(errors, `${base}.number`, 'duplicate', `duplicate ${direction} clue number ${clueNumber}`);
      } else {
        seenNumbers.add(key);
      }
    }

    const clueText = typeof entry.clue === 'string' ? entry.clue : null;
    if (clueText == null || normalizeClue(clueText) === '') {
      push(errors, `${base}.clue`, 'required', 'clue text must not be empty');
    } else {
      const normalized = normalizeClue(clueText);
      const prior = seenClues.get(normalized);
      if (prior) {
        push(errors, `${base}.clue`, 'duplicate', `clue text repeats ${prior}`);
      } else {
        seenClues.set(normalized, `${base}.clue`);
      }
    }

    const answer = typeof entry.answer === 'string' && /^[A-Z]+$/.test(entry.answer) ? entry.answer : null;
    if (answer == null) {
      push(errors, `${base}.answer`, 'invalid_value', 'answer must be uppercase A-Z letters');
    }

    const row = isInteger(entry.row) && entry.row >= 0 ? entry.row : null;
    const col = isInteger(entry.col) && entry.col >= 0 ? entry.col : null;
    const length = isInteger(entry.length) && entry.length >= 1 ? entry.length : null;
    if (row == null) push(errors, `${base}.row`, 'invalid_value', 'row must be a non-negative integer');
    if (col == null) push(errors, `${base}.col`, 'invalid_value', 'col must be a non-negative integer');
    if (length == null) push(errors, `${base}.length`, 'invalid_value', 'length must be a positive integer');
    if (answer != null && length != null && answer.length !== length) {
      push(errors, `${base}.answer`, 'mismatch', 'answer length must equal length');
    }
    if (row == null || col == null || length == null || clueNumber == null) return;

    if (row >= rows || col >= cols) {
      push(errors, base, 'out_of_bounds', 'clue starts outside the grid');
      return;
    }
    const end = direction === 'across' ? col + length : row + length;
    const limit = direction === 'across' ? cols : rows;
    if (end > limit) {
      push(errors, `${base}.length`, 'out_of_bounds', 'clue runs past the grid');
      return;
    }

    const startKey = `${row},${col}`;
    const existingStart = starts.get(startKey);
    if (existingStart == null) starts.set(startKey, clueNumber);
    else if (existingStart !== clueNumber) {
      push(errors, `${base}.number`, 'mismatch', 'across and down clues that share a start must use the same number');
    }

    const startCell = grid[row][col];
    if (startCell.number !== clueNumber) {
      push(errors, `${base}.number`, 'mismatch', 'clue number does not match the grid cell it starts on');
    }

    for (let offset = 0; offset < length; offset += 1) {
      const cellRow = direction === 'across' ? row : row + offset;
      const cellCol = direction === 'across' ? col + offset : col;
      const cell = grid[cellRow][cellCol];
      const cellField = `payload.grid[${cellRow}][${cellCol}].letter`;
      if (cell.isBlack) {
        push(errors, base, 'out_of_bounds', 'clue crosses a black square');
        break;
      }
      covered[cellRow][cellCol] = true;
      if (answer != null && cell.letter !== answer[offset]) {
        push(
          errors,
          `${base}.answer`,
          'mismatch',
          `letter ${offset + 1} does not match ${cellField}`,
        );
      }
    }
  });
}

interface GridCell {
  isBlack: boolean;
  letter: string | null;
  number: number | null;
}

function readGrid(
  value: unknown,
  rows: number | null,
  cols: number | null,
  errors: PuzzleFieldError[],
): GridCell[][] | null {
  if (!Array.isArray(value)) {
    push(errors, 'payload.grid', 'invalid_type', 'grid must be an array of rows');
    return null;
  }
  if (rows == null || cols == null) return null;
  if (value.length !== rows) {
    push(errors, 'payload.grid', 'mismatch', 'grid row count must equal rows');
    return null;
  }

  const grid: GridCell[][] = [];
  let valid = true;
  for (let row = 0; row < value.length; row += 1) {
    const line = value[row];
    if (!Array.isArray(line) || line.length !== cols) {
      push(errors, `payload.grid[${row}]`, 'mismatch', 'grid column count must equal cols');
      valid = false;
      continue;
    }
    const parsed: GridCell[] = [];
    for (let col = 0; col < line.length; col += 1) {
      const cell = parseCell(line[col], `payload.grid[${row}][${col}]`, errors);
      if (!cell) valid = false;
      else parsed.push(cell);
    }
    grid.push(parsed);
  }
  return valid ? grid : null;
}

function parseCell(value: unknown, field: string, errors: PuzzleFieldError[]): GridCell | null {
  if (!isRecord(value) || typeof value.isBlack !== 'boolean') {
    push(errors, field, 'invalid_type', 'cell must include a boolean isBlack');
    return null;
  }
  let number: number | null = null;
  if (value.number != null) {
    if (!isInteger(value.number) || value.number < 1) {
      push(errors, `${field}.number`, 'invalid_value', 'cell number must be a positive integer');
    } else {
      number = value.number;
    }
  }
  if (value.isBlack) {
    if (value.letter != null) {
      push(errors, `${field}.letter`, 'invalid_value', 'a black square must have a null letter');
      return null;
    }
    if (number != null) {
      push(errors, `${field}.number`, 'invalid_value', 'a black square cannot have a clue number');
      return null;
    }
    return { isBlack: true, letter: null, number: null };
  }
  if (typeof value.letter !== 'string' || !/^[A-Z]$/.test(value.letter)) {
    push(errors, `${field}.letter`, 'invalid_value', 'a white square must contain one uppercase letter');
    return null;
  }
  return { isBlack: false, letter: value.letter, number };
}

function acceptSchemaVersion(payload: Record<string, unknown>, errors: PuzzleFieldError[]): boolean {
  if (!Object.prototype.hasOwnProperty.call(payload, 'schemaVersion')) return true;
  const version = payload.schemaVersion;
  if (version === PUZZLE_SCHEMA_VERSION) return true;
  const shown = typeof version === 'number' && Number.isFinite(version) ? String(version) : typeof version;
  push(
    errors,
    'payload.schemaVersion',
    'unsupported_version',
    `schemaVersion ${shown} is not supported; supported versions: ${SUPPORTED_PUZZLE_SCHEMA_VERSIONS.join(', ')}`,
  );
  return false;
}

function readGameType(value: unknown, errors: PuzzleFieldError[]): PuzzleGameType | null {
  if (value === 'interchange') {
    push(errors, 'gameType', 'invalid_value', 'gameType must be "connections" for Interchange, or "crossword"');
    return null;
  }
  if (value !== 'crossword' && value !== 'connections') {
    push(errors, 'gameType', 'invalid_value', 'gameType must be "crossword" or "connections"');
    return null;
  }
  return value;
}

function readDate(value: unknown, field: string, errors: PuzzleFieldError[]): string | null {
  if (typeof value !== 'string' || !isRealDate(value)) {
    push(errors, field, 'invalid_value', `must be a real calendar date YYYY-MM-DD between ${MIN_YEAR} and ${MAX_YEAR}`);
    return null;
  }
  return value;
}

function isRealDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < MIN_YEAR || year > MAX_YEAR) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function readId(payload: Record<string, unknown>, errors: PuzzleFieldError[]): void {
  if (typeof payload.id !== 'string' || payload.id.trim() === '' || payload.id.length > 64) {
    push(errors, 'payload.id', 'invalid_value', 'id must be a non-empty string of at most 64 characters');
  }
}

function readNonEmptyString(value: unknown, field: string, errors: PuzzleFieldError[], label: string): void {
  if (typeof value !== 'string' || value.trim() === '') {
    push(errors, field, 'required', `${label} must be a non-empty string`);
  }
}

function readOptionalString(payload: Record<string, unknown>, key: string, errors: PuzzleFieldError[]): void {
  if (!Object.prototype.hasOwnProperty.call(payload, key)) return;
  const value = payload[key];
  if (typeof value !== 'string' || value.trim() === '') {
    push(errors, `payload.${key}`, 'invalid_value', `${key} must be a non-empty string when present`);
  }
}

function readDimension(value: unknown, field: string, errors: PuzzleFieldError[]): number | null {
  if (!isInteger(value) || value < 1 || value > MAX_GRID_DIMENSION) {
    push(errors, field, 'out_of_bounds', `must be an integer from 1 to ${MAX_GRID_DIMENSION}`);
    return null;
  }
  return value;
}

function normalizeWord(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

function normalizeClue(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function push(errors: PuzzleFieldError[], field: string, code: PuzzleErrorCode, message: string): void {
  if (errors.length >= MAX_ERRORS) return;
  errors.push({ field, code, message });
}

function finish(errors: PuzzleFieldError[]): PuzzleValidationResult {
  return { ok: errors.length === 0, errors };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}
