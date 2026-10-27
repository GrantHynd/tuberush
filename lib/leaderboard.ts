import { supabase } from './supabase-client';
import { EMPTY_VALUE } from './display-utils';
import { LeaderboardEntry, GameType, WeeklyLeaderboardEntry, BoroughBreakdownEntry } from '@/types/game';
import { Borough } from '@/constants/Boroughs';
import type { User } from '@/types/game';
import { toLocalDateString } from './week-utils';

export type LeaderboardFilter = 'all' | 'london' | 'area';

export type GameResult = 'won' | 'lost';

export interface SubmitScoreOptions {
    /** Real outcome. Defaults to 'won' (every pre-TUB-257 submission was a win/completion). */
    result?: GameResult;
    /** Connections mistakes used (0-4). */
    mistakes?: number | null;
    /**
     * The puzzle's date (YYYY-MM-DD). Scores are filed under the puzzle, not the submission time
     * (offline-sync audit risk 2 / TUB-235). Falls back to the device's local date.
     */
    gameDate?: string;
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

/** 42P10: no unique index/constraint matching the ON CONFLICT target (20261025000001 not applied). */
export function isMissingOnConflictIndexError(error: { code?: string } | null | undefined): boolean {
    return error?.code === '42P10';
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
    ): Promise<void> {
        const result: GameResult = options.result ?? 'won';
        const mistakes = options.mistakes ?? null;
        const gameDate = options.gameDate ?? toLocalDateString(new Date());

        // Pre-read keeps "better result wins": a worse submission never reaches the write.
        // The write itself is a single upsert on leaderboard_user_game_date_key
        // (20261025000001). If that index isn't deployed yet (42P10), fall back to the
        // old read-then-insert/update path, retrying once as an update on a 23505 race.
        const { data: existingScore } = await supabase
            .from('leaderboard')
            .select('*')
            .eq('user_id', userId)
            .eq('game_date', gameDate)
            .eq('game_type', gameType)
            .single();

        if (existingScore && !shouldReplaceScore(existingScore, { score, result })) return;

        const legacyPayload = { city, borough, score };
        const payload = { ...legacyPayload, result, mistakes };
        const key = { user_id: userId, game_type: gameType, game_date: gameDate };

        const writeWithSchemaFallback = async (
            write: (body: typeof legacyPayload | typeof payload) => PromiseLike<{ error: any }>
        ): Promise<{ error: any } | null> => {
            let res = await write(payload);
            if (res.error && isMissingSchemaError(res.error)) {
                // Migration not applied yet: losses can't be stored safely (they'd count towards ranks).
                if (result === 'lost') return null;
                res = await write(legacyPayload);
            }
            return res;
        };

        const upserted = await writeWithSchemaFallback((body) =>
            supabase.from('leaderboard').upsert({ ...key, ...body }, { onConflict: 'user_id,game_type,game_date' })
        );
        if (!upserted) return;
        if (!upserted.error) return;
        if (!isMissingOnConflictIndexError(upserted.error)) throw upserted.error;

        // Fallback: unique index missing -> legacy read-then-insert/update.
        let existing = existingScore;
        for (let attempt = 0; attempt < 2; attempt++) {
            if (attempt > 0) {
                ({ data: existing } = await supabase
                    .from('leaderboard')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('game_date', gameDate)
                    .eq('game_type', gameType)
                    .single());
                if (existing && !shouldReplaceScore(existing, { score, result })) return;
            }
            const row = existing;
            const res = await writeWithSchemaFallback((body) =>
                row
                    ? supabase.from('leaderboard').update(body).eq('id', row.id)
                    : supabase.from('leaderboard').insert({ ...key, ...body })
            );
            if (!res) return;
            if (res.error && res.error.code === '23505' && !row && attempt === 0) continue;
            if (res.error) throw res.error;
            return;
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
};
