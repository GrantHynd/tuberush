import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { type Palette, Radius, Spacing, Typography } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface EmptyStateProps {
    icon?: keyof typeof MaterialIcons.glyphMap;
    title: string;
    body: string;
    /** Primary button label; omitted (or no onAction) = no button. */
    actionLabel?: string;
    onAction?: () => void;
    testID?: string;
}

/** Shared empty state (TUB-255 / 259 / 261): tinted card, one primary action. */
export function EmptyState({ icon, title, body, actionLabel, onAction, testID }: EmptyStateProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
    const showAction = !!actionLabel && !!onAction;
    return (
        <Card variant="tinted" testID={testID}>
            <View style={styles.inner}>
                {icon ? (
                    <MaterialIcons
                        name={icon}
                        size={32}
                        color={colors.primary}
                        style={styles.icon}
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                    />
                ) : null}
                <Text style={styles.title} accessibilityRole="header">
                    {title}
                </Text>
                <Text style={styles.body}>{body}</Text>
                {showAction ? (
                    <Pressable
                        testID={testID ? `${testID}-action` : undefined}
                        onPress={onAction}
                        accessibilityRole="button"
                        accessibilityLabel={actionLabel}
                        style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
                    >
                        <Text style={styles.buttonText}>{actionLabel}</Text>
                    </Pressable>
                ) : null}
            </View>
        </Card>
    );
}

function makeStyles(colors: Palette) {
    return StyleSheet.create({
    inner: { alignItems: 'center', paddingVertical: Spacing.lg },
    icon: { marginBottom: Spacing.s12 },
    title: { ...Typography.h3, color: colors.text, textAlign: 'center' },
    body: { ...Typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },
    button: {
        marginTop: Spacing.md,
        minHeight: 48,
        width: '100%',
        maxWidth: 280,
        paddingHorizontal: Spacing.lg,
        borderRadius: Radius.md,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
});
}

