/**
 * Unit tests for TUB-230: Leaderboard Security Fix
 * Ensures RPC clients map usernames (not emails) and the migration
 * withholds emails / anon execute access.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { supabase } from '@/lib/supabase-client';
import { leaderboard } from '@/lib/leaderboard';
import { getDisplayName } from '@/lib/display-utils';

const mockRpc = supabase.rpc as jest.Mock;

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

        it('falls back to a name derived from email only when username is missing', () => {
            expect(getDisplayName('', 'jane.doe@example.com')).toBe('Jane Doe');
        });

        it('returns Anonymous when neither username nor email is available', () => {
            expect(getDisplayName('')).toBe('Anonymous');
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
});
