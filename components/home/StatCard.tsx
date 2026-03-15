import { Colors, Layout, Spacing, Typography } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface StatCardProps {
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
    value: string;
}

export function StatCard({ icon, label, value }: StatCardProps) {
    return (
        <View style={styles.card}>
            <MaterialIcons
                name={icon}
                size={24}
                color={Colors.light.icon}
                style={styles.icon}
            />
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: Colors.light.card,
        borderRadius: Layout.borderRadius.lg,
        padding: Spacing.md,
        minHeight: 80,
    },
    icon: {
        marginBottom: Spacing.xs,
    },
    label: {
        ...Typography.caption,
        marginBottom: 2,
    },
    value: {
        ...Typography.h2,
        fontSize: 22,
    },
});
