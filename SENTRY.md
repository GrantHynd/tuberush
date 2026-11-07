# Sentry Integration Guide

Sentry captures unhandled JavaScript errors and native crashes. Performance tracing is left off.

## Setup

`@sentry/react-native` is installed. Add these variables to `.env` (see `.env.example`):

```env
# Public client DSN. Inlined into the app.
EXPO_PUBLIC_SENTRY_DSN=https://YOUR_KEY@YOUR_ORG.ingest.sentry.io/YOUR_PROJECT_ID

```

Put the auth token in `.env.local`, which is gitignored:

```env
SENTRY_AUTH_TOKEN=your-auth-token
```

Create the token in Sentry under Settings → Auth Tokens, with permission to create releases and upload source maps.

The Expo plugin in `app.config.ts` is fixed to organization `grant-hynd` and project `tuberush`. For EAS builds, set `EXPO_PUBLIC_SENTRY_DSN` and `SENTRY_AUTH_TOKEN` as EAS environment variables on the build profile. `SENTRY_AUTH_TOKEN` must be sensitive. Without that token the native plugin is still applied, but source map upload is skipped.

## Where it is configured

- `lib/sentry.ts` initializes the SDK. Events are silenced when `__DEV__` is true.
- `app/_layout.tsx` calls `initSentry()` at startup and exports `Sentry.wrap(RootLayout)`.
- `app.config.ts` adds `@sentry/react-native/expo` for organization `grant-hynd` and project `tuberush`. Release and dist are left for that plugin to set, so uploaded source maps match events.
- `metro.config.js` uses `getSentryExpoConfig` so the bundle and source map share a Debug ID.
- `stores/auth-store.ts` sets the Sentry user on sign-up, sign-in, and session restore, and clears it on sign-out.

## Verify a release build

Sentry does not send events from `expo start` or a debug simulator build. The SDK is disabled when `__DEV__` is true.

Install a preview or production build with `EXPO_PUBLIC_SENTRY_DSN` set. Unhandled errors from that build are reported to the `tuberush` project. Confirm an event has a readable stack trace.

Do not attach passwords, tokens, or other secrets to events.
