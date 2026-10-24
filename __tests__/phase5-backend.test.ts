import { readFileSync } from 'fs';
import { join } from 'path';
import { supabase } from '@/lib/supabase-client';
import { filterAndRerank, isMissingSchemaError, leaderboard, shouldReplaceScore } from '@/lib/leaderboard';

const mockRpc = supabase.rpc as jest.Mock;
const mockFrom = supabase.from as jest.Mock;
const MISSING_COL = { code: 'PGRST204', message: "Could not find the 'mistakes' column" };
const MISSING_FN = { code: 'PGRST202', message: 'Could not find the function' };

const row = (user_id: string, borough: string | null, rank: number) => ({
    user_id, username: user_id, city: 'London', borough, total_score: rank * 10, games_played: 1, rank, total_players: 3,
});

/** Chainable query mock: `existing` is what the pre-check select returns, `writes` the write results in order. */
function mockLeaderboardTable(existing: object | null, writes: { error: object | null }[]) {
    const calls: { op: string; body: object }[] = [];
    const chain: Record<string, jest.Mock> = {};
    chain.select = jest.fn(() => chain);
    chain.eq = jest.fn(() => chain);
    chain.single = jest.fn(() => Promise.resolve({ data: existing, error: null }));
    const write = (op: string) => jest.fn((body: object) => {
        calls.push({ op, body });
        const res = Promise.resolve(writes.shift() ?? { error: null });
        return Object.assign(res, { eq: jest.fn(() => res) });
    });
    chain.insert = write('insert');
    chain.update = write('update');
    mockFrom.mockReturnValue(chain);
    return calls;
}

beforeEach(() => jest.clearAllMocks());

describe('migration 20261024000002 (TUB-257/260/265)', () => {
    const sql = readFileSync(join(__dirname, '../supabase/migrations/20261024000002_leaderboard_result_mistakes_borough.sql'), 'utf8');
    it('adds nullable result + mistakes columns only (additive)', () => {
        expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS result TEXT/);
        expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS mistakes SMALLINT/);
        expect(sql).not.toMatch(/DROP COLUMN/);
    });
    it('adds p_borough and excludes lost games from ranks', () => {
        expect(sql).toMatch(/p_borough TEXT DEFAULT NULL/);
        expect(sql).toMatch(/p_borough IS NULL OR p\.borough = p_borough/);
        expect(sql.match(/result IS DISTINCT FROM 'lost'/g)?.length).toBe(2);
    });
    it('keeps EXECUTE locked to authenticated', () => {
        expect(sql).toMatch(/REVOKE ALL ON FUNCTION get_weekly_leaderboard\(TEXT, DATE, DATE, TEXT, TEXT\) FROM anon/);
        expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION get_weekly_leaderboard\(TEXT, DATE, DATE, TEXT, TEXT\) TO authenticated/);
    });
});

describe('shouldReplaceScore', () => {
    it('prefers a win over a loss, then the faster time', () => {
        expect(shouldReplaceScore({ score: 30, result: 'lost' }, { score: 90, result: 'won' })).toBe(true);
        expect(shouldReplaceScore({ score: 90, result: 'won' }, { score: 30, result: 'lost' })).toBe(false);
        expect(shouldReplaceScore({ score: 90 }, { score: 60, result: 'won' })).toBe(true);
        expect(shouldReplaceScore({ score: 60, result: 'won' }, { score: 90, result: 'won' })).toBe(false);
    });
});

