import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Animated,
    LayoutAnimation,
    Platform,
    UIManager,
    useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ConnectionsState } from '@/types/game';
import { ConnectionsPuzzle } from '@/constants/ConnectionsData';
import { Colors, Typography, Spacing, Layout, TFL } from '@/constants/theme';

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

const GRID_COLUMNS = 4;
const CARD_GAP = 6;
const HORIZONTAL_PADDING = 16;

export function Connections({ gameState, puzzle, onSubmitGuess }: ConnectionsProps) {
    const { width: screenWidth } = useWindowDimensions();
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [shuffledItems, setShuffledItems] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const shakeAnim = useRef(new Animated.Value(0)).current;

    // Calculate responsive card size based on screen width
    const gridWidth = screenWidth - HORIZONTAL_PADDING * 2;
    const cardSize = (gridWidth - CARD_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

    // Initialize shuffled items on mount or when completed groups change
    useEffect(() => {
        const completedGroupIds = gameState.completedGroups || [];
        const activeGroups = puzzle.groups.filter(
            (g) => !completedGroupIds.includes(g.category)
        );
        const allActiveItems = activeGroups.flatMap((g) => g.items);

        setShuffledItems((prev) => {
            const remaining = prev.filter((item) => allActiveItems.includes(item));
            if (remaining.length !== allActiveItems.length) {
                return [...allActiveItems].sort(() => Math.random() - 0.5);
            }
            return remaining;
        });
    }, [gameState.completedGroups, puzzle]);

    // Auto-submit when 4 items are selected
    useEffect(() => {
        if (selectedItems.length === 4 && !isSubmitting && gameState.status === 'playing') {
            setIsSubmitting(true);
            // Brief delay so user sees the 4th card highlight before guess resolves
            const timer = setTimeout(() => {
                onSubmitGuess(selectedItems);
                setSelectedItems([]);
                setIsSubmitting(false);
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [selectedItems, isSubmitting, gameState.status, onSubmitGuess]);

    const handleSelect = useCallback(
        (item: string) => {
            if (gameState.status !== 'playing' || isSubmitting) return;

            if (selectedItems.includes(item)) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedItems((prev) => prev.filter((i) => i !== item));
            } else if (selectedItems.length < 4) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedItems((prev) => [...prev, item]);
            }
        },
        [gameState.status, isSubmitting, selectedItems]
    );

    const handleShuffle = useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShuffledItems((prev) => [...prev].sort(() => Math.random() - 0.5));
    }, []);

    const handleDeselectAll = useCallback(() => {
        setSelectedItems([]);
    }, []);

    // Detect wrong guess to trigger shake
    const prevMistakes = useRef(gameState.mistakesRemaining);
    useEffect(() => {
        if (gameState.mistakesRemaining < prevMistakes.current) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
            ]).start();
        }
        prevMistakes.current = gameState.mistakesRemaining;
    }, [gameState.mistakesRemaining]);

    // Detect correct guess
    const prevCompletedGroups = useRef(gameState.completedGroups.length);
    useEffect(() => {
        if (gameState.completedGroups.length > prevCompletedGroups.current) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }
        prevCompletedGroups.current = gameState.completedGroups.length;
    }, [gameState.completedGroups.length]);

    const renderCompletedGroups = () => {
        return gameState.completedGroups.map((groupId) => {
            const group = puzzle.groups.find((g) => g.category === groupId);
            if (!group) return null;

            // Use white text on darker colors, dark text on yellow
            const isLightBg = group.color === TFL.yellow;
            const textColor = isLightBg ? Colors.light.text : Colors.light.background;

            return (
                <View
                    key={groupId}
                    style={[styles.completedGroup, { backgroundColor: group.color }]}
                    accessible={true}
                    accessibilityLabel={`Completed group: ${group.category}. Items: ${group.items.join(', ')}`}
                >
                    <Text style={[styles.completedTitle, { color: textColor }]}>
                        {group.category}
                    </Text>
                    <Text style={[styles.completedItems, { color: textColor }]}>
                        {group.items.join(', ')}
                    </Text>
                </View>
            );
        });
    };

    const renderLives = () => {
        return (
            <View
                style={styles.livesContainer}
                accessible={true}
                accessibilityLabel={`${gameState.mistakesRemaining} lives remaining`}
            >
                <Text style={styles.livesLabel}>Lives remaining</Text>
                <View style={styles.dotsRow}>
                    {[...Array(4)].map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                i < gameState.mistakesRemaining
                                    ? styles.dotActive
                                    : styles.dotUsed,
                            ]}
                        />
                    ))}
                </View>
            </View>
        );
    };

    const rows: string[][] = [];
    for (let i = 0; i < shuffledItems.length; i += GRID_COLUMNS) {
        rows.push(shuffledItems.slice(i, i + GRID_COLUMNS));
    }

    return (
        <View style={styles.container}>
            {/* Completed Groups */}
            <View style={styles.completedContainer}>{renderCompletedGroups()}</View>

            {/* Game Grid */}
            <Animated.View
                style={[styles.grid, { transform: [{ translateX: shakeAnim }] }]}
            >
                {rows.map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.gridRow}>
                        {row.map((item) => {
                            const isSelected = selectedItems.includes(item);
                            return (
                                <TouchableOpacity
                                    key={item}
                                    style={[
                                        styles.card,
                                        {
                                            width: cardSize,
                                            height: cardSize * 0.65,
                                        },
                                        isSelected && styles.cardSelected,
                                        gameState.status !== 'playing' && styles.cardDisabled,
                                    ]}
                                    onPress={() => handleSelect(item)}
                                    activeOpacity={0.7}
                                    disabled={
                                        gameState.status !== 'playing' || isSubmitting
                                    }
                                    accessibilityRole="button"
                                    accessibilityLabel={`${item}, ${isSelected ? 'selected' : 'not selected'}`}
                                    accessibilityState={{
                                        selected: isSelected,
                                        disabled: gameState.status !== 'playing',
                                    }}
                                    accessibilityHint="Tap to select or deselect"
                                >
                                    <Text
                                        style={[
                                            styles.cardText,
                                            { fontSize: cardSize < 80 ? 11 : 13 },
                                            isSelected && styles.cardTextSelected,
                                        ]}
                                        numberOfLines={2}
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.7}
                                    >
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}
            </Animated.View>

            {/* Lives */}
            {renderLives()}

            {/* Controls */}
            <View style={styles.controls}>
                <TouchableOpacity
                    style={[
                        styles.buttonSecondary,
                        (gameState.status !== 'playing' || isSubmitting) &&
                            styles.buttonInactive,
                    ]}
                    onPress={handleShuffle}
                    disabled={gameState.status !== 'playing' || isSubmitting}
                    accessibilityRole="button"
                    accessibilityLabel="Shuffle items"
                    accessibilityState={{
                        disabled: gameState.status !== 'playing',
                    }}
                >
                    <Text
                        style={[
                            styles.buttonTextSecondary,
                            (gameState.status !== 'playing' || isSubmitting) &&
                                styles.buttonTextInactive,
                        ]}
                    >
                        Shuffle
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.buttonSecondary,
                        (gameState.status !== 'playing' ||
                            selectedItems.length === 0 ||
                            isSubmitting) &&
                            styles.buttonInactive,
                    ]}
                    onPress={handleDeselectAll}
                    disabled={
                        gameState.status !== 'playing' ||
                        selectedItems.length === 0 ||
                        isSubmitting
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Deselect all items"
                    accessibilityState={{
                        disabled:
                            gameState.status !== 'playing' ||
                            selectedItems.length === 0,
                    }}
                >
                    <Text
                        style={[
                            styles.buttonTextSecondary,
                            (gameState.status !== 'playing' ||
                                selectedItems.length === 0 ||
                                isSubmitting) &&
                                styles.buttonTextInactive,
                        ]}
                    >
                        Deselect All
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: HORIZONTAL_PADDING,
        paddingTop: Spacing.md,
    },
    completedContainer: {
        gap: CARD_GAP,
        marginBottom: CARD_GAP,
    },
    completedGroup: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderRadius: Layout.borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    completedTitle: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 2,
        textAlign: 'center',
    },
    completedItems: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    grid: {
        gap: CARD_GAP,
    },
    gridRow: {
        flexDirection: 'row',
        gap: CARD_GAP,
    },
    card: {
        backgroundColor: '#EFEFE6',
        borderRadius: Layout.borderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    cardSelected: {
        backgroundColor: Colors.light.text,
    },
    cardDisabled: {
        opacity: 0.5,
    },
    cardText: {
        fontWeight: '700',
        color: Colors.light.text,
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    cardTextSelected: {
        color: Colors.light.background,
    },
    livesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.lg,
        gap: Spacing.sm,
    },
    livesLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: Colors.light.text,
    },
    dotsRow: {
        flexDirection: 'row',
        gap: 6,
    },
    dot: {
        width: 14,
        height: 14,
        borderRadius: 7,
    },
    dotActive: {
        backgroundColor: Colors.light.text,
    },
    dotUsed: {
        backgroundColor: Colors.light.border,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.sm,
        marginTop: Spacing.lg,
    },
    buttonSecondary: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: Colors.light.text,
    },
    buttonTextSecondary: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
    },
    buttonInactive: {
        borderColor: Colors.light.border,
    },
    buttonTextInactive: {
        color: TFL.grey.medium,
    },
});
