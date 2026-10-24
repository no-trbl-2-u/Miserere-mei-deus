import Constants from '@/lib/platform/constants';

type Extra = {
  devToolsEnabled?: boolean;
  buildProfile?: string | null;
  buildCommit?: string | null;
  sentryDsn?: string | null;
  sentryRelease?: string | null;
};

// `extra.devToolsEnabled` is set by `app.config.ts` from
// `EAS_BUILD_PROFILE` (or `BUILD_PROFILE` for non-EAS web deploys):
// `false` only when the profile is `'production'`. Local dev
// without either env set falls through to `__DEV__`.
export function isDevToolsEnabled(): boolean {
  // e2e/screenshot escape hatch: a static `expo export` for web does NOT make
  // `Constants.expoConfig.extra` available at runtime (it's resolved from a
  // manifest the static server doesn't serve), so the BUILD_PROFILE=preview
  // bake never reaches `extra` and this falls through to `__DEV__` (false in an
  // export) — the dev-tools-link never mounts. A browser harness can opt back
  // in by setting `globalThis.__AXM_FORCE_DEV_TOOLS__ = true` via an init
  // script before boot. Inert in real builds: nothing sets the global there,
  // and `production` still hard-disables below via the `=== false` check.
  // (scripts/fixture-e2e.mjs: a BUILD_PROFILE=preview
  // `expo export` DOES bake `extra.devToolsEnabled: true` into the web
  // bundle, so the escape hatch is belt-and-braces for that profile; it
  // still matters for exports made without a BUILD_PROFILE.)
  if ((globalThis as { __AXM_FORCE_DEV_TOOLS__?: boolean }).__AXM_FORCE_DEV_TOOLS__ === true) {
    const extra = Constants.expoConfig?.extra as Extra | undefined;
    if (extra?.devToolsEnabled === false) return false;
    return true;
  }
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  if (extra?.devToolsEnabled === false) return false;
  if (extra?.devToolsEnabled === true) return true;
  return __DEV__;
}

export function getBuildProfile(): string | null {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  return extra?.buildProfile ?? null;
}

// The git commit this build was made from, baked into `extra.buildCommit` by
// `app.config.ts` on the EAS builder or in CI. Null in a local session and a
// static web export, where no commit is known; the play log (`lib/playLog.ts`)
// sends null rather than guess.
export function getBuildCommit(): string | null {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  const commit = extra?.buildCommit;
  return typeof commit === 'string' && commit.length > 0 ? commit : null;
}

// The Sentry DSN, baked into `extra` by `app.config.ts`. Public by design —
// a DSN is embedded in every shipped client and only permits event ingest —
// so it is committed, unlike the build-time SENTRY_AUTH_TOKEN. Null in a
// static web export (see the note above: `extra` is not resolvable there),
// which is correct: crash reporting is native-only (`lib/monitoring.ts`).
export function getSentryDsn(): string | null {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  const dsn = extra?.sentryDsn;
  return typeof dsn === 'string' && dsn.length > 0 ? dsn : null;
}

// This build's Sentry release (`lib/sentryRelease.js`), baked by
// `app.config.ts` on the EAS builder. Null elsewhere: the SDK default stands.
export function getSentryRelease(): string | null {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  const release = extra?.sentryRelease;
  return typeof release === 'string' && release.length > 0 ? release : null;
}
