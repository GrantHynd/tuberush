import { useTheme } from '@/hooks/useTheme';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { type Palette, Spacing } from '@/constants/theme';
import { GAMES, GameId } from '@/constants/Games';
import { GameOverviewData } from '@/types/game';
import { EMPTY_VALUE, formatPlayerCount } from '@/lib/display-utils';
import { RankedList } from './RankedList';

interface GameSummaryCardProps {
    data: GameOverviewData;
    currentUserId?: string;
    onFullBoard: () => void;
}

export function GameSummaryCard({
    data,
    currentUserId,
    onFullBoard,
}: GameSummaryCardProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
    const game = GAMES[data.gameType as GameId];

    return (
        <Card variant="outlined">
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <MaterialIcons
                        name={game.icon}
                        size={20}
                        color={colors.text}
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                    />
                    <Text style={styles.gameName}>{game.name}</Text>
                </View>
                <TouchableOpacity
                    onPress={onFullBoard}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Text
                        style={styles.fullBoardLink}
                    >
                        Full board{' '}
                        <MaterialIcons
                            name="chevron-right"
                            size={14}
                            color={colors.primary}
                        />
                    </Text>
                </TouchableOpacity>
            </View>

                                <View style={styles.rankRow}>
                        <Text style={styles.rankLabel}>Your rank</Text>
                        <Text style={styles.rankValue}>
                            {data.userRank != null
                                ? `#${data.userRank} of ${formatPlayerCount(data.totalPlayers)}`
                                : `${EMPTY_VALUE} of ${formatPlayerCount(data.totalPlayers)}`}
                        </Text>
                    </View>

                    {data.nearbyEntries.length > 0 && (
                        <RankedList
                            entries={data.nearbyEntries}
                            currentUserId={currentUserId}
                            compact
                        />
                    )}
        </Card>
    );
}

function makeStyles(colors: Palette) {
    return StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    gameName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    fullBoardLink: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },
    rankRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
        marginBottom: Spacing.xs,
    },
    rankLabel: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    rankValue: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
});
}

