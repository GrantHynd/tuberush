import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, TFL, Spacing, Typography } from '@/constants/theme';
import { LiveBadge } from './LiveBadge';
import { getWeekLabel, isCurrentWeek } from '@/lib/week-utils';

interface WeekNavigatorProps {
    weekStart: string;
    weekEnd: string;
    onWeekChange: (direction: -1 | 1) => void;
}

export function WeekNavigator({
    weekStart,
    weekEnd,
    onWeekChange,
}: WeekNavigatorProps) {
    const isCurrent = isCurrentWeek(weekStart);
    const label = getWeekLabel(weekStart, weekEnd);

    return (
        <View style={styles.container}>
            <TouchableOpacity
                onPress={() => onWeekChange(-1)}
                style={styles.button}
            >
                <Text style={styles.navText}>{'< Earlier'}</Text>
            </TouchableOpacity>

            <View style={styles.center}>
                <Text style={styles.label}>{label}</Text>
                {isCurrent && <LiveBadge />}
            </View>

            <TouchableOpacity
                onPress={() => onWeekChange(1)}
                style={styles.button}
                disabled={isCurrent}
            >
                <Text
                    style={[
                        styles.navText,
                        isCurrent && styles.navTextDisabled,
                    ]}
                >
                    {'Later >'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xs,
    },
    button: {
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.sm,
    },
    center: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    label: {
        ...Typography.caption,
        fontWeight: '600',
        color: Colors.light.text,
    },
    navText: {
        fontSize: 14,
        fontWeight: '600',
        color: TFL.blue,
    },
    navTextDisabled: {
        color: TFL.grey.medium,
    },
});
