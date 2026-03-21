import { prefetchDailyGames } from '@/lib/daily-games';
import { initPostHog, capture, flush } from '@/lib/posthog';
import { configureRevenueCat } from '@/lib/revenuecat';
import { supabase } from '@/lib/supabase-client';
import { useAuthStore } from '@/stores/auth-store';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme, Platform } from 'react-native';
import 'react-native-reanimated';

export const unstable_settings = {
  anchor: '(tabs)',
};

/**
 * Parse Supabase auth callback URL (tuberushv2://...#access_token=...&refresh_token=...)
 * and set the session. Used for email confirmation and password reset flows.
 */
async function handleAuthDeepLink(url: string) {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return;

  const fragment = url.slice(hashIndex + 1);
  const params = new URLSearchParams(fragment);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const type = params.get('type');

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (!error) {
      if (type === 'recovery') {
        // Password reset flow: navigate to the reset password screen
        useAuthStore.getState().setPendingPasswordReset(true);
        router.replace('/reset-password');
      } else {
        useAuthStore.getState().checkSession();
      }
    }
  }
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const checkSession = useAuthStore(state => state.checkSession);

  useEffect(() => {
    const init = async () => {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        try {
          await configureRevenueCat();
        } catch (e) {
          console.warn('[App] RevenueCat init failed:', e);
        }
      }

      try {
        await initPostHog();
        capture('app_launched');
        await flush();
      } catch (e) {
        console.warn('[App] PostHog init failed:', e);
      }

      checkSession();

      // Prefetch daily games in background (fire-and-forget)
      prefetchDailyGames('connections', 7).catch(() => {});
      prefetchDailyGames('crossword', 7).catch(() => {});
    };
    init();
  }, [checkSession]);

  useEffect(() => {
    // Handle auth deep links (email confirmation, password reset)
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleAuthDeepLink(url);
    });

    // Handle case when app was opened from a cold start via deep link
    Linking.getInitialURL().then(url => {
      if (url) handleAuthDeepLink(url);
    });

    return () => subscription.remove();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ presentation: 'modal', title: 'Sign In' }} />
        <Stack.Screen name="forgot-password" options={{ presentation: 'modal', title: 'Forgot Password' }} />
        <Stack.Screen name="reset-password" options={{ presentation: 'modal', title: 'Reset Password', gestureEnabled: false }} />
        <Stack.Screen name="subscribe" options={{ presentation: 'modal', title: 'Subscribe' }} />
        <Stack.Screen name="games/play-crossword" options={{ headerShown: false }} />
        <Stack.Screen name="games/play-connections" options={{ headerShown: false }} />
        <Stack.Screen name="games/connections-list" options={{ headerShown: false }} />
        <Stack.Screen name="games/crossword-list" options={{ headerShown: false }} />
        <Stack.Screen name="leaderboard/game" options={{ headerShown: false }} />
        <Stack.Screen name="leaderboard/boroughs" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
