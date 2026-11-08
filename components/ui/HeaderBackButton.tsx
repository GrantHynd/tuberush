import { useTheme } from '@/hooks/useTheme';
import { type Palette, Spacing, Typography } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface HeaderBackButtonProps {
  title: string;
  icon?: React.ReactNode;
}

/** Back header matching the settings page style — chevron-left + centered title */
export function HeaderBackButton({ title, icon }: HeaderBackButtonProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <MaterialIcons name="chevron-left" size={28} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.titleContainer}>
        {icon}
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.spacer} />
    </View>
  );
}

function makeStyles(colors: Palette) {
    return StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  button: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    ...Typography.h3, color: colors.text },
  spacer: {
    width: 44,
  },
});
}

