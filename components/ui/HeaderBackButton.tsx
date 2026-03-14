import { Colors, Spacing, Typography } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface HeaderBackButtonProps {
  title: string;
}

/** Back header matching the settings page style — chevron-left + centered title */
export function HeaderBackButton({ title }: HeaderBackButtonProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <MaterialIcons name="chevron-left" size={28} color={Colors.light.text} />
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  button: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  title: {
    ...Typography.h3,
  },
  spacer: {
    width: 44,
  },
});
