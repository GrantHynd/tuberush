import { openPaywall } from '@/lib/paywall';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { getCompletionPresentation, PuzzleCard } from '@/components/home/PuzzleCard';
import { SectionHeader } from '@/components/home/SectionHeader';
import { StatCard } from '@/components/home/StatCard';
import { TodayHeroCard } from '@/components/home/TodayHeroCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { buildTodayRows, getNextPuzzleAt, getTodaysNextGame } from '@/lib/today-puzzles';
import type {
    ConnectionsCarouselItem,
    CrosswordCarouselItem,
} from '@/hooks/usePuzzleCarousel';
import { GAMES } from '@/constants/Games';
import { Colors, GameColors, Layout, Spacing, TFL, Typography } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useLocationRank } from '@/hooks/useLocationRank';
import { usePuzzleCarousel } from '@/hooks/usePuzzleCarousel';
import { useUserStats } from '@/hooks/useUserStats';
import { formatMaybe, getAvatarInitial, getOwnDisplayName } from '@/lib/display-utils';
import { useTabBarBottomInset } from '@/hooks/useTabBarBottomInset';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HORIZONTAL_PADDING = Layout.screenPadding;
const CARD_GAP = Layout.cardGap;

export default function HomeScreen() {
    const router = useRouter();
    const bottomInset = useTabBarBottomInset();
    const { user } = useAuthStore();
    const { items: connectionsItems, loading: connectionsLoading, refresh: refreshConnections } = usePuzzleCarousel('connections');
    const { items: crosswordItems, loading: crosswordLoading, refresh: refreshCrossword } = usePuzzleCarousel('crossword');

    const { stats, loading: statsLoading, refresh: refreshStats } = useUserStats();
    useFocusEffect(
        useCallback(() => {
            refreshConnections();
            refreshCrossword();
            refreshStats();
        }, [refreshConnections, refreshCrossword, refreshStats])
    );
    const { rank } = useLocationRank();

    const handleConnectionsCardPress = (date: string) => {
        if (!user) {
            router.push('/auth');
            return;
        }
        router.push(`/games/play-connections?date=${date}` as never);
    };

    const handleCrosswordCardPress = (puzzleId: string) => {
        if (!user) {
            router.push('/auth');
            return;
        }
        if (!user.isPremium) {
            openPaywall('home');
            return;
        }
        router.push(`/games/play-crossword?puzzleId=${puzzleId}` as never);
    };

    const todayRows = buildTodayRows({
        user,
        connections: connectionsItems,
        crossword: crosswordItems,
        onConnections: (item) => handleConnectionsCardPress(item.date),
        onCrossword: (item) => handleCrosswordCardPress(item.puzzleId),
        onSignIn: () => router.push('/auth'),
        onUnlock: () => openPaywall('home'),
    });

    const hasNoStats = !statsLoading && stats.bestTime == null && stats.streak === 0;
    const nextGame = getTodaysNextGame(user, { connections: connectionsItems, crossword: crosswordItems });

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
                showsVerticalScrollIndicator={false}
            >
                <ScreenHeader
                    variant="brand"
                    title="TubeRush"
                    subtitle="Beat the commute."
                    trailing={
                        <TouchableOpacity
                            onPress={() => router.push(user ? '/profile' : '/auth')}
                            style={styles.avatarButton}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={user ? 'Profile' : 'Sign in'}
                        >
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {user ? getAvatarInitial(getOwnDisplayName(user)) : '?'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    }
                />

                <TodayHeroCard
                    rows={todayRows}
                    nextPuzzleAt={getNextPuzzleAt()}
                    loading={!!user && (connectionsLoading || crosswordLoading) && connectionsItems.length + crosswordItems.length === 0}
                />

                {/* Connections section */}
                <View style={styles.section}>
                    <SectionHeader
                        icon={GAMES.connections.icon}
                        title={GAMES.connections.name}
                        onSeeAllPress={() => router.push('/games/connections-list' as never)}
                    />
                    <FlatList
                        data={connectionsItems as ConnectionsCarouselItem[]}
                        horizontal
                        keyExtractor={(item) => item.puzzleId}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.carouselContent}
                        ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
                        renderItem={({ item }) => (
                            <PuzzleCard
                                label={item.label}
                                isNew={item.isNew}
                                status={item.status}
                                commuteCount={item.commuteCount}
                                {...getCompletionPresentation('connections', item)}
                                accessibilityGame={GAMES.connections.name}
                                backgroundColor={GameColors.connections}
                                onPress={() => handleConnectionsCardPress(item.date)}
                            />
                        )}
                    />
                </View>

                {/* Crossword section */}
                <View style={styles.section}>
                    <SectionHeader
                        icon={GAMES.crossword.icon}
                        title="Crossword"
                        badge={user?.isPremium ? '1st Class' : undefined}
                        onSeeAllPress={() => router.push('/games/crossword-list' as never)}
                    />
                    <FlatList
                        data={crosswordItems as CrosswordCarouselItem[]}
                        horizontal
                        keyExtractor={(item) => item.puzzleId}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.carouselContent}
                        ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
                        renderItem={({ item }) => (
                            <PuzzleCard
                                label={item.label}
                                isNew={item.isNew}
                                status={item.status}
                                commuteCount={item.commuteCount}
                                {...getCompletionPresentation('crossword', item)}
                                accessibilityGame="Crossword"
                                backgroundColor={GameColors.crossword}
                                onPress={() => handleCrosswordCardPress(item.puzzleId)}
                            />
                        )}
                    />
                </View>

                {/* Your Stats section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your Stats</Text>
                    {hasNoStats ? (
                        <EmptyState
                            testID="home-stats-empty"
                            icon="local-fire-department"
                            title="Your stats start here"
                            body="Finish today's puzzle to start your streak and see how you stack up."
                            actionLabel="Play today's puzzle"
                            onAction={nextGame ? () => router.push(nextGame.route as never) : undefined}
                        />
                    ) : (
                        <View style={styles.statsRow}>
                            <StatCard
                                icon="timer"
                                label="Best Time"
                                value={formatMaybe(stats.bestTime)}
                                sublabel={stats.bestTimeGameType ?? undefined}
                            />
                            <StatCard
                                icon="local-fire-department"
                                label="Streak"
                                value={String(stats.streak)}
                            />
                        </View>
                    )}
                </View>

                {/* Your Area section */}
                {rank && (
                    <Card
                        variant="tinted"
                        style={styles.boroughRow}
                        onPress={() => router.push('/(tabs)/trophy' as never)}
                        accessibilityLabel={`${rank.location}, Rank #${rank.rank}`}
                    >
                        <MaterialIcons
                            name="location-on"
                            size={24}
                            color={Colors.light.icon}
                            style={styles.boroughIcon}
                        />
                        <View style={styles.boroughContent}>
                            <Text style={styles.boroughName}>{rank.location}</Text>
                            <Text style={styles.boroughRank}>
                                {rank.rank > 0
                                    ? `Rank #${rank.rank} in your area`
                                    : `Play today's puzzle to get ranked in ${rank.location}`}
                            </Text>
                        </View>
                        <MaterialIcons
                            name="chevron-right"
                            size={24}
                            color={TFL.grey.dark}
                        />
                    </Card>
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
    scrollContent: {
        paddingHorizontal: HORIZONTAL_PADDING,
    },
    avatarButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: TFL.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: 'white',
    },
    section: {
        marginTop: Spacing.lg,
    },
    sectionTitle: {
        ...Typography.h3,
        marginBottom: Spacing.sm,
    },
    carouselContent: {
        paddingVertical: Spacing.xs,
    },
    statsRow: {
        flexDirection: 'row',
        gap: CARD_GAP,
    },
    boroughRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.lg,
    },
    boroughIcon: {
        marginRight: Spacing.sm,
    },
    boroughContent: {
        flex: 1,
    },
    boroughName: {
        ...Typography.body,
        fontWeight: '600',
    },
    boroughRank: {
        ...Typography.caption,
        marginTop: 2,
    },
});
