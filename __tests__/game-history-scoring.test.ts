import {
    scoreToPoints,
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
            mistakes: null,
        });
    });

    it('uses the stored result, not the time (TUB-257)', () => {
        const slowWin = toGameHistoryEntry({ id: 'a', game_type: 'connections', game_date: '2026-10-21', score: 900, result: 'won', mistakes: 2 });
        expect(slowWin.result).toBe('win');
        expect(slowWin.mistakes).toBe(2);
        const fastLoss = toGameHistoryEntry({ id: 'b', game_type: 'connections', game_date: '2026-10-21', score: 30, result: 'lost', mistakes: 4 });
        expect(fastLoss.result).toBe('loss');
        expect(fastLoss.points).toBe(0);
    });

    it('treats legacy rows (no result) as wins, since only wins were submitted', () => {
        expect(toGameHistoryEntry({ id: 'c', game_type: 'crossword', game_date: '2026-10-21', score: 1200 }).result).toBe('win');
    });
});
