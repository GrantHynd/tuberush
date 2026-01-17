import { TicTacToe } from '@/components/games/TicTacToe';
import { useAuthStore } from '@/stores/auth-store';
import { useGameStore } from '@/stores/game-store';
import type { GameState, TicTacToeState } from '@/types/game';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function PlayTicTacToe() {
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

        // Create new game or load existing
        if (!currentGame || currentGame.gameType !== 'tictactoe') {
            const newGame = createNewGame(user.id, 'tictactoe');
            setGameState(newGame);
        } else {
            setGameState(currentGame);
        }
    }, [user]);

    const calculateWinner = (board: (string | null)[]): string | null => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
            [0, 4, 8], [2, 4, 6], // diagonals
        ];

        for (const [a, b, c] of lines) {
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return board[a];
            }
        }
        return null;
    };

    const handleMove = async (index: number) => {
        if (!gameState) return;

        const state = gameState.state as TicTacToeState;
        const newBoard = [...state.board];
        newBoard[index] = state.currentPlayer;

        const winner = calculateWinner(newBoard);
        const isDraw = !winner && newBoard.every(cell => cell !== null);

        const newState: TicTacToeState = {
            board: newBoard,
            currentPlayer: state.currentPlayer === 'X' ? 'O' : 'X',
            winner,
            isDraw,
            moveHistory: [...state.moveHistory, index],
        };

        const updatedGame: GameState = {
            ...gameState,
            state: newState,
            lastUpdated: new Date().toISOString(),
        };

        setGameState(updatedGame);
        await saveGame(updatedGame);
    };

    const handleNewGame = () => {
        if (!user) return;
        const newGame = createNewGame(user.id, 'tictactoe');
        setGameState(newGame);
        saveGame(newGame);
    };

    if (!gameState) {
        return (
            <View style={styles.container}>
                <Text>Loading...</Text>
            </View>
        );
    }

    const state = gameState.state as TicTacToeState;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Tic Tac Toe</Text>

            <TicTacToe
                gameState={state}
                onMove={handleMove}
            />

            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleNewGame}
                >
                    <Text style={styles.buttonText}>New Game</Text>
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
        backgroundColor: '#ecf0f1',
        padding: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#2c3e50',
    },
    actions: {
        marginTop: 30,
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
