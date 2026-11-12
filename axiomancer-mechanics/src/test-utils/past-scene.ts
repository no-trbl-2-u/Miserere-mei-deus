/**
 * `resolvePastScene` - answer an arrival the way a player does when the node
 * has a scene in its slot: play the scene, then resolve the node's
 * own event. A node with no scene (or whose scene was already seen) resolves
 * once, as `resolveMapEvent` does.
 *
 * The Breakwater's 22 approved scenes (177.9) sit on 22 nodes, so a test that
 * walks the roads and wants the node's own event goes through this.
 */

import { isBeforeScene, resolveMapEvent } from '../World/MapEvents/resolve-map-event';

export function resolvePastScene(...args: Parameters<typeof resolveMapEvent>): ReturnType<typeof resolveMapEvent> {
    const first = resolveMapEvent(...args);
    if (!isBeforeScene(first.event)) return first;
    const [, ...rest] = args;
    return resolveMapEvent(first.state, ...rest);
}
