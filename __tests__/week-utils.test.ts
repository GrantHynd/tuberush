import {
    getCurrentWeek,
    getWeekLabel,
    getWeekRange,
    isCurrentWeek,
    shiftWeek,
    toLocalDateString,
} from '@/lib/week-utils';

describe('toLocalDateString', () => {
    it('uses the local calendar date', () => {
        expect(toLocalDateString(new Date(2026, 2, 9))).toBe('2026-03-09');
    });
});

describe('getWeekRange', () => {
    it('returns the Monday–Sunday week containing a Wednesday', () => {
        expect(getWeekRange(new Date(2026, 2, 11))).toEqual({
            start: '2026-03-09',
            end: '2026-03-15',
        });
    });

    it('treats Sunday as the end of the week that started the previous Monday', () => {
        expect(getWeekRange(new Date(2026, 2, 15))).toEqual({
            start: '2026-03-09',
            end: '2026-03-15',
        });
    });

    it('keeps Monday as the start', () => {
        expect(getWeekRange(new Date(2026, 2, 9)).start).toBe('2026-03-09');
    });
});

describe('getWeekLabel', () => {
    it('omits the start month when the week stays in one month', () => {
        expect(getWeekLabel('2026-03-09', '2026-03-15')).toBe('Week of 9–15 Mar 2026');
    });

    it('names both months when the week crosses a boundary', () => {
        expect(getWeekLabel('2026-04-27', '2026-05-03')).toBe('Week of 27 Apr – 3 May 2026');
    });
});

describe('shiftWeek', () => {
    it('moves a week forward and back by seven days', () => {
        expect(shiftWeek('2026-03-09', 1)).toEqual({
            start: '2026-03-16',
            end: '2026-03-22',
        });
        expect(shiftWeek('2026-03-09', -1)).toEqual({
            start: '2026-03-02',
            end: '2026-03-08',
        });
    });
});

describe('getCurrentWeek', () => {
    it('matches the range for today', () => {
        const week = getCurrentWeek();
        expect(week).toEqual(getWeekRange(new Date()));
        expect(isCurrentWeek(week.start)).toBe(true);
        expect(isCurrentWeek('2000-01-03')).toBe(false);
    });
});
