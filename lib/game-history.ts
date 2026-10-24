import type { GameType } from '@/types/game';

export interface GameHistoryEntry {
    id: string;
    gameType: GameType;
    date: string;
    score: number;
    result: 'win' | 'loss';
    points: number;
    /** Connections mistakes used, when recorded server-side (TUB-257). */
    mistakes: number | null;
}

const POINT_BANDS: { underSeconds: number; points: number }[] = [
    { underSeconds: 60, points: 32 },
    { underSeconds: 120, points: 18 },
    { underSeconds: 180, points: 8 },
    { underSeconds: 240, points: 4 },
    { underSeconds: 300, points: 3 },
];

/** Points for a submitted time. Both games share these bands. */
export function scoreToPoints(scoreSeconds: number): number {
    const band = POINT_BANDS.find((entry) => scoreSeconds < entry.underSeconds);
    return band?.points ?? 2;
}

export function toGameHistoryEntry(row: {
    id: string;
    game_type: GameType;
    game_date: string;
    score: number;
    result?: 'won' | 'lost' | null;
    mistakes?: number | null;
}): GameHistoryEntry {
    // TUB-257: use the stored outcome. Rows written before it was stored were only ever
    // submitted on a win/completion, so a missing result means "win".
    const result: 'win' | 'loss' = row.result === 'lost' ? 'loss' : 'win';
    return {
        id: row.id,
        gameType: row.game_type,
        date: row.game_date,
        score: row.score,
        result,
        points: result === 'loss' ? 0 : scoreToPoints(row.score),
        mistakes: row.mistakes ?? null,
    };
}
