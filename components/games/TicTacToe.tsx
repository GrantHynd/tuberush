import type { TicTacToeState } from '@/types/game';
import React, { useEffect } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TicTacToeProps {
    gameState: TicTacToeState;
    onMove: (index: number) => void;
    disabled?: boolean;
}

export function TicTacToe({ gameState, onMove, disabled = false }: TicTacToeProps) {
    const { board, currentPlayer, winner, isDraw } = gameState;

    useEffect(() => {
        if (winner) {
            Alert.alert('Game Over', `${winner} wins!`, [{ text: 'OK' }]);
        } else if (isDraw) {
            Alert.alert('Game Over', "It's a draw!", [{ text: 'OK' }]);
        }
    }, [winner, isDraw]);

    const handlePress = (index: number) => {
        if (disabled || board[index] || winner || isDraw) {
            return;
        }
        onMove(index);
    };

    const renderCell = (index: number) => {
        const value = board[index];
        return (
            <TouchableOpacity
                key={index}
                style={styles.cell}
                onPress={() => handlePress(index)}
                disabled={disabled || !!value || !!winner || isDraw}
            >
                <Text style={[
                    styles.cellText,
                    value === 'X' ? styles.xText : styles.oText,
                ]}>
                    {value || ''}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.statusContainer}>
                {winner ? (
                    <Text style={styles.statusText}>Winner: {winner}!</Text>
                ) : isDraw ? (
                    <Text style={styles.statusText}>It's a Draw!</Text>
                ) : (
                    <Text style={styles.statusText}>Current Player: {currentPlayer}</Text>
                )}
            </View>

            <View style={styles.board}>
                <View style={styles.row}>
                    {renderCell(0)}
                    {renderCell(1)}
                    {renderCell(2)}
                </View>
                <View style={styles.row}>
                    {renderCell(3)}
                    {renderCell(4)}
                    {renderCell(5)}
                </View>
                <View style={styles.row}>
                    {renderCell(6)}
                    {renderCell(7)}
                    {renderCell(8)}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    statusContainer: {
        marginBottom: 30,
    },
    statusText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    board: {
        backgroundColor: '#34495e',
        padding: 10,
        borderRadius: 10,
    },
    row: {
        flexDirection: 'row',
    },
    cell: {
        width: 100,
        height: 100,
        backgroundColor: '#ecf0f1',
        margin: 5,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    cellText: {
        fontSize: 48,
        fontWeight: 'bold',
    },
    xText: {
        color: '#e74c3c',
    },
    oText: {
        color: '#3498db',
    },
});
