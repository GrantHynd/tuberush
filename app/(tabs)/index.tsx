import { PuzzleCard } from '@/components/home/PuzzleCard';
import { SectionHeader } from '@/components/home/SectionHeader';
import { StatCard } from '@/components/home/StatCard';
import type {
    ConnectionsCarouselItem,
    CrosswordCarouselItem,
} from '@/hooks/usePuzzleCarousel';
import { Colors, Layout, Spacing, TFL, Typography } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useLocationRank } from '@/hooks/useLocationRank';
import { usePuzzleCarousel } from '@/hooks/usePuzzleCarousel';
import { useUserStats } from '@/hooks/useUserStats';
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

const HORIZONTAL_PADDING = 20;
const CARD_GAP = 12;

export default function HomeScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { items: connectionsItems, refresh: refreshConnections } = usePuzzleCarousel('connections');
    const { items: crosswordItems, refresh: refreshCrossword } = usePuzzleCarousel('crossword');

    useFocusEffect(
        useCallback(() => {
            refreshConnections();
            refreshCrossword();
        }, [refreshConnections, refreshCrossword])
    );
    const { stats } = useUserStats();
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
            router.push('/subscribe');
            return;
        }
        router.push(`/games/play-crossword?puzzleId=${puzzleId}` as never);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.brandRow}>
                        <View style={styles.roundel}>
                            <View style={styles.roundelInner} />
                            <View style={styles.roundelBar} />
                        </View>
                        <View>
                            <Text style={styles.title}>TubeRush</Text>
                            <Text style={styles.tagline}>Beat the commute.</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => router.push(user ? '/profile' : '/auth')}
                        style={styles.avatarButton}
                        accessibilityRole="button"
                        accessibilityLabel={user ? 'Profile' : 'Sign in'}
                    >
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {user?.email?.[0]?.toUpperCase() ?? '?'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Connections section */}
                <View style={styles.section}>
                    <SectionHeader
                        icon="hub"
                        title="Connections"
                        onSeeAllPress={() => router.push('/games/connections-list' as never)}
                    />
                    <FlatList
                        data={connectionsItems as ConnectionsCarouselItem[]}
                        horizontal
                        keyExtractor={(item) => item.date}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.carouselContent}
                        ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
                        renderItem={({ item }) => (
                            <PuzzleCard
                                puzzleNumber={item.puzzleNumber}
                                label={item.label}
                                isNew={item.isNew}
                                isCompleted={item.isCompleted}
                                commuteCount={item.commuteCount}
                                backgroundColor={TFL.blue}
                                onPress={() => handleConnectionsCardPress(item.date)}
                            />
                        )}
                    />
                </View>

                {/* Crossword section */}
                <View style={styles.section}>
                    <SectionHeader
                        icon="grid-on"
                        title="Crossword"
                        badge={user?.isPremium ? '1st Class' : undefined}
                        onSeeAllPress={() => router.push('/games/crossword-list' as never)}
                    />
                    <FlatList
                        data={crosswordItems as CrosswordCarouselItem[]}
                        horizontal
                        keyExtractor={(item) => item.date}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.carouselContent}
                        ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
                        renderItem={({ item }) => (
                            <PuzzleCard
                                puzzleNumber={item.puzzleNumber}
                                label={item.label}
                                isNew={item.isNew}
                                isCompleted={item.isCompleted}
                                commuteCount={item.commuteCount}
                                backgroundColor={TFL.red}
                                onPress={() => handleCrosswordCardPress(item.puzzleId)}
                            />
                        )}
                    />
                </View>

                {/* Your Stats section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your Stats</Text>
                    <View style={styles.statsRow}>
                        <StatCard
                            icon="timer"
                            label="Best Time"
                            value={stats.bestTime ?? '—'}
                        />
                        <View style={styles.statCardSpacer} />
                        <StatCard
                            icon="local-fire-department"
                            label="Streak"
                            value={String(stats.streak)}
                        />
                    </View>
                </View>

                {/* Your Area section */}
                {rank && (
                    <TouchableOpacity
                        style={styles.boroughRow}
                        onPress={() => router.push('/(tabs)/trophy' as never)}
                        accessibilityRole="button"
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
                                    : 'No rank yet in your area'}
                            </Text>
                        </View>
                        <MaterialIcons
                            name="chevron-right"
                            size={24}
                            color={TFL.grey.dark}
                        />
                    </TouchableOpacity>
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
        paddingBottom: Spacing.xl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.lg,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    roundel: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: TFL.red,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
        position: 'relative',
    },
    roundelInner: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'white',
    },
    roundelBar: {
        position: 'absolute',
        width: 40,
        height: 6,
        backgroundColor: TFL.blue,
    },
    title: {
        ...Typography.h2,
        fontSize: 24,
        color: Colors.light.text,
        letterSpacing: -0.5,
    },
    tagline: {
        fontSize: 14,
        color: TFL.grey.dark,
        marginTop: 2,
    },
    avatarButton: {
        padding: 4,
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
    statCardSpacer: {
        width: CARD_GAP,
    },
    boroughRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.light.card,
        borderRadius: Layout.borderRadius.lg,
        padding: Spacing.md,
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
