import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/auth-store';
import { BrandMark } from '@/components/ui/BrandMark';
import { type Palette } from '@/constants/theme';
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
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
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
                    <BrandMark size={64} testID="reset-password-brand-mark" />
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
                        placeholderTextColor={colors.textDisabled}
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
                        placeholderTextColor={colors.textDisabled}
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
                            <ActivityIndicator color={colors.onPrimary} />
                        ) : (
                            <Text style={styles.buttonText}>Reset Password</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

function makeStyles(colors: Palette) {
    return StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
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
    title: {
        fontSize: 32,
        fontWeight: '700',
        textAlign: 'center',
        color: colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 22,
        textAlign: 'center',
        marginBottom: 12,
        color: colors.primary,
        fontWeight: '500',
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        color: colors.textSecondary,
        lineHeight: 22,
    },
    form: {
        gap: 14,
    },
    input: {
        backgroundColor: colors.surface,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: colors.border,
        color: colors.text,
    },
    button: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 4,
    },
    buttonText: {
        color: colors.onPrimary,
        fontSize: 18,
        fontWeight: '600',
    },
});
}

