/**
 * Single entry point for upselling: opens RevenueCat's paywall directly (TUB-323).
 * Replaces the old intermediate "Go Premium!" screen at /subscribe.
 */
import { capture } from '@/lib/posthog';
import { ENTITLEMENT_ID } from '@/lib/revenuecat';
import { useAuthStore } from '@/stores/auth-store';
import { Alert, Platform } from 'react-native';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

/** RevenueCat PURCHASES_ERROR_CODE.CONFIGURATION_ERROR */
const CONFIGURATION_ERROR_CODE = '23';

let presenting = false;

function friendlyError(error: unknown): string {
    const code = (error as { code?: string | number } | null)?.code;
    if (code != null && String(code) === CONFIGURATION_ERROR_CODE) {
        return "Subscriptions aren't available right now. Please try again later.";
    }
    return 'Something went wrong opening the subscription screen. Please try again.';
}

/**
 * Presents the RevenueCat paywall for the 'TubeRush Pro' entitlement.
 * Never navigates, so the calling screen stays visible (no blank screen, TUB-301).
 * Returns the paywall result, or null when it couldn't be shown.
 */
export async function openPaywall(source?: string): Promise<PAYWALL_RESULT | null> {
    if (presenting) return null;
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
        Alert.alert('1st Class', 'In-app purchases are available on iOS and Android.');
        return null;
    }
    presenting = true;
    capture('paywall_presented', source ? { source } : undefined);
    try {
        const result = await RevenueCatUI.presentPaywallIfNeeded({
            requiredEntitlementIdentifier: ENTITLEMENT_ID,
            displayCloseButton: true,
        });
        if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED || result === PAYWALL_RESULT.NOT_PRESENTED) {
            try {
                await useAuthStore.getState().refreshPremiumStatusFromRevenueCat();
            } catch {
                // Non-fatal: entitlement will be picked up on next refresh.
            }
        }
        if (result === PAYWALL_RESULT.PURCHASED) {
            capture('subscription_purchased', source ? { source } : undefined);
            Alert.alert('Welcome to 1st Class', 'Premium membership activated!');
        } else if (result === PAYWALL_RESULT.RESTORED) {
            capture('subscription_restored', source ? { source } : undefined);
            Alert.alert('Purchases restored', 'Your 1st Class membership is active.');
        } else if (result === PAYWALL_RESULT.CANCELLED) {
            capture('paywall_dismissed', source ? { source } : undefined);
        } else if (result === PAYWALL_RESULT.ERROR) {
            Alert.alert('Subscription unavailable', friendlyError(null));
        }
        return result;
    } catch (error) {
        capture('paywall_error', { source, code: String((error as { code?: unknown })?.code ?? '') });
        Alert.alert('Subscription unavailable', friendlyError(error));
        return null;
    } finally {
        presenting = false;
    }
}
