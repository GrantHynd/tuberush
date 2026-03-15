import { Colors, Spacing, Typography } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export interface SectionHeaderProps {
    icon: keyof typeof MaterialIcons.glyphMap;
    title: string;
    onSeeAllPress?: () => void;
    badge?: string;
}

export function SectionHeader({
    icon,
    title,
    onSeeAllPress,
    badge,
}: SectionHeaderProps) {
    return (
        <View style={styles.container}>
            <View style={styles.left}>
                <MaterialIcons
                    name={icon}
                    size={22}
                    color={Colors.light.text}
                    style={styles.icon}
                />
                <Text style={styles.title}>{title}</Text>
                {badge && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{badge}</Text>
                    </View>
                )}
            </View>
            {onSeeAllPress && (
                <TouchableOpacity
                    onPress={onSeeAllPress}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel={`See all ${title}`}
                >
                    <Text style={styles.seeAll}>See all ›</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    icon: {
        marginRight: Spacing.sm,
    },
    title: {
        ...Typography.h3,
        fontSize: 18,
    },
    badge: {
        marginLeft: Spacing.sm,
        backgroundColor: Colors.light.border,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.light.text,
    },
    seeAll: {
        fontSize: 14,
        color: Colors.light.tint,
        fontWeight: '500',
    },
});
