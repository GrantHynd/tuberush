import { useTheme } from '@/hooks/useTheme';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { type Palette, Radius, Spacing } from '@/constants/theme';
import { BoroughBreakdownEntry } from '@/types/game';
import { getDisplayName, formatScore } from '@/lib/display-utils';

interface BoroughListProps {
    boroughs: BoroughBreakdownEntry[];
    userBorough?: string | null;
}

export function BoroughList({ boroughs, userBorough }: BoroughListProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
    return (
        <View>
            <Text style={styles.sectionLabel}>LONDON BOROUGHS</Text>
            <View style={styles.card}>
                {boroughs.map((b, i) => {
                    const isMe =
                        userBorough != null && b.borough === userBorough;
                    const leaderName = getDisplayName(b.leaderUsername, `borough-leader:${b.borough}`);

                    return (
                        <React.Fragment key={b.borough}>
                            {i > 0 && <View style={styles.divider} />}
                            <View
                                style={[
                                    styles.row,
                                    isMe && styles.rowHighlight,
                                ]}
                            >
                                {isMe && <View style={styles.accentBorder} />}
                                <View style={styles.info}>
                                    <View style={styles.nameRow}>
                                        <Text style={styles.name}>
                                            {b.borough}
                                        </Text>
                                        {isMe && (
                                            <View style={styles.youPill}>
                                                <Text style={styles.youText}>
                                                    YOU
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.subtitle}>
                                        {b.commuterCount} commuter
                                        {b.commuterCount !== 1 ? 's' : ''} ·
                                        Leader: {leaderName}
                                    </Text>
                                </View>
                                <View style={styles.scoreCol}>
                                    <Text style={styles.score}>
                                        {formatScore(b.topScore)}
                                    </Text>
                                    <Text style={styles.scoreLabel}>
                                        top score
                                    </Text>
                                </View>
                            </View>
                        </React.Fragment>
                    );
                })}
            </View>
        </View>
    );
}

function makeStyles(colors: Palette) {
    return StyleSheet.create({
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: Spacing.sm,
        paddingHorizontal: Spacing.xs,
    },
    card: {
        backgroundColor: colors.background,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: Spacing.md,
    },
    rowHighlight: {
        backgroundColor: colors.primary + '0A',
    },
    accentBorder: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        backgroundColor: colors.primary,
    },
    info: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    name: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
    },
    youPill: {
        borderWidth: 1,
        borderColor: colors.primary,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 8,
    },
    youText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    scoreCol: {
        alignItems: 'flex-end',
        marginLeft: Spacing.sm,
    },
    score: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
    },
    scoreLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        marginTop: 1,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginHorizontal: Spacing.md,
    },
});
}

