/**
 * Fixture → `GameState` compiler.
 *
 * Pure pipeline over the engine's own constructors, so a fixture never
 * encodes the state shape and never needs a migration:
 *
 *   seedRng          → `setSeed` (global engine RNG; run id + rngState follow)
 *   createNewGameState
 *   applyPreset      → `buildCharacterFromPreset`
 *   applyPlayer      → `createCharacter` rebuild for level / stats, then clamps
 *   applyWorld       → `changeContinent` / `unlockMap` / `changeMap` / `completeMap` / `placeOnNode`
 *   applyFlags       → deduped append
 *   stampRng         → `rngState` re-read after every roll above
 *
 * The one side effect is the RNG seed (the engine RNG is a process-wide
 * singleton — same as `createNewGameState` itself). Callers that need
 * isolation call `setSeed` again afterwards.
 *
 * Input is assumed valid — run `validateStateFixture` first on anything
 * that did not come from the registry.
 */

import { createCharacter } from '../../Character';
import { buildCharacterFromPreset, getPresetById } from '../../Character/presets';
import type { Character } from '../../Character/types';
import { getRng, setSeed } from '../../Utils/rng';
import { getMapDefinition, createMapState } from '../../World/map.registry';
import {
    changeContinent, changeMap, completeMap, placeOnNode, unlockMap,
} from '../../World/world.reducer';
import type { WorldState } from '../../World/types';
import { createNewGameState } from '../game.reducer';
import type { GameState } from '../types';
import type { StateFixture, StateFixturePlayer, StateFixtureWorld } from './state-fixture.types';

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
const dedupe = <T>(xs: readonly T[]): T[] => [...new Set(xs)];

/** Player from the preset, or the new-game player when none is named. */
const applyPreset = (fixture: StateFixture) => (state: GameState): GameState => {
    if (fixture.preset === undefined) return state;
    const preset = getPresetById(fixture.preset);
    if (!preset) throw new Error(`buildStateFromFixture: unknown preset '${fixture.preset}'.`);
    return { ...state, player: buildCharacterFromPreset(preset) };
};

/**
 * Layer `player` overrides. Level or stat changes rebuild the character so
 * derived numbers (max health, XP threshold, relic kit) stay consistent;
 * the rebuilt character keeps the preset's inventory, currency, and cards.
 */
const applyPlayer = (overrides: StateFixturePlayer | undefined) => (state: GameState): GameState => {
    if (!overrides) return state;
    const current = state.player;
    const needsRebuild = overrides.level !== undefined || overrides.baseStats !== undefined;
    const rebuilt: Character = needsRebuild
        ? createCharacter({
            name: overrides.name ?? current.name,
            level: overrides.level ?? current.level,
            baseStats: { ...current.baseStats, ...overrides.baseStats },
            currency: current.currency,
            inventory: current.inventory,
            knownCards: current.knownCards,
            equipment: [
                ...(current.equipment.weapon ? [current.equipment.weapon] : []),
                ...(current.equipment.armor ? [current.equipment.armor] : []),
                ...current.equipment.relics,
            ],
        })
        : { ...current, name: overrides.name ?? current.name };
    const knownCards = dedupe([...rebuilt.knownCards, ...(overrides.knownCards ?? [])]);
    const currency = overrides.currency ?? rebuilt.currency;
    const health = overrides.health === undefined
        ? rebuilt.health
        : clamp(Math.floor(overrides.health), 1, rebuilt.maxHealth);
    return { ...state, player: { ...rebuilt, knownCards, currency, health } };
};

/** Continent → map (unlocked + fresh `MapState`) → completed maps → node. */
const applyWorld = (target: StateFixtureWorld | undefined) => (state: GameState): GameState => {
    if (!target) return state;
    const def = getMapDefinition(target.continent, target.map);
    const onContinent = changeContinent(state.world, target.continent);
    const withCompleted = (target.completedMaps ?? []).reduce<WorldState>(
        (w, m) => completeMap(unlockMap(w, m), m),
        onContinent,
    );
    const onMap = changeMap(unlockMap(withCompleted, target.map), createMapState(def));
    const placed = target.node === undefined ? onMap : placeOnNode(onMap, target.node);
    return { ...state, world: placed };
};

const applyFlags = (flags: readonly string[] | undefined) => (state: GameState): GameState =>
    flags ? { ...state, flags: dedupe([...state.flags, ...flags]) } : state;

/** Every builder above may roll; persist the RNG cursor last. */
const stampRng = (state: GameState): GameState => ({ ...state, rngState: getRng().getState() });

/** Left-to-right function composition over the state. */
const pipe = (...fns: ReadonlyArray<(s: GameState) => GameState>) => (s: GameState): GameState =>
    fns.reduce((acc, fn) => fn(acc), s);

/**
 * Compile a fixture into a full, current-version `GameState`.
 *
 * Deterministic when `fixture.seed` is set: two calls yield equal states
 * (run id included).
 */
export function buildStateFromFixture(fixture: StateFixture): GameState {
    if (fixture.seed !== undefined) setSeed(fixture.seed);
    return pipe(
        applyPreset(fixture),
        applyPlayer(fixture.player),
        applyWorld(fixture.world),
        applyFlags(fixture.flags),
        stampRng,
    )(createNewGameState());
}
