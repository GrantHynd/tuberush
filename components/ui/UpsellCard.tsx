import { useTheme } from '@/hooks/useTheme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { type Palette, Radius, Spacing, Typography } from '@/constants/theme';

export interface UpsellCardProps {
    /** Game icon (leaderboard) or ticket icon (profile); rendered decoratively. */
    icon?: React.ReactNode;
    title: string;
    /** Pill on its own line. Defaults to "1st Class"; pass `null` to hide it. */
    badge?: string | null;
    /** One line on what you get; also used as the button's accessibility hint. */
    valueProp: string;
    ctaLabel?: string;
    onPress: () => void;
    /** Mark the title as a header (Leaderboard). */
    titleIsHeader?: boolean;
    testID?: string;
}

export function UpsellCard({
    icon,
    title,
    badge = '1st Class',
    valueProp,
    ctaLabel = 'Upgrade to 1st Class',
    onPress,
    titleIsHeader,
    testID,
}: UpsellCardProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
    return (
        <Card variant="outlined" testID={testID}>
            <View style={styles.titleRow}>
                {icon ? (
                    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                        {icon}
                    </View>
                ) : null}
                <Text style={styles.title} accessibilityRole={titleIsHeader ? 'header' : undefined}>
                    {title}
                </Text>
            </View>
            {badge ? (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge}</Text>
                </View>
            ) : null}
            <Text style={styles.valueProp}>
                {valueProp}
            </Text>
            <Pressable
                testID={testID ? `${testID}-cta` : undefined}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={ctaLabel}
                accessibilityHint={valueProp}
                style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            >
                <Text style={styles.buttonText}>{ctaLabel}</Text>
            </Pressable>
        </Card>
    );
}

function makeStyles(colors: Palette) {
    return StyleSheet.create({
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.s12 },
    title: { flexShrink: 1, fontSize: 16, fontWeight: '700', color: colors.text },
    badge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.premium,
        borderRadius: Radius.pill,
        paddingVertical: 2,
        paddingHorizontal: 8,
        marginBottom: Spacing.sm,
    },
    badgeText: { fontSize: 10, fontWeight: '700', color: colors.premiumText },
    valueProp: { ...Typography.caption, color: colors.textSecondary, marginBottom: Spacing.md },
    button: {
        minHeight: 48,
        borderRadius: Radius.md,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.md,
    },
    pressed: { opacity: 0.85 },
    buttonText: { fontSize: 16, fontWeight: '600', color: colors.onPrimary },
});
}

