import { BrandMark } from '@/components/ui/BrandMark';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface ScreenHeaderProps {
    title: string;
    subtitle?: string;
    /** Optional trailing action, e.g. an avatar button (provide a 44×44 hit area). */
    trailing?: React.ReactNode;
    /** 'large' (default) for tab roots; 'brand' adds the Crossbar Train symbol (Home only). */
    variant?: 'large' | 'brand';
    testID?: string;
}

/**
 * Shared tab-root header (TUB-271): large title, optional subtitle and an
 * optional trailing action. No back button and no divider. Horizontal gutter
 * comes from the parent screen container (Layout.screenPadding).
 */
export function ScreenHeader({ title, subtitle, trailing, variant = 'large', testID }: ScreenHeaderProps) {
    const { colors } = useTheme();
    const styles = useMemo(() => makeStyles(colors.text, colors.textSecondary), [colors.text, colors.textSecondary]);
    return (
        <View style={styles.container} testID={testID}>
            <View style={styles.titleRow}>
                {variant === 'brand' ? <BrandMark size={40} style={styles.mark} testID="brand-mark" /> : null}
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

function makeStyles(text: string, secondary: string) {
    return StyleSheet.create({
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
        mark: { marginRight: Spacing.sm },
        titles: {
            flex: 1,
            minWidth: 0,
        },
        title: {
            ...Typography.h1,
            color: text,
        },
        subtitle: {
            ...Typography.caption,
            color: secondary,
            marginTop: Spacing.xs,
        },
        trailing: {
            minWidth: 44,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
        },
    });
}
