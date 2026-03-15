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

export default function AuthScreen() {
    const router = useRouter();
    const { signIn, signUp } = useAuthStore();

    const [isSignUp, setIsSignUp] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (isSignUp && !username) {
            Alert.alert('Error', 'Please enter a username');
            return;
        }
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                await signUp(email, password, username);
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
                <Text style={styles.subtitle}>
                    {isSignUp ? 'Create your account' : 'Welcome back!'}
                </Text>

                <View style={styles.form}>
                    {isSignUp && (
                        <TextInput
                            testID="auth-username-input"
                            style={styles.input}
                            placeholder="Username"
                            placeholderTextColor="#9CA3AF"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                            autoComplete="username"
                        />
                    )}

                    <TextInput
                        testID="auth-email-input"
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#9CA3AF"
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
                        placeholderTextColor="#9CA3AF"
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
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>
                                {isSignUp ? 'Sign Up' : 'Sign In'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        testID="auth-switch-button"
                        style={styles.switchButton}
                        onPress={() => setIsSignUp(!isSignUp)}
                        disabled={loading}
                    >
                        <Text style={styles.switchText}>
                            {isSignUp
                                ? 'Already have an account? Sign In'
                                : "Don't have an account? Sign Up"}
                        </Text>
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
        marginBottom: 32,
        color: TFL.blue,
        fontWeight: '500',
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
    forgotPasswordText: {
        color: TFL.blue,
        fontSize: 14,
        textAlign: 'right',
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
