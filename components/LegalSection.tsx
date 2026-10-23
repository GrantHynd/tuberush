import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Layout, Spacing, TFL } from '@/constants/theme';
import { PRIVACY_POLICY_ROUTE, TERMS_OF_USE_ROUTE } from '@/lib/legal';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function LegalRow({
    label,
    route,
    testID,
}: {
    label: string;
    route: typeof PRIVACY_POLICY_ROUTE | typeof TERMS_OF_USE_ROUTE;
    testID: string;
}) {
    const router = useRouter();

    return (
        <TouchableOpacity
            style={styles.cardRow}
            onPress={() => router.push(route)}
            accessibilityRole="link"
            accessibilityLabel={label}
            testID={testID}
        >
            <Text style={styles.rowLabel}>{label}</Text>
            <IconSymbol name="chevron.right" size={20} color={Colors.light.icon} />
        </TouchableOpacity>
    );
}

export function LegalSection() {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>LEGAL</Text>
            <View style={styles.card}>
                <LegalRow
                    label="Privacy Policy"
                    route={PRIVACY_POLICY_ROUTE}
                    testID="settings-privacy-link"
                />
                <View style={styles.cardDivider} />
                <LegalRow
                    label="Terms of Use"
                    route={TERMS_OF_USE_ROUTE}
                    testID="settings-terms-link"
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginTop: Spacing.lg,
        marginBottom: Spacing.lg,
        paddingHorizontal: Spacing.md,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: TFL.grey.dark,
        marginBottom: Spacing.sm,
        marginLeft: Spacing.xs,
    },
    card: {
        backgroundColor: Colors.light.card,
        borderRadius: Layout.borderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.light.border,
        overflow: 'hidden',
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        minHeight: 56,
    },
    cardDivider: {
        height: 1,
        backgroundColor: Colors.light.border,
        marginHorizontal: Spacing.md,
    },
    rowLabel: {
        fontSize: 16,
        color: Colors.light.text,
        fontWeight: '500',
    },
});
