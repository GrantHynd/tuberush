import type { GameType } from '@/types/game';

export interface GameHistoryEntry {
    id: string;
    gameType: GameType;
    date: string;
    score: number;
    result: 'win' | 'loss';
    points: number;
}

/** A submitted time under this many seconds counts as a win on the stats screen. */
export const HISTORY_WIN_UNDER_SECONDS = 600;

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

export function scoreToResult(scoreSeconds: number): 'win' | 'loss' {
    return scoreSeconds < HISTORY_WIN_UNDER_SECONDS ? 'win' : 'loss';
}

export function toGameHistoryEntry(row: {
    id: string;
    game_type: GameType;
    game_date: string;
    score: number;
}): GameHistoryEntry {
    return {
        id: row.id,
        gameType: row.game_type,
        date: row.game_date,
        score: row.score,
        result: scoreToResult(row.score),
        points: scoreToPoints(row.score),
    };
}
