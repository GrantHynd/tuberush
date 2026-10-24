import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Colors, Spacing, TFL, Typography } from '@/constants/theme';

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

export const sectionStyles = StyleSheet.create({
    empty: { ...Typography.caption, color: TFL.grey.dark },
    listRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    listText: { ...Typography.caption, color: Colors.light.text },
});

const styles = StyleSheet.create({
    card: { marginTop: Spacing.lg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { ...Typography.h3, color: Colors.light.text },
    caption: { ...Typography.caption, color: TFL.grey.dark, marginTop: 2 },
    body: { marginTop: Spacing.s12 },
});
