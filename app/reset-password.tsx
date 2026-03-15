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

export default function ResetPasswordScreen() {
    const router = useRouter();
    const { updatePassword } = useAuthStore();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await updatePassword(password);
            Alert.alert('Success', 'Your password has been reset.', [
                { text: 'OK', onPress: () => router.replace('/') },
            ]);
        } catch (error: any) {
            const message = error?.message || 'Failed to reset password';
            console.error('[ResetPassword]', error);

            if (message.toLowerCase().includes('expired') || message.toLowerCase().includes('invalid')) {
                Alert.alert(
                    'Link Expired',
                    'This password reset link has expired. Please request a new one.',
                    [{ text: 'OK', onPress: () => router.replace('/forgot-password') }],
                );
            } else {
                Alert.alert('Error', message);
            }
        } finally {
            setLoading(false);
        }
    };

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
                <Text style={styles.subtitle}>Set new password</Text>
                <Text style={styles.description}>
                    Enter your new password below.
                </Text>

                <View style={styles.form}>
                    <TextInput
                        testID="reset-password-input"
                        style={styles.input}
                        placeholder="New password"
                        placeholderTextColor="#9CA3AF"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoComplete="new-password"
                        autoFocus
                    />

                    <TextInput
                        testID="reset-password-confirm-input"
                        style={styles.input}
                        placeholder="Confirm new password"
                        placeholderTextColor="#9CA3AF"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        autoComplete="new-password"
                    />

                    <TouchableOpacity
                        testID="reset-password-submit-button"
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
});
