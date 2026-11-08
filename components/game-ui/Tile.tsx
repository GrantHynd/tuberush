import { FontScaleCap, GameType, Size } from '@/constants/theme';
import { decorativeIconProps } from '@/lib/a11y';
import { useTheme } from '@/hooks/useTheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useMemo } from 'react';
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
 * accessibilityState (never duplicated in the label text). Selection is a tick
 * plus a stronger edge, not a colour change alone.
 */
export function Tile({ label, state = 'default', onPress, accessibilityHint, style, testID }: TileProps) {
    const { colors } = useTheme();
    const selected = state === 'selected';
    const disabled = state === 'disabled' || state === 'solved';
    const styles = useMemo(
        () =>
            makeStyles({
                fill: colors.primary,
                ink: colors.onPrimary,
                border: colors.brandArms,
                error: colors.error,
                onError: colors.onError,
                disabledBorder: colors.border,
                disabledText: colors.textDisabled,
            }),
        [colors],
    );
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
                style={[styles.text, (selected || state === 'default' || state === 'error') && styles.textOnFill, state === 'disabled' && styles.textDisabled]}
                maxFontSizeMultiplier={FontScaleCap.tile}
            >
                {label}
            </Text>
            {selected ? (
                <View style={styles.tick} testID={testID ? `${testID}-tick` : undefined} {...decorativeIconProps}>
                    <MaterialIcons name="check" size={14} color={colors.onPrimary} {...decorativeIconProps} />
                </View>
            ) : null}
            {state === 'error' ? (
                <View style={styles.errIcon} {...decorativeIconProps}>
                    <MaterialIcons name="close" size={12} color={colors.onError} {...decorativeIconProps} />
                </View>
            ) : null}
        </Pressable>
    );
}

function makeStyles(c: {
    fill: string;
    ink: string;
    border: string;
    error: string;
    onError: string;
    disabledBorder: string;
    disabledText: string;
}) {
    return StyleSheet.create({
        tile: {
            minHeight: 64,
            minWidth: Size.minTarget,
            borderRadius: Size.radius,
            borderWidth: 2,
            borderColor: c.border,
            backgroundColor: c.fill,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
            paddingVertical: 8,
        },
        selected: { borderColor: c.ink, borderWidth: 3 },
        error: { borderColor: c.error, borderWidth: 3 },
        disabled: { borderStyle: 'dashed', borderColor: c.disabledBorder, backgroundColor: 'transparent' },
        pressed: { transform: [{ scale: 0.97 }] },
        text: { ...GameType.tile, fontSize: 13, letterSpacing: 0.3, textAlign: 'center', color: c.ink },
        textOnFill: { color: c.ink },
        textDisabled: { color: c.disabledText },
        tick: {
            position: 'absolute',
            top: 4,
            right: 4,
            width: 16,
            height: 16,
            alignItems: 'center',
            justifyContent: 'center',
        },
        errIcon: {
            position: 'absolute',
            top: 4,
            right: 4,
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: c.error,
            alignItems: 'center',
            justifyContent: 'center',
        },
    });
}
