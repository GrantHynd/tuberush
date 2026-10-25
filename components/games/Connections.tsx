import { ConnectionsPuzzle } from "@/constants/ConnectionsData";
import { FontFamily, FontScaleCap, GameType, LineColors, Size, Spacing, StateColors } from "@/constants/theme";
import { FeedbackToast } from "@/components/game-ui/FeedbackToast";
import { LineRail } from "@/components/game-ui/LineRail";
import { Tile, type TileState } from "@/components/game-ui/Tile";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { announce } from "@/lib/a11y";
import { ConnectionsState } from "@/types/game";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
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
  onRevealComplete?: () => void;
  /**
   * Whether a lost game's answers appear at once (reopened from saved state) or one by one.
   * Defaults to "already lost when this component mounted".
   */
  revealImmediately?: boolean;
}

const GRID_COLUMNS = 4;
const CARD_GAP = 8;
const HORIZONTAL_PADDING = 16;
/** Wrong-guess red outline duration (TUB-296). */
export const WRONG_OUTLINE_MS = 600;
/** Delay between revealed lines on a loss (TUB-297). */
export const REVEAL_STEP_MS = 400;
const MAX_TRIES = 4;

function triesText(n: number) {
  return `${n} ${n === 1 ? "try" : "tries"} left`;
}

/**
 * Interchange (internal game_type "connections") board.
 * Playing: solved lines as numbered rails, 4x4 station-board tiles, tries carriages, controls.
 * Finished: only the line rails (✓ FOUND / dashed REVEALED) — the page wraps them in FinishedGameView.
 */
