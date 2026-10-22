import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase-client';
import { useAuthStore } from '@/stores/auth-store';
import { useGameStore } from '@/stores/game-store';
import type { Session } from '@supabase/supabase-js';

jest.mock('@/lib/revenuecat', () => ({
  hasActiveEntitlement: jest.fn(() => Promise.resolve(false)),
  logInRevenueCat: jest.fn(() => Promise.resolve()),
  logOutRevenueCat: jest.fn(() => Promise.resolve()),
}));

const invoke = supabase.functions.invoke as jest.Mock;
const signOut = supabase.auth.signOut as jest.Mock;

describe('deleteAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'user-1',
        email: 'rider@example.com',
        isPremium: true,
      },
      session: { access_token: 'token' } as Session,
      loading: false,
      pendingPasswordReset: true,
    });
    useGameStore.setState({
      currentGame: {
        id: 'connections_user-1',
        userId: 'user-1',
        gameType: 'connections',
        state: {},
        lastUpdated: '2026-10-18T00:00:00.000Z',
        syncStatus: 'pending',
        version: 1,
      } as never,
      gameHistory: [],
    });
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    signOut.mockResolvedValue({ error: null });
  });

  it('deletes the account on the server, then clears the local session and cached games', async () => {
    await AsyncStorage.setItem('game_state_connections_user-1', '{"id":"connections_user-1"}');
    await AsyncStorage.setItem('sync_queue', '[]');

    await useAuthStore.getState().deleteAccount();

    expect(invoke).toHaveBeenCalledWith('delete-account', { method: 'POST' });
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().pendingPasswordReset).toBe(false);
    expect(useGameStore.getState().currentGame).toBeNull();
    expect(await AsyncStorage.getItem('game_state_connections_user-1')).toBeNull();
    expect(await AsyncStorage.getItem('sync_queue')).toBeNull();
  });

  it('keeps the session when the server refuses to delete the account', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: {
          json: async () => ({ error: 'You need to be signed in to delete your account.' }),
        },
      },
    });

    await expect(useAuthStore.getState().deleteAccount()).rejects.toThrow(
      'You need to be signed in to delete your account.',
    );

    expect(signOut).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user?.id).toBe('user-1');
    expect(useGameStore.getState().currentGame).not.toBeNull();
  });
});
