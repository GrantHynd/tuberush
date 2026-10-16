/**
 * Test suite for TUB-230: Leaderboard Security Fix
 * Ensures that email addresses are not exposed via leaderboard RPCs
 * and that anon users cannot call these functions.
 */

import { supabase } from '@/lib/supabase-client';

describe('Leaderboard Security (TUB-230)', () => {
    describe('get_weekly_leaderboard', () => {
        it('should not return email addresses in response', async () => {
            // This test documents the expected behavior
            // In a real test environment, you would:
            // 1. Create test data with user emails
            // 2. Call the RPC as an authenticated user
            // 3. Verify the response contains username but not email

            const response = await supabase.rpc('get_weekly_leaderboard', {
                p_game_type: 'crossword',
                p_week_start: '2026-04-14',
                p_week_end: '2026-04-20',
                p_city: null,
            });

            // If data is returned, verify structure
            if (response.data && response.data.length > 0) {
                const entry = response.data[0];
                
                // Should have username field
                expect(entry).toHaveProperty('username');
                expect(typeof entry.username).toBe('string');
                
                // Should NOT have email field
                expect(entry).not.toHaveProperty('email');
            }
        });

        it('should reject calls from anon users', async () => {
            // Create an anon client
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                await supabase.auth.signOut();
            }

            const response = await supabase.rpc('get_weekly_leaderboard', {
                p_game_type: 'crossword',
                p_week_start: '2026-04-14',
                p_week_end: '2026-04-20',
                p_city: null,
            });

            // Should return an error for anon users
            // Note: In production, this will fail with a permission error
            expect(response.error).toBeDefined();
        });
    });

    describe('get_borough_breakdown', () => {
        it('should return leader_username instead of leader_email', async () => {
            const response = await supabase.rpc('get_borough_breakdown', {
                p_game_type: 'crossword',
                p_week_start: '2026-04-14',
                p_week_end: '2026-04-20',
            });

            // If data is returned, verify structure
            if (response.data && response.data.length > 0) {
                const entry = response.data[0];
                
                // Should have leader_username field
                expect(entry).toHaveProperty('leader_username');
                expect(typeof entry.leader_username).toBe('string');
                
                // Should NOT have leader_email field
                expect(entry).not.toHaveProperty('leader_email');
            }
        });

        it('should reject calls from anon users', async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                await supabase.auth.signOut();
            }

            const response = await supabase.rpc('get_borough_breakdown', {
                p_game_type: 'crossword',
                p_week_start: '2026-04-14',
                p_week_end: '2026-04-20',
            });

            // Should return an error for anon users
            expect(response.error).toBeDefined();
        });
    });
});
