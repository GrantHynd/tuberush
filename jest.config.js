module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  setupFilesAfterEnv: ['./jest-setup.ts'],
  // Lambdas have their own Node test runner (npm test inside each lambda folder).
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/lambda/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
