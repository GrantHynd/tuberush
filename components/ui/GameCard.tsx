import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, TFL, Typography, Layout, Spacing } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface GameCardProps {
    id: string;
    title: string;
    description: string;
    icon: string;
    isPremium?: boolean;
    isLocked?: boolean;
    color?: string; // Accent color
    onPress?: () => void;
}

export function GameCard({
    id,
    title,
    description,
    icon,
    isPremium,
    isLocked,
    color = TFL.black,
    onPress
}: GameCardProps) {
    const router = useRouter();

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else if (!isLocked) {
            router.push(`/games/play-${id}` as any);
        }
    };

    return (
        <TouchableOpacity
            style={[styles.card, isLocked && styles.cardLocked]}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            <View style={[styles.accent, { backgroundColor: color }]} />

            <View style={styles.contentContainer}>
                <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                    {isLocked && (
                        <View style={styles.lockedIcon}>
                             <IconSymbol name="lock.fill" size={16} color={Colors.light.icon} />
                        </View>
                    )}
                </View>

                <Text style={styles.description}>{description}</Text>

                {isPremium && (
                    <View style={styles.premiumTag}>
                        <Text style={[styles.premiumText, { color: color }]}>PREMIUM</Text>
                    </View>
                )}
            </View>

            <View style={styles.iconContainer}>
                 <Text style={styles.emoji}>{icon}</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        backgroundColor: Colors.light.background,
        borderRadius: Layout.borderRadius.md,
        marginBottom: Spacing.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.light.border,
        ...Layout.shadow.sm,
        minHeight: 100,
    },
    cardLocked: {
        opacity: 0.8,
        backgroundColor: TFL.grey.light,
    },
    accent: {
        width: 6,
        height: '100%',
    },
    contentContainer: {
        flex: 1,
        padding: Spacing.md,
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xs,
        gap: Spacing.xs,
    },
    lockedIcon: {
        marginLeft: Spacing.xs,
    },
    title: {
        ...Typography.h3,
        fontSize: 20,
    },
    description: {
        ...Typography.body,
        fontSize: 14,
        color: Colors.light.icon,
    },
    premiumTag: {
        marginTop: Spacing.sm,
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        backgroundColor: Colors.light.background,
        borderWidth: 1,
        borderColor: Colors.light.border,
        borderRadius: 4,
    },
    premiumText: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingRight: Spacing.md,
        width: 60,
    },
    emoji: {
        fontSize: 32,
    }
});
