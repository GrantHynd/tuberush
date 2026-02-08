import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/auth-store';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const checkSession = useAuthStore(state => state.checkSession);
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

  useEffect(() => {
    // Check for existing session on app start
    checkSession();
  }, []);

  return (
    <StripeProvider publishableKey={publishableKey}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ presentation: 'modal', title: 'Sign In' }} />
          <Stack.Screen name="subscribe" options={{ presentation: 'modal', title: 'Subscribe' }} />
          <Stack.Screen name="games/play-tictactoe" options={{ title: 'Tic Tac Toe' }} />
          <Stack.Screen name="games/play-crossword" options={{ title: 'Crossword' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </StripeProvider>
  );
}
