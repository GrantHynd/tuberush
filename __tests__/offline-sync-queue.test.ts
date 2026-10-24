import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase-client';
import { StorageManager, __resetQueueLockForTests } from '@/lib/storage-manager';
import { mergeConnections, mergeCrossword, mergeGameStates } from '@/lib/game-merge';
import { backoffDelay, isPermanentSyncError, offlineSyncManager } from '@/lib/offline-sync-manager';
import type { ConnectionsState, GameState, SyncOperation } from '@/types/game';

const mockFrom = supabase.from as jest.Mock;

const conn = (over: Partial<ConnectionsState> = {}): ConnectionsState => ({
    completedGroups: [], mistakesRemaining: 4, history: [], startTime: 1000, endTime: null, status: 'playing', ...over,
});
const game = (state: GameState['state'], lastUpdated: string, version = 1): GameState => ({
    id: 'connections_u_2026-10-24', userId: 'u', gameType: 'connections', state, lastUpdated, syncStatus: 'pending', version,
});
const op = (g: GameState, timestamp: string, extra: Partial<SyncOperation> = {}): SyncOperation => ({
    id: g.id, type: 'update', entity: 'game_state', data: g, timestamp, retryCount: 0, ...extra,
});

/** game_states mock: `server` is the row returned by select, `upsertErrors` consumed in order. */
function mockGameStates(server: object | null, upsertErrors: (object | null)[] = []) {
    const upserts: any[] = [];
    const chain: Record<string, jest.Mock> = {};
    chain.select = jest.fn(() => chain);
    chain.eq = jest.fn(() => chain);
    chain.single = jest.fn(() => Promise.resolve(server ? { data: server, error: null } : { data: null, error: { code: 'PGRST116' } }));
    chain.upsert = jest.fn((body) => {
        upserts.push(body);
        return Promise.resolve({ error: upsertErrors.shift() ?? null });
    });
    mockFrom.mockReturnValue(chain);
    return upserts;
}

function setOnline(v: boolean) {
    (offlineSyncManager as any).isOnline = v;
    (offlineSyncManager as any).isSyncing = false;
}

beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    __resetQueueLockForTests();
    setOnline(true);
});
afterAll(() => offlineSyncManager.destroy());

describe('game merge rules', () => {
    it('Connections: unions groups, keeps fewest mistakes left, finished stays finished', () => {
        const m = mergeConnections(
            conn({ completedGroups: ['a', 'b'], mistakesRemaining: 3, history: [['1']] }),
            conn({ completedGroups: ['a', 'b', 'c', 'd'], mistakesRemaining: 2, status: 'won', endTime: 9000, history: [['1'], ['2']] }),
        );
        expect(m).toMatchObject({ completedGroups: ['a', 'b', 'c', 'd'], mistakesRemaining: 2, status: 'won', endTime: 9000 });
        expect(m.history).toHaveLength(2);
    });
    it('Crossword: newer letters win per cell, completed snapshot wins outright', () => {
        const base = { puzzleId: 'p', grid: [], clues: { across: {}, down: {} }, completed: false };
        expect(mergeCrossword({ ...base, userAnswers: { '0-0': 'A', '0-1': 'B' } }, { ...base, userAnswers: { '0-1': 'C' } }).userAnswers)
            .toEqual({ '0-0': 'A', '0-1': 'C' });
        const done = { ...base, completed: true, userAnswers: { '0-0': 'Z' } };
        expect(mergeCrossword(done, { ...base, userAnswers: {} }).completed).toBe(true);
    });
    it('an older snapshot cannot regress a newer one', () => {
        const newer = game(conn({ completedGroups: ['a', 'b', 'c'] }), '2026-10-24T10:00:00Z');
        const older = game(conn({ completedGroups: ['a'] }), '2026-10-24T09:00:00Z');
        expect((mergeGameStates(older, newer).state as ConnectionsState).completedGroups).toEqual(['a', 'b', 'c']);
    });
});

