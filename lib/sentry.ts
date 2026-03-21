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
    process.env.SENTRY_DSN ||
    undefined
  );
}

/**
 * Initialize Sentry for error and crash reporting.
 * Automatically disabled in local development to avoid noise.
 * Call once on app launch.
 */
export function initSentry(): void {
  if (sentryInitialized) return;

  const dsn = getSentryDsn();
  if (!dsn) {
    if (__DEV__) {
      console.warn('[Sentry] SENTRY_DSN not set, skipping init');
    }
    return;
  }

  // Disable Sentry in local development to avoid noise
  if (__DEV__) {
    console.log('[Sentry] Disabled in development mode');
    return;
  }

  try {
    Sentry.init({
      dsn,
      // Enable automatic session tracking
      enableAutoSessionTracking: true,
      // Session close timeout (ms) - default 30000
      sessionTrackingIntervalMillis: 30000,
      // Enable automatic breadcrumbs for navigation, console logs, etc.
      enableAutoPerformanceTracing: false, // Keeping it simple for MVP
      // Capture errors that happen during app startup
      enableNative: true,
      // Attach stack traces to messages
      attachStacktrace: true,
      // Release version
      release: Constants.expoConfig?.version || '1.0.0',
      // Distribution (build number)
      dist: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode?.toString() || '1',
      // Environment
      environment: __DEV__ ? 'development' : 'production',
      // Enable/disable debug logging
      debug: false,
    });

    sentryInitialized = true;
    console.log('[Sentry] Initialized successfully');
  } catch (e) {
    console.warn('[Sentry] Init failed:', e);
  }
}

/** Check if Sentry is initialized and enabled */
export function isSentryEnabled(): boolean {
  return sentryInitialized && !__DEV__;
}

/** Capture an exception manually */
export function captureException(
  error: Error,
  context?: Record<string, any>,
): void {
  if (!isSentryEnabled()) return;
  
  if (context) {
    Sentry.captureException(error, { extra: context });
  } else {
    Sentry.captureException(error);
  }
}

/** Capture a message (for non-error situations) */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>,
): void {
  if (!isSentryEnabled()) return;
  
  if (context) {
    Sentry.captureMessage(message, { level, extra: context });
  } else {
    Sentry.captureMessage(message, level);
  }
}

/** Set user context for error reports */
export function setUser(user: { id: string; email?: string; username?: string } | null): void {
  if (!isSentryEnabled()) return;
  Sentry.setUser(user);
}

/** Add custom context to error reports */
export function setContext(key: string, context: Record<string, any>): void {
  if (!isSentryEnabled()) return;
  Sentry.setContext(key, context);
}

/** Add a breadcrumb (for debugging context) */
export function addBreadcrumb(breadcrumb: {
  message: string;
  category?: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, any>;
}): void {
  if (!isSentryEnabled()) return;
  Sentry.addBreadcrumb(breadcrumb);
}

/** Trigger a test error to verify Sentry integration */
export function triggerTestError(): void {
  if (!isSentryEnabled()) {
    console.warn('[Sentry] Test error not triggered - Sentry is disabled in development');
    return;
  }
  throw new Error('Sentry Test Error - If you see this in Sentry, the integration is working!');
}
