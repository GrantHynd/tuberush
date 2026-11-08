import { FontFamily, FontScaleCap, Size } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { decorativeIconProps } from '@/lib/a11y';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export const KEY_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
] as const;

export const KEYBOARD_GAP = 8;
export const KEYBOARD_PAD = 8;

/** Height of the 3-row keyboard for a given key height (matches tools/grid_sizing.py kb()). */
export function keyboardHeight(keyHeight: number, gap = KEYBOARD_GAP, pad = KEYBOARD_PAD): number {
    return 3 * keyHeight + 2 * gap + 2 * pad;
}

export interface GameKeyboardProps {
    onKey: (letter: string) => void;
    onBackspace: () => void;
    onCheck: () => void;
    checkDisabled?: boolean;
    checkLabel?: string;
    /** 46 by default; shrink to 40 on very small viewports. */
    keyHeight?: number;
    /** Extra bottom padding (safe area). */
    bottomInset?: number;
    testID?: string;
}

/**
 * In-app 3-row QWERTY. Backspace and the primary Check key live on row 3;
 * the across/down toggle lives in the ClueBar.
 */
export function GameKeyboard({
    onKey,
    onBackspace,
    onCheck,
    checkDisabled,
    checkLabel = 'Check',
    keyHeight = 46,
    bottomInset = 0,
    testID = 'game-keyboard',
}: GameKeyboardProps) {
    const { colors } = useTheme();
    const styles = useMemo(
        () =>
            makeStyles({
                page: colors.background,
                key: colors.elevated,
                ink: colors.text,
                border: colors.border,
                primary: colors.primary,
                onPrimary: colors.onPrimary,
                disabled: colors.textSecondary,
            }),
        [colors],
    );
    const keyStyle = [styles.key, { height: keyHeight, minHeight: Math.min(keyHeight, Size.minTarget) }];
    return (
        <View testID={testID} style={[styles.kb, { paddingBottom: KEYBOARD_PAD + bottomInset }]}>
            {KEY_ROWS.map((row, i) => (
                <View key={i} style={[styles.row, i < 2 && { marginBottom: KEYBOARD_GAP }]}>
                    {i === 2 ? (
                        <Pressable
                            onPress={onBackspace}
                            accessibilityRole="button"
                            accessibilityLabel="Delete letter"
                            testID="key-backspace"
                            style={({ pressed }) => [keyStyle, styles.wide, pressed && styles.pressed]}
                        >
                            <MaterialIcons name="backspace" size={20} color={colors.text} {...decorativeIconProps} />
                        </Pressable>
                    ) : null}
                    {row.map((k) => (
                        <Pressable
                            key={k}
                            onPress={() => onKey(k)}
                            accessibilityRole="keyboardkey"
                            accessibilityLabel={k}
                            testID={`key-${k}`}
                            style={({ pressed }) => [keyStyle, pressed && styles.pressed]}
                        >
                            <Text
                                style={styles.keyText}
                                maxFontSizeMultiplier={FontScaleCap.chrome}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.55}
                                {...decorativeIconProps}
                            >
                                {k}
                            </Text>
                        </Pressable>
                    ))}
                    {i === 2 ? (
                        <Pressable
                            onPress={onCheck}
                            disabled={checkDisabled}
                            accessibilityRole="button"
                            accessibilityLabel={checkLabel}
                            accessibilityState={{ disabled: !!checkDisabled }}
                            accessibilityHint={checkDisabled ? 'Fill all squares to check' : undefined}
                            testID="key-check"
                            style={({ pressed }) => [
                                keyStyle,
                                styles.check,
                                checkDisabled && styles.checkDisabled,
                                pressed && !checkDisabled && styles.pressed,
                            ]}
                        >
                            <Text
                                style={[styles.checkText, checkDisabled && styles.checkTextDisabled]}
                                maxFontSizeMultiplier={FontScaleCap.chrome}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.65}
                                {...decorativeIconProps}
                            >
                                {checkLabel}
                            </Text>
                        </Pressable>
                    ) : null}
                </View>
            ))}
        </View>
    );
}

function makeStyles(c: {
    page: string;
    key: string;
    ink: string;
    border: string;
    primary: string;
    onPrimary: string;
    disabled: string;
}) {
    return StyleSheet.create({
        kb: { backgroundColor: c.page, paddingTop: KEYBOARD_PAD, paddingHorizontal: 3 },
        row: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
        key: {
            flex: 1,
            maxWidth: 38,
            borderRadius: 6,
            backgroundColor: c.key,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: c.border,
        },
        wide: { maxWidth: 52, flex: 1.4 },
        keyText: { fontFamily: FontFamily.medium, fontSize: 20, fontWeight: '500', color: c.ink, width: '100%', textAlign: 'center' },
        // Width stays 72 at the default size, where "Check" fits. Scaled text
        // shrinks to that width so the word stays whole instead of clipping to "Chec".
        check: { maxWidth: 72, flex: 2, backgroundColor: c.primary, borderColor: c.primary },
        checkDisabled: {
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: c.border,
        },
        checkText: {
            fontFamily: FontFamily.semibold,
            fontSize: 14,
            fontWeight: '600',
            color: c.onPrimary,
            width: '100%',
            textAlign: 'center',
        },
        checkTextDisabled: { color: c.disabled },
        pressed: { opacity: 0.7 },
    });
}
