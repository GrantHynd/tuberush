/* eslint-disable no-undef */
import 'react-native-gesture-handler/jestSetup';

// Mock Async Storage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useSegments: jest.fn(() => []),
  usePathname: jest.fn(() => '/'),
  Tabs: {
    Screen: jest.fn(() => null),
  },
  Stack: {
    Screen: jest.fn(() => null),
  },
  Link: jest.fn(({ children }) => children),
}));

// Mock Expo Haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {},
}));

// Mock Expo Font
jest.mock('expo-font', () => ({
  isLoaded: jest.fn(() => true),
  loadAsync: jest.fn(),
}));

// Mock Expo Secure Store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock Safe Area Context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock.js'));

// Mock Supabase Client
jest.mock('@/lib/supabase-client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => ({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({ data: null, error: null })),
          maybeSingle: jest.fn(() => ({ data: null, error: null })),
        })),
      })),
    })),
    functions: {
      invoke: jest.fn(() => Promise.resolve({ data: null, error: null })),
    },
  },
}));

// Mock RevenueCat (native-only)
jest.mock('react-native-purchases', () => ({
  default: {
    configure: jest.fn(() => Promise.resolve()),
    setLogLevel: jest.fn(),
    logIn: jest.fn(() => Promise.resolve({ customerInfo: {} })),
    logOut: jest.fn(() => Promise.resolve()),
    getCustomerInfo: jest.fn(() =>
      Promise.resolve({ entitlements: { active: {} } })
    ),
    getOfferings: jest.fn(() => Promise.resolve({ current: null })),
    purchasePackage: jest.fn(() => Promise.resolve({ customerInfo: {} })),
    restorePurchases: jest.fn(() => Promise.resolve({})),
    LOG_LEVEL: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 },
    PAYWALL_RESULT: {
      PURCHASED: 'PURCHASED',
      RESTORED: 'RESTORED',
      CANCELLED: 'CANCELLED',
      NOT_PRESENTED: 'NOT_PRESENTED',
    },
  },
}));
jest.mock('react-native-purchases-ui', () => ({
  default: {
    presentPaywall: jest.fn(() => Promise.resolve('CANCELLED')),
    presentPaywallIfNeeded: jest.fn(() => Promise.resolve('NOT_PRESENTED')),
    presentCustomerCenter: jest.fn(() => Promise.resolve()),
  },
}));

// Mock Alert
(global as any).Alert = {
  alert: jest.fn(),
};
