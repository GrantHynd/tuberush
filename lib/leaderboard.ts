import { supabase } from './supabase-client';
import { LeaderboardEntry, GameType } from '@/types/game';
import { Borough } from '@/constants/Boroughs';

export const leaderboard = {
    /**
     * Submit a score to the leaderboard.
     * Only updates if the new score is better (lower time) or if no score exists for today.
     */
    async submitScore(userId: string, borough: Borough, score: number, gameType: GameType) {
        const today = new Date().toISOString().split('T')[0];

        // Check if score exists for today
        const { data: existingScore } = await supabase
            .from('leaderboard')
            .select('*')
            .eq('user_id', userId)
            .eq('game_date', today)
            .eq('game_type', gameType)
            .single();

        if (existingScore) {
            // Update only if better (lower time)
            if (score < existingScore.score) {
                const { error } = await supabase
                    .from('leaderboard')
                    .update({ score, borough }) // Update borough in case user moved
                    .eq('id', existingScore.id);

                if (error) throw error;
            }
        } else {
            // Insert new score
            const { error } = await supabase
                .from('leaderboard')
                .insert({
                    user_id: userId,
                    borough,
                    score,
                    game_type: gameType,
                    game_date: today,
                });

            if (error) throw error;
        }
    },

    /**
     * Get leaderboard for a specific game and date, optionally filtered by borough.
     */
    async getLeaderboard(gameType: GameType, date?: string, borough?: Borough) {
        const queryDate = date || new Date().toISOString().split('T')[0];

        let query = supabase
            .from('leaderboard')
            .select(`
                *,
                profiles:user_id (email)
            `)
            .eq('game_date', queryDate)
            .eq('game_type', gameType)
            .order('score', { ascending: true })
            .limit(50);

        if (borough) {
            query = query.eq('borough', borough);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data as (LeaderboardEntry & { profiles: { email: string } })[];
    },

    /**
     * Get user's rank for today.
     */
    async getUserRank(userId: string, gameType: GameType, date?: string, borough?: Borough) {
        const data = await this.getLeaderboard(gameType, date, borough);
        const index = data.findIndex(
            (entry: { user_id?: string; userId?: string }) =>
                (entry.user_id ?? entry.userId) === userId,
        );
        return index !== -1 ? index + 1 : null;
    },

    /**
     * Get user's best (lowest) score across all time for a game type.
     */
    async getUserBestScore(userId: string, gameType: GameType): Promise<number | null> {
        const { data, error } = await supabase
            .from('leaderboard')
            .select('score')
            .eq('user_id', userId)
            .eq('game_type', gameType)
            .order('score', { ascending: true })
            .limit(1)
            .single();

        if (error || !data) return null;
        return data.score;
    },
};
