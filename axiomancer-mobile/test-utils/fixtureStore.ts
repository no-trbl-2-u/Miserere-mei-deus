/**
 * Hermetic test helper — boot an app store from a state fixture.
 *
 * Replaces hand-built `store.setState({ world: …, player: … })` seating
 * with a declarative fixture (registry id or inline document), the same
 * documents the CLI's `--fixture` flag and the web `?fixture=` deep link
 * boot from. A test then reads as "a Wanderer on bw-w2" instead of a
 * `createMapState` + spread dance, and cannot drift from what the app
 * itself would boot.
 *
 * Hermetic: `createMemoryAdapter` by default (in-memory, `saveCount`
 * tracked); deterministic when the fixture carries `seed` (every registry
 * entry does — give inline fixtures one too).
 *
 * Functions:
 *   createFixtureStore(ref, opts)   { store, actions, adapter, state, fixture }
 *   arriveFromFixture(handle)       fire the current node's event (what
 *                                   `<FixtureBoot>` does when `arrive` is set)
 */

import {
    buildStateFromFixture,
    type GameState,
    type StateFixture,
} from '@mechanics';

import { createAppActions, type AppActions } from '@/state/actions';
import { resolveFixtureRequest } from '@/state/fixtures';
import { seatDialogue } from '@/state/dev/story-catalog';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter, type MemoryAdapter } from '@/test-utils/memoryAdapter';

/** A registry id or an inline fixture document. */
export type FixtureRef = string | StateFixture;

export interface FixtureStoreOptions {
    /**
     * Supply your own adapter to assert on `saveCount`; the fixture state
     * is written into it once (counts as one save) before boot. Defaults
     * to `createMemoryAdapter(state)` (saveCount 0).
     */
    adapter?: MemoryAdapter;
}

export interface FixtureStoreHandle {
    readonly store: AppStore;
    readonly actions: AppActions;
    readonly adapter: MemoryAdapter;
    /** The compiled engine state the store booted from. */
    readonly state: GameState;
    readonly fixture: StateFixture;
}

/** Compile `ref` and boot an app store whose adapter loads that state. */
export function createFixtureStore(ref: FixtureRef, options: FixtureStoreOptions = {}): FixtureStoreHandle {
    const fixture = resolveFixtureRequest({ source: 'global', ref });
    const state = buildStateFromFixture(fixture);
    const adapter = options.adapter ?? createMemoryAdapter(state);
    if (options.adapter) options.adapter.save(state);
    const store = createAppStore({ adapter });
    return { store, actions: createAppActions(store), adapter, state, fixture };
}

/**
 * Resolve the current node's authored event — the `arrive` step the app
 * performs in `<FixtureBoot>`. Returns the action's own boolean (true when
 * an event other than `none` resolved).
 */
export function arriveFromFixture(handle: FixtureStoreHandle): boolean {
    if (handle.fixture.stagedDialogue) {
        seatDialogue(handle.store, handle.fixture.stagedDialogue);
        return true;
    }
    return handle.actions.resolveCurrentMapEvent(undefined, handle.fixture.stagedEvent);
}
