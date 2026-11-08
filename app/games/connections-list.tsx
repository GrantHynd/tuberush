import { useTheme } from '@/hooks/useTheme';
import { GameHistoryListScreen } from '@/components/games/GameHistoryListScreen';
import { GAMES } from '@/constants/Games';
import { connectionsGameHistoryConfig } from '@/config/gameHistoryConfigs';
import { useGameHistoryList } from '@/hooks/useGameHistoryList';
import { useAuthStore } from '@/stores/auth-store';

import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';

export default function ConnectionsListScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { user } = useAuthStore();
    const { sections, stats, refresh, hasMore, loadMore, loadingMore } = useGameHistoryList(
        connectionsGameHistoryConfig
    );

    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [refresh])
    );

    const handlePuzzlePress = (date: string) => {
        if (!user) {
            router.push('/auth');
            return;
        }
        router.push(`/games/play-connections?date=${date}` as never);
    };

    return (
        <GameHistoryListScreen
            title={GAMES.connections.name}
            icon="hub"
            accentColor={colors.primary}
            hasWinLoss={true}
            sections={sections}
            stats={stats}
            hasMore={hasMore}
            loadMore={loadMore}
            loadingMore={loadingMore}
            onPuzzlePress={handlePuzzlePress}
        />
    );
}
