/**
 * `resolvePastScene` - answer the arrival on the node underfoot the way a
 * player does when the node has a scene in its slot: the scene
 * resolves first, tapping through it (`continueToNode`) resolves the node's
 * own event. A node with no scene (or a scene already seen) resolves once,
 * as `resolveCurrentMapEvent` does.
 *
 * The Breakwater's 22 approved scenes sit on 22 nodes, so a
 * test that walks to one of them and wants its own event goes through this.
 */

import { isBeforeScene } from '@mechanics';

interface SceneStore {
    getState: () => { event?: { pending?: { event: Parameters<typeof isBeforeScene>[0] } | null } | null };
}

interface SceneActions {
    resolveCurrentMapEvent: (sourceNodeType?: string) => boolean;
    continueToNode: () => boolean;
}

export function resolvePastScene(store: SceneStore, actions: SceneActions, sourceNodeType?: string): boolean {
    const resolved = actions.resolveCurrentMapEvent(sourceNodeType);
    const event = store.getState().event?.pending?.event;
    if (event && isBeforeScene(event)) return actions.continueToNode();
    return resolved;
}
