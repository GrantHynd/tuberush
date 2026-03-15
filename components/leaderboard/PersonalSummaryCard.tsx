import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, TFL, Spacing, Layout } from '@/constants/theme';
import { formatScore } from '@/lib/display-utils';

interface PersonalSummaryCardProps {
    overallRank: number | null;
    totalScore: number;
    topPercent: number | null;
}

export function PersonalSummaryCard({
    overallRank,
    totalScore,
    topPercent,
}: PersonalSummaryCardProps) {
    return (
        <View style={styles.card}>
            <View style={styles.column}>
                <Text style={styles.label}>Overall</Text>
                <Text style={styles.value}>
                    {overallRank != null ? `#${overallRank}` : '—'}
                </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.column}>
                <Text style={styles.label}>Total Score</Text>
                <Text style={styles.value}>
                    {totalScore > 0 ? formatScore(totalScore) : '—'}
                </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.column}>
                <Text style={styles.label}>Top %</Text>
                <Text style={[styles.value, styles.percentValue]}>
                    {topPercent != null ? `${topPercent}%` : '—'}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.light.card,
        borderRadius: Layout.borderRadius.lg,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.sm,
    },
    column: {
        flex: 1,
        alignItems: 'center',
    },
    divider: {
        width: 1,
        height: 36,
        backgroundColor: Colors.light.border,
    },
    label: {
        fontSize: 12,
        fontWeight: '500',
        color: TFL.grey.dark,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    value: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.light.text,
    },
    percentValue: {
        color: TFL.blue,
    },
});
