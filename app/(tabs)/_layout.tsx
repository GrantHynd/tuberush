import { useTheme } from '@/hooks/useTheme';
import { DisplayNamePrompt } from '@/components/profile/DisplayNamePrompt';
import { Tabs } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { decorativeIconProps, tabAccessibilityLabel } from '@/lib/a11y';

const TAB_TITLES = ['Games', 'Stats', 'Board', 'Profile'] as const;

/** Spoken tab names. Icons stay decorative so they are not read again. */
export function gameTabAccessibilityLabels(): string[] {
  return TAB_TITLES.map((title, index) => tabAccessibilityLabel(title, index, TAB_TITLES.length));
}

function DecorativeIcon({ children }: { children: React.ReactNode }) {
  return (
    <View {...decorativeIconProps} pointerEvents="none">
      {children}
    </View>
  );
}

function tabIconColor(color: unknown, fallback: string): string {
  return typeof color === 'string' ? color : fallback;
}

/** Active tabs are distinguished by weight as well as colour. */
function TabLabel({ focused, color, children }: { focused: boolean; color: string; children: string }) {
  return (
    <Text style={{ color, fontSize: 10, fontWeight: focused ? '600' : '400' }} numberOfLines={1}>
      {children}
    </Text>
  );
}

export default function TabLayout() {
    const { colors } = useTheme();
    const tabLabels = gameTabAccessibilityLabels();
  return (
    <>
    <DisplayNamePrompt />
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          // Web keeps border-color and drops borderTopColor, so the shorthand is set too.
          borderColor: colors.border,
          borderTopColor: colors.border,
        },
        tabBarLabel: ({ focused, color, children }) => (
          <TabLabel focused={focused} color={tabIconColor(color, colors.tabInactive)}>
            {children}
          </TabLabel>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Games',
          tabBarAccessibilityLabel: tabLabels[0],
          tabBarIcon: ({ color, focused }) => (
            <DecorativeIcon>
              <IconSymbol size={28} name={focused ? 'house.fill' : 'house'} color={tabIconColor(color, colors.tabInactive)} />
            </DecorativeIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarAccessibilityLabel: tabLabels[1],
          tabBarIcon: ({ color }) => (
            <DecorativeIcon>
              <MaterialIcons name="bar-chart" size={26} color={tabIconColor(color, colors.tabInactive)} {...decorativeIconProps} />
            </DecorativeIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="trophy"
        options={{
          title: 'Board',
          tabBarAccessibilityLabel: tabLabels[2],
          tabBarIcon: ({ color }) => (
            <DecorativeIcon>
              <MaterialIcons name="emoji-events" size={26} color={tabIconColor(color, colors.tabInactive)} {...decorativeIconProps} />
            </DecorativeIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarAccessibilityLabel: tabLabels[3],
          tabBarIcon: ({ color, focused }) => (
            <DecorativeIcon>
              <MaterialIcons
                name={focused ? 'person' : 'person-outline'}
                size={26}
                color={tabIconColor(color, colors.tabInactive)}
                {...decorativeIconProps}
              />
            </DecorativeIcon>
          ),
        }}
      />
    </Tabs>
    </>
  );
}
