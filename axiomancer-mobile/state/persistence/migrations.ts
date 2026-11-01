import type { GameState } from '@mechanics';
import {
    migrate,
    dropUnknownCardIds,
    dropRetiredFlags,
    dropCutNodes,
    syncWorldMoveLists,
    GAME_STATE_VERSION,
} from '@mechanics';

/**
 * Envelope-format version for the *mobile-only* pre-engine save bridge.
 *
 * This is **frozen at 3** and is NOT the source of truth for GameState
 * migration. The engine owns that (`migrate` / `GAME_STATE_VERSION`).
 * The steps below (v1→v2→v3) exist solely to normalise pre-engine save
 * *shapes* — saves that predate the engine store and carry a string
 * `version` (e.g. `'0.4.0'`) with no engine numeric `version` field —
 * up to a baseline the engine's `migrate` can take over from. All NEW
 * migrations belong in `axiomancer-mechanics`, keyed on the engine
 * `GameState.version`, and ride through `unwrap` automatically (see
 * the `migrate()` delegation at the bottom of `unwrap`). Do not add
 * entries here.
 */
export const CURRENT_SCHEMA_VERSION = 3;

export interface StoredEnvelope {
    schemaVersion: number;
    state: unknown;
    /**
     * Epoch ms of the write. Optional: envelopes
     * written before the slot system carry none and read as `0` — "oldest"
     * — when CONTINUE picks the most recent slot. A property of the WRITE,
     * so it lives on the envelope, not inside the game state.
     */
    savedAt?: number;
}

/** Migration from version `N` to `N + 1`. */
export type Migration = (state: unknown) => unknown;

/**
 * `migrations[N]` migrates a save from version `N` to `N + 1`.
 * Empty by default — bump `CURRENT_SCHEMA_VERSION` and add an entry
 * here when the shape changes.
 */
export type MigrationMap = Record<number, Migration>;

/**
 * Migration from schema v1 to v2. Validates that the pre-engine save carries
 * usable base stats. It stays in the chain so a
 * v1 envelope still walks v1 → v2 → v3 before the engine's `migrate` runs.
 */
function migrateV1ToV2(state: unknown): unknown {
    if (!state || typeof state !== 'object') {
        throw new Error('Migration v1→v2: invalid state object');
    }

    const gameState = state as Record<string, unknown>;
    const player = gameState.player as Record<string, unknown> | null | undefined;

    // Check that we have a valid player with baseStats
    if (!player || !player.baseStats) {
        throw new Error('Migration v1→v2: missing player.baseStats');
    }

    const baseStats = player.baseStats as Record<string, unknown>;

    // Check if baseStats has required fields
    if (typeof baseStats.heart !== 'number' ||
        typeof baseStats.body !== 'number' ||
        typeof baseStats.mind !== 'number') {
        throw new Error('Migration v1→v2: invalid baseStats structure');
    }

    return gameState;
}

/**
 * Migration from schema v2 to v3. Validates the save is an object. It stays
 * in the chain so a v2 envelope still walks v2 → v3; the engine's `migrate`
 * strips obsolete fields from engine-shaped saves.
 */
function migrateV2ToV3(state: unknown): unknown {
    if (!state || typeof state !== 'object') {
        throw new Error('Migration v2→v3: invalid state object');
    }

    return state;
}

/**
 * Default migration map with v1→v2 and v2→v3 migrations.
 */
export const DEFAULT_MIGRATIONS: MigrationMap = {
    1: migrateV1ToV2,
    2: migrateV2ToV3,
};

/**
 * Wrap a state for storage.
 *
 * @param state   the game state to persist.
 * @param savedAt epoch ms of this write; omitted → no stamp.
 */
export function wrap(state: GameState, savedAt?: number): StoredEnvelope {
    return savedAt === undefined
        ? { schemaVersion: CURRENT_SCHEMA_VERSION, state }
        : { schemaVersion: CURRENT_SCHEMA_VERSION, state, savedAt };
}

/**
 * Load an on-disk save into a current-version `GameState`.
 *
 * Two stages:
 *  1. **Pre-engine envelope bridge** — applies the frozen v1→v3 mobile steps
 *     to normalise pre-engine save *shapes* (string `version`, missing
 *     base stats). No new steps are added
 *     here.
 *  2. **Engine migration (source of truth)** — delegates to the engine's
 *     `migrate`, keyed on the engine numeric `GameState.version`, to bring
 *     the save up to `GAME_STATE_VERSION`. Engine schema bumps ride through
 *     without any mobile change; mobile keeps no per-engine-version
 *     migration logic.
 *
 * Throws on malformed envelopes and on saves from a future version.
 */
export function unwrap(
    envelope: StoredEnvelope,
    migrations: MigrationMap = DEFAULT_MIGRATIONS,
): GameState {
    if (
        envelope === null ||
        typeof envelope !== 'object' ||
        typeof (envelope as StoredEnvelope).schemaVersion !== 'number'
    ) {
        throw new Error('asyncStorageAdapter: corrupt save (missing schemaVersion)');
    }
    let v = envelope.schemaVersion;
    let state: unknown = envelope.state;
    if (v > CURRENT_SCHEMA_VERSION) {
        throw new Error(
            `asyncStorageAdapter: save schema v${v} is from a future version (current v${CURRENT_SCHEMA_VERSION})`,
        );
    }
    // Stage 1 — pre-engine mobile-shape bridge (frozen).
    while (v < CURRENT_SCHEMA_VERSION) {
        const m = migrations[v];
        if (!m) {
            throw new Error(`asyncStorageAdapter: no migration from v${v}`);
        }
        state = m(state);
        v++;
    }
    // Stage 2 — engine owns GameState migration. Only engine-shaped saves
    // carry a numeric `version`; pre-engine bridged saves (string `version`)
    // are left to the engine reducer's own tolerance.
    const engineVersion = (state as { version?: unknown } | null)?.version;
    if (typeof engineVersion === 'number' && engineVersion < GAME_STATE_VERSION) {
        state = migrate(state, engineVersion);
    }
    // Every engine-shaped load, current version included: a save can name
    // cards the library no longer holds (`dropUnknownCardIds`) and flags no
    // code reads (`dropRetiredFlags`) and nodes a map has since cut
    // (`dropCutNodes`), and a save written under the frontier
    // rule carries the frontier in its move lists, which the road rule
    // rewrites from where the player stands (`syncWorldMoveLists`).
    if (typeof engineVersion === 'number') {
        const cleaned = dropCutNodes(dropRetiredFlags(dropUnknownCardIds(state as GameState)));
        const world = cleaned.world ? syncWorldMoveLists(cleaned.world) : cleaned.world;
        state = world === cleaned.world ? cleaned : { ...cleaned, world };
    }
    return state as GameState;
}
