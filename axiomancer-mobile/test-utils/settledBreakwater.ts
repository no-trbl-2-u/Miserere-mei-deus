/**
 * Test-only: a new Breakwater with its questline's quest nodes settled.
 *
 * The Breakwater puts every fight and hazard in a pocket behind its quest
 * marker (QL1d). A test that is not about the questline but needs a fight
 * or a hazard starts here: the four markers are spent and their locks are
 * open (the engine's `settleQuestNodes`), so every pocket, and the
 * watchtower, is on the frontier from the windmill. The quest log is
 * untouched.
 */

import { createStartingWorld, settleQuestNodes, type WorldState } from '@mechanics';

export function settledBreakwater(): WorldState {
    const world = createStartingWorld('breakwater');
    return { ...world, currentMap: settleQuestNodes(world.currentMap) };
}
