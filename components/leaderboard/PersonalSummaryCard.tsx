import React from 'react';
import { Card } from '@/components/ui/Card';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, TFL, Typography } from '@/constants/theme';
import { formatScore } from '@/lib/display-utils';

interface PersonalSummaryCardProps {
    overallRank: number | null;
    totalScore: number;
    /** Only rendered once ranked; unranked users see the Trophy EmptyState instead. */
    topPercent: number;
}

export function PersonalSummaryCard({ overallRank, totalScore, topPercent }: PersonalSummaryCardProps) {
    return (
        <Card variant="tinted">
            <View style={styles.row}>
                <View style={styles.column} accessible>
                    <Text style={styles.label}>Overall</Text>
                    <Text style={styles.value}>{overallRank != null ? `#${overallRank}` : ''}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.column} accessible>
                    <Text style={styles.label}>Total Score</Text>
                    <Text style={styles.value}>{formatScore(totalScore)}</Text>
                </View>
            </View>

            <View style={styles.hairline} />
            <Text style={styles.topPercent}>Top {topPercent}% of commuters this week</Text>
        </Card>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
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
    hairline: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: Colors.light.border,
        marginTop: Spacing.md,
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
    topPercent: {
        ...Typography.body,
        fontWeight: '600',
        color: TFL.blue,
        textAlign: 'center',
        paddingTop: Spacing.s12,
    },
});
