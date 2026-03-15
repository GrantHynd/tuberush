import { Colors, Spacing, TFL, Typography } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
    children: React.ReactNode;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
}

export class CrosswordErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('CrosswordErrorBoundary caught:', error, info);
    }

    handleReset = () => {
        this.setState({ hasError: false });
        this.props.onReset?.();
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <MaterialIcons name="error-outline" size={48} color={TFL.grey.dark} />
                    <Text style={styles.title}>Something went wrong</Text>
                    <Text style={styles.subtitle}>
                        This puzzle couldn't be loaded. Please try again.
                    </Text>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={this.handleReset}
                        accessibilityRole="button"
                        accessibilityLabel="Try again"
                    >
                        <Text style={styles.buttonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
    },
    title: {
        ...Typography.h3,
        marginTop: Spacing.md,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        ...Typography.body,
        color: TFL.grey.dark,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: Colors.light.text,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.light.text,
    },
});
