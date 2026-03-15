import { Colors, Layout, Spacing, TFL } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface ConnectionsPuzzleListItemProps {
    dayNumber: number;
    label: string;
    isToday: boolean;
    isLive: boolean;
    puzzleNumber: string;
    commuteCount: string;
    isCompleted: boolean;
    completionTime?: string;
    score?: string;
    isWon?: boolean;
    onPress: () => void;
}

export function ConnectionsPuzzleListItem({
    dayNumber,
    label,
    isToday,
    isLive,
    puzzleNumber,
    commuteCount,
    isCompleted,
    completionTime,
    score,
    isWon,
    onPress,
}: ConnectionsPuzzleListItemProps) {
    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${puzzleNumber}, ${isCompleted ? 'completed' : 'play puzzle'}`}
        >
            <View style={[
                styles.dateBadge,
                isToday ? styles.dateBadgeToday : styles.dateBadgeDefault
            ]}>
                {isCompleted ? (
                    <MaterialIcons 
                        name="check" 
                        size={20} 
                        color={TFL.white} 
                    />
                ) : (
                    <Text style={[
                        styles.dayNumber,
                        isToday ? styles.dayNumberToday : styles.dayNumberDefault
                    ]}>
                        {dayNumber}
                    </Text>
                )}
            </View>

            <View style={styles.content}>
                <View style={styles.labelRow}>
                    <Text style={styles.label}>{label}</Text>
                    {isLive && (
                        <View style={styles.liveBadge}>
                            <Text style={styles.liveText}>LIVE</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.sublabel}>
                    {puzzleNumber} · {commuteCount}
                </Text>
            </View>

            {isCompleted ? (
                <View style={styles.completedInfo}>
                    <Text style={[
                        styles.time,
                        isWon ? styles.timeWon : styles.timeLost
                    ]}>
                        {completionTime}
                    </Text>
                    <Text style={styles.score}>{score}</Text>
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
    dateBadgeToday: {
        backgroundColor: TFL.blue,
    },
    dateBadgeDefault: {
        backgroundColor: TFL.grey.light,
    },
    dayNumber: {
        fontSize: 20,
        fontWeight: '600',
    },
    dayNumberToday: {
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
        backgroundColor: TFL.blue,
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
