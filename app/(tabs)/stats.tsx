import { Colors, Spacing, Typography } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StatsScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Stats</Text>
                <Text style={styles.subtitle}>Coming soon</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    title: {
        ...Typography.h2,
        marginBottom: Spacing.sm,
    },
    subtitle: {
        ...Typography.caption,
    },
});
