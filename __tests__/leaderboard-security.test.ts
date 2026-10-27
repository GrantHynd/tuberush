/**
 * Unit tests for TUB-230: Leaderboard Security Fix
 * Ensures RPC clients map usernames (not emails) and the migration
 * withholds emails / anon execute access.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { supabase } from '@/lib/supabase-client';
import { leaderboard, mergeProfileUsernames } from '@/lib/leaderboard';
import { getDisplayName } from '@/lib/display-utils';

const mockRpc = supabase.rpc as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

const LOCKDOWN_SQL = readFileSync(
    join(
        __dirname,
        '../supabase/migrations/20261027000001_lock_rpc_execute_and_leaderboard_usernames.sql',
    ),
    'utf8',
);

function mockDailyLeaderboardQuery(rows: object[]) {
    const result = { data: rows, error: null };
    const chain: Record<string, unknown> = {};
    chain.select = jest.fn(() => chain);
    chain.eq = jest.fn(() => chain);
    chain.order = jest.fn(() => chain);
    chain.limit = jest.fn(() => chain);
    chain.or = jest.fn(() => chain);
    chain.then = (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
        Promise.resolve(result).then(onFulfilled, onRejected);
    mockFrom.mockReturnValue(chain);
    return chain;
}

const WEEKLY_PARAMS = {
    p_game_type: 'crossword',
    p_week_start: '2026-04-14',
    p_week_end: '2026-04-20',
    p_city: null,
};

const PERMISSION_ERROR = {
    message: 'permission denied for function get_weekly_leaderboard',
    code: '42501',
};

beforeEach(() => {
    jest.clearAllMocks();
});

describe('Leaderboard Security (TUB-230)', () => {
    describe('get_weekly_leaderboard', () => {
        it('should not return email addresses in response', async () => {
            mockRpc.mockResolvedValue({
                data: [
                    {
                        user_id: 'user-1',
                        username: 'tube_runner',
                        city: 'London',
                        borough: 'Camden',
                        total_score: 120,
                        games_played: 3,
                        rank: 1,
                        total_players: 10,
                    },
                ],
                error: null,
            });

            const { entries } = await leaderboard.getWeeklyLeaderboard(
                'crossword',
                '2026-04-14',
                '2026-04-20',
            );

            expect(mockRpc).toHaveBeenCalledWith('get_weekly_leaderboard', WEEKLY_PARAMS);

            const entry = entries[0];
            expect(entry).toHaveProperty('username');
            expect(typeof entry.username).toBe('string');
            expect(entry.username).toBe('tube_runner');
            expect(entry).not.toHaveProperty('email');
        });

        it('should reject calls from anon users', async () => {
            mockRpc.mockResolvedValue({
                data: null,
                error: PERMISSION_ERROR,
            });

            await expect(
                leaderboard.getWeeklyLeaderboard(
                    'crossword',
                    '2026-04-14',
                    '2026-04-20',
                ),
            ).rejects.toMatchObject(PERMISSION_ERROR);
        });
    });

    describe('get_borough_breakdown', () => {
        it('should return leader_username instead of leader_email', async () => {
            mockRpc.mockResolvedValue({
                data: [
                    {
                        borough: 'Camden',
                        commuter_count: 12,
                        leader_username: 'tube_runner',
                        top_score: 95,
                    },
                ],
                error: null,
            });

            const entries = await leaderboard.getBoroughBreakdown(
                'crossword',
                '2026-04-14',
                '2026-04-20',
            );

            expect(mockRpc).toHaveBeenCalledWith('get_borough_breakdown', {
                p_game_type: 'crossword',
                p_week_start: '2026-04-14',
                p_week_end: '2026-04-20',
            });

            const entry = entries[0];
            expect(entry).toHaveProperty('leaderUsername');
            expect(typeof entry.leaderUsername).toBe('string');
            expect(entry.leaderUsername).toBe('tube_runner');
            expect(entry).not.toHaveProperty('leaderEmail');
            expect(entry).not.toHaveProperty('leader_email');
        });

        it('should reject calls from anon users', async () => {
            const boroughPermissionError = {
                ...PERMISSION_ERROR,
                message: 'permission denied for function get_borough_breakdown',
            };
            mockRpc.mockResolvedValue({
                data: null,
                error: boroughPermissionError,
            });

            await expect(
                leaderboard.getBoroughBreakdown(
                    'crossword',
                    '2026-04-14',
                    '2026-04-20',
                ),
            ).rejects.toMatchObject(boroughPermissionError);
        });
    });

    describe('getDisplayName', () => {
        it('uses username and never falls back to email when username is present', () => {
            expect(getDisplayName('tube_runner', 'secret@example.com')).toBe(
                'tube_runner',
            );
        });

        it('never derives a name from email when username is missing (TUB-268)', () => {
            expect(getDisplayName('', 'jane.doe@example.com')).not.toMatch(/jane|doe/i);
            expect(getDisplayName('', 'user-1')).toMatch(/^Commuter \d{4}$/);
        });
    });

    describe('TUB-268 migration', () => {
        const sql = readFileSync(
            join(__dirname, '../supabase/migrations/20261024000001_stop_email_derived_usernames.sql'),
            'utf8',
        );

        it('no longer falls back to the email local part in handle_new_user', () => {
            const fn = sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.handle_new_user'), sql.indexOf('$$;'));
            expect(fn).not.toMatch(/SPLIT_PART\(NEW\.email/i);
        });

        it('clears backfilled email-derived usernames', () => {
            expect(sql).toMatch(/SET username = NULL/);
        });
    });

    describe('security migration', () => {
        const sql = readFileSync(
            join(
                __dirname,
                '../supabase/migrations/20260415000001_add_username_fix_leaderboard_security.sql',
            ),
            'utf8',
        );

        it('returns username instead of email from get_weekly_leaderboard', () => {
            expect(sql).toMatch(/username TEXT/);
            expect(sql).toMatch(/r\.username/);
            expect(sql).not.toMatch(/leader_email/);
            expect(sql).not.toMatch(/r\.email/);
        });

        it('returns leader_username instead of leader_email from get_borough_breakdown', () => {
            expect(sql).toMatch(/leader_username TEXT/);
            expect(sql).toMatch(/bl\.uname AS leader_username/);
        });

        it('revokes public and anon execute on leaderboard RPCs', () => {
            expect(sql).toMatch(
                /REVOKE ALL ON FUNCTION get_weekly_leaderboard\(TEXT, DATE, DATE, TEXT\) FROM PUBLIC/,
            );
            expect(sql).toMatch(
                /REVOKE ALL ON FUNCTION get_weekly_leaderboard\(TEXT, DATE, DATE, TEXT\) FROM anon/,
            );
            expect(sql).toMatch(
                /REVOKE ALL ON FUNCTION get_borough_breakdown\(TEXT, DATE, DATE\) FROM PUBLIC/,
            );
            expect(sql).toMatch(
                /REVOKE ALL ON FUNCTION get_borough_breakdown\(TEXT, DATE, DATE\) FROM anon/,
            );
        });
    });

    describe('migration 20261027000001', () => {
        const sql = LOCKDOWN_SQL;

        function sliceFunction(name: string, until: string): string {
            const start = sql.indexOf(name);
            expect(start).toBeGreaterThanOrEqual(0);
            const end = sql.indexOf(until, start);
            expect(end).toBeGreaterThan(start);
            return sql.slice(start, end);
        }

        it('locks nextval_text to the two puzzle sequences and service_role', () => {
            const fn = sliceFunction(
                'CREATE OR REPLACE FUNCTION public.nextval_text(seq_name TEXT)',
                'CREATE OR REPLACE FUNCTION public.get_connections_play_count',
            );
            expect(fn).toMatch(/SET search_path = ''/);
            expect(fn).toMatch(/WHEN 'connections_puzzle_id_seq'/);
            expect(fn).toMatch(/WHEN 'crossword_puzzle_id_seq'/);
            expect(fn).toMatch(/pg_catalog\.nextval\('public\.connections_puzzle_id_seq'/);
            expect(fn).toMatch(/pg_catalog\.nextval\('public\.crossword_puzzle_id_seq'/);
            expect(fn).not.toMatch(/nextval\s*\(\s*seq_name\s*\)/);
            expect(fn).toMatch(/sequence not allowed/);

            expect(sql).toMatch(/REVOKE ALL ON FUNCTION nextval_text\(TEXT\) FROM PUBLIC/);
            expect(sql).toMatch(/REVOKE ALL ON FUNCTION nextval_text\(TEXT\) FROM anon/);
            expect(sql).toMatch(/REVOKE ALL ON FUNCTION nextval_text\(TEXT\) FROM authenticated/);
            expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION nextval_text\(TEXT\) TO service_role/);
            expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION nextval_text\(TEXT\) TO anon/);
            expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION nextval_text\(TEXT\) TO authenticated/);
            expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION nextval_text\(TEXT\) TO PUBLIC/);
        });

        it('sets empty search_path and grants play-count RPCs to authenticated only', () => {
            const locked = [
                [/REVOKE ALL ON FUNCTION get_connections_play_count\(TEXT\) FROM PUBLIC/, /REVOKE ALL ON FUNCTION get_connections_play_count\(TEXT\) FROM anon/, /GRANT EXECUTE ON FUNCTION get_connections_play_count\(TEXT\) TO authenticated/, /GRANT EXECUTE ON FUNCTION get_connections_play_count\(TEXT\) TO anon/],
                [/REVOKE ALL ON FUNCTION get_connections_play_counts\(TEXT\[\]\) FROM PUBLIC/, /REVOKE ALL ON FUNCTION get_connections_play_counts\(TEXT\[\]\) FROM anon/, /GRANT EXECUTE ON FUNCTION get_connections_play_counts\(TEXT\[\]\) TO authenticated/, /GRANT EXECUTE ON FUNCTION get_connections_play_counts\(TEXT\[\]\) TO anon/],
                [/REVOKE ALL ON FUNCTION get_crossword_play_count\(TEXT\) FROM PUBLIC/, /REVOKE ALL ON FUNCTION get_crossword_play_count\(TEXT\) FROM anon/, /GRANT EXECUTE ON FUNCTION get_crossword_play_count\(TEXT\) TO authenticated/, /GRANT EXECUTE ON FUNCTION get_crossword_play_count\(TEXT\) TO anon/],
                [/REVOKE ALL ON FUNCTION get_crossword_play_counts\(TEXT\[\]\) FROM PUBLIC/, /REVOKE ALL ON FUNCTION get_crossword_play_counts\(TEXT\[\]\) FROM anon/, /GRANT EXECUTE ON FUNCTION get_crossword_play_counts\(TEXT\[\]\) TO authenticated/, /GRANT EXECUTE ON FUNCTION get_crossword_play_counts\(TEXT\[\]\) TO anon/],
            ] as const;
            for (const [fromPublic, fromAnon, toAuthenticated, toAnon] of locked) {
                expect(sql).toMatch(fromPublic);
                expect(sql).toMatch(fromAnon);
                expect(sql).toMatch(toAuthenticated);
                expect(sql).not.toMatch(toAnon);
            }

            const bodies = [
                sliceFunction(
                    'CREATE OR REPLACE FUNCTION public.get_connections_play_count(puzzle_date TEXT)',
                    'CREATE OR REPLACE FUNCTION public.get_connections_play_counts',
                ),
                sliceFunction(
                    'CREATE OR REPLACE FUNCTION public.get_connections_play_counts(puzzle_dates TEXT[])',
                    'CREATE OR REPLACE FUNCTION public.get_crossword_play_count',
                ),
                sliceFunction(
                    'CREATE OR REPLACE FUNCTION public.get_crossword_play_count(puzzle_id TEXT)',
                    'CREATE OR REPLACE FUNCTION public.get_crossword_play_counts',
                ),
                sliceFunction(
                    'CREATE OR REPLACE FUNCTION public.get_crossword_play_counts(puzzle_ids TEXT[])',
                    'CREATE OR REPLACE FUNCTION public.get_profile_usernames',
                ),
            ];
            for (const body of bodies) {
                expect(body).toMatch(/SET search_path = ''/);
                expect(body).toMatch(/FROM public\.game_states/);
                expect(body).not.toMatch(/FROM game_states/);
            }
        });

        it('revokes the anon INSERT and UPDATE on profiles from 20261017154551', () => {
            expect(sql).toMatch(/REVOKE INSERT, UPDATE ON TABLE public\.profiles FROM anon/);
            expect(sql).not.toMatch(/REVOKE INSERT, UPDATE ON TABLE public\.profiles FROM authenticated/);
            expect(sql).not.toMatch(/GRANT INSERT, UPDATE ON TABLE public\.profiles TO anon/);
        });

        it('reads daily-board usernames through a column-limited security-definer RPC', () => {
            const fn = sliceFunction(
                'CREATE OR REPLACE FUNCTION public.get_profile_usernames(p_ids UUID[])',
                'REVOKE ALL ON FUNCTION nextval_text',
            );
            expect(fn).toMatch(/SECURITY DEFINER/);
            expect(fn).toMatch(/SET search_path = ''/);
            expect(fn).toMatch(/RETURNS TABLE \(id UUID, username TEXT\)/);
            expect(fn).toMatch(/SELECT p\.id, p\.username/);
            expect(fn).toMatch(/FROM public\.profiles p/);
            expect(fn).toMatch(/FROM public\.leaderboard l/);
            expect(fn).not.toMatch(/email/i);
            expect(sql).toMatch(/REVOKE ALL ON FUNCTION get_profile_usernames\(UUID\[\]\) FROM PUBLIC/);
            expect(sql).toMatch(/REVOKE ALL ON FUNCTION get_profile_usernames\(UUID\[\]\) FROM anon/);
            expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION get_profile_usernames\(UUID\[\]\) TO authenticated/);
        });
    });

    describe('daily leaderboard usernames', () => {
        const otherPlayer = {
            id: 'row-1',
            user_id: 'other-user',
            city: 'London',
            borough: 'Camden',
            score: 42,
            profiles: null,
        };

        it('fills other players from get_profile_usernames and does not copy email', async () => {
            mockDailyLeaderboardQuery([otherPlayer]);
            mockRpc.mockResolvedValue({
                data: [{ id: 'other-user', username: 'tube_runner', email: 'secret@example.com' }],
                error: null,
            });

            const rows = await leaderboard.getLeaderboard('crossword', '2026-10-27');

            expect(mockRpc).toHaveBeenCalledWith('get_profile_usernames', {
                p_ids: ['other-user'],
            });
            expect(rows[0].profiles).toEqual({ username: 'tube_runner' });
            expect(rows[0].profiles).not.toHaveProperty('email');
            expect(rows[0]).not.toHaveProperty('email');
            expect(JSON.stringify(rows[0])).not.toMatch(/secret@example.com/);
        });

        it('still returns scores when the username RPC is not deployed yet', async () => {
            mockDailyLeaderboardQuery([otherPlayer]);
            mockRpc.mockResolvedValue({
                data: null,
                error: { code: 'PGRST202', message: 'Could not find the function' },
            });

            const rows = await leaderboard.getLeaderboard('crossword', '2026-10-27');

            expect(rows[0].score).toBe(42);
            expect(rows[0].profiles).toBeNull();
        });

        it('mergeProfileUsernames keeps rows the RPC did not return', () => {
            const merged = mergeProfileUsernames(
                [otherPlayer, { ...otherPlayer, id: 'row-2', user_id: 'self', profiles: { username: 'me' } }],
                [{ id: 'other-user', username: 'tube_runner' }],
            );
            expect(merged[0].profiles).toEqual({ username: 'tube_runner' });
            expect(merged[1].profiles).toEqual({ username: 'me' });
        });
    });
});
