// Spec 163 (A8): the `production` EAS profile is the tester APK. DEV TOOLS are
// off in it, and it stamps play-log rows `human` (without the env value
// `playLog.ts` stamps `harness`).

import { join } from 'path';

const ORIGINAL = { eas: process.env.EAS_BUILD_PROFILE, bp: process.env.BUILD_PROFILE };

function configFor(profile: string | undefined) {
  if (profile === undefined) delete process.env.EAS_BUILD_PROFILE;
  else process.env.EAS_BUILD_PROFILE = profile;
  delete process.env.BUILD_PROFILE;
  let config: { extra?: Record<string, unknown> } = {};
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    config = require('../app.config').default();
  });
  return config;
}

afterEach(() => {
  if (ORIGINAL.eas === undefined) delete process.env.EAS_BUILD_PROFILE;
  else process.env.EAS_BUILD_PROFILE = ORIGINAL.eas;
  if (ORIGINAL.bp === undefined) delete process.env.BUILD_PROFILE;
  else process.env.BUILD_PROFILE = ORIGINAL.bp;
});

describe('production profile (tester APK)', () => {
  test('app.config.ts turns DEV TOOLS off under EAS_BUILD_PROFILE=production', () => {
    expect(configFor('production').extra?.devToolsEnabled).toBe(false);
  });

  test('preview keeps DEV TOOLS on', () => {
    expect(configFor('preview').extra?.devToolsEnabled).toBe(true);
  });

  test('eas.json: production Android is a sideloadable APK, rows post as human, iOS is the store build', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const eas = require(join(__dirname, '..', 'eas.json'));
    expect(eas.build.production.android).toEqual({
      distribution: 'internal',
      autoIncrement: 'versionCode',
      buildType: 'apk',
    });
    expect(eas.build.production.env).toEqual({ EXPO_PUBLIC_PLAY_LOG_SOURCE: 'human' });
    expect(eas.build.production.ios).toEqual({ distribution: 'store', autoIncrement: 'buildNumber' });
  });
});
