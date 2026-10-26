import { useGameStore } from '@/stores/game-store';
import { offlineSyncManager } from '@/lib/offline-sync-manager';

describe('saveGame storage failure (TUB-289)', () => {
    it('keeps the in-memory game and does not reject when local storage fails', async () => {
        const spy = jest.spyOn(offlineSyncManager, 'saveGameState').mockRejectedValue(new Error('QuotaExceeded'));
        const err = jest.spyOn(console, 'error').mockImplementation(() => {});
        const game = { id: 'g1', userId: 'u1', gameType: 'connections', state: {}, lastUpdated: '', syncStatus: 'pending', version: 1 } as never;
        await expect(useGameStore.getState().saveGame(game)).resolves.toBeUndefined();
        expect(useGameStore.getState().currentGame).toBe(game);
        spy.mockRestore();
        err.mockRestore();
    });
});