export function Connections({
  gameState,
  puzzle,
  onSubmitGuess,
  onRevealComplete,
  revealImmediately,
}: ConnectionsProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [errorItems, setErrorItems] = useState<string[]>([]);
  const [shuffledItems, setShuffledItems] = useState<string[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [nudge] = useState(() => new Animated.Value(0));
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);
  const errorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastGuessRef = useRef<string[]>([]);
  const reduceMotion = useReduceMotion();
  const playing = gameState.status === "playing";

  const revealedGroups = React.useMemo(() => {
    if (gameState.status !== "lost") return [];
    const completedGroupIds = gameState.completedGroups || [];
    return puzzle.groups
      .filter((g) => !completedGroupIds.includes(g.category))
      .sort((a, b) => a.difficulty - b.difficulty);
  }, [gameState.status, gameState.completedGroups, puzzle.groups]);

  // Reopening an already-lost game shows every answer immediately (no animation).
  const [revealAtOnce] = useState(() => revealImmediately ?? gameState.status === "lost");

  useEffect(() => {
    if (gameState.status !== "lost" || revealedGroups.length === 0) return;

    if (revealAtOnce) {
      // Reopened: every answer is already shown (see shownRevealed); just report completion.
      onRevealComplete?.();
      return;
    }

    let count = 0;
    const revealNext = () => {
      if (count < revealedGroups.length) {
        count++;
        if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setRevealedCount(count);
        revealTimerRef.current = setTimeout(revealNext, REVEAL_STEP_MS);
      } else {
        onRevealComplete?.();
      }
    };
    revealTimerRef.current = setTimeout(revealNext, REVEAL_STEP_MS);

    return () => {
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
    };
  }, [gameState.status, revealedGroups.length, onRevealComplete, reduceMotion, revealAtOnce]);

  useEffect(
    () => () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    },
    [],
  );

  // Board order stays stable when a solved group drops out; reshuffle only when the set changes.
  const shownRevealed = revealAtOnce ? revealedGroups.length : revealedCount;
  const revealedToExclude = revealedGroups.slice(0, shownRevealed).map((g) => g.category);
  const excludedGroups = [...(gameState.completedGroups || []), ...revealedToExclude];
  const allActiveItems = puzzle.groups
    .filter((g) => !excludedGroups.includes(g.category))
    .flatMap((g) => g.items);
  const activeKey = allActiveItems.join("\0");

  useEffect(() => {
    const items = activeKey ? activeKey.split("\0") : [];
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setShuffledItems((prev) => {
        const remaining = prev.filter((item) => items.includes(item));
        if (remaining.length !== items.length) {
          return [...items].sort(() => Math.random() - 0.5);
        }
        return remaining;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [activeKey]);

  const handleSelect = useCallback(
    (item: string) => {
      if (!playing) return;
      if (errorItems.length) setErrorItems([]);
      if (selectedItems.includes(item)) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedItems((prev) => prev.filter((i) => i !== item));
        announce(`${selectedItems.length - 1} of 4 selected`);
      } else if (selectedItems.length < 4) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedItems((prev) => [...prev, item]);
        announce(`${selectedItems.length + 1} of 4 selected`);
      }
    },
    [playing, selectedItems, errorItems.length],
  );

  const handleShuffle = useCallback(() => {
    if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShuffledItems((prev) => [...prev].sort(() => Math.random() - 0.5));
    announce("Items shuffled");
  }, [reduceMotion]);

  const handleDeselectAll = useCallback(() => {
    setSelectedItems([]);
    setErrorItems([]);
  }, []);

  const handleSubmit = useCallback(() => {
    if (selectedItems.length !== 4 || !playing) return;
    lastGuessRef.current = selectedItems;
    // TUB-296: the selection is kept until we know the outcome; a correct line clears it,
    // a wrong guess keeps it (with a red outline) so the player sees what they tried.
    onSubmitGuess(selectedItems);
  }, [selectedItems, playing, onSubmitGuess]);

  // Wrong guess: keep selection, red outline 600ms, single 6px nudge, toast + announcement.
  const prevMistakes = useRef(gameState.mistakesRemaining);
  useEffect(() => {
    if (gameState.mistakesRemaining < prevMistakes.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const guess = lastGuessRef.current;
      const oneAway =
        guess.length === 4 &&
        puzzle.groups.some((g) => guess.filter((i) => g.items.includes(i)).length === 3);
      const left = gameState.mistakesRemaining;
      const message = `${oneAway ? "One away." : "Not a line."} ${left > 0 ? `${triesText(left)}.` : "No tries left."}`;
      // FeedbackToast announces "Mind the gap. <message>" to VoiceOver.
      setToast((prev) => ({ id: (prev?.id ?? 0) + 1, message }));
      setErrorItems(guess);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setErrorItems([]), WRONG_OUTLINE_MS);
      if (!reduceMotion && gameState.status === "playing") {
        Animated.sequence([
          Animated.timing(nudge, { toValue: 6, duration: 80, useNativeDriver: true }),
          Animated.timing(nudge, { toValue: 0, duration: 120, useNativeDriver: true }),
        ]).start();
      }
    }
    prevMistakes.current = gameState.mistakesRemaining;
  }, [gameState.mistakesRemaining, gameState.status, nudge, reduceMotion, puzzle.groups]);

  // Correct line: clear the selection, announce.
  const prevCompletedGroups = useRef(gameState.completedGroups.length);
  useEffect(() => {
    if (gameState.completedGroups.length > prevCompletedGroups.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSelectedItems([]);
      setErrorItems([]);
      const latest = gameState.completedGroups[gameState.completedGroups.length - 1];
      if (latest) announce(`Line found: ${latest}`);
    }
    prevCompletedGroups.current = gameState.completedGroups.length;
  }, [gameState.completedGroups, reduceMotion]);

  const finishedMarker = gameState.status === "playing" ? "none" : "found";

  const renderLines = () => {
    const found = gameState.completedGroups.map((groupId) => {
      const group = puzzle.groups.find((g) => g.category === groupId);
      if (!group) return null;
      return (
        <LineRail
          key={groupId}
          testID={`line-${group.difficulty}`}
          level={group.difficulty}
          category={group.category}
          items={group.items}
          marker={finishedMarker}
        />
      );
    });
    const revealed = revealedGroups.slice(0, shownRevealed).map((group) => (
      <LineRail
        key={`revealed-${group.category}`}
        testID={`line-${group.difficulty}`}
        level={group.difficulty}
        category={group.category}
        items={group.items}
        marker="revealed"
      />
    ));
    return [...found, ...revealed];
  };

  const renderTries = () => {
    const left = gameState.mistakesRemaining;
    return (
      <View
        style={styles.tries}
        accessible
        accessibilityLabel={triesText(left)}
        testID="tries"
      >
        <Text style={styles.triesLabel} maxFontSizeMultiplier={FontScaleCap.chrome}>
          Tries left <Text style={styles.triesCount}>{left}</Text>
        </Text>
        <View style={styles.carriages}>
          {Array.from({ length: MAX_TRIES }).map((_, i) => (
            <View key={i} style={[styles.carriage, i < left ? styles.carriageOn : styles.carriageOff]} />
          ))}
        </View>
      </View>
    );
  };

  // Finished: only the lines (the page wraps them in FinishedGameView; no gameplay controls).
  if (!playing) {
    return <View style={styles.lines}>{renderLines()}</View>;
  }

  const rows: string[][] = [];
  for (let i = 0; i < shuffledItems.length; i += GRID_COLUMNS) {
    rows.push(shuffledItems.slice(i, i + GRID_COLUMNS));
  }

  const canSubmit = selectedItems.length === 4;
  const canClear = selectedItems.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.instruction} maxFontSizeMultiplier={FontScaleCap.chrome}>
        Find four lines of four stops
      </Text>

      {gameState.completedGroups.length > 0 && <View style={styles.lines}>{renderLines()}</View>}

      <Animated.View style={[styles.grid, { transform: [{ translateX: nudge }] }]}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.gridRow}>
            {row.map((item) => {
              const state: TileState = errorItems.includes(item)
                ? "error"
                : selectedItems.includes(item)
                  ? "selected"
                  : "default";
              return (
                <Tile
                  key={item}
                  testID={`tile-${item}`}
                  label={item}
                  state={state}
                  onPress={() => handleSelect(item)}
                  accessibilityHint="Select 4 items"
                  style={styles.tile}
                />
              );
            })}
          </View>
        ))}
      </Animated.View>

      {renderTries()}

      <FeedbackToast message={toast?.message ?? null} id={toast?.id} onHide={() => setToast(null)} />

      <View style={styles.spacer} />

      <View style={styles.controls}>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
          onPress={handleShuffle}
          accessibilityRole="button"
          accessibilityLabel="Shuffle items"
          accessibilityState={{ disabled: false }}
          testID="btn-shuffle"
        >
          <MaterialIcons name="shuffle" size={18} color={StateColors.ink} />
          <Text style={styles.btnText} maxFontSizeMultiplier={FontScaleCap.chrome}>Shuffle</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.btn, !canClear && styles.btnInactive, pressed && styles.pressed]}
          onPress={handleDeselectAll}
          disabled={!canClear}
          accessibilityRole="button"
          accessibilityLabel="Deselect all items"
          accessibilityState={{ disabled: !canClear }}
          testID="btn-clear"
        >
          <Text style={[styles.btnText, !canClear && styles.btnTextInactive]} maxFontSizeMultiplier={FontScaleCap.chrome}>
            Clear
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.btn,
            styles.btnSubmit,
            canSubmit ? styles.btnPrimary : styles.btnInactive,
            pressed && canSubmit && styles.pressed,
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="Submit guess"
          accessibilityValue={{ text: `${selectedItems.length} of 4 selected` }}
          accessibilityHint={canSubmit ? undefined : "Select 4 items"}
          accessibilityState={{ disabled: !canSubmit }}
          testID="btn-submit"
        >
          <Text
            style={[styles.btnText, canSubmit ? styles.btnTextPrimary : styles.btnTextInactive]}
            maxFontSizeMultiplier={FontScaleCap.chrome}
          >
            {canSubmit ? "Submit" : `Submit ${selectedItems.length}/4`}
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
    paddingTop: Spacing.md,
  },
  instruction: {
    ...GameType.body,
    color: StateColors.inactiveText,
    marginBottom: Spacing.sm,
  },
  lines: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  grid: { gap: CARD_GAP },
  gridRow: { flexDirection: "row", gap: CARD_GAP },
  tile: { flex: 1 },
  tries: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  triesLabel: { fontFamily: FontFamily.medium, fontSize: 15, color: StateColors.ink },
  triesCount: { fontFamily: FontFamily.bold, fontWeight: "700" },
  carriages: { flexDirection: "row", gap: 4 },
  carriage: { width: 22, height: 12, borderRadius: 3 },
  carriageOn: { backgroundColor: LineColors.connections },
  carriageOff: { backgroundColor: "transparent", borderWidth: 2, borderColor: StateColors.inactiveBorder },
  spacer: { flex: 1 },
  controls: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.md,
  },
  btn: {
    flex: 1,
    minHeight: Size.primaryButton,
    borderRadius: Size.radius,
    borderWidth: 2,
    borderColor: StateColors.ink,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
  },
  btnSubmit: { flex: 1.4 },
  btnPrimary: { backgroundColor: LineColors.connections, borderColor: LineColors.connections },
  btnInactive: { borderStyle: "dashed", borderColor: StateColors.inactiveBorder },
  pressed: { opacity: 0.8 },
  btnText: { fontFamily: FontFamily.bold, fontSize: 16, fontWeight: "700", color: StateColors.ink },
  btnTextPrimary: { color: "#FFFFFF" },
  btnTextInactive: { color: StateColors.inactiveText },
});
