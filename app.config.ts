import 'dotenv/config';

const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;

if (!sentryOrg || !sentryProject) {
  console.warn(
    '[Sentry] SENTRY_ORG or SENTRY_PROJECT is unset. Native crash reporting and source map upload are skipped for this build.',
  );
}

const linkedDataType = (type: string, purposes: string[]) => ({
  NSPrivacyCollectedDataType: `NSPrivacyCollectedDataType${type}`,
  NSPrivacyCollectedDataTypeLinked: true,
  NSPrivacyCollectedDataTypeTracking: false,
  NSPrivacyCollectedDataTypePurposes: purposes.map(
    (purpose) => `NSPrivacyCollectedDataTypePurpose${purpose}`,
  ),
});

// Everything is linked because Sentry.setUser, PostHog identify, and RevenueCat
// logIn all receive the Supabase user ID (Sentry and PostHog also get the email).
// See docs/ios-privacy-manifest.md before adding an SDK or changing these.
const privacyManifests = {
  NSPrivacyTracking: false,
  NSPrivacyTrackingDomains: [],
  NSPrivacyCollectedDataTypes: [
    // Supabase auth, Sentry user context, PostHog identify
    linkedDataType('EmailAddress', ['AppFunctionality', 'Analytics']),
    // Supabase auth, RevenueCat app user ID, Sentry user context, PostHog identify
    linkedDataType('UserID', ['AppFunctionality', 'Analytics']),
    // Sentry
    linkedDataType('CrashData', ['AppFunctionality']),
    linkedDataType('PerformanceData', ['AppFunctionality']),
    linkedDataType('OtherDiagnosticData', ['AppFunctionality']),
    // PostHog
    linkedDataType('ProductInteraction', ['Analytics']),
    linkedDataType('OtherUsageData', ['Analytics']),
    // RevenueCat
    linkedDataType('PurchaseHistory', ['AppFunctionality']),
  ],
  // Union of the reasons declared by bundled native SDKs (React Native, Expo
  // modules, AsyncStorage, Sentry Cocoa, PostHog iOS, RevenueCat). Static
  // CocoaPods linking can drop SDK manifests, so the app declares them too.
  NSPrivacyAccessedAPITypes: [
    {
      NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
      NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
    },
    {
      NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
      NSPrivacyAccessedAPITypeReasons: ['C617.1', '0A2A.1', '3B52.1'],
    },
    {
      NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
      NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
    },
    {
      NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
      NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'],
    },
  ],
};

export default {
  expo: {
    name: 'tuberush-v2',
    slug: 'tuberush-v2',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'tuberushv2',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.tuberush.v2',
      privacyManifests,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      package: 'com.tuberush.v2',
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
      ...(sentryOrg && sentryProject
        ? [
            [
              '@sentry/react-native/expo',
              {
                organization: sentryOrg,
                project: sentryProject,
                url: 'https://sentry.io/',
              },
            ],
          ]
        : []),
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
      supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
      posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '',
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
    },
  },
};
