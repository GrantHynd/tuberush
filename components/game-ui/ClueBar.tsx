import { FontScaleCap, FontFamily, Size, StateColors } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
    return (
        <View style={[styles.bar, { minHeight }]} testID={testID}>
            <Pressable
                onPress={onPrev}
                accessibilityRole="button"
                accessibilityLabel="Previous clue"
                style={styles.nav}
                testID="clue-prev"
            >
                <MaterialIcons name="chevron-left" size={24} color={StateColors.inactiveText} />
            </Pressable>
            <View style={styles.body} accessible accessibilityLabel={`${label}. ${clue}${length ? `, ${length} letters` : ''}`}>
                <Text style={styles.text} maxFontSizeMultiplier={FontScaleCap.chrome} numberOfLines={3}>
                    <Text style={[styles.dir, { backgroundColor: lineColor }]}> {label.toUpperCase()} </Text>
                    {'  '}
                    {clue}
                    {length ? <Text style={[styles.len, { color: lineColor }]}> ({length})</Text> : null}
                </Text>
            </View>
            <Pressable
                onPress={onToggleDirection}
                accessibilityRole="button"
                accessibilityLabel="Switch direction"
                style={styles.nav}
                testID="clue-toggle"
            >
                <MaterialIcons name="swap-horiz" size={22} color={StateColors.inactiveText} />
            </Pressable>
            <Pressable
                onPress={onNext}
                accessibilityRole="button"
                accessibilityLabel="Next clue"
                style={styles.nav}
                testID="clue-next"
            >
                <MaterialIcons name="chevron-right" size={24} color={StateColors.inactiveText} />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: StateColors.surface,
        borderWidth: 1,
        borderColor: StateColors.hairline,
        borderRadius: Size.radius,
    },
    nav: { width: Size.minTarget, height: Size.minTarget, alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, paddingVertical: 6 },
    text: { fontFamily: FontFamily.regular, fontSize: 16, lineHeight: 22, color: StateColors.ink },
    dir: { fontFamily: FontFamily.bold, fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
    len: { fontFamily: FontFamily.bold, fontWeight: '700' },
});
