/**
 * Enemy art registry — one OR MORE assets per enemy.
 *
 * Three enemies: two alpha-matted paintings (black backgrounds keyed out so
 * figures float over the arena backdrop) and the Death Beholder, torio's
 * Javardry free material, ingested in colour. The registry key is the enemy's
 * `portraitAsset` (kebab-case) — slug->asset routing stays mobile-local. See
 * provenance.json.
 *
 * There is no "one asset per enemy" law. An enemy may carry a single
 * painting, or a painting plus an animated FRAME SET — see `./frames.ts`. The
 * float-eye carries both: its painting below, and the 24 cells under
 * `anim/float-eye/` that phase AN1e installed. The bindings below hold either
 * way: a frame set is additional art for an enemy, never a replacement for
 * its key, and an enemy with no set renders through `getEncounterEnemyArt`
 * exactly as it always did.
 *
 * `getEncounterEnemyArt(artKey, nonce)` resolves the key directly; unknown /
 * missing keys fall back to a stable hash pick over the whole pool (so an
 * unauthored or synthetic enemy still gets a consistent painting for the
 * duration of its encounter).
 */

/**
 * The bindings. Exported so a test can ENUMERATE them rather than name the
 * enemies that happen to exist today.
 */
export const ENEMY_ART_BY_KEY: Readonly<Record<string, number>> = {
    'float-eye':         require('./float-eye.webp'),
    'brine-hag':         require('./hag.webp'),
    // The Act 1 boss (phase AN4a): torio Javardry free material - free for
    // any use including commercial and modification - ingested --no-grade,
    // because RECIPE carries `grayscale: true` and this is a colour enemy
    // (AN1 A6b).
    'death-beholder':    require('./death-beholder.webp'),
    // STAGED for phase AN3a, which repoints the Brine Hag to it and drops
    // her entry above. Registered now, not later, because the asset trove is
    // gitignored: a loop tick cannot reach the source, so the ingested art
    // has to be in the tree before that phase can be built. Same licence and
    // the same ungraded ingest as the beholder.
    'green-jelly':       require('./green-jelly.webp'),
};

const ENEMY_ART_POOL: number[] = Object.values(ENEMY_ART_BY_KEY);

/**
 * Resolve an enemy's painting. `artKey` should be the engine's
 * `portraitAsset`; a registered key returns its 1:1 painting. Unknown keys
 * fall back to an FNV-1a hash pick seeded by the encounter nonce —
 * deterministic within an encounter, different between encounters.
 */
export function getEncounterEnemyArt(artKey: string | null | undefined, nonce = 0): number {
    if (artKey && ENEMY_ART_BY_KEY[artKey] !== undefined) {
        return ENEMY_ART_BY_KEY[artKey];
    }
    const s = artKey || 'enemy';
    let h = (2166136261 ^ nonce) >>> 0;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return ENEMY_ART_POOL[h % ENEMY_ART_POOL.length];
}

/** True when the key resolves directly to its own painting (no hash fallback). */
export function hasEnemyArt(artKey: string | null | undefined): boolean {
    return !!artKey && ENEMY_ART_BY_KEY[artKey] !== undefined;
}

export const ENEMY_ART_COUNT = ENEMY_ART_POOL.length;

/** Every bound `portraitAsset` key, in registry order. */
export const ENEMY_ART_KEYS: readonly string[] = Object.keys(ENEMY_ART_BY_KEY);

export {
    ENEMY_FRAME_SETS,
    FRAME_CELL_MAX_BYTES,
    RESTING_CLIP,
    getEnemyFrameSet,
    hasEnemyFrames,
    validateFrameSet,
} from './frames';
export type {
    EnemyFrameSet,
    FrameAnchor,
    FrameAnchorKind,
    FrameClip,
    FrameSetManifest,
} from './frames';
