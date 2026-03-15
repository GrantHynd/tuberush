import { PuzzleCard } from '@/components/home/PuzzleCard';
import { HeaderBackButton } from '@/components/ui/HeaderBackButton';
import {
    usePuzzleCarousel,
    type CrosswordCarouselItem,
} from '@/hooks/usePuzzleCarousel';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, TFL } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    FlatList,
    StyleSheet,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CARD_GAP = 12;

export default function CrosswordListScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { items } = usePuzzleCarousel('crossword');

    const handleCardPress = (puzzleId: string) => {
        if (!user) {
            router.push('/auth');
            return;
        }
        if (!user.isPremium) {
            Alert.alert(
                'Premium Required',
                'Crossword puzzles are only available for premium members.',
                [
                    { text: 'Subscribe', onPress: () => router.push('/subscribe') },
                    { text: 'Cancel', onPress: () => {} },
                ],
            );
            return;
        }
        router.push(`/games/play-crossword?puzzleId=${puzzleId}` as never);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <HeaderBackButton title="Crossword" />
            <FlatList<CrosswordCarouselItem>
                data={items as CrosswordCarouselItem[]}
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
                        backgroundColor={TFL.red}
                        onPress={() => handleCardPress(item.puzzleId)}
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
