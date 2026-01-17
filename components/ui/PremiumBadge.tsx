import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface PremiumBadgeProps {
    size?: 'small' | 'medium' | 'large';
}

export function PremiumBadge({ size = 'medium' }: PremiumBadgeProps) {
    const sizeStyles = {
        small: { fontSize: 10, paddingHorizontal: 6, paddingVertical: 2 },
        medium: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 4 },
        large: { fontSize: 14, paddingHorizontal: 10, paddingVertical: 6 },
    };

    return (
        <View style={[styles.badge, sizeStyles[size]]}>
            <Text style={[styles.text, { fontSize: sizeStyles[size].fontSize }]}>
                ⭐ PREMIUM
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        backgroundColor: '#f39c12',
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    text: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
