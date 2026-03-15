import React, { useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, TFL, Spacing, Typography, Layout } from '@/constants/theme';
import { GAMES, GameId } from '@/constants/Games';
import { GameType } from '@/types/game';
import { getCurrentWeek, getWeekLabel, isCurrentWeek } from '@/lib/week-utils';
import { useLeaderboardOverview } from '@/hooks/useLeaderboardOverview';
import { useAuthStore } from '@/stores/auth-store';
import { LiveBadge } from '@/components/leaderboard/LiveBadge';
import { PersonalSummaryCard } from '@/components/leaderboard/PersonalSummaryCard';
import { GameSummaryCard } from '@/components/leaderboard/GameSummaryCard';

export default function TrophyScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const week = useMemo(() => getCurrentWeek(), []);
    const { games, stats, loading, error } = useLeaderboardOverview(
        week.start,
        week.end
    );

    const gameIds = Object.keys(GAMES) as GameId[];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.heading}>Leaderboard</Text>
                <Text style={styles.subtitle}>
                    See where you stand across all games.
                </Text>

                <View style={styles.weekRow}>
                    <Text style={styles.weekLabel}>
                        {getWeekLabel(week.start, week.end)}
                    </Text>
                    {isCurrentWeek(week.start) && <LiveBadge />}
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator
                            size="large"
                            color={Colors.light.tint}
                        />
                    </View>
                ) : error ? (
                    <View style={styles.loadingContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : (
                    <>
                        {user && (
                            <PersonalSummaryCard
                                overallRank={stats.overallRank}
                                totalScore={stats.totalScore}
                                topPercent={stats.topPercent}
                            />
                        )}

                        <View style={styles.gamesSection}>
                            {gameIds.map((gameId) => {
                                const gameData = games.find(
                                    (g) => g.gameType === gameId
                                );
                                if (!gameData) return null;

                                const game = GAMES[gameId];
                                const isLocked =
                                    game.isPremium && !user?.isPremium;

                                return (
                                    <GameSummaryCard
                                        key={gameId}
                                        data={gameData}
                                        currentUserId={user?.id}
                                        isLocked={isLocked}
                                        onFullBoard={() =>
                                            router.push(
                                                `/leaderboard/game?gameType=${gameId}` as never
                                            )
                                        }
                                    />
                                );
                            })}
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    scroll: {
        padding: Spacing.md,
        paddingBottom: Spacing.xxl,
    },
    heading: {
        ...Typography.h1,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        ...Typography.caption,
        marginBottom: Spacing.md,
    },
    weekRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: Spacing.md,
    },
    weekLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
    },
    loadingContainer: {
        paddingVertical: Spacing.xxl,
        alignItems: 'center',
    },
    errorText: {
        ...Typography.caption,
        color: Colors.light.error,
    },
    gamesSection: {
        gap: Spacing.md,
        marginTop: Spacing.md,
    },
});
