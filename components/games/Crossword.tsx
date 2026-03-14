import type { CrosswordState } from '@/types/game';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface CrosswordProps {
    gameState: CrosswordState;
    onCellChange: (row: number, col: number, value: string) => void;
    disabled?: boolean;
}

export function Crossword({ gameState, onCellChange, disabled = false }: CrosswordProps) {
    const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);

    const grid = gameState.grid;
    const clues = gameState.clues;

    const handleCellPress = (row: number, col: number) => {
        const cell = grid[row][col];
        if (!cell.isBlack) {
            setSelectedCell({ row, col });
        }
    };

    const handleCellInput = (value: string) => {
        if (selectedCell && value.length <= 1) {
            onCellChange(selectedCell.row, selectedCell.col, value.toUpperCase());

            // Auto-advance to next cell
            const nextCol = selectedCell.col + 1;
            if (nextCol < grid[selectedCell.row].length && !grid[selectedCell.row][nextCol].isBlack) {
                setSelectedCell({ row: selectedCell.row, col: nextCol });
            }
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Premium Crossword Puzzle</Text>

            {/* Grid */}
            <View style={styles.gridContainer}>
                {grid.map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.row}>
                        {row.map((cell, colIndex) => {
                            const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                            const userAnswer = gameState.userAnswers[`${rowIndex}-${colIndex}`] || '';

                            return (
                                <TouchableOpacity
                                    key={colIndex}
                                    style={[
                                        styles.cell,
                                        cell.isBlack && styles.blackCell,
                                        isSelected && styles.selectedCell,
                                    ]}
                                    onPress={() => handleCellPress(rowIndex, colIndex)}
                                    disabled={disabled || cell.isBlack}
                                >
                                    {cell.number && (
                                        <Text style={styles.cellNumber}>{cell.number}</Text>
                                    )}
                                    {!cell.isBlack && (
                                        <Text style={styles.cellLetter}>{userAnswer}</Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}
            </View>

            {/* Input for selected cell */}
            {selectedCell && (
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={gameState.userAnswers[`${selectedCell.row}-${selectedCell.col}`] || ''}
                        onChangeText={handleCellInput}
                        maxLength={1}
                        autoCapitalize="characters"
                        autoFocus
                        placeholder="Enter letter"
                    />
                </View>
            )}

            {/* Clues */}
            <View style={styles.cluesContainer}>
                <View style={styles.clueSection}>
                    <Text style={styles.clueTitle}>Across</Text>
                    {Object.entries(clues.across).map(([num, clue]) => (
                        <Text key={num} style={styles.clue}>
                            {num}. {clue}
                        </Text>
                    ))}
                </View>

                <View style={styles.clueSection}>
                    <Text style={styles.clueTitle}>Down</Text>
                    {Object.entries(clues.down).map(([num, clue]) => (
                        <Text key={num} style={styles.clue}>
                            {num}. {clue}
                        </Text>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#2c3e50',
    },
    gridContainer: {
        alignSelf: 'center',
        marginBottom: 20,
        backgroundColor: '#000',
        padding: 2,
    },
    row: {
        flexDirection: 'row',
    },
    cell: {
        width: 50,
        height: 50,
        backgroundColor: '#fff',
        margin: 1,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    blackCell: {
        backgroundColor: '#000',
    },
    selectedCell: {
        backgroundColor: '#3498db',
    },
    cellNumber: {
        position: 'absolute',
        top: 2,
        left: 3,
        fontSize: 10,
        color: '#666',
    },
    cellLetter: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    inputContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    input: {
        width: 60,
        height: 60,
        borderWidth: 2,
        borderColor: '#3498db',
        borderRadius: 8,
        fontSize: 32,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    cluesContainer: {
        marginTop: 20,
    },
    clueSection: {
        marginBottom: 20,
    },
    clueTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#2c3e50',
    },
    clue: {
        fontSize: 16,
        marginBottom: 8,
        color: '#34495e',
    },
});
