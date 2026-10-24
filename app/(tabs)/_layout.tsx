import { Tabs } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Text } from 'react-native';

import { Colors } from '@/constants/theme';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';

function tabIconColor(color: unknown): string {
  return typeof color === 'string' ? color : Colors.light.tabIconDefault;
}

/** Active tabs are distinguished by hue (brand blue) plus weight, not lightness alone. */
function TabLabel({ focused, color, children }: { focused: boolean; color: string; children: string }) {
  return (
    <Text style={{ color, fontSize: 10, fontWeight: focused ? '600' : '400' }} numberOfLines={1}>
      {children}
    </Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: Colors.light.tabIconSelected,
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
        tabBarStyle: { backgroundColor: Colors.light.tabBarBackground },
        tabBarLabel: ({ focused, color, children }) => (
          <TabLabel focused={focused} color={tabIconColor(color)}>
            {children}
          </TabLabel>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Games',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name={focused ? 'house.fill' : 'house'} color={tabIconColor(color)} />
          ),
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
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name={focused ? 'person' : 'person-outline'} size={26} color={tabIconColor(color)} />
          ),
        }}
      />
    </Tabs>
  );
}
