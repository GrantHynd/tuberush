import { supabase } from './supabase-client';
import { EMPTY_VALUE } from './display-utils';
import { LeaderboardEntry, GameType, WeeklyLeaderboardEntry, BoroughBreakdownEntry, CityPlayerCount } from '@/types/game';
import { Borough } from '@/constants/Boroughs';
import type { User } from '@/types/game';

export type LeaderboardFilter = 'all' | 'london' | 'area';

export type GameResult = 'won' | 'lost';

export interface SubmitScoreOptions {
    /** Real outcome. Defaults to 'won' (every pre-TUB-257 submission was a win/completion). */
    result?: GameResult;
    /** Connections mistakes used (0-4). */
    mistakes?: number | null;
}

/**
 * True when PostgREST says a column/function from migration 20261024000002 isn't there yet
 * (PGRST204 unknown column, PGRST202 unknown function signature, 42703 undefined column).
 * Lets this build ship before the migration is applied.
 */
export function isMissingSchemaError(error: { code?: string; message?: string } | null | undefined): boolean {
    if (!error) return false;
    return ['PGRST204', 'PGRST202', '42703'].includes(error.code ?? '');
}

/** A new submission replaces the stored one if it's a win over a loss, or a faster game of the same outcome. */
export function shouldReplaceScore(
    existing: { score: number; result?: GameResult | null },
    next: { score: number; result: GameResult },
): boolean {
    const existingResult: GameResult = existing.result ?? 'won';
    if (existingResult !== next.result) return next.result === 'won';
    return next.score < existing.score;
}

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
    return city || borough || EMPTY_VALUE;
}

type WeeklyRow = {
    user_id: string;
    username: string;
    city: string | null;
    borough: string | null;
    total_score: number;
    games_played: number;
    rank: number;
    total_players: number;
};

/** Client-side borough filter used only until the p_borough RPC is deployed. */
export function filterAndRerank(rows: WeeklyRow[], borough: string): WeeklyRow[] {
    const kept = rows.filter((r) => r.borough === borough);
    return kept.map((r, i) => ({ ...r, rank: i + 1, total_players: kept.length }));
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
        gameType: GameType,
        options: SubmitScoreOptions = {}
    ) {
        const result: GameResult = options.result ?? 'won';
        const mistakes = options.mistakes ?? null;
        const today = new Date().toISOString().split('T')[0];

        const { data: existingScore } = await supabase
            .from('leaderboard')
            .select('*')
            .eq('user_id', userId)
            .eq('game_date', today)
            .eq('game_type', gameType)
            .single();

        const legacyPayload = { city, borough, score };
        const payload = { ...legacyPayload, result, mistakes };

        if (existingScore && !shouldReplaceScore(existingScore, { score, result })) return;

        const write = (body: typeof legacyPayload | typeof payload) =>
            existingScore
                ? supabase.from('leaderboard').update(body).eq('id', existingScore.id)
                : supabase.from('leaderboard').insert({
                      user_id: userId,
                      ...body,
                      game_type: gameType,
                      game_date: today,
                  });

        let { error } = await write(payload);
        if (error && isMissingSchemaError(error)) {
            // Migration not applied yet: losses can't be stored safely (they'd count towards ranks).
            if (result === 'lost') return;
            ({ error } = await write(legacyPayload));
        }
        if (error) throw error;
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

        const build = (excludeLost: boolean) => {
        let query = supabase
            .from('leaderboard')
            .select(
                `
                *,
                profiles:user_id (username)
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

        if (excludeLost) query = query.or('result.is.null,result.neq.lost');
        return query;
        };

        let { data, error } = await build(true);
        if (error && isMissingSchemaError(error)) ({ data, error } = await build(false));
        if (error) throw error;

        return data as (LeaderboardEntry & { profiles: { username: string | null } | null })[];
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
        const build = (excludeLost: boolean) => {
            let q = supabase.from('leaderboard').select('score').eq('user_id', userId).eq('game_type', gameType);
            if (excludeLost) q = q.or('result.is.null,result.neq.lost');
            return q.order('score', { ascending: true }).limit(1).maybeSingle();
        };
        let { data, error } = await build(true);
        if (error && isMissingSchemaError(error)) ({ data, error } = await build(false));

        if (error || !data) return null;
        return data.score;
    },

    /**
     * Weekly leaderboard — ranked list with aggregated scores for a date range.
     */
    async getWeeklyLeaderboard(
        gameType: GameType,
        weekStart: string,
        weekEnd: string,
        city?: string | null,
        borough?: string | null
    ): Promise<{ entries: WeeklyLeaderboardEntry[]; totalPlayers: number }> {
        const base = {
            p_game_type: gameType,
            p_week_start: weekStart,
            p_week_end: weekEnd,
            p_city: city ?? null,
        };
        let { data, error } = borough
            ? await supabase.rpc('get_weekly_leaderboard', { ...base, p_borough: borough })
            : await supabase.rpc('get_weekly_leaderboard', base);
        if (borough && error && isMissingSchemaError(error)) {
            // Pre-migration RPC has no p_borough: fetch the city board and filter by borough here.
            ({ data, error } = await supabase.rpc('get_weekly_leaderboard', base));
            if (!error) data = filterAndRerank((data ?? []) as WeeklyRow[], borough);
        }

        if (error) throw error;

        const rows = (data ?? []) as WeeklyRow[];

        const totalPlayers = rows.length > 0 ? rows[0].total_players : 0;

        const entries: WeeklyLeaderboardEntry[] = rows.map((r) => ({
            userId: r.user_id,
            username: r.username,
            city: r.city,
            borough: r.borough,
            totalScore: r.total_score,
            gamesPlayed: r.games_played,
            rank: r.rank,
        }));

        return { entries, totalPlayers };
    },

    /**
     * Borough breakdown — aggregated stats per London borough for a week.
     */
    async getBoroughBreakdown(
        gameType: GameType,
        weekStart: string,
        weekEnd: string
    ): Promise<BoroughBreakdownEntry[]> {
        const { data, error } = await supabase.rpc('get_borough_breakdown', {
            p_game_type: gameType,
            p_week_start: weekStart,
            p_week_end: weekEnd,
        });

        if (error) throw error;

        return ((data ?? []) as {
            borough: string;
            commuter_count: number;
            leader_username: string;
            top_score: number;
        }[]).map((r) => ({
            borough: r.borough,
            commuterCount: r.commuter_count,
            leaderUsername: r.leader_username,
            topScore: r.top_score,
        }));
    },

    /**
     * Available cities with player counts for a given week and game type.
     */
    async getAvailableCities(
        gameType: GameType,
        weekStart: string,
        weekEnd: string
    ): Promise<CityPlayerCount[]> {
        const { data, error } = await supabase.rpc('get_available_cities', {
            p_game_type: gameType,
            p_week_start: weekStart,
            p_week_end: weekEnd,
        });

        if (error) throw error;

        return ((data ?? []) as { city: string; player_count: number }[]).map(
            (r) => ({
                city: r.city,
                playerCount: r.player_count,
            })
        );
    },
};
