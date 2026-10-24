import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Colors, Radius, TFL, Spacing } from '@/constants/theme';
import { GAMES, GameId } from '@/constants/Games';
import { GameOverviewData } from '@/types/game';
import { EMPTY_VALUE, formatPlayerCount } from '@/lib/display-utils';
import { RankedList } from './RankedList';

interface GameSummaryCardProps {
    data: GameOverviewData;
    currentUserId?: string;
    isLocked?: boolean;
    onFullBoard: () => void;
}

export function GameSummaryCard({
    data,
    currentUserId,
    isLocked,
    onFullBoard,
}: GameSummaryCardProps) {
    const game = GAMES[data.gameType as GameId];

    return (
        <Card variant="outlined" style={isLocked && styles.cardLocked}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <MaterialIcons
                        name={game.icon}
                        size={20}
                        color={Colors.light.text}
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                    />
                    <Text style={styles.gameName}>{game.name}</Text>
                    {isLocked && (
                        <View style={styles.premiumPill}>
                            <Text style={styles.premiumText}>1st Class</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity
                    onPress={onFullBoard}
                    disabled={isLocked}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Text
                        style={[
                            styles.fullBoardLink,
                            isLocked && styles.fullBoardDisabled,
                        ]}
                    >
                        Full board{' '}
                        <MaterialIcons
                            name="chevron-right"
                            size={14}
                            color={isLocked ? TFL.grey.medium : TFL.blue}
                        />
                    </Text>
                </TouchableOpacity>
            </View>

            {isLocked ? (
                <View style={styles.lockedContent}>
                    <MaterialIcons
                        name="lock"
                        size={20}
                        color={TFL.grey.dark}
                    />
                    <Text style={styles.lockedText}>
                        Subscribe to see your ranking
                    </Text>
                </View>
            ) : (
                <>
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
                </>
            )}
        </Card>
    );
}

const styles = StyleSheet.create({
    cardLocked: {
        opacity: 0.7,
    },
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
        color: Colors.light.text,
    },
    premiumPill: {
        backgroundColor: TFL.yellow,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: Radius.pill,
    },
    premiumText: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.light.text,
    },
    fullBoardLink: {
        fontSize: 14,
        fontWeight: '600',
        color: TFL.blue,
    },
    fullBoardDisabled: {
        color: TFL.grey.medium,
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
        color: TFL.grey.dark,
    },
    rankValue: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
    },
    lockedContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: Spacing.lg,
    },
    lockedText: {
        fontSize: 14,
        color: TFL.grey.dark,
    },
});
