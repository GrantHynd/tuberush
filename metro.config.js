const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// Assigns a Debug ID shared by the bundle and its source map.
const config = getSentryExpoConfig(__dirname);

module.exports = config;
