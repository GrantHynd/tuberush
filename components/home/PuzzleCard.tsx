import { Card } from '@/components/ui/Card';
import { Layout, Radius, Spacing } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { PuzzleStatus } from '@/hooks/usePuzzleCarousel';
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
    status: PuzzleStatus;
    commuteCount?: number;
    /** e.g. "2:14 · 3/4" (Connections) or "Solved in 9:01" (Crossword). */
    completionText?: string;
    /** Extra a11y detail for the completed state, e.g. "completed in 2 minutes 14 seconds, 3 of 4 lives left". */
    completionLabel?: string;
    backgroundColor: string;
    onPress: () => void;
    /** Game name included in the a11y label, e.g. "Connections". */
    accessibilityGame?: string;
}

function spokenDuration(mss: string): string {
    const [m, sec] = mss.split(':').map((n) => parseInt(n, 10));
    if (Number.isNaN(m) || Number.isNaN(sec)) return mss;
    const part = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
    return m > 0 ? `${part(m, 'minute')} ${part(sec, 'second')}` : part(sec, 'second');
}

/** Bottom-row text and a11y label for a completed carousel item (TUB-252). */
export function getCompletionPresentation(
    gameType: 'connections' | 'crossword',
    item: { completionTime?: string; score?: string },
): { completionText?: string; completionLabel: string } {
    if (!item.completionTime) return { completionLabel: 'completed' };
    if (gameType === 'connections') {
        const lives = item.score?.split('/')[0];
        return {
            completionText: item.score ? `${item.completionTime} · ${item.score}` : item.completionTime,
            completionLabel: `completed in ${spokenDuration(item.completionTime)}${lives != null && item.score ? `, ${lives} of 4 lives left` : ''}`,
        };
    }
    return {
        completionText: `Solved in ${item.completionTime}`,
        completionLabel: `completed in ${spokenDuration(item.completionTime)}`,
    };
}

export function PuzzleCard({
    label,
    isNew = false,
    status,
    commuteCount,
    completionText,
    completionLabel,
    backgroundColor,
    onPress,
    accessibilityGame,
}: PuzzleCardProps) {
    let statusContent: React.ReactNode = null;
    let a11ySuffix = ', not played';
    if (status === 'completed') {
        statusContent = (
            <>
                <MaterialIcons name="check-circle" size={18} color="white" />
                {completionText ? <Text style={styles.statusText}>{completionText}</Text> : null}
            </>
        );
        a11ySuffix = `, ${completionLabel ?? 'completed'}`;
    } else if (status === 'inProgress') {
        statusContent = (
            <>
                <MaterialIcons name="play-circle-outline" size={18} color="white" />
                <Text style={styles.statusText}>In progress</Text>
            </>
        );
        a11ySuffix = ', in progress';
    } else if (commuteCount) {
        statusContent = <Text style={styles.statusText}>{commuteCount.toLocaleString('en-GB')} commuters played</Text>;
    }
    const showNew = isNew && status === 'unplayed';

    return (
        <Card
            variant="filled"
            color={backgroundColor}
            style={styles.card}
            onPress={onPress}
            accessibilityLabel={`${label}${accessibilityGame ? `, ${accessibilityGame}` : ''}${a11ySuffix}`}
        >
            <View style={styles.header}>
                <Text style={styles.label} numberOfLines={1}>{label}</Text>
                {showNew && (
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
        gap: 4,
        minHeight: 18,
    },
    statusText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
    },
});
