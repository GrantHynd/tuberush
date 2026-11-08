import { useTheme } from '@/hooks/useTheme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface PremiumBadgeProps {
    size?: 'small' | 'medium' | 'large';
}

export function PremiumBadge({ size = 'medium' }: PremiumBadgeProps) {
    const { colors } = useTheme();
    const sizeStyles = {
        small: { fontSize: 10, paddingHorizontal: 6, paddingVertical: 2 },
        medium: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 4 },
        large: { fontSize: 14, paddingHorizontal: 10, paddingVertical: 6 },
    };

    return (
        <View style={[styles.badge, { backgroundColor: colors.premium }, sizeStyles[size]]}>
            <Text style={[styles.text, { fontSize: sizeStyles[size].fontSize, color: colors.premiumText }]}>
                PREMIUM
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    text: {
        fontWeight: 'bold',
    },
});
