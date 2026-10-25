import { Colors, Spacing, TFL } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface GameHeaderProps {
    title: string;
    subtitle?: string;
    /** Game line colour: ring badge + 4px strip. */
    lineColor: string;
    onBack: () => void;
    /** Right slot: help / timer / share. */
    right?: React.ReactNode;
    testID?: string;
}

/**
 * Shared game header ("Mind the Gap"): 44pt back, plain ring badge (no bar),
 * title + subtitle, right slot, and a 4px line strip underneath.
 */
export function GameHeader({ title, subtitle, lineColor, onBack, right, testID }: GameHeaderProps) {
    return (
        <View testID={testID}>
            <View style={styles.row}>
                <Pressable
                    onPress={onBack}
                    style={({ pressed }) => [styles.back, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    testID={testID ? `${testID}-back` : 'game-header-back'}
                >
                    <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
                </Pressable>
                <View
                    style={[styles.ring, { borderColor: lineColor }]}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                />
                <View style={styles.titles}>
                    <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={2}>
                        {title}
                    </Text>
                    {subtitle ? (
                        <Text style={styles.subtitle} maxFontSizeMultiplier={2}>
                            {subtitle}
                        </Text>
                    ) : null}
                </View>
                {right ? <View style={styles.right}>{right}</View> : null}
            </View>
            <View style={[styles.strip, { backgroundColor: lineColor }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingLeft: Spacing.sm,
        paddingRight: Spacing.md,
        paddingVertical: Spacing.xs,
    },
    back: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pressed: { opacity: 0.6 },
    ring: { width: 28, height: 28, borderRadius: 14, borderWidth: 5 },
    titles: { flex: 1 },
    title: { fontSize: 20, fontWeight: '700', color: Colors.light.text, letterSpacing: -0.2 },
    subtitle: { fontSize: 13, color: TFL.grey.dark },
    right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    strip: { height: 4 },
});
