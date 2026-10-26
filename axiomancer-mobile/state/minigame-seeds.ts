/**
 * Shared mobile minigame seed resolver.
 *
 * Deterministic playtest/smoke tooling can set one unified global,
 * `globalThis.__AXM_MINIGAME_SEEDS__`, or the per-minigame
 * `__AXM_*_SEED__` globals. Begin actions use the
 * same precedence everywhere:
 *
 *   explicit begin option > unified global > per-minigame global > fallback
 *
 * Every resolved seed is logged as `rng/minigame-seed {key, seed, source}`
 * at info level, so a harness can read which seed a minigame used.
 */

import { getLogger } from '@mechanics';

export type MinigameSeedKey = 'hazard' | 'rest' | 'cache' | 'blacksmith';

export interface MinigameSeedEntry {
    seed?: number;
    hazardId?: string;
    id?: string;
}

export type MinigameSeedConfig = Partial<Record<MinigameSeedKey, MinigameSeedEntry>>;

declare global {
    // eslint-disable-next-line no-var
    var __AXM_MINIGAME_SEEDS__: MinigameSeedConfig | undefined;
}

function finiteNumber(value: number | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function nonEmptyString(value: string | undefined): value is string {
    return typeof value === 'string' && value.length > 0;
}

export function fallbackMinigameSeed(): number {
    return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

/** Which tier of the precedence chain supplied a resolved seed. */
export type MinigameSeedSource = 'explicit' | 'unified' | 'legacy' | 'fallback';

function logMinigameSeed(key: MinigameSeedKey, seed: number, source: MinigameSeedSource): number {
    try {
        getLogger().info('rng', 'minigame-seed', { key, seed, source });
    } catch { /* logging never breaks play */ }
    return seed;
}

export function resolveMinigameSeed(
    key: MinigameSeedKey,
    explicitSeed: number | undefined,
    legacySeed: number | undefined,
    fallbackSeed: number | (() => number) = fallbackMinigameSeed,
): number {
    if (finiteNumber(explicitSeed)) return logMinigameSeed(key, explicitSeed, 'explicit');
    const unified = globalThis.__AXM_MINIGAME_SEEDS__?.[key]?.seed;
    if (finiteNumber(unified)) return logMinigameSeed(key, unified, 'unified');
    if (finiteNumber(legacySeed)) return logMinigameSeed(key, legacySeed, 'legacy');
    const fallback = typeof fallbackSeed === 'function' ? fallbackSeed() : fallbackSeed;
    return logMinigameSeed(key, fallback, 'fallback');
}

export function resolveMinigameString(
    key: MinigameSeedKey,
    names: readonly (keyof MinigameSeedEntry)[],
    explicitValue: string | undefined,
    legacyValue: string | undefined,
    fallbackValue?: string,
): string | undefined {
    if (nonEmptyString(explicitValue)) return explicitValue;
    const unified = globalThis.__AXM_MINIGAME_SEEDS__?.[key];
    for (const name of names) {
        const value = unified?.[name];
        if (nonEmptyString(value as string | undefined)) return value as string;
    }
    if (nonEmptyString(legacyValue)) return legacyValue;
    return fallbackValue;
}
