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
import { useBoroughBreakdown } from '@/hooks/useBoroughBreakdown';
import { useAuthStore } from '@/stores/auth-store';
import { WeekNavigator } from '@/components/leaderboard/WeekNavigator';
import { LocationFilterTabs } from '@/components/leaderboard/LocationFilterTabs';
import { BoroughList } from '@/components/leaderboard/BoroughList';

export default function BoroughBreakdownScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        gameType: string;
        weekStart?: string;
        weekEnd?: string;
    }>();
    const { user } = useAuthStore();

    const gt = (params.gameType ?? 'connections') as GameType;
    const game = GAMES[gt as GameId];

    const initialWeek = useMemo(() => {
        if (params.weekStart && params.weekEnd) {
            return { start: params.weekStart, end: params.weekEnd };
        }
        return getCurrentWeek();
    }, [params.weekStart, params.weekEnd]);

    const [week, setWeek] = useState(initialWeek);

    const { boroughs, loading } = useBoroughBreakdown(
        gt,
        week.start,
        week.end
    );

    const handleWeekChange = useCallback((dir: -1 | 1) => {
        setWeek((prev) => shiftWeek(prev.start, dir));
    }, []);

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
                cities={['London']}
                activeCity="London"
                onSelect={(city) => {
                    if (city !== 'London') {
                        router.back();
                    }
                }}
                showBackToLondon
                onBackToLondon={() => router.back()}
            />

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator
                        size="large"
                        color={Colors.light.tint}
                    />
                </View>
            ) : boroughs.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <Text style={styles.emptyText}>
                        No borough data for this week.
                    </Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                >
                    <BoroughList
                        boroughs={boroughs}
                        userBorough={user?.borough}
                    />
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