describe('sync queue', () => {
    it('keeps one entry per game (latest snapshot)', async () => {
        const g1 = game(conn({ completedGroups: ['a'] }), 't1');
        const g2 = game(conn({ completedGroups: ['a', 'b'] }), 't2');
        await StorageManager.addToSyncQueue(op(g1, 't1'));
        await StorageManager.addToSyncQueue(op(g2, 't2'));
        const q = await StorageManager.getSyncQueue();
        expect(q).toHaveLength(1);
        expect(q[0].data.state.completedGroups).toEqual(['a', 'b']);
    });

    it('serialises concurrent writes (no lost ops)', async () => {
        await Promise.all(Array.from({ length: 20 }, (_, i) => {
            const g = { ...game(conn(), `t${i}`), id: `g${i}` };
            return StorageManager.addToSyncQueue(op(g, `t${i}`));
        }));
        expect(await StorageManager.getSyncQueue()).toHaveLength(20);
    });

    it('offline saves coalesce, then replay merges with the server without regressing local', async () => {
        setOnline(false);
        const g = game(conn({ completedGroups: ['a', 'b'], mistakesRemaining: 3 }), '2026-10-24T10:00:00Z');
        await offlineSyncManager.saveGameState({ ...g, state: conn({ completedGroups: ['a'] }), lastUpdated: '2026-10-24T09:59:00Z' });
        await offlineSyncManager.saveGameState(g);
        expect(await StorageManager.getSyncQueue()).toHaveLength(1);

        // Server has a different group from another device, older clock.
        const upserts = mockGameStates({
            id: g.id, user_id: 'u', game_type: 'connections', version: 3,
            state: conn({ completedGroups: ['c'], mistakesRemaining: 4 }), last_updated: '2026-10-24T08:00:00Z',
        });
        setOnline(true);
        await offlineSyncManager.syncPendingOperations();

        expect(upserts).toHaveLength(1);
        expect(upserts[0].state.completedGroups.sort()).toEqual(['a', 'b', 'c']);
        expect(upserts[0].version).toBe(4);
        const local = await StorageManager.getGameState(g.id);
        expect(local.state.completedGroups.sort()).toEqual(['a', 'b', 'c']);
        expect(local.syncStatus).toBe('synced');
        expect(await StorageManager.getSyncQueue()).toHaveLength(0);
    });

    it('persists retry count with exponential backoff on transient errors', async () => {
        const g = game(conn(), '2026-10-24T10:00:00Z');
        await StorageManager.addToSyncQueue(op(g, 'ts'));
        mockGameStates(null, [{ message: 'fetch failed' }]);
        const before = Date.now();
        await offlineSyncManager.syncPendingOperations();
        let [queued] = await StorageManager.getSyncQueue();
        expect(queued.retryCount).toBe(1);
        expect(queued.nextAttemptAt).toBeGreaterThanOrEqual(before + backoffDelay(1));

        // Not due yet: a second sync doesn't retry it.
        await offlineSyncManager.syncPendingOperations();
        [queued] = await StorageManager.getSyncQueue();
        expect(queued.retryCount).toBe(1);
        expect(backoffDelay(1)).toBe(2000);
        expect(backoffDelay(3)).toBe(8000);
        expect(backoffDelay(50)).toBe(5 * 60 * 1000);
    });

    it('dead-letters ops the server rejects (RLS/4xx)', async () => {
        const g = game(conn(), '2026-10-24T10:00:00Z');
        await StorageManager.addToSyncQueue(op(g, 'ts'));
        mockGameStates(null, [{ code: '42501', message: 'row-level security' }]);
        await offlineSyncManager.syncPendingOperations();
        expect(await StorageManager.getSyncQueue()).toHaveLength(0);
        const dead = await StorageManager.getDeadLetter();
        expect(dead).toHaveLength(1);
        expect(dead[0].error.code).toBe('42501');
        expect(isPermanentSyncError({ status: 500 })).toBe(false);
    });

    it('keeps an op replaced by a newer snapshot during sync', async () => {
        const g = game(conn({ completedGroups: ['a'] }), 't1');
        await StorageManager.addToSyncQueue(op(g, 'ts1'));
        const queued = await StorageManager.getSyncQueue();
        await StorageManager.addToSyncQueue(op({ ...g, lastUpdated: 't2' }, 'ts2'));
        await StorageManager.removeFromSyncQueueBatch([queued[0].id], { [queued[0].id]: queued[0].timestamp });
        expect(await StorageManager.getSyncQueue()).toHaveLength(1);
    });
});
