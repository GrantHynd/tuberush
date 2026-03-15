import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, TFL, Spacing, Layout } from '@/constants/theme';
import { WeeklyLeaderboardEntry } from '@/types/game';
import {
    getDisplayName,
    getAvatarInitial,
    formatScore,
} from '@/lib/display-utils';
import { getLocationDisplay } from '@/lib/leaderboard';
import { Avatar } from './Avatar';

interface RankedListProps {
    entries: WeeklyLeaderboardEntry[];
    currentUserId?: string;
    /** Skip the top N entries (e.g. 3 for podium) */
    startFromRank?: number;
    /** Compact mode for the overview mini-list */
    compact?: boolean;
    /**
     * When the current user is outside the displayed entries, pass their
     * entry here to render it below an ellipsis gap at the bottom of the list.
     */
    userEntryOutsideList?: WeeklyLeaderboardEntry | null;
}

function EntryRow({
    item,
    isMe,
    compact,
}: {
    item: WeeklyLeaderboardEntry;
    isMe: boolean;
    compact: boolean;
}) {
    const name = getDisplayName(item.email);
    const initial = getAvatarInitial(name);
    const location = getLocationDisplay({
        city: item.city,
        borough: item.borough,
    });

    return (
        <View
            style={[
                styles.row,
                isMe && styles.rowHighlight,
                compact && styles.rowCompact,
            ]}
        >
            {isMe && <View style={styles.accentBorder} />}
            <Text style={styles.rank}>{item.rank}</Text>
            <Avatar
                initial={initial}
                size={compact ? 28 : 34}
                isCurrentUser={isMe}
            />
            <View style={styles.info}>
                <View style={styles.nameRow}>
                    <Text
                        style={[styles.name, compact && styles.nameCompact]}
                        numberOfLines={1}
                    >
                        {name}
                    </Text>
                    {isMe && (
                        <View style={styles.youPill}>
                            <Text style={styles.youText}>you</Text>
                        </View>
                    )}
                </View>
                {!compact && (
                    <Text style={styles.location} numberOfLines={1}>
                        {location}
                    </Text>
                )}
            </View>
            <Text style={[styles.score, compact && styles.scoreCompact]}>
                {formatScore(item.totalScore)}
            </Text>
        </View>
    );
}

function GapIndicator() {
    return (
        <View style={styles.gapRow}>
            <View style={styles.gapDot} />
            <View style={styles.gapDot} />
            <View style={styles.gapDot} />
        </View>
    );
}

export function RankedList({
    entries,
    currentUserId,
    startFromRank = 0,
    compact = false,
    userEntryOutsideList,
}: RankedListProps) {
    const filtered =
        startFromRank > 0
            ? entries.filter((e) => e.rank > startFromRank)
            : entries;

    if (compact) {
        return (
            <View>
                {filtered.map((item) => (
                    <EntryRow
                        key={item.userId}
                        item={item}
                        isMe={item.userId === currentUserId}
                        compact
                    />
                ))}
                {userEntryOutsideList && (
                    <>
                        <GapIndicator />
                        <EntryRow
                            item={userEntryOutsideList}
                            isMe
                            compact
                        />
                    </>
                )}
            </View>
        );
    }

    return (
        <View style={styles.card}>
            {filtered.map((item, i) => (
                <React.Fragment key={item.userId}>
                    {i > 0 && <View style={styles.divider} />}
                    <EntryRow
                        item={item}
                        isMe={item.userId === currentUserId}
                        compact={false}
                    />
                </React.Fragment>
            ))}
            {userEntryOutsideList && (
                <>
                    <GapIndicator />
                    <View style={styles.divider} />
                    <EntryRow
                        item={userEntryOutsideList}
                        isMe
                        compact={false}
                    />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.light.background,
        borderRadius: Layout.borderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: Spacing.md,
        backgroundColor: Colors.light.background,
    },
    rowCompact: {
        paddingVertical: 6,
        paddingHorizontal: 0,
    },
    rowHighlight: {
        backgroundColor: TFL.blue + '0A',
    },
    accentBorder: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        backgroundColor: TFL.blue,
        borderTopLeftRadius: Layout.borderRadius.lg,
        borderBottomLeftRadius: Layout.borderRadius.lg,
    },
    rank: {
        width: 28,
        fontSize: 14,
        color: TFL.grey.dark,
        textAlign: 'center',
    },
    info: {
        flex: 1,
        marginLeft: Spacing.sm,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    name: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.light.text,
        flexShrink: 1,
    },
    nameCompact: {
        fontSize: 13,
    },
    youPill: {
        backgroundColor: TFL.blue + '18',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 8,
    },
    youText: {
        fontSize: 10,
        fontWeight: '700',
        color: TFL.blue,
    },
    location: {
        fontSize: 12,
        color: TFL.grey.dark,
        marginTop: 1,
    },
    score: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.light.text,
        marginLeft: Spacing.sm,
    },
    scoreCompact: {
        fontSize: 13,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.light.border,
        marginHorizontal: Spacing.md,
    },
    gapRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 6,
    },
    gapDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: TFL.grey.medium,
    },
});
