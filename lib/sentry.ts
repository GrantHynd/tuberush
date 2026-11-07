/**
 * Sentry error and crash reporting for TubeRush
 * @see https://docs.sentry.io/platforms/react-native/
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

let sentryInitialized = false;

function getSentryDsn(): string | undefined {
  return (
    Constants.expoConfig?.extra?.sentryDsn ||
    process.env.EXPO_PUBLIC_SENTRY_DSN ||
    undefined
  );
}

/**
 * Initialize Sentry for error and crash reporting.
 * Events are silenced in local development. Call once at app startup,
 * before the root component renders. Leave release and dist unset so the
 * Expo plugin can match uploaded source maps.
 */
export function initSentry(): void {
  if (sentryInitialized) return;

  const dsn = getSentryDsn();
  if (!dsn) {
    if (__DEV__) {
      console.warn('[Sentry] EXPO_PUBLIC_SENTRY_DSN not set, skipping init');
    }
    return;
  }

  try {
    Sentry.init({
      dsn,
      enabled: !__DEV__,
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,
      enableNative: true,
      attachStacktrace: true,
      environment: __DEV__ ? 'development' : 'production',
      debug: false,
    });

    sentryInitialized = true;
    if (__DEV__) {
      console.log('[Sentry] Disabled in development mode');
    } else {
      console.log('[Sentry] Initialized successfully');
    }
  } catch (e) {
    console.warn('[Sentry] Init failed:', e);
  }
}

/** Check if Sentry is initialized and enabled */
export function isSentryEnabled(): boolean {
  return sentryInitialized && !__DEV__;
}

/** Set user context for error reports */
export function setUser(user: { id: string; email?: string; username?: string } | null): void {
  if (!isSentryEnabled()) return;
  Sentry.setUser(user);
}
