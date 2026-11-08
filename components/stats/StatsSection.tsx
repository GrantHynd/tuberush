import { useTheme } from '@/hooks/useTheme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { type Palette, Spacing, Typography } from '@/constants/theme';

export function StatsSection({
    title,
    caption,
    right,
    children,
    testID,
}: {
    title: string;
    caption?: string;
    right?: React.ReactNode;
    children: React.ReactNode;
    testID?: string;
}) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
    return (
        <Card variant="outlined" style={styles.card} testID={testID}>
            <View style={styles.header}>
                <Text style={styles.title} accessibilityRole="header">
                    {title}
                </Text>
                {right}
            </View>
            {caption ? <Text style={styles.caption}>{caption}</Text> : null}
            <View style={styles.body}>{children}</View>
        </Card>
    );
}

export function useSectionStyles() {
    const { colors } = useTheme();
    return React.useMemo(
        () =>
            StyleSheet.create({
                empty: { ...Typography.caption, color: colors.textSecondary },
                listRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
                listText: { ...Typography.caption, color: colors.text },
            }),
        [colors],
    );
}

function makeStyles(colors: Palette) {
    return StyleSheet.create({
    card: { marginTop: Spacing.lg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { ...Typography.h3, color: colors.text },
    caption: { ...Typography.caption, color: colors.textSecondary, marginTop: 2 },
    body: { marginTop: Spacing.s12 },
});
}

