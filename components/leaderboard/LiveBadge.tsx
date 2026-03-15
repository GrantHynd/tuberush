import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TFL, Spacing } from '@/constants/theme';

export function LiveBadge() {
    return (
        <View style={styles.badge}>
            <View style={styles.dot} />
            <Text style={styles.text}>LIVE</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: TFL.green + '18',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: 10,
        gap: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: TFL.green,
    },
    text: {
        fontSize: 11,
        fontWeight: '700',
        color: TFL.green,
        letterSpacing: 0.5,
    },
});
