import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, TFL, Spacing } from '@/constants/theme';
import { WeeklyLeaderboardEntry } from '@/types/game';
import { getDisplayName, getAvatarInitial, formatScore } from '@/lib/display-utils';
import { Avatar } from './Avatar';

interface PodiumProps {
    entries: WeeklyLeaderboardEntry[];
    currentUserId?: string;
}

type RingColor = 'gold' | 'silver' | 'bronze';
const RING: RingColor[] = ['gold', 'silver', 'bronze'];

export function Podium({ entries, currentUserId }: PodiumProps) {
    const top3 = entries.slice(0, 3);
    if (top3.length === 0) return null;

    // Display order: 2nd (left), 1st (center), 3rd (right)
    const ordered = [top3[1], top3[0], top3[2]].filter(Boolean);

    return (
        <View style={styles.container}>
            {ordered.map((entry, i) => {
                const actualRank = entry.rank;
                const ringIdx = actualRank - 1;
                const isCenter = actualRank === 1;
                const name = getDisplayName(entry.email);
                const initial = getAvatarInitial(name);
                const isMe = entry.userId === currentUserId;

                return (
                    <View
                        key={entry.userId}
                        style={[styles.slot, isCenter && styles.slotCenter]}
                    >
                        <Avatar
                            initial={initial}
                            size={isCenter ? 56 : 44}
                            isCurrentUser={isMe}
                            ringColor={RING[ringIdx]}
                        />
                        <Text
                            style={[styles.name, isMe && styles.nameMe]}
                            numberOfLines={1}
                        >
                            {name}
                        </Text>
                        <Text style={styles.score}>
                            {formatScore(entry.totalScore)}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingVertical: Spacing.md,
        gap: Spacing.lg,
    },
    slot: {
        alignItems: 'center',
        width: 80,
    },
    slotCenter: {
        marginBottom: Spacing.sm,
    },
    name: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.light.text,
        marginTop: 6,
        textAlign: 'center',
    },
    nameMe: {
        color: TFL.blue,
    },
    score: {
        fontSize: 12,
        color: TFL.grey.dark,
        marginTop: 2,
    },
});
