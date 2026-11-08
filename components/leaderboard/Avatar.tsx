import { useTheme } from '@/hooks/useTheme';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { type Palette } from '@/constants/theme';

type RingColor = 'gold' | 'silver' | 'bronze';

interface AvatarProps {
    initial: string;
    size?: number;
    isCurrentUser?: boolean;
    ringColor?: RingColor;
}

const RING_COLORS: Record<RingColor, string> = {
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32',
};

export function Avatar({
    initial,
    size = 36,
    isCurrentUser = false,
    ringColor,
}: AvatarProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
    const bgColor = isCurrentUser ? colors.primary : colors.surface;
    const letterColor = isCurrentUser ? colors.onPrimary : colors.text;
    const ring = ringColor ? RING_COLORS[ringColor] : undefined;

    return (
        <View
            style={[
                styles.container,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: bgColor,
                },
                !isCurrentUser && {
                    borderWidth: 1,
                    borderColor: colors.border,
                },
                ring && {
                    borderWidth: 2.5,
                    borderColor: ring,
                },
            ]}
        >
            <Text
                style={[
                    styles.initial,
                    { fontSize: size * 0.42, lineHeight: size * 0.52, color: letterColor },
                ]}
            >
                {initial}
            </Text>
        </View>
    );
}

function makeStyles(colors: Palette) {
    return StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    initial: {
        color: colors.onPrimary,
        fontWeight: '700',
        textAlign: 'center',
    },
});
}

