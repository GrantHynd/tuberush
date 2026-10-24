import {
    formatSettingsLocation,
    normalizeProfile,
    userFromProfile,
} from '@/lib/profile';

describe('normalizeProfile', () => {
    it('keeps an explicit city and a known borough', () => {
        expect(normalizeProfile({ city: 'London', borough: 'Camden' })).toEqual({
            city: 'London',
            borough: 'Camden',
        });
    });

    it('treats a borough-only legacy row as London', () => {
        expect(normalizeProfile({ borough: 'Hackney' })).toEqual({
            city: 'London',
            borough: 'Hackney',
        });
    });

    it('drops an unknown borough and leaves a missing city empty', () => {
        expect(normalizeProfile({ borough: 'Not A Borough' })).toEqual({
            city: null,
            borough: undefined,
        });
    });

    it('keeps a non-London city and ignores a borough that is not a London borough', () => {
        expect(normalizeProfile({ city: 'Manchester', borough: 'Salford' })).toEqual({
            city: 'Manchester',
            borough: undefined,
        });
    });
});

describe('userFromProfile', () => {
    it('builds a user from auth fields and the profile row', () => {
        expect(userFromProfile({
            id: 'user-1',
            email: 'rider@example.com',
            isPremium: true,
            profile: { username: 'rider', city: 'Leeds', borough: null },
        })).toEqual({
            id: 'user-1',
            email: 'rider@example.com',
            username: 'rider',
            isPremium: true,
            city: 'Leeds',
            borough: undefined,
        });
    });

    it('leaves username unset when the profile has none', () => {
        expect(userFromProfile({
            id: 'user-1',
            email: 'rider@example.com',
            isPremium: false,
        }).username).toBeUndefined();
    });
});

describe('formatSettingsLocation', () => {
    it('says the location is not set', () => {
        expect(formatSettingsLocation({})).toBe('Not set');
    });

    it('includes the borough for London', () => {
        expect(formatSettingsLocation({ city: 'London', borough: 'Camden' })).toBe('London, Camden');
    });

    it('shows only the city outside London', () => {
        expect(formatSettingsLocation({ city: 'Manchester', borough: 'Camden' })).toBe('Manchester');
    });
});

describe('userFromProfile username loading (TUB-268)', () => {
    it('falls back to auth metadata username when the profile row has none', () => {
        const u = userFromProfile({
            id: 'u1', email: 'a@b.com', isPremium: false,
            profile: { username: null, city: null, borough: null },
            metadataUsername: ' Runner ',
        });
        expect(u.username).toBe('Runner');
    });

    it('prefers the profile username', () => {
        const u = userFromProfile({
            id: 'u1', email: 'a@b.com', isPremium: false,
            profile: { username: 'FromDb' }, metadataUsername: 'FromMeta',
        });
        expect(u.username).toBe('FromDb');
    });
});
