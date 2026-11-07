import { readFileSync } from 'fs';
import { join } from 'path';

import { CONNECTIONS_DATA } from '@/constants/ConnectionsData';
import { CROSSWORD_DATA } from '@/constants/CrosswordData';
import {
  GAME_TYPES,
  INTERCHANGE_GAME_TYPE,
  PUZZLE_SCHEMA_VERSION,
  hashPublishKey,
  validatePuzzleSubmission,
  type PuzzleFieldError,
  type PuzzleSubmission,
  type PuzzleValidationResult,
} from '@/supabase/functions/_shared/puzzle-validators';

const FIXTURES = join(__dirname, '../supabase/functions/_shared/fixtures');

function loadFixture(name: string): PuzzleSubmission {
  return JSON.parse(readFileSync(join(FIXTURES, name), 'utf8')) as PuzzleSubmission;
}

function errorOn(result: PuzzleValidationResult, field: string, code?: PuzzleFieldError['code']): PuzzleFieldError {
  const match = result.errors.find((error) => error.field === field && (code == null || error.code === code));
  if (!match) {
    throw new Error(`missing ${code ?? 'error'} on ${field}: ${JSON.stringify(result.errors)}`);
  }
  return match;
}

describe('puzzle validators (TUB-332)', () => {
  it('accepts the app crossword payloads, including a missing schemaVersion', () => {
    for (const puzzle of CROSSWORD_DATA) {
      const result = validatePuzzleSubmission({
        gameType: 'crossword',
        targetDate: puzzle.date,
        payload: puzzle,
      });
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    }
  });

  it('accepts the app Interchange payloads stored as connections', () => {
    expect(INTERCHANGE_GAME_TYPE).toBe('connections');
    expect(GAME_TYPES).toEqual(['crossword', 'connections']);
    for (const puzzle of CONNECTIONS_DATA) {
      const result = validatePuzzleSubmission({
        gameType: 'connections',
        targetDate: puzzle.date,
        payload: puzzle,
      });
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    }
  });

  it('accepts the app fixture and the lambda fixture', () => {
    expect(validatePuzzleSubmission(loadFixture('crossword-app.json')).ok).toBe(true);
    expect(validatePuzzleSubmission(loadFixture('crossword-lambda.json')).ok).toBe(true);
    const interchange = validatePuzzleSubmission(loadFixture('interchange.json'));
    expect(interchange.ok).toBe(true);

    const withVersion = loadFixture('interchange.json');
    (withVersion.payload as { schemaVersion?: number }).schemaVersion = PUZZLE_SCHEMA_VERSION;
    expect(validatePuzzleSubmission(withVersion).ok).toBe(true);
  });

  it('rejects an unsupported schema version without echoing other payload fields', () => {
    const secret = 'sk_live_DO_NOT_LEAK_991122';
    const fixture = loadFixture('invalid/unsupported-version.json');
    (fixture.payload as { note?: string }).note = secret;
    const result = validatePuzzleSubmission(fixture);
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({
        field: 'payload.schemaVersion',
        code: 'unsupported_version',
      }),
    ]);
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it('rejects a string schema version so bots cannot drift from the numeric contract', () => {
    const fixture = loadFixture('crossword-app.json');
    (fixture.payload as { schemaVersion: unknown }).schemaVersion = '1';
    const result = validatePuzzleSubmission(fixture);
    expect(errorOn(result, 'payload.schemaVersion', 'unsupported_version')).toBeTruthy();
  });

  it('rejects malformed groups', () => {
    const result = validatePuzzleSubmission(loadFixture('invalid/malformed.json'));
    expect(errorOn(result, 'payload.groups', 'invalid_type')).toBeTruthy();
  });

  it('rejects duplicate normalized Interchange words', () => {
    const result = validatePuzzleSubmission(loadFixture('invalid/duplicate-words.json'));
    expect(errorOn(result, 'payload.groups[1].items[0]', 'duplicate').message).toContain(
      'payload.groups[0].items[0]',
    );
  });

  it('rejects invalid category metadata', () => {
    const result = validatePuzzleSubmission(loadFixture('invalid/bad-category.json'));
    expect(errorOn(result, 'payload.groups[0].category', 'required')).toBeTruthy();
    expect(errorOn(result, 'payload.groups[0].difficulty', 'invalid_value')).toBeTruthy();
    expect(errorOn(result, 'payload.groups[0].color', 'invalid_value')).toBeTruthy();
  });

  it('requires one of each difficulty', () => {
    const fixture = loadFixture('interchange.json');
    const groups = (fixture.payload as { groups: { difficulty: number }[] }).groups;
    groups[3].difficulty = 1;
    const result = validatePuzzleSubmission(fixture);
    expect(errorOn(result, 'payload.groups', 'invalid_value').message).toContain('1, 2, 3 and 4');
  });

  it('rejects a puzzle that is not four groups of four', () => {
    const result = validatePuzzleSubmission(loadFixture('invalid/three-groups.json'));
    expect(errorOn(result, 'payload.groups', 'invalid_value')).toBeTruthy();
  });

  it('rejects a calendar date that does not exist', () => {
    const result = validatePuzzleSubmission(loadFixture('invalid/bad-date.json'));
    expect(errorOn(result, 'targetDate', 'invalid_value')).toBeTruthy();
    expect(errorOn(result, 'payload.date', 'invalid_value')).toBeTruthy();
  });

  it('rejects a target date that disagrees with the payload date', () => {
    const fixture = loadFixture('interchange.json');
    fixture.targetDate = '2026-11-09';
    const result = validatePuzzleSubmission(fixture);
    expect(errorOn(result, 'targetDate', 'mismatch')).toBeTruthy();
    expect(errorOn(result, 'payload.date', 'mismatch')).toBeTruthy();
  });

  it('rejects the display name Interchange as a stored game type', () => {
    const fixture = loadFixture('interchange.json');
    fixture.gameType = 'interchange';
    const result = validatePuzzleSubmission(fixture);
    expect(errorOn(result, 'gameType', 'invalid_value').message).toContain('connections');
  });

  it('rejects duplicate normalized clues', () => {
    const result = validatePuzzleSubmission(loadFixture('invalid/duplicate-clues.json'));
    expect(errorOn(result, 'payload.clues.down[0].clue', 'duplicate').message).toContain(
      'payload.clues.across[0].clue',
    );
  });

  it('rejects a grid whose crossing letter does not match both words', () => {
    const result = validatePuzzleSubmission(loadFixture('invalid/bad-grid.json'));
    expect(errorOn(result, 'payload.clues.across[0].answer', 'mismatch')).toBeTruthy();
    expect(errorOn(result, 'payload.clues.down[0].answer', 'mismatch')).toBeTruthy();
  });

  it('rejects a clue that runs outside the grid', () => {
    const result = validatePuzzleSubmission(loadFixture('invalid/clue-out-of-bounds.json'));
    expect(errorOn(result, 'payload.clues.across[0].length', 'out_of_bounds')).toBeTruthy();
  });

  it('rejects a clue number that does not match its start cell', () => {
    const fixture = loadFixture('crossword-app.json');
    const grid = (fixture.payload as { grid: { number?: number }[][] }).grid;
    grid[0][0].number = 9;
    const result = validatePuzzleSubmission(fixture);
    expect(result.errors.some((error) => error.code === 'mismatch' && error.field.endsWith('.number'))).toBe(true);
  });

  it('hashes a publish key as lowercase sha256 of the raw utf-8 bytes', async () => {
    await expect(hashPublishKey('abc')).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    await expect(hashPublishKey('abc\n')).resolves.not.toBe(await hashPublishKey('abc'));
  });
});
