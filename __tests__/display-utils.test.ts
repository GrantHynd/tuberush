import {
    EMPTY_VALUE,
    formatMaybe,
    formatPlayerCount,
    formatScore,
    getAvatarInitial,
    getDisplayName,
    getFallbackSuffix,
    getOwnDisplayName,
} from '@/lib/display-utils';

describe('getDisplayName', () => {
    it('prefers a trimmed username', () => {
        expect(getDisplayName('  commuter  ', 'user-1')).toBe('commuter');
    });

    it('never derives a name from an email', () => {
        const name = getDisplayName('', 'ada.lovelace@example.com');
        expect(name).not.toMatch(/ada|lovelace/i);
        expect(name).toMatch(/^Commuter \d{4}$/);
    });

    it('uses a stable "Commuter NNNN" fallback per seed', () => {
        const a = getDisplayName(null, 'user-abc');
        expect(a).toMatch(/^Commuter \d{4}$/);
        expect(getDisplayName(undefined, 'user-abc')).toBe(a);
        expect(getFallbackSuffix('user-abc')).toBe(a.split(' ')[1]);
        expect(getDisplayName('   ')).toBe('Commuter');
    });
});

describe('getOwnDisplayName', () => {
    it('treats an email-local-part username as unset', () => {
        const name = getOwnDisplayName({ id: 'u1', username: 'grant.hynd', email: 'grant.hynd@gmail.com' });
        expect(name).toBe(getDisplayName(null, 'u1'));
    });

    it('keeps a real username', () => {
        expect(getOwnDisplayName({ id: 'u1', username: 'TubeRunner', email: 'g@x.com' })).toBe('TubeRunner');
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

describe('formatMaybe', () => {
    it('returns the shared empty glyph for missing values', () => {
        expect(EMPTY_VALUE).toBe('—');
        expect(formatMaybe(null)).toBe(EMPTY_VALUE);
        expect(formatMaybe(undefined)).toBe(EMPTY_VALUE);
        expect(formatMaybe('')).toBe(EMPTY_VALUE);
        expect(formatMaybe('  ')).toBe(EMPTY_VALUE);
    });

    it('formats present values, including zero', () => {
        expect(formatMaybe('1:23')).toBe('1:23');
        expect(formatMaybe(0)).toBe('0');
        expect(formatMaybe(3, (r) => `#${r}`)).toBe('#3');
        expect(formatMaybe(83, formatScore)).toBe('1:23');
    });
});
