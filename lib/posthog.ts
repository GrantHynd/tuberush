/**
 * PostHog product analytics for TubeRush
 * @see https://posthog.com/docs/libraries/react-native
 */

import PostHog from 'posthog-react-native';
import Constants from 'expo-constants';

let posthogClient: PostHog | null = null;

function getPostHogApiKey(): string | undefined {
  return (
    Constants.expoConfig?.extra?.posthogApiKey ||
    process.env.EXPO_PUBLIC_POSTHOG_API_KEY ||
    undefined
  );
}

/**
 * Initialize the PostHog client. Call once on app launch.
 * Waits for the client to be ready before returning.
 */
export async function initPostHog(): Promise<PostHog | null> {
  if (posthogClient) return posthogClient;

  const apiKey = getPostHogApiKey();
  if (!apiKey) {
    if (__DEV__) {
      console.warn('[PostHog] EXPO_PUBLIC_POSTHOG_API_KEY not set, skipping init');
    }
    return null;
  }

  if (__DEV__) {
    console.log('[PostHog] Initializing with key:', apiKey.slice(0, 10) + '…');
  }

  try {
    posthogClient = new PostHog(apiKey, {
      host: 'https://eu.i.posthog.com',
      enableSessionReplay: false,
      captureAppLifecycleEvents: false,
      flushAt: __DEV__ ? 1 : 20,
      flushInterval: __DEV__ ? 5000 : 30000,
      persistence: 'memory',
    });

    if (__DEV__) {
      console.log('[PostHog] Initialized successfully');
    }
  } catch (e) {
    if (__DEV__) {
      console.warn('[PostHog] Init failed:', e);
    }
    posthogClient = null;
  }

  return posthogClient;
}

/** Get the PostHog client instance (null if not initialized) */
export function getPostHog(): PostHog | null {
  return posthogClient;
}

/** Capture a named event with optional properties */
export function capture(event: string, properties?: Record<string, any>): void {
  posthogClient?.capture(event, properties);
}

/** Identify a user (call after login with Supabase user ID) */
export function identify(
  userId: string,
  properties?: Record<string, any>,
): void {
  posthogClient?.identify(userId, properties);
}

/** Reset user identity (call on logout) */
export function resetIdentity(): void {
  posthogClient?.reset();
}

/** Flush queued events immediately */
export async function flush(): Promise<void> {
  await posthogClient?.flush();
}

