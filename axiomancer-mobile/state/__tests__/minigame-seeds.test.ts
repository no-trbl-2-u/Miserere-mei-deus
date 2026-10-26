/**
 * Hermetic test pin — `state/minigame-seeds.ts`, the shared
 * deterministic seed/string resolver imported by every minigame Begin
 * action (`state/{hazard,rest,cache}/store-actions.ts`).
 *
 * A silent precedence/guard regression here breaks playtest and smoke
 * reproducibility across every minigame at once, so the pin asserts the
 * resolver's contract directly rather than through any one consumer:
 *
 *   - resolveMinigameSeed: explicit > unified global > legacy > fallback,
 *     with the finiteNumber guard rejecting NaN/Infinity/non-numbers at
 *     each tier, and the fallback in both number and thunk form.
 *   - resolveMinigameString: explicit > unified-entry name-scan (in order)
 *     > legacy > fallback, with the nonEmptyString guard.
 *   - fallbackMinigameSeed: a finite uint32.
 *
 * The unified global `globalThis.__AXM_MINIGAME_SEEDS__` is mutated and
 * fully restored around every case so no test leaks state.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { configureLogging, getLogger, resetLoggingForTests } from '@mechanics';

import {
    fallbackMinigameSeed,
    resolveMinigameSeed,
    resolveMinigameString,
    type MinigameSeedConfig,
    type MinigameSeedKey,
    type MinigameSeedSource,
} from '@/state/minigame-seeds';

const setUnified = (config: MinigameSeedConfig | undefined) => {
    globalThis.__AXM_MINIGAME_SEEDS__ = config;
};

beforeEach(() => {
    setUnified(undefined);
});

afterEach(() => {
    setUnified(undefined);
});

describe('resolveMinigameSeed', () => {
    it('returns the explicit seed when one is provided (highest precedence)', () => {
        setUnified({ hazard: { seed: 222 } });
        expect(resolveMinigameSeed('hazard', 111, 333, 444)).toBe(111);
    });

    it('falls through to the unified global when no explicit seed is given', () => {
        setUnified({ blacksmith: { seed: 777 } });
        expect(resolveMinigameSeed('blacksmith', undefined, 333, 444)).toBe(777);
    });

    it('reads the unified entry keyed by the requested minigame', () => {
        setUnified({ hazard: { seed: 10 }, cache: { seed: 20 } });
        expect(resolveMinigameSeed('cache', undefined, undefined, 444)).toBe(20);
    });

    it('falls through to the legacy seed when no explicit/unified seed exists', () => {
        setUnified({ rest: {} });
        expect(resolveMinigameSeed('rest', undefined, 333, 444)).toBe(333);
    });

    it('falls through to the numeric fallback when nothing else is finite', () => {
        expect(resolveMinigameSeed('cache', undefined, undefined, 444)).toBe(444);
    });

    it('invokes the fallback thunk form only when reached, returning its value', () => {
        let calls = 0;
        const thunk = () => {
            calls += 1;
            return 999;
        };
        expect(resolveMinigameSeed('cache', undefined, undefined, thunk)).toBe(999);
        expect(calls).toBe(1);
    });

    it('does not invoke the fallback thunk when an earlier tier wins', () => {
        let calls = 0;
        const thunk = () => {
            calls += 1;
            return 999;
        };
        expect(resolveMinigameSeed('cache', 5, undefined, thunk)).toBe(5);
        expect(calls).toBe(0);
    });

    it('uses the real fallback resolver (uint32) when no fallback arg is passed', () => {
        const seed = resolveMinigameSeed('hazard', undefined, undefined);
        expect(Number.isInteger(seed)).toBe(true);
        expect(seed).toBeGreaterThanOrEqual(0);
        expect(seed).toBeLessThanOrEqual(0xffffffff);
    });

    describe('finiteNumber guard', () => {
        it('skips a NaN explicit seed and falls through to the unified global', () => {
            setUnified({ hazard: { seed: 777 } });
            expect(resolveMinigameSeed('hazard', Number.NaN, 333, 444)).toBe(777);
        });

        it('skips an Infinity unified seed and falls through to the legacy seed', () => {
            setUnified({ hazard: { seed: Number.POSITIVE_INFINITY } });
            expect(resolveMinigameSeed('hazard', undefined, 333, 444)).toBe(333);
        });

        it('skips a NaN legacy seed and falls through to the fallback', () => {
            expect(resolveMinigameSeed('hazard', undefined, Number.NaN, 444)).toBe(444);
        });

        it('treats 0 as a valid finite seed (not falsy-skipped)', () => {
            expect(resolveMinigameSeed('hazard', 0, 333, 444)).toBe(0);
        });

        it('treats a negative finite seed as valid', () => {
            expect(resolveMinigameSeed('hazard', -7, 333, 444)).toBe(-7);
        });
    });
});

describe('resolveMinigameString', () => {
    it('returns the explicit value when one is provided (highest precedence)', () => {
        setUnified({ hazard: { hazardId: 'unified' } });
        expect(
            resolveMinigameString('hazard', ['hazardId', 'id'], 'explicit', 'legacy', 'fallback'),
        ).toBe('explicit');
    });

    it('scans the unified entry name keys in order, returning the first non-empty', () => {
        setUnified({ hazard: { id: 'from-id' } });
        expect(
            resolveMinigameString('hazard', ['hazardId', 'id'], undefined, 'legacy', 'fallback'),
        ).toBe('from-id');
    });

    it('prefers the earlier name key when multiple are present', () => {
        setUnified({ hazard: { hazardId: 'first', id: 'second' } });
        expect(
            resolveMinigameString('hazard', ['hazardId', 'id'], undefined, 'legacy', 'fallback'),
        ).toBe('first');
    });

    it('skips an empty-string unified key and continues the name scan', () => {
        setUnified({ hazard: { hazardId: '', id: 'second' } });
        expect(
            resolveMinigameString('hazard', ['hazardId', 'id'], undefined, 'legacy', 'fallback'),
        ).toBe('second');
    });

    it('falls through to the legacy value when no explicit/unified match', () => {
        setUnified({ hazard: {} });
        expect(
            resolveMinigameString('hazard', ['hazardId', 'id'], undefined, 'legacy', 'fallback'),
        ).toBe('legacy');
    });

    it('skips an empty-string legacy value and falls through to the fallback', () => {
        expect(
            resolveMinigameString('hazard', ['hazardId', 'id'], undefined, '', 'fallback'),
        ).toBe('fallback');
    });

    it('falls through to the fallback when nothing else matches', () => {
        expect(
            resolveMinigameString('cache', ['hazardId', 'id'], undefined, undefined, 'fallback'),
        ).toBe('fallback');
    });

    it('returns undefined when no fallback is supplied and nothing matches', () => {
        expect(
            resolveMinigameString('hazard', ['hazardId', 'id'], undefined, undefined),
        ).toBeUndefined();
    });

    it('reads the unified entry keyed by the requested minigame, not another', () => {
        setUnified({ cache: { id: 'other-cache' }, hazard: { hazardId: 'cracked-cliff' } });
        expect(
            resolveMinigameString('hazard', ['hazardId', 'id'], undefined, undefined, 'fallback'),
        ).toBe('cracked-cliff');
    });
});

describe('fallbackMinigameSeed', () => {
    it('returns a finite uint32', () => {
        const seed = fallbackMinigameSeed();
        expect(Number.isInteger(seed)).toBe(true);
        expect(seed).toBeGreaterThanOrEqual(0);
        expect(seed).toBeLessThanOrEqual(0xffffffff);
    });
});

describe('the rng/minigame-seed log line', () => {
    beforeEach(() => {
        configureLogging({ enabled: true, level: 'info', capacity: 100 });
        getLogger().clear();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        resetLoggingForTests();
    });

    const lastSeedLine = () => getLogger().entries({ domains: ['rng'], kind: 'minigame-seed' }).at(-1);

    const cases: { source: MinigameSeedSource; key: MinigameSeedKey; seed: number; resolve: () => number }[] = [
        { source: 'explicit', key: 'hazard', seed: 11, resolve: () => resolveMinigameSeed('hazard', 11, 33, 44) },
        {
            source: 'unified', key: 'rest', seed: 22,
            resolve: () => { setUnified({ rest: { seed: 22 } }); return resolveMinigameSeed('rest', undefined, 33, 44); },
        },
        { source: 'legacy', key: 'cache', seed: 33, resolve: () => resolveMinigameSeed('cache', undefined, 33, 44) },
        {
            source: 'fallback', key: 'blacksmith', seed: 44,
            resolve: () => resolveMinigameSeed('blacksmith', undefined, undefined, () => 44),
        },
    ];

    for (const { source, key, seed, resolve } of cases) {
        it(`logs the ${source} source at info level`, () => {
            expect(resolve()).toBe(seed);
            const line = lastSeedLine();
            expect(line?.level).toBe('info');
            expect(line?.data).toEqual({ key, seed, source });
        });
    }

    it('returns the same seed when the logger throws', () => {
        const info = jest.spyOn(getLogger(), 'info').mockImplementation(() => {
            throw new Error('sink down');
        });
        setUnified({ hazard: { seed: 99 } });
        expect(resolveMinigameSeed('hazard', 7, 1, 2)).toBe(7);
        expect(resolveMinigameSeed('hazard', undefined, 1, 2)).toBe(99);
        expect(resolveMinigameSeed('rest', undefined, 1, 2)).toBe(1);
        expect(resolveMinigameSeed('cache', undefined, undefined, 2)).toBe(2);
        expect(info).toHaveBeenCalledTimes(4);
    });
});
