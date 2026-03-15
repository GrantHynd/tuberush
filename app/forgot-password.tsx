import { useAuthStore } from '@/stores/auth-store';
import { TFL } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const { resetPasswordForEmail } = useAuthStore();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleSubmit = async () => {
        if (!email) {
            Alert.alert('Error', 'Please enter your email address');
            return;
        }

        setLoading(true);
        try {
            await resetPasswordForEmail(email);
            setEmailSent(true);
        } catch (error: any) {
            const message = error?.message || 'Failed to send reset email';
            console.error('[ForgotPassword]', error);
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    if (emailSent) {
        return (
            <View style={styles.container}>
                <View style={styles.content}>
                    {/* Logo */}
                    <View style={styles.logoContainer}>
                        <View style={styles.roundel}>
                            <View style={styles.roundelInner} />
                            <View style={styles.roundelBar} />
                        </View>
                    </View>

                    <Text style={styles.title}>TubeRush</Text>
                    <Text style={styles.subtitle}>Check your email</Text>
                    <Text style={styles.description}>
                        We sent a password reset link to {email}. Tap the link in the email to
                        reset your password.
                    </Text>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.buttonText}>Back to Sign In</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.content}>
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <View style={styles.roundel}>
                        <View style={styles.roundelInner} />
                        <View style={styles.roundelBar} />
                    </View>
                </View>

                <Text style={styles.title}>TubeRush</Text>
                <Text style={styles.subtitle}>Forgot password?</Text>
                <Text style={styles.description}>
                    Enter your email address and we{"'"}ll send you a link to reset your password.
                </Text>

                <View style={styles.form}>
                    <TextInput
                        testID="forgot-password-email-input"
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#9CA3AF"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoComplete="email"
                        autoFocus
                    />

                    <TouchableOpacity
                        testID="forgot-password-submit-button"
                        style={styles.button}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Reset Password</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.switchButton}
                        onPress={() => router.back()}
                        disabled={loading}
                    >
                        <Text style={styles.switchText}>Back to Sign In</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    roundel: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: TFL.red,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    roundelInner: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#FFFFFF',
    },
    roundelBar: {
        position: 'absolute',
        width: 64,
        height: 10,
        backgroundColor: TFL.blue,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        textAlign: 'center',
        color: '#111111',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 22,
        textAlign: 'center',
        marginBottom: 12,
        color: TFL.blue,
        fontWeight: '500',
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        color: '#6B7280',
        lineHeight: 22,
    },
    form: {
        gap: 14,
    },
    input: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        color: '#111111',
    },
    button: {
        backgroundColor: TFL.blue,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 4,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    switchButton: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    switchText: {
        color: TFL.blue,
        fontSize: 14,
    },
});
