import { useTheme } from '@/hooks/useTheme';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { type Palette, Layout, Radius, Spacing, Typography } from '@/constants/theme';
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
    color,
    onPress
}: GameCardProps) {
    const { colors } = useTheme();
    const accent = color ?? colors.text;
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
    const router = useRouter();

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else if (!isLocked) {
            router.push(`/games/play-${id}` as any);
        }
    };

    const a11yLabel = [
        title,
        description,
        isPremium ? 'Premium game' : '',
        isLocked ? 'Locked' : ''
    ].filter(Boolean).join(', ');

    const a11yHint = isLocked ? 'Double tap to subscribe' : 'Double tap to play';

    return (
        <Card
            variant="outlined"
            padding="none"
            testID={`game-card-${id}`}
            style={[styles.card, isLocked && styles.cardLocked]}
            onPress={handlePress}
            accessibilityLabel={a11yLabel}
            accessibilityHint={a11yHint}
        >
            <View style={[styles.accent, { backgroundColor: accent }]} />

            <View style={styles.contentContainer}>
                <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                    {isLocked && (
                        <View style={styles.lockedIcon}>
                             <IconSymbol name="lock.fill" size={16} color={colors.textSecondary} />
                        </View>
                    )}
                </View>

                <Text style={styles.description}>{description}</Text>

                {isPremium && (
                    <View style={styles.premiumTag}>
                        <Text style={[styles.premiumText, { color: colors.premiumText }]}>PREMIUM</Text>
                    </View>
                )}
            </View>

            <View style={styles.iconContainer}>
                 <Text style={styles.emoji}>{icon}</Text>
            </View>
        </Card>
    );
}

function makeStyles(colors: Palette) {
    return StyleSheet.create({
    card: {
        flexDirection: 'row',
        marginBottom: Layout.cardGap,
        overflow: 'hidden',
        minHeight: 100,
    },
    cardLocked: {
        opacity: 0.8,
        backgroundColor: colors.background,
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
        fontSize: 20, color: colors.text },
    description: {
        ...Typography.body,
        fontSize: 14,
        color: colors.textSecondary,
    },
    premiumTag: {
        marginTop: Spacing.sm,
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        backgroundColor: colors.premium,
        borderRadius: Radius.sm,
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
}

