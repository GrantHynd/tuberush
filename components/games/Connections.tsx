import React, { useEffect, useState, useRef } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Animated,
    LayoutAnimation,
    Platform,
    UIManager
} from 'react-native';
import { ConnectionsState } from '@/types/game';
import { ConnectionsPuzzle } from '@/constants/ConnectionsData';
import { Colors, Typography, Spacing, Layout } from '@/constants/theme';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

interface ConnectionsProps {
    gameState: ConnectionsState;
    puzzle: ConnectionsPuzzle;
    onSubmitGuess: (items: string[]) => void;
}

export function Connections({ gameState, puzzle, onSubmitGuess }: ConnectionsProps) {
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [shuffledItems, setShuffledItems] = useState<string[]>([]);
    const shakeAnim = useRef(new Animated.Value(0)).current;

    // Initialize shuffled items on mount or when completed groups change
    useEffect(() => {
        // Get all items from groups that are NOT in completedGroups
        const completedGroupIds = gameState.completedGroups || [];
        const activeGroups = puzzle.groups.filter(g => !completedGroupIds.includes(g.category)); // Using category as ID for now or find better ID logic

        // If we just loaded, or completed a group, we need to refresh the grid items
        // But we should try to preserve order if possible, or just re-shuffle remaining
        const allActiveItems = activeGroups.flatMap(g => g.items);

        // If shuffledItems is empty (first load) or has items that are now completed, re-initialize
        // We only want to keep items that are still active.

        setShuffledItems(prev => {
            // Filter previous items to keep only active ones
            const remaining = prev.filter(item => allActiveItems.includes(item));
            // Add any new ones (shouldn't happen in this game type)
            // If the count doesn't match allActiveItems, it means we haven't initialized or need a full reset
            if (remaining.length !== allActiveItems.length) {
                // Shuffle all active items
                return [...allActiveItems].sort(() => Math.random() - 0.5);
            }
            return remaining;
        });

    }, [gameState.completedGroups, puzzle]);

    const handleSelect = (item: string) => {
        if (gameState.status !== 'playing') return;

        if (selectedItems.includes(item)) {
            setSelectedItems(prev => prev.filter(i => i !== item));
        } else {
            if (selectedItems.length < 4) {
                setSelectedItems(prev => [...prev, item]);
            }
        }
    };

    const handleShuffle = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShuffledItems(prev => [...prev].sort(() => Math.random() - 0.5));
    };

    const handleDeselectAll = () => {
        setSelectedItems([]);
    };

    const handleSubmit = () => {
        if (selectedItems.length !== 4) return;

        // Pass to parent to check logic
        // We might want to shake if wrong, but we don't know yet.
        // The parent will update gameState.
        // Check if the guess was already made or logic in parent?
        // Ideally parent handles logic, but we need feedback.
        // For now, assume parent updates state. If mistakes drop, we shake.

        onSubmitGuess(selectedItems);
        setSelectedItems([]);
    };

    // Effect to detect wrong guess (mistakes reduced) to trigger shake
    const prevMistakes = useRef(gameState.mistakesRemaining);
    useEffect(() => {
        if (gameState.mistakesRemaining < prevMistakes.current) {
            // Shake animation
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
            ]).start();
        }
        prevMistakes.current = gameState.mistakesRemaining;
    }, [gameState.mistakesRemaining]);

    // Render completed groups
    const renderCompletedGroups = () => {
        return gameState.completedGroups.map(groupId => {
            const group = puzzle.groups.find(g => g.category === groupId); // Assuming category is ID
            if (!group) return null;
            return (
                <View key={groupId} style={[styles.completedGroup, { backgroundColor: group.color }]}>
                    <Text style={styles.completedTitle}>{group.category}</Text>
                    <Text style={styles.completedItems}>{group.items.join(', ')}</Text>
                </View>
            );
        });
    };

    return (
        <View style={styles.container}>
            {/* Header / Mistakes */}
            <View
                style={styles.mistakesContainer}
                accessible={true}
                accessibilityLabel={`Mistakes remaining: ${gameState.mistakesRemaining}`}
            >
                <Text style={styles.mistakesText}>Mistakes remaining:</Text>
                <View style={styles.dotsContainer}>
                    {[...Array(4)].map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                i < gameState.mistakesRemaining ? styles.dotActive : styles.dotInactive
                            ]}
                        />
                    ))}
                </View>
            </View>

            {/* Completed Groups */}
            <View style={styles.completedContainer}>
                {renderCompletedGroups()}
            </View>

            {/* Grid */}
            <Animated.View style={[styles.grid, { transform: [{ translateX: shakeAnim }] }]}>
                {shuffledItems.map(item => {
                    const isSelected = selectedItems.includes(item);
                    return (
                        <TouchableOpacity
                            key={item}
                            style={[
                                styles.card,
                                isSelected && styles.cardSelected,
                                gameState.status !== 'playing' && styles.cardDisabled
                            ]}
                            onPress={() => handleSelect(item)}
                            activeOpacity={0.7}
                            disabled={gameState.status !== 'playing'}
                            accessibilityRole="button"
                            accessibilityLabel={`${item}, ${isSelected ? 'selected' : 'not selected'}`}
                            accessibilityState={{ selected: isSelected, disabled: gameState.status !== 'playing' }}
                            accessibilityHint="Double tap to select or deselect"
                        >
                            <Text style={[
                                styles.cardText,
                                isSelected && styles.cardTextSelected
                            ]}>
                                {item}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </Animated.View>

            {/* Controls */}
            <View style={styles.controls}>
                <TouchableOpacity
                    style={styles.buttonSecondary}
                    onPress={handleShuffle}
                    disabled={gameState.status !== 'playing'}
                    accessibilityRole="button"
                    accessibilityLabel="Shuffle items"
                    accessibilityState={{ disabled: gameState.status !== 'playing' }}
                >
                    <Text style={styles.buttonTextSecondary}>Shuffle</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.buttonSecondary}
                    onPress={handleDeselectAll}
                    disabled={gameState.status !== 'playing' || selectedItems.length === 0}
                    accessibilityRole="button"
                    accessibilityLabel="Deselect all items"
                    accessibilityState={{ disabled: gameState.status !== 'playing' || selectedItems.length === 0 }}
                >
                    <Text style={styles.buttonTextSecondary}>Deselect All</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.buttonPrimary,
                        selectedItems.length !== 4 && styles.buttonDisabled
                    ]}
                    onPress={handleSubmit}
                    disabled={selectedItems.length !== 4 || gameState.status !== 'playing'}
                    accessibilityRole="button"
                    accessibilityLabel="Submit guess"
                    accessibilityState={{ disabled: selectedItems.length !== 4 || gameState.status !== 'playing' }}
                    accessibilityHint={selectedItems.length !== 4 ? "Select 4 items to submit" : "Double tap to submit your guess"}
                >
                    <Text style={styles.buttonTextPrimary}>Submit</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: Spacing.md,
    },
    mistakesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    mistakesText: {
        ...Typography.body,
        marginRight: Spacing.sm,
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    dotActive: {
        backgroundColor: Colors.light.text,
    },
    dotInactive: {
        backgroundColor: Colors.light.border,
    },
    completedContainer: {
        marginBottom: Spacing.md,
        gap: Spacing.sm,
    },
    completedGroup: {
        padding: Spacing.md,
        borderRadius: Layout.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    completedTitle: {
        ...Typography.h3,
        color: Colors.light.background, // Assuming white text on colors
        marginBottom: 2,
        textAlign: 'center',
    },
    completedItems: {
        ...Typography.body,
        color: Colors.light.background,
        textAlign: 'center',
        fontSize: 14,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        justifyContent: 'center',
    },
    card: {
        width: '23%', // approx 4 columns with gap
        aspectRatio: 1.2, // slightly wider than tall
        backgroundColor: Colors.light.card, // Light grey
        borderRadius: Layout.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
        borderWidth: 1,
        borderColor: Colors.light.background, // match background
    },
    cardSelected: {
        backgroundColor: Colors.light.text, // Selected state (black)
        borderColor: Colors.light.text,
    },
    cardDisabled: {
        opacity: 0.5,
    },
    cardText: {
        ...Typography.label,
        color: Colors.light.text,
        textAlign: 'center',
        fontSize: 11, // Small text for mobile grid
        fontWeight: '700',
    },
    cardTextSelected: {
        color: Colors.light.background, // White text on black
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.md,
        marginTop: Spacing.xl,
    },
    buttonSecondary: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.light.text,
    },
    buttonTextSecondary: {
        ...Typography.label,
        color: Colors.light.text,
    },
    buttonPrimary: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xl,
        borderRadius: 20,
        backgroundColor: Colors.light.text,
        borderWidth: 1,
        borderColor: Colors.light.text,
    },
    buttonDisabled: {
        opacity: 0.3,
    },
    buttonTextPrimary: {
        ...Typography.label,
        color: Colors.light.background,
    },
});
