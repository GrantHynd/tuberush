import {
    formatPlayerCount,
    formatScore,
    getAvatarInitial,
    getDisplayName,
} from '@/lib/display-utils';

describe('getDisplayName', () => {
    it('prefers a trimmed username', () => {
        expect(getDisplayName('  commuter  ', 'ada@example.com')).toBe('commuter');
    });

    it('turns an email local-part into a name when username is empty', () => {
        expect(getDisplayName('', 'ada.lovelace@example.com')).toBe('Ada Lovelace');
    });

    it('falls back to Anonymous', () => {
        expect(getDisplayName('   ')).toBe('Anonymous');
    });
});

describe('getAvatarInitial', () => {
    it('uppercases a letter', () => {
        expect(getAvatarInitial('ada')).toBe('A');
    });

    it('keeps a non-letter first character', () => {
        expect(getAvatarInitial('9 rider')).toBe('9');
    });

    it('uses a question mark for a blank name', () => {
        expect(getAvatarInitial('  ')).toBe('?');
    });
});

describe('formatScore', () => {
    it('formats seconds as M:SS', () => {
        expect(formatScore(0)).toBe('0:00');
        expect(formatScore(65)).toBe('1:05');
        expect(formatScore(125)).toBe('2:05');
    });
});

describe('formatPlayerCount', () => {
    it('keeps counts under 1000 as a locale string', () => {
        expect(formatPlayerCount(999)).toBe('999');
    });

    it('abbreviates thousands', () => {
        expect(formatPlayerCount(1000)).toBe('1k');
        expect(formatPlayerCount(1200)).toBe('1.2k');
        expect(formatPlayerCount(12345)).toBe('12.3k');
    });
});
