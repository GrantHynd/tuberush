import { useTheme } from '@/hooks/useTheme';
import { type Palette, palette, Layout, Radius, Spacing } from '@/constants/theme';
import React from 'react';
import {
    Pressable,
    StyleProp,
    StyleSheet,
    View,
    ViewProps,
    ViewStyle,
} from 'react-native';

export type CardVariant = 'filled' | 'tinted' | 'outlined' | 'grouped';
export type CardPadding = 'none' | 'sm' | 'md';

export interface CardProps extends Omit<ViewProps, 'style'> {
    /** Default 'outlined'. */
    variant?: CardVariant;
    /** Background colour for the 'filled' variant (e.g. a game colour). */
    color?: string;
    /** 0 | 12 | 16. Defaults to 'md', or 'none' for 'grouped'. */
    padding?: CardPadding;
    /** When set, the card renders as a Pressable button. */
    onPress?: () => void;
    disabled?: boolean;
    /** Layout only (width / flex / margin / flexDirection) — not visual overrides. */
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
}

const PADDING: Record<CardPadding, number> = {
    none: 0,
    sm: Spacing.s12,
    md: Layout.cardPadding,
};

export function getCardStyle(variant: CardVariant, color?: string, colors: Palette = palette.light): ViewStyle {
    const surface = { borderWidth: 1 as const, borderColor: colors.border };
    switch (variant) {
        case 'filled':
            return { backgroundColor: color ?? colors.primary };
        case 'tinted':
            return { backgroundColor: colors.elevated };
        case 'grouped':
            return { backgroundColor: colors.elevated, ...surface, overflow: 'hidden' };
        case 'outlined':
        default:
            return { backgroundColor: colors.background, ...surface };
    }
}

/** Shared card surface (TUB-272): one radius, one border style, no shadow. */
export function Card({
    variant = 'outlined',
    color,
    padding,
    onPress,
    disabled,
    style,
    children,
    accessibilityState,
    ...rest
}: CardProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
    const pad = PADDING[padding ?? (variant === 'grouped' ? 'none' : 'md')];
    const base: StyleProp<ViewStyle> = [
        styles.base,
        getCardStyle(variant, color, colors),
        { padding: pad },
        disabled && styles.disabled,
        style,
    ];

    if (!onPress) {
        return (
            <View style={base} {...rest}>
                {children}
            </View>
        );
    }

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ ...accessibilityState, disabled: !!disabled }}
            style={({ pressed }) => [base, styles.minTarget, pressed && styles.pressed]}
            {...rest}
        >
            {children}
        </Pressable>
    );
}

function makeStyles(colors: Palette) {
    return StyleSheet.create({
    base: {
        borderRadius: Radius.lg,
    },
    minTarget: {
        minHeight: 44,
        minWidth: 44,
    },
    pressed: {
        opacity: 0.85,
    },
    disabled: {
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.border,
    },
});
}

