import { FontScaleCap, GameType, Size, StateColors } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

export type TileState = 'default' | 'selected' | 'solved' | 'error' | 'disabled';

export interface TileProps {
    label: string;
    state?: TileState;
    onPress?: () => void;
    accessibilityHint?: string;
    style?: StyleProp<ViewStyle>;
    testID?: string;
}

/**
 * Shared tile primitive. The accessible label is the content; state lives in
 * accessibilityState (never duplicated in the label text).
 */
export function Tile({ label, state = 'default', onPress, accessibilityHint, style, testID }: TileProps) {
    const selected = state === 'selected';
    const disabled = state === 'disabled' || state === 'solved';
    return (
        <Pressable
            testID={testID}
            onPress={onPress}
            disabled={disabled || !onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ selected, disabled }}
            accessibilityValue={state === 'error' ? { text: 'incorrect' } : undefined}
            style={({ pressed }) => [
                styles.tile,
                selected && styles.selected,
                state === 'error' && styles.error,
                state === 'disabled' && styles.disabled,
                pressed && styles.pressed,
                style,
            ]}
        >
            <Text
                style={[styles.text, selected && styles.textSelected, state === 'disabled' && styles.textDisabled]}
                maxFontSizeMultiplier={FontScaleCap.tile}
            >
                {label}
            </Text>
            {selected ? <View style={styles.dot} testID={testID ? `${testID}-dot` : undefined} /> : null}
            {state === 'error' ? (
                <View style={styles.errIcon} accessibilityElementsHidden importantForAccessibility="no">
                    <MaterialIcons name="close" size={12} color="#FFFFFF" />
                </View>
            ) : null}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    tile: {
        minHeight: 64,
        minWidth: Size.minTarget,
        borderRadius: Size.radius,
        borderWidth: 2,
        borderColor: StateColors.tileBorder,
        backgroundColor: StateColors.paper,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        paddingVertical: 8,
    },
    selected: { backgroundColor: StateColors.selected, borderColor: StateColors.selected },
    error: { borderColor: StateColors.error, borderWidth: 3 },
    disabled: { borderStyle: 'dashed', borderColor: StateColors.inactiveBorder },
    pressed: { transform: [{ scale: 0.97 }] },
    text: { ...GameType.tile, fontSize: 13, letterSpacing: 0.3, textAlign: 'center' },
    textSelected: { color: StateColors.selectedText },
    textDisabled: { color: StateColors.inactiveText },
    dot: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
    },
    errIcon: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: StateColors.error,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
