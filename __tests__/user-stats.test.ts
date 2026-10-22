import { calculateStreakFromDates, selectBestTime } from '@/lib/user-stats';

const wednesday = new Date(2026, 9, 21, 9, 0, 0);

describe('calculateStreakFromDates', () => {
    it('counts a run that includes today', () => {
        const dates = new Set(['2026-10-21', '2026-10-20', '2026-10-19']);
        expect(calculateStreakFromDates(dates, wednesday)).toBe(3);
    });

    it('keeps yesterday’s streak while today is still open', () => {
        const dates = new Set(['2026-10-20', '2026-10-19']);
        expect(calculateStreakFromDates(dates, wednesday)).toBe(2);
    });

    it('breaks when yesterday was missed and today is not done', () => {
        const dates = new Set(['2026-10-19', '2026-10-18']);
        expect(calculateStreakFromDates(dates, wednesday)).toBe(0);
    });

    it('stops at the first gap behind today', () => {
        const dates = new Set(['2026-10-21', '2026-10-19']);
        expect(calculateStreakFromDates(dates, wednesday)).toBe(1);
    });

    it('returns 0 when there are no wins', () => {
        expect(calculateStreakFromDates(new Set(), wednesday)).toBe(0);
    });
});

describe('selectBestTime', () => {
    it('returns nothing when both games are empty', () => {
        expect(selectBestTime(null, null)).toEqual({
            bestTime: null,
            bestTimeGameType: null,
        });
    });

    it('picks the lower time and labels the game', () => {
        expect(selectBestTime(95, 40)).toEqual({
            bestTime: '0:40',
            bestTimeGameType: 'crossword',
        });
    });

    it('keeps Connections when the times tie', () => {
        expect(selectBestTime(60, 60).bestTimeGameType).toBe('connections');
    });

    it('uses the only available game', () => {
        expect(selectBestTime(null, 125)).toEqual({
            bestTime: '2:05',
            bestTimeGameType: 'crossword',
        });
    });
});
