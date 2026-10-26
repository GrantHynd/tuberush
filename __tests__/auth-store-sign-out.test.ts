import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase-client';
import { offlineSyncManager } from '@/lib/offline-sync-manager';
import { useAuthStore } from '@/stores/auth-store';
import type { Session } from '@supabase/supabase-js';

jest.mock('@/lib/revenuecat', () => ({
  hasActiveEntitlement: jest.fn(() => Promise.resolve(false)),
  logInRevenueCat: jest.fn(() => Promise.resolve()),
  logOutRevenueCat: jest.fn(() => Promise.resolve()),
}));

describe('signOut (TUB-281)', () => {
  it('flushes pending sync, then clears local games and the sync queue', async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
    const flush = jest.spyOn(offlineSyncManager, 'forceSync').mockResolvedValue();
    useAuthStore.setState({ user: { id: 'u1', email: 'a@b.c', isPremium: false }, session: { access_token: 't' } as Session });
    await AsyncStorage.setItem('game_state_connections_u1', '{}');
    await AsyncStorage.setItem('sync_queue', '[{"id":"x"}]');

    await useAuthStore.getState().signOut();

    expect(flush).toHaveBeenCalled();
    expect(await AsyncStorage.getItem('game_state_connections_u1')).toBeNull();
    expect(await AsyncStorage.getItem('sync_queue')).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
