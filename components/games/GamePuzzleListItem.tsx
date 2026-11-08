import { useTheme } from '@/hooks/useTheme';
import { type Palette, Layout, Spacing } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { formatMaybe } from '@/lib/display-utils';
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
    /** Accent color for today/completed badges (e.g. colors.primary, colors.error) */
    accentColor: string;
    /** If true, show win (check) vs loss (X). If false, only show check for completed */
    hasWinLoss: boolean;
    /** Badge color when completed (e.g. colors.primary for crossword). Falls back to accentColor if not set. */
    completedBadgeColor?: string;
    /** Optional accessory rendered after the content, before completion info */
    renderAccessory?: React.ReactNode;
    /** Premium-only puzzle for a non-premium user: show a lock marker. */
    isLocked?: boolean;
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
    renderAccessory,
    isLocked,
    onPress,
}: GamePuzzleListItemProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
    const badgeColor = isCompleted
        ? hasWinLoss && !isWon
            ? colors.error
            : (completedBadgeColor ?? accentColor)
        : isToday
            ? accentColor
            : colors.background;

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${label}${sublabel ? `, ${sublabel}` : ''}, ${isCompleted ? 'completed' : isLocked ? 'locked, 1st Class' : 'play puzzle'}`}
        >
            <View style={[styles.dateBadge, { backgroundColor: badgeColor }]}>
                {isCompleted ? (
                    <MaterialIcons
                        name={hasWinLoss && !isWon ? 'close' : 'check'}
                        size={20}
                        color={colors.onPrimary}
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

            {renderAccessory}

            {isCompleted ? (
                <View style={styles.completedInfo}>
                    <Text
                        style={[
                            styles.time,
                            hasWinLoss && !isWon ? styles.timeLost : styles.timeWon,
                        ]}
                    >
                        {formatMaybe(completionTime)}
                    </Text>
                    {score ? <Text style={styles.score}>{score}</Text> : null}
                </View>
            ) : isLocked ? (
                <View style={styles.lockedBadge} testID="puzzle-locked">
                    <MaterialIcons name="lock" size={14} color={colors.premiumText} />
                    <Text style={styles.lockedText}>1st Class</Text>
                </View>
            ) : (
                <View style={styles.playButton}>
                    <MaterialIcons
                        name="person-outline"
                        size={16}
                        color={colors.textSecondary}
                    />
                    <Text style={styles.playText}>Play</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

function makeStyles(colors: Palette) {
    return StyleSheet.create({
    lockedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.premium,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    lockedText: { fontSize: 12, fontWeight: '700', color: colors.premiumText },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        backgroundColor: colors.background,
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
        color: colors.onPrimary,
    },
    dayNumberDefault: {
        color: colors.text,
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
        color: colors.text,
    },
    liveBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    liveText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.onPrimary,
        letterSpacing: 0.5,
    },
    sublabel: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    playButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    playText: {
        fontSize: 15,
        color: colors.textSecondary,
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
        color: colors.success,
    },
    timeLost: {
        color: colors.error,
    },
    score: {
        fontSize: 14,
        color: colors.textSecondary,
    },
});
}

