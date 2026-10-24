import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '@/lib/supabase-client';
import {
    getRecentAndUpcomingGames,
    mergeCacheRows,
    prefetchDailyGames,
    startDailyGamesPrefetch,
} from '@/lib/daily-games';

type Row = Parameters<typeof mergeCacheRows>[0][number];
const row = (game_date: string, tag = 'a'): Row => ({
    id: `${game_date}-${tag}`, game_type: 'connections', game_date,
    puzzle_data: { date: game_date, tag } as never, is_published: true, created_at: '', updated_at: '',
});

const mockFrom = supabase.from as jest.Mock;
function mockGames(result: { data: Row[] | null; error: object | null }) {
    const chain: Record<string, jest.Mock> = {};
    for (const m of ['select', 'eq', 'gte', 'lte']) chain[m] = jest.fn(() => chain);
    chain.order = jest.fn(() => Promise.resolve(result));
    mockFrom.mockReturnValue(chain);
    return chain;
}
const NOW = new Date(2026, 9, 25, 0, 30); // 00:30 BST

beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }).setSystemTime(NOW);
});
afterEach(() => jest.useRealTimers());

describe('mergeCacheRows', () => {
    it('unions by date, prefers fresh rows and prunes outside past 7 / next 7', () => {
        const merged = mergeCacheRows(
            [row('2026-10-17'), row('2026-10-18'), row('2026-10-24', 'old'), row('2026-10-25')],
            [row('2026-10-24', 'new'), row('2026-11-01'), row('2026-11-02')],
            NOW,
        );
        expect(merged.map(r => r.game_date)).toEqual(['2026-10-18', '2026-10-24', '2026-10-25', '2026-11-01']);
        expect(merged.find(r => r.game_date === '2026-10-24')!.id).toBe('2026-10-24-new');
    });
});

describe('cache behaviour', () => {
    it('prefetch fetches the past 7 and next 7 days', async () => {
        const chain = mockGames({ data: [row('2026-10-20')], error: null });
        await prefetchDailyGames('connections');
        expect(chain.gte).toHaveBeenCalledWith('game_date', '2026-10-18');
        expect(chain.lte).toHaveBeenCalledWith('game_date', '2026-11-01');
    });

    it('a later fetch does not drop past puzzles already cached (offline carousel)', async () => {
        mockGames({ data: [row('2026-10-20'), row('2026-10-25')], error: null });
        await prefetchDailyGames('connections');
        mockGames({ data: [row('2026-10-26')], error: null });
        await prefetchDailyGames('connections');

        mockGames({ data: null, error: { message: 'offline' } });
        const recent = await getRecentAndUpcomingGames('connections', 7, 1);
        expect(recent.map(g => g.game_date)).toEqual(['2026-10-26', '2026-10-25', '2026-10-20']);
    });

    it('concurrent writes are serialised and both land', async () => {
        mockGames({ data: [row('2026-10-20')], error: null });
        const a = prefetchDailyGames('connections');
        mockGames({ data: [row('2026-10-21')], error: null });
        const b = prefetchDailyGames('connections');
        await Promise.all([a, b]);
        const cached = JSON.parse((await AsyncStorage.getItem('games_cache_v3_connections'))!);
        expect(cached.games.map((g: Row) => g.game_date)).toEqual(['2026-10-20', '2026-10-21']);
    });
});

describe('startDailyGamesPrefetch', () => {
    it('prefetches at start, on foreground and on reconnect', () => {
        mockGames({ data: [], error: null });
        let appStateCb: (s: string) => void = () => {};
        const appSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_e, cb) => {
            appStateCb = cb as never;
            return { remove: jest.fn() } as never;
        });
        let netCb: (s: { isConnected: boolean }) => void = () => {};
        (NetInfo.addEventListener as jest.Mock).mockImplementation((cb) => { netCb = cb; return jest.fn(); });

        const stop = startDailyGamesPrefetch();
        expect(mockFrom).toHaveBeenCalledTimes(2);
        appStateCb('active');
        expect(mockFrom).toHaveBeenCalledTimes(4);
        netCb({ isConnected: false });
        netCb({ isConnected: true });
        expect(mockFrom).toHaveBeenCalledTimes(6);
        stop();
        appSpy.mockRestore();
    });
});
