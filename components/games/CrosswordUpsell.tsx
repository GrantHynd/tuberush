import { Colors, GameColors, Radius, Spacing, TFL } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/** Decorative 5x5 preview pattern (1 = black square). */
const PREVIEW = [
    [0, 0, 0, 0, 1],
    [0, 1, 0, 1, 0],
    [0, 0, 0, 0, 0],
    [0, 1, 0, 1, 0],
    [1, 0, 0, 0, 0],
];

const BENEFITS = [
    'A new London mini every day',
    'Leaderboards for your borough',
    'Your full puzzle archive',
];

export interface CrosswordUpsellProps {
    onSeePremium: () => void;
    onPlayFree: () => void;
    /** Label for the free alternative. */
    freeLabel?: string;
}

/**
 * Shared Upsell rendered inside the crossword game shell (TUB-301).
 * Replaces the old Alert.alert over a screen that returned null.
 */
export function CrosswordUpsell({
    onSeePremium,
    onPlayFree,
    freeLabel = "Play today's Connections instead",
}: CrosswordUpsellProps) {
    return (
        <View style={styles.card} testID="crossword-upsell">
            <View style={styles.top}>
                <View style={styles.ticket}>
                    <Text style={styles.ticketText}>1st Class</Text>
                </View>
                <Text style={styles.title} accessibilityRole="header">
                    This one&apos;s First Class
                </Text>
                <Text style={styles.sub}>Daily crosswords are part of TubeRush Premium.</Text>
                <View
                    style={styles.preview}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                >
                    {PREVIEW.map((row, r) => (
                        <View key={r} style={styles.previewRow}>
                            {row.map((b, c) => (
                                <View key={c} style={[styles.previewCell, b === 1 && styles.previewBlack]} />
                            ))}
                        </View>
                    ))}
                </View>
            </View>
            <View style={styles.list}>
                {BENEFITS.map((b) => (
                    <View key={b} style={styles.benefit}>
                        <View style={styles.dot} />
                        <Text style={styles.benefitText}>{b}</Text>
                    </View>
                ))}
            </View>
            <View style={styles.actions}>
                <Pressable
                    onPress={onSeePremium}
                    accessibilityRole="button"
                    accessibilityLabel="See Premium"
                    accessibilityHint="Opens TubeRush Premium plans"
                    style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
                    testID="crossword-upsell-cta"
                >
                    <Text style={styles.primaryText}>See Premium</Text>
                </Pressable>
                <Pressable
                    onPress={onPlayFree}
                    accessibilityRole="button"
                    accessibilityLabel={freeLabel}
                    style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                    testID="crossword-upsell-free"
                >
                    <Text style={styles.secondaryText}>{freeLabel}</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        margin: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.light.border,
        borderRadius: Radius.lg,
        overflow: 'hidden',
    },
    top: { backgroundColor: GameColors.crossword, padding: Spacing.md, paddingVertical: Spacing.lg },
    ticket: {
        position: 'absolute',
        right: Spacing.md,
        top: Spacing.md,
        backgroundColor: TFL.yellow,
        borderRadius: Radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    ticketText: { fontSize: 12, fontWeight: '700', color: '#111111' },
    title: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginRight: 80 },
    sub: { fontSize: 15, color: '#FFFFFF', marginTop: Spacing.xs },
    preview: {
        marginTop: Spacing.md,
        alignSelf: 'flex-start',
        backgroundColor: '#FFFFFF',
        padding: 2,
        borderRadius: 6,
        gap: 2,
    },
    previewRow: { flexDirection: 'row', gap: 2 },
    previewCell: { width: 28, height: 28, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#6B7280' },
    previewBlack: { backgroundColor: '#1C1C1F' },
    list: { padding: Spacing.md },
    benefit: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
    dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: GameColors.crossword },
    benefitText: { fontSize: 16, color: Colors.light.text, flexShrink: 1 },
    actions: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.sm },
    primary: {
        minHeight: 48,
        borderRadius: Radius.lg,
        backgroundColor: TFL.blue,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.md,
    },
    primaryText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
    secondary: {
        minHeight: 48,
        borderRadius: Radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.md,
    },
    secondaryText: { fontSize: 16, fontWeight: '600', color: TFL.blue, textAlign: 'center' },
    pressed: { opacity: 0.85 },
});
