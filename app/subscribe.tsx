import { PRIVACY_POLICY_ROUTE, TERMS_OF_USE_ROUTE } from '@/lib/legal';
import { capture } from '@/lib/posthog';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

/** Benefits shown on the one purchase screen (carried over from the crossword Upsell). */
const PREMIUM_BENEFITS = [
    'Daily crosswords: a new London mini every day',
    'Leaderboards for your borough',
    'Your full puzzle archive',
];

export default function SubscribeScreen() {
    const router = useRouter();
    const { user, refreshPremiumStatusFromRevenueCat } = useAuthStore();
    const [loading, setLoading] = useState(false);

    const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

    useEffect(() => {
        capture('subscribe_screen_viewed');
    }, []);

    const handleSubscribe = async () => {
        if (!user) {
            Alert.alert('Error', 'You must be logged in to subscribe');
            router.push('/auth');
            return;
        }

        if (user.isPremium) {
            Alert.alert('Info', 'You are already a premium member.');
            return;
        }

        if (!isNative) {
            Alert.alert('Info', 'In-app purchases are available on iOS and Android.');
            return;
        }

        setLoading(true);
        try {
            // RevenueCat Paywall - presents native paywall UI
            capture('paywall_presented');
            const result = await RevenueCatUI.presentPaywall({
                displayCloseButton: true,
            });

            await refreshPremiumStatusFromRevenueCat();

            if (result === PAYWALL_RESULT.PURCHASED) {
                capture('subscription_purchased');
                Alert.alert('Success', 'Premium membership activated!', [
                    { text: 'OK', onPress: () => router.back() },
                ]);
            } else if (result === PAYWALL_RESULT.RESTORED) {
                capture('subscription_restored');
                Alert.alert('Success', 'Purchases restored!', [
                    { text: 'OK', onPress: () => router.back() },
                ]);
            } else if (result === PAYWALL_RESULT.CANCELLED) {
                capture('paywall_dismissed');
            } else if (result === PAYWALL_RESULT.NOT_PRESENTED) {
                // User already has entitlement - paywall wasn't shown
                Alert.alert('Info', 'You already have premium access.', [
                    { text: 'OK', onPress: () => router.back() },
                ]);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Subscription failed';
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.inner}>
                <Text style={styles.logo}>⭐</Text>
                <Text style={styles.title}>Go Premium!</Text>
                <Text style={styles.subtitle}>Unlock exclusive features</Text>

                <View style={styles.featuresContainer}>
                    {PREMIUM_BENEFITS.map((benefit) => (
                        <View key={benefit} style={styles.feature}>
                            <Text style={styles.featureIcon}>✓</Text>
                            <Text style={styles.featureText}>{benefit}</Text>
                        </View>
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.subscribeButton, user?.isPremium && styles.subscribeButtonDisabled]}
                    onPress={handleSubscribe}
                    disabled={loading || user?.isPremium}
                    testID="subscribe-button"
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
                    )}
                </TouchableOpacity>

                <Text style={styles.disclaimer}>
                    TubeRush Pro is an auto-renewable subscription, billed monthly or yearly.
                    The price and length are shown on the purchase screen before you confirm.
                    Payment is charged to your Apple ID or Google Play account. The plan renews
                    unless you cancel at least 24 hours before the period ends, in your store
                    account settings. Deleting your TubeRush account does not cancel the subscription.
                </Text>

                <View style={styles.legalRow}>
                    <TouchableOpacity
                        onPress={() => router.push(PRIVACY_POLICY_ROUTE)}
                        accessibilityRole="link"
                        testID="subscribe-privacy-link"
                    >
                        <Text style={styles.legalLink}>Privacy Policy</Text>
                    </TouchableOpacity>
                    <Text style={styles.legalSeparator}>·</Text>
                    <TouchableOpacity
                        onPress={() => router.push(TERMS_OF_USE_ROUTE)}
                        accessibilityRole="link"
                        testID="subscribe-terms-link"
                    >
                        <Text style={styles.legalLink}>Terms of Use (EULA)</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        padding: 30,
        paddingBottom: 48,
    },
    inner: {
        alignItems: 'center',
    },
    logo: {
        fontSize: 80,
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 18,
        color: '#7f8c8d',
        marginBottom: 40,
    },
    featuresContainer: {
        width: '100%',
        marginBottom: 30,
    },
    feature: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ecf0f1',
    },
    featureIcon: {
        fontSize: 24,
        color: '#27ae60',
        marginRight: 15,
    },
    featureText: {
        fontSize: 16,
        color: '#2c3e50',
    },
    subscribeButton: {
        backgroundColor: '#3498db',
        paddingVertical: 18,
        paddingHorizontal: 60,
        borderRadius: 10,
        width: '100%',
        alignItems: 'center',
        marginBottom: 15,
    },
    subscribeButtonDisabled: {
        backgroundColor: '#bdc3c7',
    },
    subscribeButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    disclaimer: {
        fontSize: 13,
        lineHeight: 18,
        color: '#7f8c8d',
        textAlign: 'center',
    },
    legalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 16,
    },
    legalLink: {
        color: '#3498db',
        fontSize: 15,
        fontWeight: '600',
    },
    legalSeparator: {
        color: '#95a5a6',
        fontSize: 15,
    },
});
