import { supabase } from '@/lib/supabase-client';
import { useAuthStore } from '@/stores/auth-store';
import { useStripe } from '@stripe/stripe-react-native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// Note: This is a simplified version. Full Stripe integration requires:
// 1. Stripe account setup
// 2. Backend endpoint for creating payment intents
// 3. @stripe/stripe-react-native integration

export default function SubscribeScreen() {
    const router = useRouter();
    const { user, refreshPremiumStatus } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    const handleSubscribe = async () => {
        if (!user) {
            Alert.alert('Error', 'You must be logged in to subscribe');
            router.push('/auth');
            return;
        }

        setLoading(true);
        try {
            // 1. Fetch params from backend
            const { data, error } = await supabase.functions.invoke('create-payment-sheet');

            if (error) {
                console.error('Function error:', error);
                throw new Error(error.message || 'Failed to initialize payment');
            }

            if (!data) {
                throw new Error('No data returned from payment service');
            }

            const { paymentIntent, ephemeralKey, customer } = data;

            if (!paymentIntent || !ephemeralKey || !customer) {
                throw new Error('Invalid payment data');
            }

            // 2. Initialize Payment Sheet
            const { error: initError } = await initPaymentSheet({
                merchantDisplayName: 'TubeRush',
                customerId: customer,
                customerEphemeralKeySecret: ephemeralKey,
                paymentIntentClientSecret: paymentIntent,
                defaultBillingDetails: {
                    name: 'TubeRush User',
                },
            });

            if (initError) {
                console.error('Init error:', initError);
                throw new Error(initError.message);
            }

            // 3. Present Payment Sheet
            const { error: paymentError } = await presentPaymentSheet();

            if (paymentError) {
                if (paymentError.code === 'Canceled') {
                    // User canceled, do nothing
                    return;
                }
                throw new Error(paymentError.message);
            }

            // 4. Success
            await refreshPremiumStatus();
            Alert.alert('Success', 'Premium membership activated!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Subscription failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
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

                <View style={styles.pricingCard}>
                    <Text style={styles.price}>$4.99</Text>
                    <Text style={styles.priceSubtext}>per month</Text>
                </View>

                <TouchableOpacity
                    style={styles.subscribeButton}
                    onPress={handleSubscribe}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
                    )}
                </TouchableOpacity>

                <Text style={styles.disclaimer}>
                    Cancel anytime. Payment secured by Stripe.
                </Text>
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
    pricingCard: {
        backgroundColor: '#f39c12',
        paddingVertical: 30,
        paddingHorizontal: 60,
        borderRadius: 15,
        marginBottom: 30,
    },
    price: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    priceSubtext: {
        fontSize: 16,
        color: '#fff',
        textAlign: 'center',
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
