import { useTheme } from '@/hooks/useTheme';
import { DisplayNamePrompt } from '@/components/profile/DisplayNamePrompt';
import { Tabs } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';

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
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name={focused ? 'house.fill' : 'house'} color={tabIconColor(color, colors.tabInactive)} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <MaterialIcons name="bar-chart" size={26} color={tabIconColor(color, colors.tabInactive)} />,
        }}
      />
      <Tabs.Screen
        name="trophy"
        options={{
          title: 'Board',
          tabBarIcon: ({ color }) => <MaterialIcons name="emoji-events" size={26} color={tabIconColor(color, colors.tabInactive)} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name={focused ? 'person' : 'person-outline'} size={26} color={tabIconColor(color, colors.tabInactive)} />
          ),
        }}
      />
    </Tabs>
    </>
  );
}
