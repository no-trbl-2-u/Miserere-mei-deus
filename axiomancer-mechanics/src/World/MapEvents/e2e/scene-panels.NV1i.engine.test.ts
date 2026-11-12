/**
 * NV1i (A10) - T's 22 approved Chapter 1 scenes play from the
 * Breakwater's scene slots, before each node's own event.
 *
 * The text itself, character for character against
 * `plan/ballots/narrator-chapter1.md`, is pinned by
 * `scripts/narrator-verdicts.test.mjs`. This file keeps the engine disk-free:
 * it plays each slot once and pins the panel counts and the chapter's two ends.
 */

import { describe, expect, it } from 'vitest';

import { BREAKWATER_CHAPTER_QUESTLINE_ID } from '../../breakwater-chapter.questline';
import { createMapState, createStartingWorld, getMapDefinition, getNodeScene, isBeforeScene, resolveMapEvent } from '../../index';
import { createNewGameState } from '../../../Game/game.reducer';
import type { GameState } from '../../../Game/types';
import { BW_NODE_SCENES } from '../content';

/** S-01 to S-22: the node each plays on, and how many panels the ledger gives it. */
const SCENES: ReadonlyArray<readonly [string, string, number]> = [
    ['S-01', 'bw-w1', 4], ['S-02', 'bw-w2', 2], ['S-03', 'bw-h1', 1], ['S-04', 'bw-h3', 2],
    ['S-05', 'bw-h4', 2], ['S-06', 'bw-h5', 2], ['S-07', 'bw-c0', 1], ['S-08', 'bw-c2', 4],
    ['S-09', 'bw-t2', 1], ['S-10', 'bw-t4', 3], ['S-11', 'bw-t6', 1], ['S-12', 'bw-l2', 2],
    ['S-13', 'bw-l3', 1], ['S-14', 'bw-l5', 3], ['S-15', 'bw-w5', 2], ['S-16', 'bw-k1', 3],
    ['S-17', 'bw-k2', 3], ['S-18', 'bw-d5', 1], ['S-19', 'bw-b1', 2], ['S-20', 'bw-p3', 1],
    ['S-21', 'bw-m5', 1], ['S-22', 'bw-b2', 3],
];

const breakwater = getMapDefinition('coastal-continent', 'breakwater');

function standingOn(nodeId: string): GameState {
    const base = createNewGameState();
    return { ...base, world: { ...base.world, currentMap: { ...createMapState(breakwater), currentNode: nodeId } } };
}

describe('the Breakwater plays the approved scenes (NV1i)', () => {
    it('holds exactly 22 slots, one per scene, on the nodes the ledger names', () => {
        expect(BW_NODE_SCENES.map((e) => e.nodeId).sort()).toEqual(SCENES.map(([, node]) => node).sort());
    });

    it.each(SCENES)(
        '%s plays on %s as %i panels before the node\'s own event, once',
        (_id, nodeId, count) => {
            const slot = getNodeScene('coastal-continent', 'breakwater', nodeId)!.before;
            const first = resolveMapEvent(standingOn(nodeId));
            expect(isBeforeScene(first.event)).toBe(true);
            expect(first.event).toMatchObject({ kind: 'cutscene', slot: 'before', lines: slot.lines });
            expect(slot.lines).toHaveLength(count);
            expect(first.state.world.currentMap.seenScenes).toContain(nodeId);
            expect(isBeforeScene(resolveMapEvent(first.state).event)).toBe(false);
            for (const line of slot.lines) {
                expect(line).not.toContain('[content]');
                expect(line).not.toContain('[NPC Content Needed]');
            }
        },
    );

    it('opens the chapter with the Keeper\'s telling and ends the chapter\'s road on the fire', () => {
        const opening = getNodeScene('coastal-continent', 'breakwater', 'bw-w1')!.before.lines;
        expect(opening[0]).toMatch(/^Before the roads there was one lamp over all this country\./);
        expect(opening[3]).toMatch(/^Ann Greave says, You are going down\./);
        const far = getNodeScene('coastal-continent', 'breakwater', 'bw-b2')!.before.lines;
        expect(far[2]).toMatch(/^I have seen it done on other coasts\./);
    });

    it('keeps no scene a description, as a resolved scene carries lines only', () => {
        for (const { nodeId } of BW_NODE_SCENES) {
            const payload = getNodeScene('coastal-continent', 'breakwater', nodeId)!.before;
            expect('description' in payload, nodeId).toBe(false);
        }
    });

    it('the windmill\'s scene gives the chain\'s first step, and no other scene gives one', () => {
        for (const { nodeId } of BW_NODE_SCENES) {
            const effect = getNodeScene('coastal-continent', 'breakwater', nodeId)!.before.effect;
            if (nodeId === 'bw-w1') {
                expect(effect).toEqual({ giveQuestStep: { questline: BREAKWATER_CHAPTER_QUESTLINE_ID, step: 1 } });
            } else expect(effect, nodeId).toBeUndefined();
        }
        const first = resolveMapEvent({ ...createNewGameState(), world: createStartingWorld() });
        expect(first.state.quests.active).toHaveLength(1);
        expect(first.state.quests.active[0]).toMatchObject({ questline: BREAKWATER_CHAPTER_QUESTLINE_ID, step: 1 });
    });
});
