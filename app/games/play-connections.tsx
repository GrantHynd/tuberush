import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Modal } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useGameStore } from '@/stores/game-store';
import { Connections } from '@/components/games/Connections';
import { getDailyPuzzle, ConnectionsPuzzle } from '@/constants/ConnectionsData';
import { Colors } from '@/constants/theme';
import { ConnectionsState } from '@/types/game';
import { leaderboard } from '@/lib/leaderboard';
import { Leaderboard } from '@/components/ui/Leaderboard';

export default function PlayConnectionsScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { currentGame, loadGame, createNewGame, saveGame } = useGameStore();
    const [loading, setLoading] = useState(true);
    const [puzzle, setPuzzle] = useState<ConnectionsPuzzle | null>(null);
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    useEffect(() => {
        if (!user) {
            router.replace('/auth');
            return;
        }

        const initGame = async () => {
            const dailyPuzzle = getDailyPuzzle();
            setPuzzle(dailyPuzzle);

            const today = new Date().toISOString().split('T')[0];
            const gameId = `connections_${user.id}_${today}`;

            // Try to load existing game for today
            try {
                let game = await loadGame(gameId, user.id);

                if (!game) {
                    // Create new game
                    game = createNewGame(user.id, 'connections', gameId);
                }

                setLoading(false);
            } catch (error) {
                console.error('Failed to init game:', error);
                Alert.alert('Error', 'Failed to load game');
                router.back();
            }
        };

        initGame();
    }, [user]);

    const handleSubmitGuess = async (items: string[]) => {
        if (!currentGame || !puzzle || !user) return;

        const state = currentGame.state as ConnectionsState;

        // Prevent moves if game over
        if (state.status !== 'playing') return;

        // Check against groups
        const matchedGroup = puzzle.groups.find(group => {
            const groupItems = group.items;
            if (groupItems.length !== items.length) return false;
            return items.every(item => groupItems.includes(item));
        });

        const newState = { ...state };

        if (matchedGroup) {
            // Correct!
            if (!state.completedGroups.includes(matchedGroup.category)) {
                newState.completedGroups = [...state.completedGroups, matchedGroup.category];

                // Check win condition
                if (newState.completedGroups.length === 4) {
                    newState.status = 'won';
                    const endTime = Date.now();
                    newState.endTime = endTime;

                    // Calculate time taken in seconds
                    const timeTaken = Math.floor((endTime - newState.startTime) / 1000);

                    // Submit score if borough is set
                    if (user.borough) {
                        leaderboard.submitScore(user.id, user.borough, timeTaken, 'connections')
                            .catch(err => console.error('Failed to submit score', err));
                    }

                    setTimeout(() => {
                        Alert.alert(
                            'Congratulations!',
                            `You solved today's puzzle in ${timeTaken} seconds!`,
                            [
                                { text: 'Leaderboard', onPress: () => setShowLeaderboard(true) },
                                { text: 'Close', onPress: () => router.back() }
                            ]
                        );
                    }, 500);
                }
            }
        } else {
            // Wrong!
            newState.mistakesRemaining = Math.max(0, state.mistakesRemaining - 1);

            // Check loss condition
            if (newState.mistakesRemaining === 0) {
                newState.status = 'lost';
                newState.endTime = Date.now();
                setTimeout(() => {
                    Alert.alert(
                        'Game Over',
                        'Out of lives! Better luck next time.',
                        [
                            { text: 'Leaderboard', onPress: () => setShowLeaderboard(true) },
                            { text: 'Close', onPress: () => router.back() }
                        ]
                    );
                }, 500);
            }
        }

        // Update history
        newState.history = [...state.history, items];

        // Save
        await saveGame({
            ...currentGame,
            state: newState,
            lastUpdated: new Date().toISOString()
        });
    };

    if (loading || !puzzle || !currentGame) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.light.tint} />
            </View>
        );
    }

    const gameState = currentGame.state as ConnectionsState;

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                title: 'Connections',
                headerBackTitle: 'Home',
            }} />

            <Connections
                gameState={gameState}
                puzzle={puzzle}
                onSubmitGuess={handleSubmitGuess}
            />

            <Modal
                visible={showLeaderboard}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <Leaderboard
                    gameType="connections"
                    onClose={() => setShowLeaderboard(false)}
                />
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
