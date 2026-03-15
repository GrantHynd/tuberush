import { PuzzleCard } from '@/components/home/PuzzleCard';
import { HeaderBackButton } from '@/components/ui/HeaderBackButton';
import {
    usePuzzleCarousel,
    type ConnectionsCarouselItem,
} from '@/hooks/usePuzzleCarousel';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, TFL } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    FlatList,
    StyleSheet,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CARD_GAP = 12;

export default function ConnectionsListScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { items } = usePuzzleCarousel('connections');

    const handleCardPress = (date: string) => {
        if (!user) {
            router.push('/auth');
            return;
        }
        router.push(`/games/play-connections?date=${date}` as never);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <HeaderBackButton title="Connections" />
            <FlatList<ConnectionsCarouselItem>
                data={items as ConnectionsCarouselItem[]}
                keyExtractor={(item) => item.date}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                renderItem={({ item }) => (
                    <PuzzleCard
                        puzzleNumber={item.puzzleNumber}
                        label={item.label}
                        isNew={item.isNew}
                        isCompleted={item.isCompleted}
                        commuteCount={item.commuteCount}
                        backgroundColor={TFL.blue}
                        onPress={() => handleCardPress(item.date)}
                        variant="list"
                    />
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    listContent: {
        padding: Spacing.md,
        paddingBottom: Spacing.xl,
    },
    separator: {
        height: CARD_GAP,
    },
});
