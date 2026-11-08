const path = require('path');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// Assigns a Debug ID shared by the bundle and its source map.
const config = getSentryExpoConfig(__dirname);
const previousResolve = config.resolver.resolveRequest;
const previewStub = path.resolve(__dirname, 'components/dev/RebrandPreview.prod.tsx');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const normalised = moduleName.replace(/\\/g, '/');
  const isPreview =
    normalised === '@/components/dev/RebrandPreview' ||
    normalised.endsWith('/components/dev/RebrandPreview');
  if (context.dev === false && isPreview) {
    return { type: 'sourceFile', filePath: previewStub };
  }
  if (typeof previousResolve === 'function') {
    return previousResolve(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
