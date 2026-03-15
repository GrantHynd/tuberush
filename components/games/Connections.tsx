import { ConnectionsPuzzle } from "@/constants/ConnectionsData";
import { Colors, ConnectionsGroupColors, Layout, Spacing, TFL } from "@/constants/theme";
import { ConnectionsState } from "@/types/game";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  useWindowDimensions,
  View,
} from "react-native";

if (Platform.OS === "android") {
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
const CARD_GAP = 8;
const HORIZONTAL_PADDING = 16;

/** Map difficulty (1–4) to the standard Connections colour */
const DIFFICULTY_COLORS: Record<number, string> = {
  1: ConnectionsGroupColors.yellow,
  2: ConnectionsGroupColors.green,
  3: ConnectionsGroupColors.blue,
  4: ConnectionsGroupColors.purple,
};

export function Connections({
  gameState,
  puzzle,
  onSubmitGuess,
}: ConnectionsProps) {
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
      (g) => !completedGroupIds.includes(g.category),
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

  const handleSelect = useCallback(
    (item: string) => {
      if (gameState.status !== "playing" || isSubmitting) return;

      if (selectedItems.includes(item)) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedItems((prev) => prev.filter((i) => i !== item));
      } else if (selectedItems.length < 4) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedItems((prev) => [...prev, item]);
      }
    },
    [gameState.status, isSubmitting, selectedItems],
  );

  const handleShuffle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShuffledItems((prev) => [...prev].sort(() => Math.random() - 0.5));
  }, []);

  const handleDeselectAll = useCallback(() => {
    setSelectedItems([]);
  }, []);

  const handleSubmit = useCallback(() => {
    if (selectedItems.length !== 4 || isSubmitting || gameState.status !== "playing") return;

    setIsSubmitting(true);
    onSubmitGuess(selectedItems);
    setSelectedItems([]);
    setIsSubmitting(false);
  }, [selectedItems, isSubmitting, gameState.status, onSubmitGuess]);

  // Detect wrong guess to trigger shake
  const prevMistakes = useRef(gameState.mistakesRemaining);
  useEffect(() => {
    if (gameState.mistakesRemaining < prevMistakes.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevMistakes.current = gameState.mistakesRemaining;
  }, [gameState.mistakesRemaining, shakeAnim]);

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

      const bgColor = DIFFICULTY_COLORS[group.difficulty] || group.color;
      const textColor = Colors.light.text;

      return (
        <View
          key={groupId}
          style={[styles.completedGroup, { backgroundColor: bgColor }]}
          accessible={true}
          accessibilityLabel={`Completed group: ${group.category}. Items: ${group.items.join(", ")}`}
        >
          <Text style={[styles.completedTitle, { color: textColor }]}>
            {group.category}
          </Text>
          <Text style={[styles.completedItems, { color: textColor }]}>
            {group.items.join(", ")}
          </Text>
        </View>
      );
    });
  };

  const renderMistakes = () => {
    return (
      <View
        style={styles.mistakesContainer}
        accessible={true}
        accessibilityLabel={`${gameState.mistakesRemaining} mistakes remaining`}
      >
        <Text style={styles.mistakesLabel}>Mistakes Remaining:</Text>
        <View style={styles.dotsRow}>
          {[...Array(4)].map((_, i) => (
            <Animated.View
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

  const canSubmit =
    selectedItems.length === 4 &&
    !isSubmitting &&
    gameState.status === "playing";

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
                <Pressable
                  key={item}
                  style={({ pressed }) => [
                    styles.card,
                    {
                      width: cardSize,
                      height: cardSize * 0.7,
                    },
                    isSelected && styles.cardSelected,
                    gameState.status !== "playing" && styles.cardDisabled,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => handleSelect(item)}
                  disabled={gameState.status !== "playing" || isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel={`${item}, ${isSelected ? "selected" : "not selected"}`}
                  accessibilityState={{
                    selected: isSelected,
                    disabled: gameState.status !== "playing",
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
                </Pressable>
              );
            })}
          </View>
        ))}
      </Animated.View>

      {/* Mistakes Remaining */}
      {renderMistakes()}

      {/* Spacer to push controls to bottom */}
      <View style={styles.spacer} />

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable
          style={({ pressed }) => [
            styles.buttonOutlined,
            (gameState.status !== "playing" || isSubmitting) &&
              styles.buttonInactive,
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleShuffle}
          disabled={gameState.status !== "playing" || isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Shuffle items"
          accessibilityState={{
            disabled: gameState.status !== "playing",
          }}
        >
          <Text
            style={[
              styles.buttonTextOutlined,
              (gameState.status !== "playing" || isSubmitting) &&
                styles.buttonTextInactive,
            ]}
          >
            Shuffle
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.buttonOutlined,
            (gameState.status !== "playing" ||
              selectedItems.length === 0 ||
              isSubmitting) &&
              styles.buttonInactive,
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleDeselectAll}
          disabled={
            gameState.status !== "playing" ||
            selectedItems.length === 0 ||
            isSubmitting
          }
          accessibilityRole="button"
          accessibilityLabel="Deselect all items"
          accessibilityState={{
            disabled:
              gameState.status !== "playing" || selectedItems.length === 0,
          }}
        >
          <Text
            style={[
              styles.buttonTextOutlined,
              (gameState.status !== "playing" ||
                selectedItems.length === 0 ||
                isSubmitting) &&
                styles.buttonTextInactive,
            ]}
          >
            Deselect All
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.buttonFilled,
            !canSubmit && styles.buttonFilledDisabled,
            pressed && canSubmit && { opacity: 0.85 },
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="Submit guess"
          accessibilityState={{
            disabled: !canSubmit,
          }}
        >
          <Text
            style={[
              styles.buttonTextFilled,
              !canSubmit && styles.buttonTextFilledDisabled,
            ]}
          >
            Submit
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: Spacing.xs,
  },
  completedContainer: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  completedGroup: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Layout.borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  completedTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
    textAlign: "center",
  },
  completedItems: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  grid: {
    gap: CARD_GAP,
  },
  gridRow: {
    flexDirection: "row",
    gap: CARD_GAP,
  },
  card: {
    backgroundColor: "#EFEFE6",
    borderRadius: Layout.borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  cardSelected: {
    backgroundColor: TFL.blue,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardText: {
    fontWeight: "700",
    color: Colors.light.text,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardTextSelected: {
    color: Colors.light.background,
  },
  mistakesContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  mistakesLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.light.text,
  },
  dotsRow: {
    flexDirection: "row",
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
  spacer: {
    flex: 1,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.md,
  },
  buttonOutlined: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.light.text,
  },
  buttonTextOutlined: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  buttonInactive: {
    borderColor: Colors.light.border,
  },
  buttonTextInactive: {
    color: TFL.grey.medium,
  },
  buttonFilled: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: TFL.blue,
  },
  buttonFilledDisabled: {
    backgroundColor: TFL.grey.medium,
  },
  buttonTextFilled: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.background,
  },
  buttonTextFilledDisabled: {
    color: Colors.light.background,
  },
});
