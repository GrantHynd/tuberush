import { openPaywall } from '@/lib/paywall';
import { useAuthStore } from '@/stores/auth-store';
import { Alert, Platform } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';

jest.mock('@/lib/posthog', () => ({ capture: jest.fn() }));
jest.mock('@/stores/auth-store', () => ({ useAuthStore: { getState: jest.fn() } }));

describe('openPaywall (TUB-323)', () => {
    const refresh = jest.fn(() => Promise.resolve());
    beforeEach(() => {
        jest.clearAllMocks();
        Platform.OS = 'ios';
        (useAuthStore.getState as jest.Mock).mockReturnValue({ refreshPremiumStatusFromRevenueCat: refresh });
    });

    it('presents the paywall for the TubeRush Pro entitlement and refreshes on purchase', async () => {
        (RevenueCatUI.presentPaywallIfNeeded as jest.Mock).mockResolvedValueOnce('PURCHASED');
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        const result = await openPaywall('home');
        expect(RevenueCatUI.presentPaywallIfNeeded).toHaveBeenCalledWith(
            expect.objectContaining({ requiredEntitlementIdentifier: 'TubeRush Pro' }),
        );
        expect(result).toBe('PURCHASED');
        expect(refresh).toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalled();
    });

    it('refreshes on restore', async () => {
        (RevenueCatUI.presentPaywallIfNeeded as jest.Mock).mockResolvedValueOnce('RESTORED');
        jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        await openPaywall();
        expect(refresh).toHaveBeenCalled();
    });

    it('does not refresh or alert when cancelled', async () => {
        (RevenueCatUI.presentPaywallIfNeeded as jest.Mock).mockResolvedValueOnce('CANCELLED');
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        await openPaywall();
        expect(refresh).not.toHaveBeenCalled();
        expect(alertSpy).not.toHaveBeenCalled();
    });

    it('shows a friendly alert for configuration error 23', async () => {
        (RevenueCatUI.presentPaywallIfNeeded as jest.Mock).mockRejectedValueOnce({ code: '23', message: 'config' });
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        const result = await openPaywall();
        expect(result).toBeNull();
        expect(alertSpy).toHaveBeenCalledWith('Subscription unavailable', expect.stringMatching(/aren't available right now/));
    });
});
