import { useTheme } from '@/hooks/useTheme';
import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { type Palette, Spacing } from '@/constants/theme';

interface LocationFilterTabsProps {
    cities: string[];
    /** null = Global tab active */
    activeCity: string | null;
    onSelect: (city: string | null) => void;
    /** Show "View by Borough >" when London is the active city */
    showBoroughLink?: boolean;
    onBoroughPress?: () => void;
    /** Show "Back to London board" link instead of borough button */
    showBackToLondon?: boolean;
    onBackToLondon?: () => void;
}

export function LocationFilterTabs({
    cities,
    activeCity,
    onSelect,
    showBoroughLink,
    onBoroughPress,
    showBackToLondon,
    onBackToLondon,
}: LocationFilterTabsProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
    return (
        <View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabRow}
            >
                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeCity === null && styles.tabActive,
                    ]}
                    onPress={() => onSelect(null)}
                >
                    <Text
                        style={[
                            styles.tabText,
                            activeCity === null && styles.tabTextActive,
                        ]}
                    >
                        Global
                    </Text>
                </TouchableOpacity>

                {cities.map((city) => (
                    <TouchableOpacity
                        key={city}
                        style={[
                            styles.tab,
                            activeCity === city && styles.tabActive,
                        ]}
                        onPress={() => onSelect(city)}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeCity === city && styles.tabTextActive,
                            ]}
                        >
                            {city}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {showBoroughLink && activeCity === 'London' && (
                <TouchableOpacity
                    style={styles.boroughButton}
                    onPress={onBoroughPress}
                >
                    <MaterialIcons
                        name="location-on"
                        size={16}
                        color={colors.primary}
                    />
                    <Text style={styles.boroughText}>View by Borough</Text>
                    <MaterialIcons
                        name="chevron-right"
                        size={18}
                        color={colors.primary}
                    />
                </TouchableOpacity>
            )}

            {showBackToLondon && (
                <TouchableOpacity
                    style={styles.backLink}
                    onPress={onBackToLondon}
                >
                    <Text style={styles.backLinkText}>
                        {'← Back to London board'}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

function makeStyles(colors: Palette) {
    return StyleSheet.create({
    tabRow: {
        flexDirection: 'row',
        gap: 8,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xs,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
    },
    tabActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    tabTextActive: {
        color: colors.onPrimary,
    },
    boroughButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xs,
    },
    boroughText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },
    backLink: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xs,
    },
    backLinkText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },
});
}

