import { hasActiveEntitlement } from '@/lib/revenuecat';
import { supabase } from '@/lib/supabase-client';
import { useAuthStore } from '@/stores/auth-store';
import { Platform } from 'react-native';

jest.mock('@/lib/revenuecat', () => ({
  hasActiveEntitlement: jest.fn(),
  logInRevenueCat: jest.fn(() => Promise.resolve()),
  logOutRevenueCat: jest.fn(() => Promise.resolve()),
}));

const mockHasActiveEntitlement = hasActiveEntitlement as jest.Mock;

function mockSignedInUser() {
  (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
    data: {
      user: { id: 'user-1', email: 'rider@example.com' },
      session: { access_token: 'token' },
    },
    error: null,
  });

  (supabase.from as jest.Mock).mockReturnValue({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() =>
          Promise.resolve({
            data: {
              id: 'user-1',
              email: 'rider@example.com',
              username: 'rider',
              city: 'London',
              borough: 'Camden',
            },
            error: null,
          }),
        ),
      })),
    })),
  });
}

describe('premium status from RevenueCat', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: null, session: null, loading: false });
    mockSignedInUser();
    Platform.OS = originalOS;
  });

  afterAll(() => {
    Platform.OS = originalOS;
  });

  it('unlocks premium when the native entitlement is active', async () => {
    Platform.OS = 'ios';
    mockHasActiveEntitlement.mockResolvedValue(true);

    await useAuthStore.getState().signIn('rider@example.com', 'secret');

    expect(useAuthStore.getState().user?.isPremium).toBe(true);
    expect(mockHasActiveEntitlement).toHaveBeenCalledTimes(1);
  });

  it('stays free when the RevenueCat lookup throws', async () => {
    Platform.OS = 'ios';
    mockHasActiveEntitlement.mockRejectedValue(new Error('network'));
    useAuthStore.setState({
      user: {
        id: 'user-1',
        email: 'rider@example.com',
        isPremium: true,
      },
    });

    await useAuthStore.getState().refreshPremiumStatus();

    expect(useAuthStore.getState().user?.isPremium).toBe(false);
  });

  it('stays free on web without calling RevenueCat', async () => {
    Platform.OS = 'web';
    mockHasActiveEntitlement.mockResolvedValue(true);

    await useAuthStore.getState().signIn('rider@example.com', 'secret');

    expect(mockHasActiveEntitlement).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user?.isPremium).toBe(false);
  });
});
