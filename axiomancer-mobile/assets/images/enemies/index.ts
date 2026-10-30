/**
 * Enemy art registry — one OR MORE assets per enemy.
 *
 * The Float-Eye, an alpha-matted painting (black background keyed out so the
 * figure floats over the arena backdrop); the Green Jelly and the Death
 * Beholder, torio's Javardry free material, ingested in colour; and Chapter
 * 1's normals, stand-ins from the same drop as the Float-Eye until T's
 * portrait swap. The registry key is the enemy's
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
    // The Act 1 elite (phase AN3a) and boss (phase AN4a): torio's Javardry
    // free material - free for any use including commercial and
    // modification - ingested --no-grade, because RECIPE carries
    // `grayscale: true` and these are colour enemies (AN1 A6b).
    'green-jelly':       require('./green-jelly.webp'),
    'death-beholder':    require('./death-beholder.webp'),
    // Chapter 1's normals (phases EN1f and EN1g): stand-ins restored from the
    // 2026-07-06 drop until T's portrait swap; static, no frame set.
    'gallows-crow':      require('./gallows-crow.webp'),
    'net-mender':        require('./net-mender.webp'),
    'crane-hook':        require('./crane-hook.webp'),
    'brine-widow':       require('./brine-widow.webp'),
    'lamprey-knot':      require('./lamprey-knot.webp'),
    'curfew-ringer':     require('./curfew-ringer.webp'),
    // The cliffs, the hamlet and the sea cave (phase EN1h): the same kind of stand-in.
    'wreck-picker':      require('./wreck-picker.webp'),
    'smokehouse-gutter': require('./smokehouse-gutter.webp'),
    'tithe-collector':   require('./tithe-collector.webp'),
    // Chapter 1's elites (phase EN1j on): stand-ins restored from the same
    // drop until T's portrait swap; static, no frame set.
    'cave-choir':        require('./cave-choir.webp'),
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
