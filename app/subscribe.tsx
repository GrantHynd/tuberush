import { supabase } from '@/lib/supabase-client';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

export default function SubscribeScreen() {
    const router = useRouter();
    const { user, refreshPremiumStatusFromRevenueCat } = useAuthStore();
    const [loading, setLoading] = useState(false);

    const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

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
            // Test users: bypass IAP and use e2e-test-helper
            if (
                __DEV__ &&
                user.email &&
                (user.email.startsWith('test_user_') || user.email.endsWith('@example.com'))
            ) {
                const { error: testError } = await supabase.functions.invoke('e2e-test-helper', {
                    body: {
                        action: 'promote_premium',
                        secret: 'e2e_secret_9f8e7d6c5b4a3_DO_NOT_USE_IN_PROD_random_string_xyz',
                    },
                });

                if (testError) {
                    throw new Error(testError.message || 'Test promotion failed');
                }

                await new Promise((resolve) => setTimeout(resolve, 1000));
                await refreshPremiumStatusFromRevenueCat();
                Alert.alert('Success', 'Premium membership activated!', [
                    { text: 'OK', onPress: () => router.back() },
                ]);
                return;
            }

            // RevenueCat Paywall - presents native paywall UI
            const result = await RevenueCatUI.presentPaywall({
                displayCloseButton: true,
            });

            await refreshPremiumStatusFromRevenueCat();

            if (result === PAYWALL_RESULT.PURCHASED) {
                Alert.alert('Success', 'Premium membership activated!', [
                    { text: 'OK', onPress: () => router.back() },
                ]);
            } else if (result === PAYWALL_RESULT.RESTORED) {
                Alert.alert('Success', 'Purchases restored!', [
                    { text: 'OK', onPress: () => router.back() },
                ]);
            } else if (result === PAYWALL_RESULT.CANCELLED) {
                // User dismissed without purchasing - do nothing
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
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.logo}>⭐</Text>
                <Text style={styles.title}>Go Premium!</Text>
                <Text style={styles.subtitle}>Unlock exclusive features</Text>

                <View style={styles.featuresContainer}>
                    <View style={styles.feature}>
                        <Text style={styles.featureIcon}>✓</Text>
                        <Text style={styles.featureText}>Access to Crossword Puzzles</Text>
                    </View>

                    <View style={styles.feature}>
                        <Text style={styles.featureIcon}>✓</Text>
                        <Text style={styles.featureText}>More games coming soon</Text>
                    </View>

                    <View style={styles.feature}>
                        <Text style={styles.featureIcon}>✓</Text>
                        <Text style={styles.featureText}>Priority support</Text>
                    </View>

                    <View style={styles.feature}>
                        <Text style={styles.featureIcon}>✓</Text>
                        <Text style={styles.featureText}>Ad-free experience</Text>
                    </View>
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
                    Cancel anytime. Monthly and yearly plans available.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        padding: 30,
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
        fontSize: 12,
        color: '#95a5a6',
        textAlign: 'center',
    },
});
