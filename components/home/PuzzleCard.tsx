import { Layout, Spacing, TFL } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import {
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const HORIZONTAL_PADDING = 20;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) * 0.45;

export interface PuzzleCardProps {
    puzzleNumber: string;
    label: string;
    isNew?: boolean;
    isCompleted?: boolean;
    commuteCount?: number;
    backgroundColor: string;
    onPress: () => void;
    /** 'carousel' for horizontal scroll (fixed width), 'list' for vertical list (full width) */
    variant?: 'carousel' | 'list';
}

export function PuzzleCard({
    puzzleNumber,
    label,
    isNew = false,
    isCompleted = false,
    commuteCount,
    backgroundColor,
    onPress,
    variant = 'carousel',
}: PuzzleCardProps) {
    const statusContent = isCompleted ? (
        <MaterialIcons name="check-circle" size={20} color="white" />
    ) : commuteCount !== undefined ? (
        <Text style={styles.commuteCount}>{commuteCount} commutes</Text>
    ) : (
        <Text style={styles.commuteCount}>—</Text>
    );

    const cardStyle = [
        styles.card,
        { backgroundColor },
        variant === 'list' && styles.cardList,
    ];

    return (
        <TouchableOpacity
            style={cardStyle}
            onPress={onPress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Puzzle ${puzzleNumber}, ${label}${isCompleted ? ', completed' : ''}`}
        >
            <View style={styles.header}>
                <Text style={styles.puzzleNumber}>{puzzleNumber}</Text>
                {isNew && (
                    <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                )}
            </View>
            <Text style={styles.label} numberOfLines={1}>
                {label}
            </Text>
            <View style={styles.status}>{statusContent}</View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        width: CARD_WIDTH,
        borderRadius: Layout.borderRadius.lg,
        padding: Spacing.md,
        minHeight: 100,
        justifyContent: 'space-between',
    },
    cardList: {
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.xs,
    },
    puzzleNumber: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
    },
    newBadge: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    newBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: 'white',
        letterSpacing: 0.5,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
    status: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    commuteCount: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
    },
});
