import React, { useState, useMemo } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Layout } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface SearchSelectProps {
    options: readonly string[];
    value: string | null;
    onSelect: (value: string) => void;
    placeholder?: string;
    accessibilityLabel?: string;
    modalTitle?: string;
    visible: boolean;
    onClose: () => void;
    closeOnSelect?: (value: string) => boolean;
}

export function SearchSelect({
    options,
    value,
    onSelect,
    placeholder = 'Search...',
    accessibilityLabel,
    modalTitle = 'Select',
    visible,
    onClose,
    closeOnSelect = () => true,
}: SearchSelectProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) {
            return options;
        }
        const query = searchQuery.toLowerCase();
        return options.filter((option) =>
            option.toLowerCase().includes(query)
        );
    }, [options, searchQuery]);

    const handleSelect = (selectedValue: string) => {
        onSelect(selectedValue);
        setSearchQuery('');
        if (closeOnSelect(selectedValue)) {
            onClose();
        }
    };

    const handleClose = () => {
        setSearchQuery('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>{modalTitle}</Text>
                    <TouchableOpacity
                        onPress={handleClose}
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                    >
                        <Text style={styles.closeButton}>Close</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                    <IconSymbol name="magnifyingglass" size={20} color={Colors.light.icon} />
                    <TextInput
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder={placeholder}
                        placeholderTextColor={Colors.light.icon}
                        accessibilityLabel={accessibilityLabel}
                        autoCapitalize="none"
                        autoCorrect={false}
                        clearButtonMode="while-editing"
                    />
                </View>

                <FlatList
                    data={filteredOptions}
                    keyExtractor={(item) => item}
                    accessibilityRole="list"
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No results found</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.optionItem}
                            onPress={() => handleSelect(item)}
                            accessibilityRole="button"
                            accessibilityLabel={item}
                            accessibilityState={{
                                selected: value === item,
                            }}
                        >
                            <Text
                                style={[
                                    styles.optionText,
                                    value === item && styles.selectedOptionText,
                                ]}
                            >
                                {item}
                            </Text>
                            {value === item && (
                                <IconSymbol
                                    name="checkmark.circle.fill"
                                    size={22}
                                    color={Colors.light.tint}
                                />
                            )}
                        </TouchableOpacity>
                    )}
                />
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    title: {
        ...Typography.h3,
    },
    closeButton: {
        color: Colors.light.tint,
        fontSize: 16,
        fontWeight: '600',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.light.card,
        marginHorizontal: Spacing.md,
        marginVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderRadius: Layout.borderRadius.md,
        borderWidth: 1,
        borderColor: Colors.light.border,
        gap: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: Colors.light.text,
        paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    },
    optionItem: {
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 56,
    },
    optionText: {
        fontSize: 16,
        color: Colors.light.text,
    },
    selectedOptionText: {
        color: Colors.light.tint,
        fontWeight: '600',
    },
    emptyState: {
        padding: Spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: Colors.light.icon,
    },
});
