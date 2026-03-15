import { Colors, Spacing, TFL } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface GameHistoryStatsBarProps {
    completed: number;
    total: number;
    currentStreak: number;
}

export function GameHistoryStatsBar({ completed, total, currentStreak }: GameHistoryStatsBarProps) {
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

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: TFL.grey.light,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
    },
    stat: {
        flex: 1,
        alignItems: 'center',
    },
    label: {
        fontSize: 13,
        color: TFL.grey.dark,
        marginBottom: 4,
    },
    value: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.light.text,
    },
    divider: {
        width: 1,
        height: 40,
        backgroundColor: Colors.light.border,
    },
});