describe('submitScore', () => {
    it('stores result and mistakes', async () => {
        const calls = mockLeaderboardTable(null, [{ error: null }]);
        await leaderboard.submitScore('u', 'London', 'Camden', 70, 'connections', { result: 'won', mistakes: 1 });
        expect(calls).toHaveLength(1);
        expect(calls[0].body).toMatchObject({ score: 70, result: 'won', mistakes: 1, game_type: 'connections' });
    });
    it('falls back to the legacy payload before the migration is applied', async () => {
        const calls = mockLeaderboardTable(null, [{ error: MISSING_COL }, { error: null }]);
        await leaderboard.submitScore('u', 'London', null, 70, 'connections', { result: 'won', mistakes: 1 });
        expect(calls).toHaveLength(2);
        expect(calls[1].body).not.toHaveProperty('result');
        expect(calls[1].body).not.toHaveProperty('mistakes');
    });
    it('drops a loss before the migration (so it can never count towards ranks)', async () => {
        const calls = mockLeaderboardTable(null, [{ error: MISSING_COL }]);
        await leaderboard.submitScore('u', 'London', null, 70, 'connections', { result: 'lost', mistakes: 4 });
        expect(calls).toHaveLength(1);
    });
    it('does not overwrite a win with a later loss', async () => {
        const calls = mockLeaderboardTable({ id: 'r', score: 80, result: 'won' }, []);
        await leaderboard.submitScore('u', 'London', null, 20, 'connections', { result: 'lost', mistakes: 4 });
        expect(calls).toHaveLength(0);
    });
});

describe('submitScore puzzle date (offline-sync risk 2)', () => {
    it('files the score under the given puzzle date, not the UTC submission date', async () => {
        const calls = mockLeaderboardTable(null, [{ error: null }]);
        await leaderboard.submitScore('u', 'London', null, 70, 'connections', { gameDate: '2026-10-20' });
        expect(calls[0].body).toMatchObject({ game_date: '2026-10-20' });
    });
    it('defaults to the local date (00:30 BST is still the same day)', async () => {
        jest.useFakeTimers().setSystemTime(new Date(2026, 9, 25, 0, 30));
        const calls = mockLeaderboardTable(null, [{ error: null }]);
        await leaderboard.submitScore('u', 'London', null, 70, 'connections');
        expect(calls[0].body).toMatchObject({ game_date: '2026-10-25' });
        jest.useRealTimers();
    });
    it('retries as an update after a unique-violation race', async () => {
        const calls = mockLeaderboardTable(null, [{ error: { code: '23505' } }, { error: null }]);
        await leaderboard.submitScore('u', 'London', null, 70, 'connections', { gameDate: '2026-10-20' });
        expect(calls).toHaveLength(2);
    });
});

describe('getWeeklyLeaderboard borough option', () => {
    it('passes p_borough when given', async () => {
        mockRpc.mockResolvedValue({ data: [row('a', 'Camden', 1)], error: null });
        await leaderboard.getWeeklyLeaderboard('connections', '2026-10-19', '2026-10-25', 'London', 'Camden');
        expect(mockRpc).toHaveBeenCalledWith('get_weekly_leaderboard', expect.objectContaining({ p_city: 'London', p_borough: 'Camden' }));
    });
    it('omits p_borough otherwise (old 4-arg signature)', async () => {
        mockRpc.mockResolvedValue({ data: [], error: null });
        await leaderboard.getWeeklyLeaderboard('connections', '2026-10-19', '2026-10-25', 'Leeds');
        expect(mockRpc.mock.calls[0][1]).not.toHaveProperty('p_borough');
    });
    it('falls back to client-side borough filtering when the RPC is not deployed', async () => {
        mockRpc
            .mockResolvedValueOnce({ data: null, error: MISSING_FN })
            .mockResolvedValueOnce({ data: [row('a', 'Hackney', 1), row('b', 'Camden', 2), row('c', 'Camden', 3)], error: null });
        const res = await leaderboard.getWeeklyLeaderboard('connections', '2026-10-19', '2026-10-25', 'London', 'Camden');
        expect(res.totalPlayers).toBe(2);
        expect(res.entries.map((e) => [e.userId, e.rank])).toEqual([['b', 1], ['c', 2]]);
    });
    it('filterAndRerank / isMissingSchemaError', () => {
        expect(filterAndRerank([row('x', 'A', 4)], 'B')).toEqual([]);
        expect(isMissingSchemaError(MISSING_FN)).toBe(true);
        expect(isMissingSchemaError({ code: '42501' })).toBe(false);
        expect(isMissingSchemaError(null)).toBe(false);
    });
});
