import { BrandMark } from '@/components/ui/BrandMark';
import { FontScaleCap, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { decorativeIconProps, LARGE_TEXT_FONT_SCALE } from '@/lib/a11y';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

export interface GameHeaderProps {
    title: string;
    subtitle?: string;
    /** Tonal accent for the 4px strip under the header. */
    lineColor: string;
    onBack: () => void;
    /** Right slot: help / timer / share. */
    right?: React.ReactNode;
    testID?: string;
    /** System text scale. Defaults to the live value from `useWindowDimensions`. */
    fontScale?: number;
}

/**
 * Shared game header (Platform): 44pt back, Crossbar Train symbol,
 * title + subtitle, right slot, and a 4px tonal strip underneath.
 */
export function GameHeader({ title, subtitle, lineColor, onBack, right, testID, fontScale }: GameHeaderProps) {
    const { colors } = useTheme();
    const windowScale = useWindowDimensions().fontScale;
    const scale = fontScale ?? windowScale;
    // Accessibility sizes put the title on its own row. In the single row the
    // title's minimum width is the unwrapped word, so "Crossword" draws over
    // the mark and the timer once it no longer fits beside them.
    const stacked = scale > LARGE_TEXT_FONT_SCALE;
    const styles = useMemo(() => makeStyles(colors.text, colors.textSecondary), [colors.text, colors.textSecondary]);
    const titles = (
        <View style={stacked ? styles.titlesStacked : styles.titles} testID={stacked ? 'game-header-titles' : undefined}>
            <Text
                style={styles.title}
                accessibilityRole="header"
                maxFontSizeMultiplier={FontScaleCap.chrome}
                numberOfLines={stacked ? undefined : 2}
            >
                {title}
            </Text>
            {subtitle ? (
                <Text style={styles.subtitle} maxFontSizeMultiplier={FontScaleCap.chrome} numberOfLines={stacked ? undefined : 2}>
                    {subtitle}
                </Text>
            ) : null}
        </View>
    );
    return (
        <View testID={testID}>
            <View style={styles.row} testID="game-header-row">
                <Pressable
                    onPress={onBack}
                    style={({ pressed }) => [styles.back, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    testID={testID ? `${testID}-back` : 'game-header-back'}
                >
                    <MaterialIcons name="arrow-back" size={24} color={colors.text} {...decorativeIconProps} />
                </Pressable>
                <BrandMark size={32} testID={testID ? `${testID}-mark` : 'game-header-mark'} />
                {stacked ? <View style={styles.spacer} /> : titles}
                {right ? <View style={styles.right}>{right}</View> : null}
            </View>
            {stacked ? titles : null}
            <View style={[styles.strip, { backgroundColor: lineColor }]} />
        </View>
    );
}

function makeStyles(text: string, secondary: string) {
    return StyleSheet.create({
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
        spacer: { flex: 1 },
        titles: { flex: 1, minWidth: 0 },
        titlesStacked: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs },
        title: { fontSize: 20, fontWeight: '700', color: text, letterSpacing: -0.2 },
        subtitle: { fontSize: 13, color: secondary },
        right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexShrink: 0 },
        strip: { height: 4 },
    });
}
