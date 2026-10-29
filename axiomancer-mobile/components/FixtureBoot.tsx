/**
 * Honour a booted fixture's `arrive` intent.
 *
 * When the app booted from a `StateFixture` whose `arrive` is true, fire
 * the current node's authored event once — exactly what walking onto the
 * node would do — so state-gated screens (`/dialogue`, `/village`,
 * `/cutscene`, `/event`, the minigame gates) open cold from a URL or a
 * Playwright init script. The CLI twin is `--resolve-start`.
 *
 * Waits for the navigation container to be ready before firing so
 * `<EventGate>`'s push is never lost to an unready `navigationRef`.
 * Stands down when something else already produced an event or a
 * minigame session (the exploration screen's own start-node arrival,
 * for one) — a second resolve would find the node consumed, clear the
 * event slice, and bounce the gated screen straight back out.
 *
 * Renders null; no-op on a normal boot.
 */

import { useEffect, useRef } from 'react';

import { navigationRef } from '@/lib/platform/router';
import { getBootFixture } from '@/state/fixtures';
import { seatDialogue } from '@/state/dev/story-catalog';
import { useGameActions, useGameStore } from '@/state/GameStoreProvider';
import { selectHasActiveEvent } from '@/state/presenters/event.engine';

/** Poll cadence + budget for navigation readiness (2 s total). */
const READY_POLL_MS = 50;
const READY_POLL_MAX = 40;

/** True when a paced event or a minigame session is already live. */
function somethingAlreadyArrived(state: ReturnType<ReturnType<typeof useGameStore>['getState']>): boolean {
    return selectHasActiveEvent(state)
        || state.hazard.session !== null
        || state.rest.session !== null
        || state.cache.session !== null
        || state.blacksmith.session !== null;
}

export function FixtureBoot() {
    const actions = useGameActions();
    const store = useGameStore();
    const fired = useRef(false);

    useEffect(() => {
        const boot = getBootFixture();
        if (!boot?.fixture.arrive || fired.current) return;
        let attempts = 0;
        let timer: ReturnType<typeof setTimeout> | null = null;
        const tryFire = () => {
            if (fired.current) return;
            if (navigationRef.isReady() || attempts >= READY_POLL_MAX) {
                fired.current = true;
                if (somethingAlreadyArrived(store.getState())) return;
                // No map event opens a dialogue: a staged tree is seated, not resolved.
                if (boot.fixture.stagedDialogue) seatDialogue(store, boot.fixture.stagedDialogue);
                else actions.resolveCurrentMapEvent(undefined, boot.fixture.stagedEvent);
                return;
            }
            attempts += 1;
            timer = setTimeout(tryFire, READY_POLL_MS);
        };
        tryFire();
        return () => {
            if (timer !== null) clearTimeout(timer);
        };
    }, [actions, store]);

    return null;
}
