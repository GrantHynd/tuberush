import { useTheme } from '@/hooks/useTheme';
import { BrandMark } from '@/components/ui/BrandMark';
import { type Palette } from '@/constants/theme';
import { PRIVACY_POLICY_ROUTE, TERMS_OF_USE_ROUTE } from '@/lib/legal';
import { DisplayNameField } from '@/components/profile/DisplayNameField';
import { validateDisplayName } from '@/lib/display-name';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function AuthScreen() {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
    const router = useRouter();
    const { signIn, signUp } = useAuthStore();

    const [isSignUp, setIsSignUp] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [nameError, setNameError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (isSignUp) {
            const error = validateDisplayName(username);
            setNameError(error);
            if (error) return;
        }
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                await signUp(email, password, username.trim());
                Alert.alert('Success', 'Account created! Please check your email to verify.');
            } else {
                await signIn(email, password);
                router.back();
            }
        } catch (error: any) {
            const message = error?.message || error?.error_description || 'Authentication failed';
            const details = error?.status ? ` (${error.status})` : '';
            console.error('[Auth]', error);
            Alert.alert('Error', `${message}${details}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
            testID="auth-screen"
        >
            <ScrollView
                testID="auth-scroll"
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                bounces={false}
            >
            <View style={styles.content}>
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <BrandMark size={64} testID="auth-brand-mark" />
                </View>

                <Text
                    style={styles.title}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.35}
                >
                    TubeRush
                </Text>
                <Text
                    style={styles.subtitle}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.35}
                >
                    {isSignUp ? 'Create your account' : 'Welcome back!'}
                </Text>

                <View style={styles.form}>
                    {isSignUp && (
                        <DisplayNameField
                            testID="auth-username-input"
                            value={username}
                            onChangeText={(t) => {
                                setUsername(t);
                                if (nameError) setNameError(null);
                            }}
                            error={nameError}
                        />
                    )}

                    <TextInput
                        testID="auth-email-input"
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor={colors.textDisabled}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoComplete="email"
                    />

                    <TextInput
                        testID="auth-password-input"
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor={colors.textDisabled}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoComplete="password"
                    />

                    {!isSignUp && (
                        <TouchableOpacity
                            testID="auth-forgot-password-button"
                            onPress={() => router.push('/forgot-password')}
                            disabled={loading}
                        >
                            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        testID="auth-submit-button"
                        style={styles.button}
                        onPress={handleSubmit}
                        disabled={loading}
                        accessibilityRole="button"
                        accessibilityLabel={isSignUp ? 'Sign Up' : 'Sign In'}
                        accessibilityState={{ disabled: loading, busy: loading }}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.onPrimary} />
                        ) : (
                            <Text
                                style={styles.buttonText}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.5}
                            >
                                {isSignUp ? 'Sign Up' : 'Sign In'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {isSignUp && (
                        <Text style={styles.legalText}>
                            By creating an account, you agree to our{' '}
                            <Text
                                style={styles.legalLink}
                                onPress={() => router.push(TERMS_OF_USE_ROUTE)}
                                accessibilityRole="link"
                                testID="auth-terms-link"
                            >
                                Terms of Use
                            </Text>
                            {' '}and{' '}
                            <Text
                                style={styles.legalLink}
                                onPress={() => router.push(PRIVACY_POLICY_ROUTE)}
                                accessibilityRole="link"
                                testID="auth-privacy-link"
                            >
                                Privacy Policy
                            </Text>
                            .
                        </Text>
                    )}

                    <TouchableOpacity
                        testID="auth-switch-button"
                        style={styles.switchButton}
                        onPress={() => setIsSignUp(!isSignUp)}
                        disabled={loading}
                    >
                        <Text
                            style={styles.switchText}
                            numberOfLines={3}
                            adjustsFontSizeToFit
                            minimumFontScale={0.5}
                        >
                            {isSignUp
                                ? 'Already have an account? Sign In'
                                : "Don't have an account? Sign Up"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function makeStyles(colors: Palette) {
    return StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 30,
        paddingVertical: 24,
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
        width: '100%',
    },
    subtitle: {
        fontSize: 22,
        textAlign: 'center',
        marginBottom: 32,
        color: colors.primary,
        fontWeight: '500',
        width: '100%',
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
    forgotPasswordText: {
        color: colors.primary,
        fontSize: 14,
        textAlign: 'right',
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
        width: '100%',
        textAlign: 'center',
    },
    switchButton: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    switchText: {
        width: '100%',
        textAlign: 'center',
        color: colors.primary,
        fontSize: 14,
    },
    legalText: {
        color: colors.textSecondary,
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
    legalLink: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
});
}

