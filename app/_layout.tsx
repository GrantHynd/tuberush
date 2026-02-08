import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useAuthStore } from '@/stores/auth-store';
import { Colors } from '@/constants/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const checkSession = useAuthStore(state => state.checkSession);

  useEffect(() => {
    // Check for existing session on app start
    checkSession();
  }, []);

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.light.background,
          },
          headerTintColor: Colors.light.text,
          headerTitleStyle: {
            fontWeight: '600',
            color: Colors.light.text,
          },
          contentStyle: {
            backgroundColor: Colors.light.background,
          },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ presentation: 'modal', title: 'Sign In' }} />
        <Stack.Screen name="subscribe" options={{ presentation: 'modal', title: 'Subscribe' }} />
        <Stack.Screen name="games/play-connections" options={{ title: 'Connections' }} />
        <Stack.Screen name="games/play-crossword" options={{ title: 'Crossword' }} />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
