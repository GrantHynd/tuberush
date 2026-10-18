import { Tabs } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';

import { TFL } from '@/constants/theme';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';

function tabIconColor(color: unknown): string {
  return typeof color === 'string' ? color : TFL.grey.medium;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: TFL.blue,
        tabBarInactiveTintColor: TFL.grey.medium,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Games',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={tabIconColor(color)} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <MaterialIcons name="bar-chart" size={26} color={tabIconColor(color)} />,
        }}
      />
      <Tabs.Screen
        name="trophy"
        options={{
          title: 'Board',
          tabBarIcon: ({ color }) => <MaterialIcons name="emoji-events" size={26} color={tabIconColor(color)} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={26} color={tabIconColor(color)} />,
        }}
      />
    </Tabs>
  );
}
