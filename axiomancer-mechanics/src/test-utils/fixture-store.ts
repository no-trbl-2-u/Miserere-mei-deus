/**
 * Hermetic test helper — boot a `createGameStore` from a state fixture.
 *
 * The engine twin of mobile's `test-utils/fixtureStore.ts`. Replaces the
 * hand-built `createGameStore(nullAdapter, { player, world: … })` setup
 * with a declarative fixture (registry id or inline document), so a test
 * reads as "a Sage on bw-t4" rather than twenty lines of state surgery.
 *
 * Deterministic: every registry fixture carries a seed; an inline
 * fixture should too. Hermetic: `nullAdapter` by default (no disk).
 *
 * Functions:
 *   resolveFixture(ref)                 id → registry entry / object → validated
 *   createFixtureGameStore(ref, opts)   { store, state, fixture }
 */

import { createGameStore } from '../Game/store';
import { createEventEmitter } from '../Game/events';
import { nullAdapter } from '../Game/persistence/null.adapter';
import type { PersistenceAdapter } from '../Game/persistence/types';
import type { GameEventEmitter } from '../Game/events';
import type { GameState } from '../Game/types';
import {
    buildStateFromFixture, getStateFixtureById, listStateFixtureIds, validateStateFixture,
} from '../Game/fixtures';
import type { StateFixture } from '../Game/fixtures';

export interface FixtureGameStoreOptions {
    /** Defaults to `nullAdapter` (hermetic). */
    adapter?: PersistenceAdapter;
    /** Defaults to a fresh emitter so event-driven assertions work. */
    emitter?: GameEventEmitter;
}

/** A registry id or an inline fixture document. */
export type FixtureRef = string | StateFixture;

/** Registry lookup (throws with the known ids) or inline validation. */
export function resolveFixture(ref: FixtureRef): StateFixture {
    if (typeof ref !== 'string') return validateStateFixture(ref);
    const fixture = getStateFixtureById(ref);
    if (!fixture) {
        throw new Error(`resolveFixture: unknown state fixture '${ref}'. Known ids: ${listStateFixtureIds().join(', ')}.`);
    }
    return fixture;
}

/** Compile `ref` and boot a store from it as full overrides. */
export function createFixtureGameStore(ref: FixtureRef, options: FixtureGameStoreOptions = {}) {
    const fixture = resolveFixture(ref);
    const state: GameState = buildStateFromFixture(fixture);
    const emitter = options.emitter ?? createEventEmitter();
    const store = createGameStore(options.adapter ?? nullAdapter, state, emitter);
    return { store, state, fixture, emitter };
}
