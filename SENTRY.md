# Sentry Integration Guide

This document explains how Sentry is integrated into TubeRush for crash and error reporting.

## Overview

Sentry is configured to automatically capture:
- Unhandled JavaScript errors
- Native crashes (iOS/Android)
- Manual error captures via the Sentry API

## Setup

### 1. Install Dependencies

Sentry is already installed via `@sentry/react-native`:

```bash
npm install @sentry/react-native
```

### 2. Environment Configuration

Add the following environment variables to your `.env` file (see `.env.example` for reference):

```env
# Sentry DSN (Data Source Name) - required for error reporting
SENTRY_DSN=https://YOUR_KEY@YOUR_ORG.ingest.sentry.io/YOUR_PROJECT_ID

# Sentry organization slug (for source map uploads)
SENTRY_ORG=your-org-slug

# Sentry project name (for source map uploads)
SENTRY_PROJECT=your-project-name

# Sentry auth token (for source map uploads during builds)
SENTRY_AUTH_TOKEN=your-auth-token
```

#### Getting Your Sentry Configuration

1. **Create a Sentry Account**: Go to [sentry.io](https://sentry.io) and create an account
2. **Create a Project**: Create a new project and select "React Native" as the platform
3. **Get Your DSN**: Navigate to Project Settings → Client Keys (DSN) and copy your DSN
4. **Get Organization Slug**: Found in Organization Settings → General Settings
5. **Create Auth Token**: Navigate to Settings → Account → API → Auth Tokens → Create New Token
   - Scopes required: `project:read`, `project:releases`, `org:read`

### 3. Configuration Files

Sentry is configured in the following files:

- **`lib/sentry.ts`**: Initialization logic and utility functions
- **`app/_layout.tsx`**: Sentry initialization at app entry point
- **`app.config.ts`**: Expo plugin configuration for native integration

## Features

### Automatic Error Capture

Sentry automatically captures:
- Unhandled exceptions in JavaScript
- Native crashes on iOS and Android
- Promise rejections

### Development Mode

**Sentry is automatically disabled in local development** (`__DEV__` mode) to avoid noise in your Sentry dashboard during development. This means:
- No errors are sent to Sentry when running with Expo Go or `expo start`
- Test error buttons will show a warning instead of throwing

To test Sentry in production mode, you need to create a production build.

### Manual Error Capture

You can manually capture errors and messages using the utility functions:

```typescript
import { captureException, captureMessage, addBreadcrumb } from '@/lib/sentry';

// Capture an exception with context
try {
  // some code
} catch (error) {
  captureException(error, { extra: 'context' });
}

// Capture a message
captureMessage('Something important happened', 'info');

// Add breadcrumbs for debugging
addBreadcrumb({
  message: 'User clicked button',
  category: 'ui',
  level: 'info',
});
```

### User Context

Set user context to associate errors with specific users:

```typescript
import { setUser } from '@/lib/sentry';

// After user logs in
setUser({
  id: user.id,
  email: user.email,
  username: user.username,
});

// After user logs out
setUser(null);
```

## Testing

### Test Error Trigger

A test error button is available in the app:

1. Navigate to the **Profile/Settings** screen
2. Scroll to the **ACCOUNT** section
3. Tap on **Test Sentry** → **Trigger Test Error**

**Note**: This button will only work in production builds. In development mode, it will show a warning message.

### Testing in Production Mode

To test Sentry properly, you need to create a production build:

#### iOS (Simulator or Device)
```bash
eas build --profile preview --platform ios
```

#### Android (Emulator or Device)
```bash
eas build --profile preview --platform android
```

After installing the preview build, trigger a test error and verify it appears in your Sentry dashboard.

## Source Maps

Source maps are automatically uploaded during EAS builds via the Sentry Expo plugin. This ensures that stack traces in Sentry show readable code (not minified).

The plugin configuration in `app.config.ts` handles:
- Automatic source map generation during builds
- Upload to Sentry with the correct release version
- Association of errors with source code

## Troubleshooting

### Errors Not Appearing in Sentry

1. **Check DSN**: Verify `SENTRY_DSN` is set correctly in your environment
2. **Check Build Mode**: Ensure you're testing with a production build, not in dev mode
3. **Check Sentry Status**: Visit [status.sentry.io](https://status.sentry.io) to ensure Sentry is operational
4. **Check Console**: Look for Sentry initialization logs: `[Sentry] Initialized successfully`

### Source Maps Not Working

1. **Check Auth Token**: Ensure `SENTRY_AUTH_TOKEN` is set with correct permissions
2. **Check Organization/Project**: Verify `SENTRY_ORG` and `SENTRY_PROJECT` match your Sentry account
3. **Check Build Logs**: Review EAS build logs for Sentry upload errors

### Test Error Not Working

Remember: Sentry is disabled in development mode. You must create a production or preview build to test error reporting.

## Best Practices

1. **Don't Log Sensitive Data**: Avoid capturing passwords, tokens, or PII in error contexts
2. **Use Breadcrumbs**: Add breadcrumbs before important operations to aid debugging
3. **Set User Context**: Always set user context after login/logout for better error tracking
4. **Rate Limiting**: Sentry has built-in rate limiting to prevent spam
5. **Review Regularly**: Check your Sentry dashboard regularly to catch and fix issues

## Additional Resources

- [Sentry React Native Docs](https://docs.sentry.io/platforms/react-native/)
- [Sentry Expo Integration](https://docs.sentry.io/platforms/react-native/manual-setup/expo/)
- [Source Maps Guide](https://docs.sentry.io/platforms/react-native/sourcemaps/)
