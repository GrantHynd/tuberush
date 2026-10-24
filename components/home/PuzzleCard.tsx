import { Card } from '@/components/ui/Card';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { EMPTY_VALUE } from '@/lib/display-utils';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import {
    Dimensions,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - Layout.screenPadding * 2 - Layout.cardGap) * 0.45;

export interface PuzzleCardProps {
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
        <Text style={styles.commuteCount}>{commuteCount} commuters played</Text>
    ) : (
        <Text style={styles.commuteCount}>{EMPTY_VALUE}</Text>
    );

    return (
        <Card
            variant="filled"
            color={backgroundColor}
            style={[styles.card, variant === 'list' && styles.cardList]}
            onPress={onPress}
            accessibilityLabel={`${label}${isCompleted ? ', completed' : ''}`}
        >
            <View style={styles.header}>
                <Text style={styles.label} numberOfLines={1}>{label}</Text>
                {isNew && (
                    <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                )}
            </View>
            <View style={styles.status}>{statusContent}</View>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        width: CARD_WIDTH,
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
    newBadge: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: Radius.sm,
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
