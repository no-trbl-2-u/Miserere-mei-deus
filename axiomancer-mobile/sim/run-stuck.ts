/**
 * The driver's bug detector (phase SM1e, A9): a step with no legal move throws
 * a `RunStuckError` naming the node and the state, never a grade.
 */

import type { AppStoreState } from '@/state/store';

/** What the run looked like when it stuck. */
export interface RunStuckState {
    readonly map: string;
    readonly node: string;
    readonly health: number;
    readonly maxHealth: number;
    readonly level: number;
    /** The open screen, as the driver saw it (`event:encounter`, `rest:offer`, `map`, …). */
    readonly screen: string;
    readonly step: number;
}

/** Thrown when a run reaches a step with no legal move. */
export class RunStuckError extends Error {
    readonly node: string;
    readonly state: RunStuckState;

    constructor(reason: string, state: RunStuckState) {
        super(
            `run stuck at ${state.map}/${state.node} (step ${state.step}, screen ${state.screen}, ` +
            `VITAE ${state.health}/${state.maxHealth}, level ${state.level}): ${reason}`,
        );
        this.name = 'RunStuckError';
        this.node = state.node;
        this.state = state;
    }
}

/** The open screen a store state shows, in the driver's words. */
export function describeScreen(s: AppStoreState): string {
    if ((s.itemReward?.queue.length ?? 0) > 0) return 'item-reward';
    if (s.hazard?.puzzle) return `hazard:puzzle-${s.hazard.puzzle.claim ? 'claimed' : s.hazard.puzzle.nodeId}`;
    if (s.hazard?.session) return `hazard:${s.hazard.session.phase}`;
    if (s.rest?.session) return `rest:${s.rest.session.phase}`;
    if (s.cache?.session) return `cache:${s.cache.session.phase}`;
    if (s.blacksmith?.session) return 'blacksmith';
    if (s.quest?.open) return 'quest';
    if (s.travel?.open) return 'travel';
    if (s.labyrinthUi?.session) return 'labyrinth';
    if (s.event?.pending) return `event:${s.event.pending.event.kind}`;
    if (s.currentEncounter) return 'fight';
    return 'map';
}

/** Build a stuck error from the store's current state. */
export function stuck(reason: string, s: AppStoreState, step: number): RunStuckError {
    return new RunStuckError(reason, {
        map: s.world?.currentMap?.name ?? '?',
        node: s.world?.currentMap?.currentNode ?? '?',
        health: s.player?.health ?? 0,
        maxHealth: s.player?.maxHealth ?? 0,
        level: s.player?.level ?? 0,
        screen: describeScreen(s),
        step,
    });
}
