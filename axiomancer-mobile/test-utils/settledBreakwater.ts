/**
 * Test-only: a new Breakwater with its questline's quest nodes settled.
 *
 * The Breakwater puts every fight and hazard in a pocket behind its quest
 * marker (QL1d). A test that is not about the questline but needs a fight
 * or a hazard starts here: the four markers are spent and their locks are
 * open (the engine's `settleQuestNodes`). The quest log is untouched.
 *
 * The player walks the roads (phase WR1a): a pocket's fights are a road away
 * only from its marker, so `standingOn` stands the player there (marker 2,
 * `bw-20`, has the fights `bw-2`, `bw-10` and `bw-14` a road away). Omitted,
 * the player stands on the windmill.
 */

import { createStartingWorld, settleQuestNodes, syncMoveLists, type WorldState } from '@mechanics';

export function settledBreakwater(standingOn?: string): WorldState {
    const world = createStartingWorld('breakwater');
    const settled = settleQuestNodes(world.currentMap);
    const currentMap = standingOn === undefined ? settled : syncMoveLists({ ...settled, currentNode: standingOn });
    return { ...world, currentMap };
}
