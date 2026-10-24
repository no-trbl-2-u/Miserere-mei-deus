/**
 * Hermetic test for the unmocked `@/lib/buildProfile` helper.
 *
 * `jest.setup.ts` ships a project-wide auto-mock that routes
 * `isDevToolsEnabled` to `__DEV__` so the `__DEV__`-toggling
 * Debug* / DevMenu suites need no per-file mock.
 * This suite uses `jest.unmock` so we exercise the real
 * `Constants.expoConfig.extra.devToolsEnabled` lookup that runs in
 * production / preview / dev builds.
 */

jest.unmock('@/lib/buildProfile');

import Constants from 'expo-constants';

import { getBuildCommit, getBuildProfile, isDevToolsEnabled } from '@/lib/buildProfile';

type Extra = { devToolsEnabled?: boolean; buildProfile?: string | null; buildCommit?: string | null };

function setExtra(extra: Extra | undefined): void {
    const cfg = (Constants as unknown as { expoConfig: { extra?: Extra } }).expoConfig;
    cfg.extra = extra as Extra;
}

describe('lib/buildProfile', () => {
    let originalExtra: Extra | undefined;
    let originalDev: boolean;

    beforeEach(() => {
        originalExtra = Constants.expoConfig?.extra as Extra | undefined;
        originalDev = (globalThis as { __DEV__?: boolean }).__DEV__ ?? true;
    });

    afterEach(() => {
        setExtra(originalExtra);
        (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
    });

    describe('isDevToolsEnabled', () => {
        it('returns true when extra.devToolsEnabled is true', () => {
            setExtra({ devToolsEnabled: true });
            (globalThis as { __DEV__?: boolean }).__DEV__ = false;
            expect(isDevToolsEnabled()).toBe(true);
        });

        it('returns false when extra.devToolsEnabled is false (production)', () => {
            setExtra({ devToolsEnabled: false });
            (globalThis as { __DEV__?: boolean }).__DEV__ = true;
            expect(isDevToolsEnabled()).toBe(false);
        });

        it('falls back to __DEV__ when extra is missing', () => {
            setExtra(undefined);
            (globalThis as { __DEV__?: boolean }).__DEV__ = true;
            expect(isDevToolsEnabled()).toBe(true);
            (globalThis as { __DEV__?: boolean }).__DEV__ = false;
            expect(isDevToolsEnabled()).toBe(false);
        });

        it('falls back to __DEV__ when extra.devToolsEnabled is undefined', () => {
            setExtra({ buildProfile: 'preview' });
            (globalThis as { __DEV__?: boolean }).__DEV__ = false;
            expect(isDevToolsEnabled()).toBe(false);
        });
    });

    describe('getBuildProfile', () => {
        it('returns the build profile string when set', () => {
            setExtra({ buildProfile: 'preview' });
            expect(getBuildProfile()).toBe('preview');
        });

        it('returns null when extra.buildProfile is unset', () => {
            setExtra({});
            expect(getBuildProfile()).toBeNull();
        });

        it('returns null when extra is missing', () => {
            setExtra(undefined);
            expect(getBuildProfile()).toBeNull();
        });
    });

    describe('getBuildCommit', () => {
        it('returns the baked build commit', () => {
            setExtra({ buildCommit: '238002d75abc' });
            expect(getBuildCommit()).toBe('238002d75abc');
        });

        it('returns null when no commit is known (a local session, a web export)', () => {
            setExtra({ buildCommit: '' });
            expect(getBuildCommit()).toBeNull();
            setExtra(undefined);
            expect(getBuildCommit()).toBeNull();
        });
    });
});
