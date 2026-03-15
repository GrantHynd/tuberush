import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TFL } from '@/constants/theme';

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
    const bgColor = isCurrentUser ? TFL.blue : TFL.grey.medium;
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
                ring && {
                    borderWidth: 2.5,
                    borderColor: ring,
                },
            ]}
        >
            <Text
                style={[
                    styles.initial,
                    { fontSize: size * 0.42, lineHeight: size * 0.52 },
                ]}
            >
                {initial}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    initial: {
        color: TFL.white,
        fontWeight: '700',
        textAlign: 'center',
    },
});
