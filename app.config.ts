import 'dotenv/config';

const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;

if (!sentryOrg || !sentryProject) {
  console.warn(
    '[Sentry] SENTRY_ORG or SENTRY_PROJECT is unset. Native crash reporting and source map upload are skipped for this build.',
  );
}

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
      './plugins/withPrivacyManifest.js',
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
