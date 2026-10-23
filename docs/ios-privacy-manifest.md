# iOS privacy manifest

Apple rejects builds whose `PrivacyInfo.xcprivacy` is missing or incomplete. Ours is defined in `app.config.ts` under `ios.privacyManifests`, and `expo prebuild` writes it to `ios/tuberushv2/PrivacyInfo.xcprivacy`. Don't edit the generated file; it is overwritten on every prebuild.

## What we declare

The app does not track users (`NSPrivacyTracking` is false, no tracking domains).

| Data type | Collected by | Purpose |
| --- | --- | --- |
| Email address | Supabase auth, Sentry user context, PostHog `identify` | App functionality, analytics |
| User ID | Supabase auth, RevenueCat, Sentry user context, PostHog `identify` | App functionality, analytics |
| Crash data | Sentry | App functionality |
| Performance data | Sentry (session tracking) | App functionality |
| Other diagnostic data | Sentry (device context, breadcrumbs) | App functionality |
| Product interaction | PostHog | Analytics |
| Other usage data | PostHog | Analytics |
| Purchase history | RevenueCat | App functionality |

Every type is marked as linked to the user. After sign-in, `stores/auth-store.ts` passes the Supabase user ID to Sentry, PostHog and RevenueCat, and the email to Sentry and PostHog. The SDKs' own manifests say "not linked" because they can't know that. If we stop sending identity to an SDK, its rows can become unlinked.

Required-reason APIs are the union of what the bundled native SDKs declare:

| API | Reasons | Declared by |
| --- | --- | --- |
| User defaults | `CA92.1` | React Native, Expo modules, Sentry, PostHog, RevenueCat |
| File timestamp | `C617.1`, `0A2A.1`, `3B52.1` | React Native, AsyncStorage, expo-application, expo-file-system, Sentry, PostHog |
| System boot time | `35F9.1` | React Native, expo-device, Sentry, PostHog |
| Disk space | `E174.1`, `85F4.1` | expo-file-system |

The SDKs ship their own manifests too. The app repeats their API reasons because static CocoaPods linking can drop SDK manifests from the final bundle.

## Adding or upgrading an SDK

1. Find the SDK's `PrivacyInfo.xcprivacy`. For JS packages with native code, look in `node_modules/<package>/ios/`. For SDKs pulled in through CocoaPods (Sentry Cocoa, PostHog iOS, RevenueCat), look in the native SDK's repo at the version the podspec pins.
2. Add any new data types or API reasons to `ios.privacyManifests` in `app.config.ts`. Decide "linked" based on whether we send that SDK a user ID or email.
3. Run `npx expo prebuild --platform ios --clean --no-install` and check the generated file.
4. Update the App Store Connect privacy label to match.

Apple's validation only runs on an uploaded build. Check the TestFlight build in App Store Connect for privacy manifest warnings before submitting.
