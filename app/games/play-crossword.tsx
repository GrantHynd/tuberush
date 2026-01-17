import { Crossword } from '@/components/games/Crossword';
import { useAuthStore } from '@/stores/auth-store';
import { useGameStore } from '@/stores/game-store';
import type { CrosswordState, GameState } from '@/types/game';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function PlayCrossword() {
    const router = useRouter();
    const user = useAuthStore(state => state.user);
    const { currentGame, saveGame, createNewGame } = useGameStore();
    const [gameState, setGameState] = useState<GameState | null>(null);

    useEffect(() => {
        if (!user) {
            Alert.alert('Error', 'You must be logged in to play', [
                { text: 'OK', onPress: () => router.back() }
            ]);
            return;
        }

        // Check premium status
        if (!user.isPremium) {
            Alert.alert(
                'Premium Required',
                'Crossword puzzles are only available for premium members.',
                [
                    { text: 'Subscribe', onPress: () => router.push('/subscribe') },
                    { text: 'Cancel', onPress: () => router.back() },
                ]
            );
            return;
        }

        // Create new game or load existing
        if (!currentGame || currentGame.gameType !== 'crossword') {
            const newGame = createNewGame(user.id, 'crossword');
            setGameState(newGame);
        } else {
            setGameState(currentGame);
        }
    }, [user]);

    const handleCellChange = async (row: number, col: number, value: string) => {
        if (!gameState) return;

        const state = gameState.state as CrosswordState;
        const newAnswers = {
            ...state.userAnswers,
            [`${row}-${col}`]: value,
        };

        const newState: CrosswordState = {
            ...state,
            userAnswers: newAnswers,
        };

        const updatedGame: GameState = {
            ...gameState,
            state: newState,
            lastUpdated: new Date().toISOString(),
        };

        setGameState(updatedGame);
        await saveGame(updatedGame);
    };

    const handleNewPuzzle = () => {
        if (!user) return;
        const newGame = createNewGame(user.id, 'crossword');
        setGameState(newGame);
        saveGame(newGame);
    };

    if (!user?.isPremium) {
        return null;
    }

    if (!gameState) {
        return (
            <View style={styles.container}>
                <Text>Loading...</Text>
            </View>
        );
    }

    const state = gameState.state as CrosswordState;

    return (
        <View style={styles.container}>
            <Crossword
                gameState={state}
                onCellChange={handleCellChange}
            />

            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleNewPuzzle}
                >
                    <Text style={styles.buttonText}>New Puzzle</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.buttonSecondary]}
                    onPress={() => router.back()}
                >
                    <Text style={styles.buttonTextSecondary}>Back to Home</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    actions: {
        padding: 20,
        gap: 10,
    },
    button: {
        backgroundColor: '#3498db',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#3498db',
    },
    buttonTextSecondary: {
        color: '#3498db',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
