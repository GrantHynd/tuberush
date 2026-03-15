import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, TFL, Spacing, Layout } from '@/constants/theme';
import { BoroughBreakdownEntry } from '@/types/game';
import { getDisplayName, formatScore } from '@/lib/display-utils';

interface BoroughListProps {
    boroughs: BoroughBreakdownEntry[];
    userBorough?: string | null;
}

export function BoroughList({ boroughs, userBorough }: BoroughListProps) {
    return (
        <View>
            <Text style={styles.sectionLabel}>LONDON BOROUGHS</Text>
            <View style={styles.card}>
                {boroughs.map((b, i) => {
                    const isMe =
                        userBorough != null && b.borough === userBorough;
                    const leaderName = getDisplayName(b.leaderEmail);

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

const styles = StyleSheet.create({
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: TFL.grey.dark,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: Spacing.sm,
        paddingHorizontal: Spacing.xs,
    },
    card: {
        backgroundColor: Colors.light.background,
        borderRadius: Layout.borderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.light.border,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: Spacing.md,
    },
    rowHighlight: {
        backgroundColor: TFL.blue + '0A',
    },
    accentBorder: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        backgroundColor: TFL.blue,
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
        color: Colors.light.text,
    },
    youPill: {
        borderWidth: 1,
        borderColor: TFL.blue,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 8,
    },
    youText: {
        fontSize: 9,
        fontWeight: '700',
        color: TFL.blue,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 12,
        color: TFL.grey.dark,
        marginTop: 2,
    },
    scoreCol: {
        alignItems: 'flex-end',
        marginLeft: Spacing.sm,
    },
    score: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.light.text,
    },
    scoreLabel: {
        fontSize: 10,
        color: TFL.grey.dark,
        marginTop: 1,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.light.border,
        marginHorizontal: Spacing.md,
    },
});
