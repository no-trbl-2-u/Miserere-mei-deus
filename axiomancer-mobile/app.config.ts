import type { ExpoConfig } from 'expo/config';

import appJson from './app.json';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { sentryReleaseFor, buildCommit } = require('./lib/sentryRelease.js') as typeof import('./lib/sentryRelease.js');

// EAS sets `EAS_BUILD_PROFILE` to the active profile name during
// build. `BUILD_PROFILE` is an explicit override for web deploys
// (Netlify / Vercel / etc.) where EAS isn't involved.
//
// DEV menu / Debug* affordances render whenever the profile is
// anything other than 'production'. When no profile is set
// (e.g. a plain `expo start` local session), we leave
// `devToolsEnabled` undefined so `isDevToolsEnabled()` falls
// through to `__DEV__` — true in Metro dev server, false in
// production bundles. This prevents a production APK built
// without EAS_BUILD_PROFILE from accidentally receiving
// devToolsEnabled=true and exposing the /dev route.
const buildProfile = process.env.EAS_BUILD_PROFILE ?? process.env.BUILD_PROFILE;
const devToolsEnabled = buildProfile != null ? buildProfile !== 'production' : undefined;

// Sentry's DSN is PUBLIC by design — it ships inside every client binary and
// only permits event ingest, so it is committed rather than injected. The
// build-time SENTRY_AUTH_TOKEN (sourcemap upload) is the secret, and lives in
// EAS secrets. `EXPO_PUBLIC_SENTRY_DSN` overrides for a fork or a throwaway
// project; setting it empty disables reporting outright.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN
  ?? 'https://4abbfcd3e2a87c1798c13bacdf2f7a05@o4512025187123200.ingest.us.sentry.io/4512025202458624';

const expo = appJson.expo as ExpoConfig;

// One Sentry release per build commit (`lib/sentryRelease.js` says why).
// Null off the builder, where the SDK keeps its own default.
const BUILD_COMMIT = buildCommit();
const SENTRY_RELEASE = sentryReleaseFor(expo.version, BUILD_COMMIT);

export default (): ExpoConfig => ({
  ...expo,
  extra: {
    ...(expo.extra ?? {}),
    // Only include when set — Expo's config merge converts a literal
    // null/undefined into `{}` which would defeat the `?? null`
    // fallback in `getBuildProfile()` and the `=== true/false` guards
    // in `isDevToolsEnabled()`.
    ...(devToolsEnabled !== undefined ? { devToolsEnabled } : {}),
    ...(buildProfile ? { buildProfile } : {}),
    // The play log stamps every post with it (`getBuildCommit()`).
    ...(BUILD_COMMIT ? { buildCommit: BUILD_COMMIT } : {}),
    ...(SENTRY_DSN ? { sentryDsn: SENTRY_DSN } : {}),
    ...(SENTRY_RELEASE ? { sentryRelease: SENTRY_RELEASE } : {}),
  },
});
