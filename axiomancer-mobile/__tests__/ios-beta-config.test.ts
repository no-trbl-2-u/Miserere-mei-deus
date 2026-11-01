/**
 * @jest-environment node
 */

// The iPhone beta's build config (phase IO1a, `plan/README.md`
// A1, A2): one TestFlight `beta` profile, no ad hoc channel, and the `ios` block
// App Store Connect reads. `docs/ios-beta.md` is the runbook these keys serve.

import { join } from 'path';

import resolveConfig from '../app.config';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const eas = require(join(__dirname, '..', 'eas.json'));

describe('iOS config (A1)', () => {
  const ios = resolveConfig().ios ?? {};

  test('the bundle id is the Android package name', () => {
    expect(ios.bundleIdentifier).toBe('com.axiomancer.mobile');
    expect(ios.bundleIdentifier).toBe(resolveConfig().android?.package);
  });

  test('the committed build number is the seed EAS starts from', () => {
    expect(ios.buildNumber).toBe('1');
  });

  test('iPhone only', () => {
    expect(ios.supportsTablet).toBe(false);
  });

  test('export compliance is declared once in config', () => {
    expect(ios.config?.usesNonExemptEncryption).toBe(false);
  });
});

describe('EAS profiles (A2)', () => {
  test('build numbers are kept by EAS', () => {
    expect(eas.cli.appVersionSource).toBe('remote');
  });

  test('preview stays Android-only: no ad hoc iOS channel', () => {
    // `env` carries the play-log stamp that makes the APK the human (SM1b); `android` is the only platform.
    expect(Object.keys(eas.build.preview).sort()).toEqual(['android', 'env']);
    expect(eas.build.preview.env).toEqual({ EXPO_PUBLIC_PLAY_LOG_SOURCE: 'human' });
    expect(eas.build.preview.android).toEqual({ buildType: 'apk', distribution: 'internal' });
  });

  test('beta builds iOS for the store and bumps its build number', () => {
    expect(eas.build.beta).toEqual({
      ios: { distribution: 'store', autoIncrement: 'buildNumber' },
    });
  });

  test('beta submits to App Store Connect', () => {
    // IO1b swaps the placeholder for the numeric id of the App Store Connect record.
    expect(typeof eas.submit.beta.ios.ascAppId).toBe('string');
    expect(eas.submit.beta.ios.ascAppId.length).toBeGreaterThan(0);
  });

  test('production is unchanged', () => {
    expect(eas.build.production).toEqual({
      ios: { distribution: 'store', autoIncrement: 'buildNumber' },
      android: { distribution: 'store', autoIncrement: 'versionCode', buildType: 'app-bundle' },
    });
    expect(eas.submit.production).toBeUndefined();
  });

  test('the beta deploy script builds iOS only and submits', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { scripts } = require(join(__dirname, '..', 'package.json'));
    expect(scripts['deploy:ios-beta']).toBe(
      'npm run verify && node scripts/with-env.mjs eas build --platform ios --profile beta --auto-submit',
    );
    expect(scripts['deploy:ios-preview']).toBeUndefined();
  });
});
