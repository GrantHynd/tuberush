import React, { useCallback, useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, TFL, Spacing, Typography } from '@/constants/theme';
import { GAMES, GameId } from '@/constants/Games';
import { GameType } from '@/types/game';
import { getCurrentWeek, shiftWeek } from '@/lib/week-utils';
import { useWeeklyLeaderboard } from '@/hooks/useWeeklyLeaderboard';
import { useAuthStore } from '@/stores/auth-store';
import { WeekNavigator } from '@/components/leaderboard/WeekNavigator';
import { LocationFilterTabs } from '@/components/leaderboard/LocationFilterTabs';
import { Podium } from '@/components/leaderboard/Podium';
import { RankedList } from '@/components/leaderboard/RankedList';

const LIST_CAP = 50;

export default function GameLeaderboardScreen() {
    const router = useRouter();
    const { gameType } = useLocalSearchParams<{ gameType: string }>();
    const { user } = useAuthStore();

    const gt = (gameType ?? 'connections') as GameType;
    const game = GAMES[gt as GameId];

    const [week, setWeek] = useState(getCurrentWeek);
    const [activeCity, setActiveCity] = useState<string | null>(null);

    const { entries, totalPlayers, loading } = useWeeklyLeaderboard(
        gt,
        week.start,
        week.end,
        activeCity
    );

    // Only show Global + user's own city/town
    const userCityTabs = useMemo(() => {
        if (!user?.city) return [];
        return [user.city];
    }, [user?.city]);

    // Cap at top 50; find user entry if outside
    const { top, userOutside } = useMemo(() => {
        const top = entries.slice(0, LIST_CAP);
        const userInTop = user
            ? top.some((e) => e.userId === user.id)
            : true;
        const userOutside =
            !userInTop && user
                ? entries.find((e) => e.userId === user.id) ?? null
                : null;
        return { top, userOutside };
    }, [entries, user]);

    const handleWeekChange = useCallback((dir: -1 | 1) => {
        setWeek((prev) => shiftWeek(prev.start, dir));
    }, []);

    const handleBoroughPress = useCallback(() => {
        router.push(
            `/leaderboard/boroughs?gameType=${gt}&weekStart=${week.start}&weekEnd=${week.end}` as never
        );
    }, [router, gt, week]);

    const isLondonUser = user?.city === 'London';

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <MaterialIcons
                        name="arrow-back"
                        size={24}
                        color={Colors.light.text}
                    />
                </TouchableOpacity>
                <Text style={styles.gameIcon}>{game.icon}</Text>
                <Text style={styles.gameName}>{game.name}</Text>
            </View>

            <WeekNavigator
                weekStart={week.start}
                weekEnd={week.end}
                onWeekChange={handleWeekChange}
            />

            <LocationFilterTabs
                cities={userCityTabs}
                activeCity={activeCity}
                onSelect={setActiveCity}
                showBoroughLink={isLondonUser}
                onBoroughPress={handleBoroughPress}
            />

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator
                        size="large"
                        color={Colors.light.tint}
                    />
                </View>
            ) : top.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <Text style={styles.emptyText}>
                        No scores yet for this week.
                    </Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                >
                    <Podium entries={top} currentUserId={user?.id} />

                    {top.length > 3 && (
                        <RankedList
                            entries={top}
                            currentUserId={user?.id}
                            startFromRank={3}
                            userEntryOutsideList={userOutside}
                        />
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: 8,
    },
    gameIcon: {
        fontSize: 20,
    },
    gameName: {
        ...Typography.h3,
    },
    scroll: {
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.xxl,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
    },
    emptyText: {
        ...Typography.caption,
        color: Colors.light.icon,
    },
});
