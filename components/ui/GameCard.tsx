import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface GameCardProps {
    id: string;
    title: string;
    description: string;
    icon: string;
    isPremium: boolean;
    isLocked: boolean;
    onPress?: () => void;
}

export function GameCard({
    id,
    title,
    description,
    icon,
    isPremium,
    isLocked,
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
            disabled={isLocked}
        >
            <View style={styles.iconContainer}>
                <Text style={styles.icon}>{icon}</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                    {isPremium && (
                        <View style={styles.premiumBadge}>
                            <Text style={styles.premiumText}>PRO</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.description}>{description}</Text>

                {isLocked && (
                    <Text style={styles.lockedText}>🔒 Premium membership required</Text>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardLocked: {
        opacity: 0.6,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    icon: {
        fontSize: 32,
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginRight: 8,
    },
    premiumBadge: {
        backgroundColor: '#f39c12',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    premiumText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    description: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 4,
    },
    lockedText: {
        fontSize: 12,
        color: '#e74c3c',
        fontStyle: 'italic',
    },
});
