import { useTheme } from '@/hooks/useTheme';
import React from 'react';
import { Card } from '@/components/ui/Card';
import { View, Text, StyleSheet } from 'react-native';
import { type Palette, Spacing, Typography } from '@/constants/theme';
import { formatScore } from '@/lib/display-utils';

interface PersonalSummaryCardProps {
    overallRank: number | null;
    totalScore: number;
    /** Only rendered once ranked; unranked users see the Trophy EmptyState instead. */
    topPercent: number;
    /** TUB-265: area name when the board is filtered to My area. */
    areaName?: string | null;
}

export function PersonalSummaryCard({ overallRank, totalScore, topPercent, areaName }: PersonalSummaryCardProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
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
            <Text style={styles.topPercent}>Top {topPercent}% of commuters{areaName ? ` in ${areaName}` : ''} this week</Text>
        </Card>
    );
}

function makeStyles(colors: Palette) {
    return StyleSheet.create({
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
        backgroundColor: colors.border,
    },
    hairline: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border,
        marginTop: Spacing.md,
    },
    label: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    value: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text,
    },
    topPercent: {
        ...Typography.body,
        fontWeight: '600',
        color: colors.primary,
        textAlign: 'center',
        paddingTop: Spacing.s12,
    },
});
}

