import { type Palette } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { openPaywall } from '@/lib/paywall';
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
import { PAYWALL_RESULT } from 'react-native-purchases-ui';

/** Benefits shown on the Subscription details page (reached from Profile) (carried over from the crossword Upsell). */
const PREMIUM_BENEFITS = [
    'Daily crosswords: a new London mini every day',
    'Leaderboards for your borough',
    'Your full puzzle archive',
];

export default function SubscribeScreen() {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
    const router = useRouter();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);

    const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

    useEffect(() => {
        capture('subscription_details_viewed');
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
            const result = await openPaywall('subscription_details');
            if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
                router.back();
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.inner}>
                <Text style={styles.logo}>⭐</Text>
                <Text style={styles.title}>1st Class</Text>
                <Text style={styles.subtitle}>Subscription details</Text>

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
                        <ActivityIndicator color={colors.onPrimary} />
                    ) : (
                        <Text style={[styles.subscribeButtonText, user?.isPremium && styles.subscribeButtonTextDisabled]}>
                            Subscribe Now
                        </Text>
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

function makeStyles(colors: Palette) {
    return StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
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
        color: colors.text,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 18,
        color: colors.textSecondary,
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
        borderBottomColor: colors.border,
    },
    featureIcon: {
        fontSize: 24,
        color: colors.success,
        marginRight: 15,
    },
    featureText: {
        fontSize: 16,
        color: colors.text,
    },
    subscribeButton: {
        backgroundColor: colors.primary,
        paddingVertical: 18,
        paddingHorizontal: 60,
        borderRadius: 10,
        width: '100%',
        alignItems: 'center',
        marginBottom: 15,
    },
    subscribeButtonDisabled: {
        backgroundColor: colors.elevated,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.border,
    },
    subscribeButtonText: {
        color: colors.onPrimary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    subscribeButtonTextDisabled: {
        color: colors.textSecondary,
    },
    disclaimer: {
        fontSize: 13,
        lineHeight: 18,
        color: colors.textSecondary,
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
        color: colors.primary,
        fontSize: 15,
        fontWeight: '600',
    },
    legalSeparator: {
        color: colors.textSecondary,
        fontSize: 15,
    },
});
}
