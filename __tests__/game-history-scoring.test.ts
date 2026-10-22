import {
    HISTORY_WIN_UNDER_SECONDS,
    scoreToPoints,
    scoreToResult,
    toGameHistoryEntry,
} from '@/lib/game-history';

describe('scoreToPoints', () => {
    it.each([
        [0, 32],
        [59, 32],
        [60, 18],
        [119, 18],
        [120, 8],
        [180, 4],
        [240, 3],
        [300, 2],
        [900, 2],
    ])('maps %s seconds to %s points', (seconds, points) => {
        expect(scoreToPoints(seconds)).toBe(points);
    });
});

describe('scoreToResult', () => {
    it('counts times under 10 minutes as a win', () => {
        expect(scoreToResult(HISTORY_WIN_UNDER_SECONDS - 1)).toBe('win');
        expect(scoreToResult(HISTORY_WIN_UNDER_SECONDS)).toBe('loss');
    });
});

describe('toGameHistoryEntry', () => {
    it('maps a leaderboard row into a history entry', () => {
        expect(toGameHistoryEntry({
            id: 'row-1',
            game_type: 'connections',
            game_date: '2026-10-21',
            score: 45,
        })).toEqual({
            id: 'row-1',
            gameType: 'connections',
            date: '2026-10-21',
            score: 45,
            result: 'win',
            points: 32,
        });
    });
});
