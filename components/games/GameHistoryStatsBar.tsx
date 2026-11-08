import { useTheme } from '@/hooks/useTheme';
import { type Palette, Spacing } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface GameHistoryStatsBarProps {
    completed: number;
    total: number;
    currentStreak: number;
}

export function GameHistoryStatsBar({ completed, total, currentStreak }: GameHistoryStatsBarProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
    return (
        <View style={styles.container}>
            <View style={styles.stat}>
                <Text style={styles.label}>Completed</Text>
                <Text style={styles.value}>
                    {completed} / {total}
                </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
                <Text style={styles.label}>Current streak</Text>
                <Text style={styles.value}>{currentStreak} days</Text>
            </View>
        </View>
    );
}

function makeStyles(colors: Palette) {
    return StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: colors.background,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
    },
    stat: {
        flex: 1,
        alignItems: 'center',
    },
    label: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    value: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
    },
    divider: {
        width: 1,
        height: 40,
        backgroundColor: colors.border,
    },
});
}

