/**
 * Test-only: a new Breakwater a test can fight on without playing the chain.
 *
 * The Breakwater's Chapter 1 chain (phase BW1a) holds two quest gates (the
 * keep gate bw-k1 -> bw-k2, the river bridge bw-b1 -> bw-b2) and its quest
 * nodes (bw-w1, bw-c2, bw-l5, bw-k1) refuse or offer steps on arrival. A test
 * that is not about the chain starts here: the quest nodes are spent and both
 * gates are open (the engine's `settleQuestNodes`). The quest log is
 * untouched, and the held nodes (the wreck bw-h4, the elites bw-c1, bw-l4,
 * bw-w5) still hold their far roads: a test that needs a node past one marks
 * that held node completed itself.
 *
 * The player walks the roads (phase WR1a): `standingOn` stands the player on
 * that node (bw-k1 has the chapter boss bw-k2 a road away). Omitted, the
 * player stands on the windmill (bw-w1), the first fight bw-w2 a road away.
 */

import { createStartingWorld, settleQuestNodes, syncMoveLists, type WorldState } from '@mechanics';

export function settledBreakwater(standingOn?: string): WorldState {
    const world = createStartingWorld('breakwater');
    const settled = settleQuestNodes(world.currentMap);
    const currentMap = standingOn === undefined ? settled : syncMoveLists({ ...settled, currentNode: standingOn });
    return { ...world, currentMap };
}
