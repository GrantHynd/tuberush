import { Colors, Layout, Spacing, TFL } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface GamePuzzleListItemProps {
    dayNumber: number;
    label: string;
    isToday: boolean;
    isLive: boolean;
    sublabel?: string;
    isCompleted: boolean;
    completionTime?: string;
    score?: string;
    isWon?: boolean;
    /** Accent color for today/completed badges (e.g. TFL.blue, TFL.red) */
    accentColor: string;
    /** If true, show win (check) vs loss (X). If false, only show check for completed */
    hasWinLoss: boolean;
    /** Badge color when completed (e.g. TFL.blue for crossword). Falls back to accentColor if not set. */
    completedBadgeColor?: string;
    onPress: () => void;
}

export function GamePuzzleListItem({
    dayNumber,
    label,
    isToday,
    isLive,
    sublabel,
    isCompleted,
    completionTime,
    score,
    isWon,
    accentColor,
    hasWinLoss,
    completedBadgeColor,
    onPress,
}: GamePuzzleListItemProps) {
    const badgeColor = isCompleted
        ? hasWinLoss && !isWon
            ? TFL.red
            : (completedBadgeColor ?? accentColor)
        : isToday
            ? accentColor
            : TFL.grey.light;

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${label}${sublabel ? `, ${sublabel}` : ''}, ${isCompleted ? 'completed' : 'play puzzle'}`}
        >
            <View style={[styles.dateBadge, { backgroundColor: badgeColor }]}>
                {isCompleted ? (
                    <MaterialIcons
                        name={hasWinLoss && !isWon ? 'close' : 'check'}
                        size={20}
                        color={TFL.white}
                    />
                ) : (
                    <Text
                        style={[
                            styles.dayNumber,
                            (isToday || isCompleted) ? styles.dayNumberLight : styles.dayNumberDefault,
                        ]}
                    >
                        {dayNumber}
                    </Text>
                )}
            </View>

            <View style={styles.content}>
                <View style={styles.labelRow}>
                    <Text style={styles.label}>{label}</Text>
                    {isLive && (
                        <View style={[styles.liveBadge, { backgroundColor: accentColor }]}>
                            <Text style={styles.liveText}>LIVE</Text>
                        </View>
                    )}
                </View>
                {sublabel ? (
                    <Text style={styles.sublabel}>{sublabel}</Text>
                ) : null}
            </View>

            {isCompleted ? (
                <View style={styles.completedInfo}>
                    <Text
                        style={[
                            styles.time,
                            hasWinLoss && !isWon ? styles.timeLost : styles.timeWon,
                        ]}
                    >
                        {completionTime ?? '—'}
                    </Text>
                    {score ? <Text style={styles.score}>{score}</Text> : null}
                </View>
            ) : (
                <View style={styles.playButton}>
                    <MaterialIcons
                        name="person-outline"
                        size={16}
                        color={TFL.grey.dark}
                    />
                    <Text style={styles.playText}>Play</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        backgroundColor: Colors.light.background,
    },
    dateBadge: {
        width: 48,
        height: 48,
        borderRadius: Layout.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    dayNumber: {
        fontSize: 20,
        fontWeight: '600',
    },
    dayNumberLight: {
        color: TFL.white,
    },
    dayNumberDefault: {
        color: Colors.light.text,
    },
    content: {
        flex: 1,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: 2,
    },
    label: {
        fontSize: 17,
        fontWeight: '600',
        color: Colors.light.text,
    },
    liveBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    liveText: {
        fontSize: 11,
        fontWeight: '700',
        color: TFL.white,
        letterSpacing: 0.5,
    },
    sublabel: {
        fontSize: 14,
        color: TFL.grey.dark,
    },
    playButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    playText: {
        fontSize: 15,
        color: TFL.grey.dark,
    },
    completedInfo: {
        alignItems: 'flex-end',
    },
    time: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 2,
    },
    timeWon: {
        color: TFL.green,
    },
    timeLost: {
        color: TFL.red,
    },
    score: {
        fontSize: 14,
        color: TFL.grey.dark,
    },
});
