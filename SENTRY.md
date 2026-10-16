# Sentry Integration Guide

Sentry captures unhandled JavaScript errors and native crashes. Performance tracing is left off.

## Setup

`@sentry/react-native` is installed. Add these variables to `.env` (see `.env.example`):

```env
# Public client DSN. Inlined into the app.
EXPO_PUBLIC_SENTRY_DSN=https://YOUR_KEY@YOUR_ORG.ingest.sentry.io/YOUR_PROJECT_ID

# Build-time source map upload
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
```

Put the auth token in `.env.local`, which is gitignored:

```env
SENTRY_AUTH_TOKEN=your-auth-token
```

Create the token in Sentry under Settings → Auth Tokens, with permission to create releases and upload source maps.

For EAS builds, set `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` as EAS environment variables on the build profile. `SENTRY_AUTH_TOKEN` must be sensitive. The native plugin is added only when `SENTRY_ORG` and `SENTRY_PROJECT` are set, so a build without them skips native crash reporting and source map upload.

## Where it is configured

- `lib/sentry.ts` initializes the SDK. Events are silenced when `__DEV__` is true.
- `app/_layout.tsx` calls `initSentry()` at startup and exports `Sentry.wrap(RootLayout)`.
- `app.config.ts` adds `@sentry/react-native/expo` when org and project are set. Release and dist are left for that plugin to set, so uploaded source maps match events.
- `metro.config.js` uses `getSentryExpoConfig` so the bundle and source map share a Debug ID.
- `stores/auth-store.ts` sets the Sentry user on sign-up, sign-in, and session restore, and clears it on sign-out.

## Verify a release build

Sentry does not send events from `expo start`. Install a preview or production build, then call `triggerTestError()` from a temporary debug control:

```typescript
import { triggerTestError } from '@/lib/sentry';

triggerTestError();
```

That sends a captured exception and does not crash the app. Remove the control before shipping. Confirm the event in Sentry has a readable stack trace.

## Manual capture

```typescript
import { captureException, captureMessage, addBreadcrumb } from '@/lib/sentry';

try {
  // some code
} catch (error) {
  captureException(error as Error, { extra: 'context' });
}

captureMessage('Something important happened', 'info');

addBreadcrumb({
  message: 'User clicked button',
  category: 'ui',
  level: 'info',
});
```

Do not attach passwords, tokens, or other secrets to events.
