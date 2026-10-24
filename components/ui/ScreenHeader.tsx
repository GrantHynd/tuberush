import { Colors, Spacing, TFL, Typography } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface ScreenHeaderProps {
    title: string;
    subtitle?: string;
    /** Optional trailing action, e.g. an avatar button (provide a 44×44 hit area). */
    trailing?: React.ReactNode;
    /** 'large' (default) for tab roots; 'brand' adds the roundel (Home only). */
    variant?: 'large' | 'brand';
    testID?: string;
}

/** Decorative TfL-style roundel used by the brand header. */
function Roundel() {
    return (
        <View
            style={styles.roundel}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
        >
            <View style={styles.roundelInner} />
            <View style={styles.roundelBar} />
        </View>
    );
}

/**
 * Shared tab-root header (TUB-271): large title, optional subtitle and an
 * optional trailing action. No back button and no divider. Horizontal gutter
 * comes from the parent screen container (Layout.screenPadding).
 */
export function ScreenHeader({ title, subtitle, trailing, variant = 'large', testID }: ScreenHeaderProps) {
    return (
        <View style={styles.container} testID={testID}>
            <View style={styles.titleRow}>
                {variant === 'brand' && <Roundel />}
                <View style={styles.titles}>
                    <Text style={styles.title} accessibilityRole="header" numberOfLines={1} ellipsizeMode="tail">
                        {title}
                    </Text>
                    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                </View>
            </View>
            {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingTop: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
    },
    titles: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        ...Typography.h1,
        color: Colors.light.text,
    },
    subtitle: {
        ...Typography.caption,
        marginTop: Spacing.xs,
    },
    trailing: {
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roundel: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: TFL.red,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    roundelInner: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'white',
    },
    roundelBar: {
        position: 'absolute',
        width: 40,
        height: 6,
        backgroundColor: TFL.blue,
    },
});
