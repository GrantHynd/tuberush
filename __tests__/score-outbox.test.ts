import AsyncStorage from '@react-native-async-storage/async-storage';
import { leaderboard } from '@/lib/leaderboard';
import {
    MAX_SCORE_ATTEMPTS,
    SCORE_OUTBOX_KEY,
    __resetScoreOutboxForTests,
    isPermanentError,
    scoreOutbox,
} from '@/lib/score-outbox';

jest.mock('@/lib/leaderboard', () => {
    const actual = jest.requireActual('@/lib/leaderboard');
    return { ...actual, leaderboard: { ...actual.leaderboard, submitScore: jest.fn() } };
});

const submit = leaderboard.submitScore as jest.Mock;
const base = {
    userId: 'u1', city: 'London', borough: null, gameType: 'connections' as const, gameDate: '2026-10-24',
};

beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    __resetScoreOutboxForTests();
});

describe('scoreOutbox', () => {
    it('persists before sending and sends with the puzzle date', async () => {
        submit.mockResolvedValue(undefined);
        await scoreOutbox.submit({ ...base, score: 70, result: 'won', mistakes: 1 });
        expect(submit).toHaveBeenCalledWith('u1', 'London', null, 70, 'connections', {
            result: 'won', mistakes: 1, gameDate: '2026-10-24',
        });
        expect(await scoreOutbox.getPending()).toEqual([]);
    });

    it('keeps the entry across a network failure and drains it on the next trigger', async () => {
        submit.mockRejectedValueOnce(new TypeError('Network request failed'));
        await scoreOutbox.submit({ ...base, score: 70 });
        const pending = await scoreOutbox.getPending();
        expect(pending).toHaveLength(1);
        expect(pending[0].attempts).toBe(1);
        // survives a "restart": it is in AsyncStorage
        expect(JSON.parse((await AsyncStorage.getItem(SCORE_OUTBOX_KEY))!)).toHaveLength(1);

        submit.mockResolvedValue(undefined);
        await scoreOutbox.drain();
        expect(await scoreOutbox.getPending()).toEqual([]);
        expect(submit).toHaveBeenCalledTimes(2);
    });

    it('holds one entry per user/game/puzzle date and keeps the better result', async () => {
        await scoreOutbox.enqueue({ ...base, score: 50, result: 'lost', mistakes: 4 });
        await scoreOutbox.enqueue({ ...base, score: 90, result: 'won', mistakes: 2 });
        await scoreOutbox.enqueue({ ...base, score: 120, result: 'won', mistakes: 3 });
        await scoreOutbox.enqueue({ ...base, gameDate: '2026-10-25', score: 10 });
        const pending = await scoreOutbox.getPending();
        expect(pending).toHaveLength(2);
        expect(pending[0]).toMatchObject({ score: 90, result: 'won' });
    });

    it('does not lose concurrent enqueues', async () => {
        await Promise.all(
            Array.from({ length: 10 }, (_, i) => scoreOutbox.enqueue({ ...base, gameDate: `2026-10-${10 + i}`, score: i })),
        );
        expect(await scoreOutbox.getPending()).toHaveLength(10);
    });

    it('drops entries the server permanently rejects', async () => {
        submit.mockRejectedValue({ code: '42501', message: 'new row violates row-level security policy' });
        await scoreOutbox.submit({ ...base, score: 70 });
        expect(await scoreOutbox.getPending()).toEqual([]);
    });

    it('gives up after MAX_SCORE_ATTEMPTS transient failures', async () => {
        submit.mockRejectedValue(new TypeError('Network request failed'));
        await scoreOutbox.enqueue({ ...base, score: 70 });
        for (let i = 0; i < MAX_SCORE_ATTEMPTS; i++) await scoreOutbox.drain();
        expect(await scoreOutbox.getPending()).toEqual([]);
    });

    it('classifies errors', () => {
        expect(isPermanentError({ code: '42501' })).toBe(true);
        expect(isPermanentError({ code: '23514' })).toBe(true);
        expect(isPermanentError({ status: 403 })).toBe(true);
        expect(isPermanentError({ status: 503 })).toBe(false);
        expect(isPermanentError(new TypeError('Network request failed'))).toBe(false);
    });
});
