import { supabase } from './supabase-client';
import { LeaderboardEntry, GameType } from '@/types/game';
import { Borough } from '@/constants/Boroughs';
import type { User } from '@/types/game';

export type LeaderboardFilter = 'all' | 'london' | 'area';

/** Display string for a leaderboard entry: London → borough, else → city */
export function getLocationDisplay(entry: {
    city?: string | null;
    borough?: string | null;
}): string {
    const city = entry.city ?? null;
    const borough = entry.borough ?? null;
    if (city === 'London' && borough) {
        return borough;
    }
    return city || borough || '—';
}

export const leaderboard = {
    /**
     * Submit a score to the leaderboard.
     * Only updates if the new score is better (lower time) or if no score exists for today.
     */
    async submitScore(
        userId: string,
        city: string,
        borough: Borough | null,
        score: number,
        gameType: GameType
    ) {
        const today = new Date().toISOString().split('T')[0];

        const { data: existingScore } = await supabase
            .from('leaderboard')
            .select('*')
            .eq('user_id', userId)
            .eq('game_date', today)
            .eq('game_type', gameType)
            .single();

        const payload = { city, borough, score };

        if (existingScore) {
            if (score < existingScore.score) {
                const { error } = await supabase
                    .from('leaderboard')
                    .update(payload)
                    .eq('id', existingScore.id);

                if (error) throw error;
            }
        } else {
            const { error } = await supabase.from('leaderboard').insert({
                user_id: userId,
                ...payload,
                game_type: gameType,
                game_date: today,
            });

            if (error) throw error;
        }
    },

    /**
     * Get leaderboard for a specific game and date, with optional filter.
     */
    async getLeaderboard(
        gameType: GameType,
        date?: string,
        filter?: LeaderboardFilter,
        user?: User | null
    ) {
        const queryDate = date || new Date().toISOString().split('T')[0];

        let query = supabase
            .from('leaderboard')
            .select(
                `
                *,
                profiles:user_id (email)
            `
            )
            .eq('game_date', queryDate)
            .eq('game_type', gameType)
            .order('score', { ascending: true })
            .limit(50);

        if (filter === 'london') {
            query = query.eq('city', 'London');
        } else if (filter === 'area' && user?.city) {
            query = query.eq('city', user.city);
            if (user.city === 'London' && user.borough) {
                query = query.eq('borough', user.borough);
            }
        }

        const { data, error } = await query;
        if (error) throw error;

        return data as (LeaderboardEntry & { profiles: { email: string } })[];
    },

    /**
     * Get user's rank for today.
     */
    async getUserRank(
        userId: string,
        gameType: GameType,
        date?: string,
        filter?: LeaderboardFilter,
        user?: User | null
    ) {
        const data = await this.getLeaderboard(gameType, date, filter, user);
        const index = data.findIndex(
            (entry: { user_id?: string; userId?: string }) =>
                (entry.user_id ?? entry.userId) === userId
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
