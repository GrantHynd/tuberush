import { useTheme } from '@/hooks/useTheme';
import { type Palette, Spacing, Typography } from '@/constants/theme';
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
            return <CrosswordErrorFallback onReset={this.handleReset} />;
        }
        return this.props.children;
    }
}

function CrosswordErrorFallback({ onReset }: { onReset: () => void }) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
    return (
        <View style={styles.container}>
            <MaterialIcons name="error-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
                This puzzle couldn&apos;t be loaded. Please try again.
            </Text>
            <TouchableOpacity
                style={styles.button}
                onPress={onReset}
                accessibilityRole="button"
                accessibilityLabel="Try again"
            >
                <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
        </View>
    );
}

function makeStyles(colors: Palette) {
    return StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
    },
    title: {
        ...Typography.h3,
        marginTop: Spacing.md,
        marginBottom: Spacing.xs, color: colors.text },
    subtitle: {
        ...Typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.text,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
});
}

