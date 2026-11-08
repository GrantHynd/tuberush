import { FontFamily, FontScaleCap, Size } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { decorativeIconProps, LARGE_TEXT_FONT_SCALE } from '@/lib/a11y';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

export interface ClueBarProps {
    /** e.g. "1 Across" */
    label: string;
    clue: string;
    length?: number;
    lineColor: string;
    onPrev: () => void;
    onNext: () => void;
    onToggleDirection: () => void;
    /** 64 by default; may shrink to 52 on small viewports. */
    minHeight?: number;
    testID?: string;
}

/** Sticky clue bar above the in-app keyboard: ‹ clue › and the ⇄ direction toggle. */
export function ClueBar({
    label,
    clue,
    length,
    lineColor,
    onPrev,
    onNext,
    onToggleDirection,
    minHeight = 64,
    testID = 'clue-bar',
}: ClueBarProps) {
    const { colors } = useTheme();
    const { fontScale } = useWindowDimensions();
    const styles = useMemo(
        () => makeStyles(colors.surface, colors.border, colors.text, colors.onPrimary),
        [colors.surface, colors.border, colors.text, colors.onPrimary],
    );
    // Three unscaled lines match the previous clue height. At accessibility
    // sizes the window is two scaled lines and the rest scrolls, so the grid
    // and keyboard stay on screen and the clue is not cut off with an ellipsis.
    const textScale = Math.min(Math.max(fontScale, 1), FontScaleCap.chrome);
    const visibleLines = fontScale > LARGE_TEXT_FONT_SCALE ? 2 : 3;
    const maxHeight = Math.round(22 * textScale * visibleLines + 8);
    return (
        <View style={[styles.bar, { minHeight }]} testID={testID}>
            <Pressable
                onPress={onPrev}
                accessibilityRole="button"
                accessibilityLabel="Previous clue"
                style={styles.nav}
                testID="clue-prev"
            >
                <MaterialIcons name="chevron-left" size={24} color={colors.text} {...decorativeIconProps} />
            </Pressable>
            <View style={styles.body} accessible accessibilityLabel={`${label}. ${clue}${length ? `, ${length} letters` : ''}`}>
                <ScrollView testID="clue-scroll" style={{ maxHeight }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    <Text style={styles.text} maxFontSizeMultiplier={FontScaleCap.chrome} {...decorativeIconProps}>
                        <Text style={[styles.dir, { backgroundColor: lineColor, color: colors.onPrimary }]}> {label.toUpperCase()} </Text>
                        {'  '}
                        {clue}
                        {length ? <Text style={[styles.len, { color: lineColor }]}> ({length})</Text> : null}
                    </Text>
                </ScrollView>
            </View>
            <Pressable
                onPress={onToggleDirection}
                accessibilityRole="button"
                accessibilityLabel="Switch direction"
                style={styles.nav}
                testID="clue-toggle"
            >
                <MaterialIcons name="swap-horiz" size={22} color={colors.text} {...decorativeIconProps} />
            </Pressable>
            <Pressable
                onPress={onNext}
                accessibilityRole="button"
                accessibilityLabel="Next clue"
                style={styles.nav}
                testID="clue-next"
            >
                <MaterialIcons name="chevron-right" size={24} color={colors.text} {...decorativeIconProps} />
            </Pressable>
        </View>
    );
}

function makeStyles(surface: string, border: string, text: string, onPrimary: string) {
    return StyleSheet.create({
        bar: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: surface,
            borderWidth: 1,
            borderColor: border,
            borderRadius: Size.radius,
        },
        nav: { width: Size.minTarget, height: Size.minTarget, alignItems: 'center', justifyContent: 'center' },
        body: { flex: 1, paddingVertical: 6 },
        text: { fontFamily: FontFamily.regular, fontSize: 16, lineHeight: 22, color: text },
        dir: { fontFamily: FontFamily.bold, fontSize: 12, fontWeight: '700', color: onPrimary },
        len: { fontFamily: FontFamily.bold, fontWeight: '700' },
    });
}
