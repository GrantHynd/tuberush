import React, { useCallback, useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Layout } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

export interface SearchSelectProps {
    options: readonly string[];
    value: string | null;
    onSelect: (value: string) => void;
    placeholder?: string;
    accessibilityLabel?: string;
    modalTitle?: string;
    visible: boolean;
    onClose: () => void;
    /** If false or returns false for the selected value, the modal will not close on select (e.g. for multi-step flows). Default: true */
    closeOnSelect?: boolean | ((value: string) => boolean);
}

const DEBOUNCE_MS = 150;

export function SearchSelect({
    options,
    value,
    onSelect,
    placeholder = 'Search...',
    accessibilityLabel = 'Search and select',
    modalTitle = 'Select',
    visible,
    onClose,
    closeOnSelect = true,
}: SearchSelectProps) {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');

    const updateDebouncedQuery = useCallback(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query.trim().toLowerCase());
        }, DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [query]);

    React.useEffect(() => {
        const cleanup = updateDebouncedQuery();
        return cleanup;
    }, [query, updateDebouncedQuery]);

    React.useEffect(() => {
        if (!visible) {
            setQuery('');
            setDebouncedQuery('');
        }
    }, [visible]);

    const filteredOptions = useMemo(() => {
        if (!debouncedQuery) {
            return [...options];
        }
        return options.filter((opt) =>
            opt.toLowerCase().includes(debouncedQuery)
        );
    }, [options, debouncedQuery]);

    const handleSelect = useCallback(
        (item: string) => {
            onSelect(item);
            const shouldClose =
                typeof closeOnSelect === 'function' ? closeOnSelect(item) : closeOnSelect;
            if (shouldClose) {
                onClose();
            }
        },
        [onSelect, onClose, closeOnSelect]
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>{modalTitle}</Text>
                    <TouchableOpacity
                        onPress={onClose}
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                    >
                        <Text style={styles.closeButton}>Close</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        value={query}
                        onChangeText={setQuery}
                        placeholder={placeholder}
                        placeholderTextColor={Colors.light.icon}
                        autoCapitalize="none"
                        autoCorrect={false}
                        accessibilityLabel={accessibilityLabel}
                        accessibilityRole="search"
                        accessibilityState={{ disabled: false }}
                    />
                </View>

                <FlatList
                    data={filteredOptions}
                    keyExtractor={(item) => item}
                    keyboardShouldPersistTaps="handled"
                    accessibilityRole="list"
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No results found</Text>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.item}
                            onPress={() => handleSelect(item)}
                            accessibilityRole="button"
                            accessibilityLabel={item}
                            accessibilityState={{
                                selected: value === item,
                            }}
                            accessibilityHint={
                                value === item
                                    ? 'Selected. Double tap to change.'
                                    : 'Double tap to select'
                            }
                        >
                            <Text
                                style={[
                                    styles.itemText,
                                    value === item && styles.selectedItemText,
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
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    searchInput: {
        backgroundColor: Colors.light.card,
        borderWidth: 1,
        borderColor: Colors.light.border,
        borderRadius: Layout.borderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        fontSize: 16,
        color: Colors.light.text,
        minHeight: 44,
    },
    item: {
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 56,
    },
    itemText: {
        fontSize: 16,
        color: Colors.light.text,
        flex: 1,
    },
    selectedItemText: {
        color: Colors.light.tint,
        fontWeight: '600',
    },
    emptyText: {
        textAlign: 'center',
        color: Colors.light.icon,
        padding: Spacing.xl,
        fontSize: 16,
    },
});
