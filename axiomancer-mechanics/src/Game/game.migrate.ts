/**
 * Save-state validation.
 *
 * Save files are tagged with `version`. Only a save at the current version
 * loads. Every save made before v41 (the live Breakwater became T's Chapter 1
 * map, phase BW1b) is rejected: its world names nodes the map no longer has,
 * and T ruled every old save deleted. The persistence layer reads a rejected
 * slot as `unreadable`, which the slot screen offers only for deletion, and
 * NEW GAME starts on the windmill (`bw-w1`). There is no hop chain: the
 * earlier hops (v11 .. v40) went with the saves they served.
 *
 * Two load-time cleanups run on every load after `migrate`, at any version:
 * `dropUnknownCardIds` and `dropRetiredFlags`.
 */

import { GameState } from './types';
import { getCardById } from '../Cards/cards.library';
import { STARTING_CARD_IDS } from '../Combat/combat.rewards';
import { GAME_STATE_VERSION } from './game.reducer';

/**
 * Narrow a raw save payload to the current `GameState`. Only the current
 * version is accepted; any other version throws, and the caller offers the
 * slot only for deletion. The name and signature are kept so the
 * persistence layer's call site is unchanged.
 *
 * @param raw         - The deserialised JSON object pulled from persistence.
 * @param fromVersion - The `version` field of the saved payload.
 * @param toVersion   - The target schema version (defaults to current).
 * @throws If the payload is not an object, is not the current version, or is
 *   missing required `GameState` fields.
 */
export function migrate(
    raw: unknown,
    fromVersion: number,
    toVersion: number = GAME_STATE_VERSION,
): GameState {
    if (!raw || typeof raw !== 'object') {
        throw new Error(`migrate: invalid save payload (got ${typeof raw}).`);
    }
    if (fromVersion !== toVersion) {
        throw new Error(
            `migrate: save version ${fromVersion} is not supported (runtime is ${toVersion}); ` +
            'saves made before the new Breakwater are not migrated — delete it and start a new game.',
        );
    }
    return assertGameState(raw);
}

/**
 * Drop the player card ids the library no longer holds, on every load.
 *
 * A save can outlive the cards it names: the grey-card purge left old ids in
 * `knownCards` and `combatRewardCards`, and a trial set taken out of the
 * library would do the same. Dealing an unknown id throws in
 * `executeCard`. This is not a version hop: a save at the current version can
 * hold them too, so the load paths call it after `migrate`. A save whose
 * `knownCards` named cards and kept none falls back to the starting cards.
 * Returns `state` itself when nothing changes.
 */
export function dropUnknownCardIds(state: GameState): GameState {
    const player = state.player;
    if (!player || typeof player !== 'object') return state;
    const known = (id: string): boolean => getCardById(id) !== undefined;
    const knownCards = player.knownCards ?? [];
    const rewards = player.combatRewardCards;
    const keptKnown = knownCards.filter(known);
    const keptRewards = rewards?.filter(known);
    if (keptKnown.length === knownCards.length && keptRewards?.length === rewards?.length) {
        return state;
    }
    const nextKnown = keptKnown.length === 0 && knownCards.length > 0 ? [...STARTING_CARD_IDS] : keptKnown;
    return {
        ...state,
        player: {
            ...player,
            knownCards: nextKnown,
            ...(keptRewards !== undefined ? { combatRewardCards: keptRewards } : {}),
        },
    };
}

/** `GameState.flags` entries that no code reads; `dropRetiredFlags` removes them. */
const RETIRED_FLAGS: ReadonlySet<string> = new Set([
    'combat-tutorial-done',
    'hazard-tutorial-done',
    'blacksmith-tutorial-done',
    'night-watch-tutorial-done',
]);

/**
 * Drop the `RETIRED_FLAGS` entries from `state.flags`, on every load.
 *
 * Like `dropUnknownCardIds` this is not a version hop: a save at the current
 * version can still carry them, so the load paths call it after
 * `dropUnknownCardIds`. Returns `state` itself when nothing changes.
 */
export function dropRetiredFlags(state: GameState): GameState {
    const flags = state.flags;
    if (!Array.isArray(flags) || !flags.some(f => RETIRED_FLAGS.has(f))) return state;
    return { ...state, flags: flags.filter(f => !RETIRED_FLAGS.has(f)) };
}

/**
 * Narrow `raw` to a `GameState`. Only the top-level shape is checked — the
 * sub-modules trust their own invariants and the serialiser writes the full
 * shape. Adjust here as `GameState` gains required keys.
 */
function assertGameState(raw: unknown): GameState {
    const r = raw as Partial<GameState>;
    if (typeof r.version !== 'number'
        || typeof r.runId !== 'string'
        || r.player == null
        || r.world == null
        || r.quests == null
        || !Array.isArray(r.flags)
        || typeof r.rngState !== 'number'
        || r.codex == null
        || !Array.isArray(r.codex.unlockedEntries)
    ) {
        throw new Error('migrate: payload missing required GameState fields.');
    }
    return raw as GameState;
}
