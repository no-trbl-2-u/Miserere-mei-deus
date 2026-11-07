/**
 * Every dialogue offers a way out among its choices.
 *
 * The dialogue screen no longer draws a separate "walk away" row, so
 * the only exit is a choice that ends the conversation (one with no
 * `nextNodeId`). A node that is a dead end (no choices) or whose choices all
 * loop or sit behind a gate strands the player. This walks every dialogue tree
 * in play (the live rosters plus the fixture trees) and fails any node that
 * cannot reach an ungated ending choice.
 */

import { describe, it, expect } from 'vitest';

import { FIXTURE_NPC } from '../../Game/fixtures/fixture-content';
import { LONG_START_DIALOGUE } from '../../Game/fixtures/quest-chain-long.fixture';
import { collectRosterSources, dialogueTrees } from '../../World/roster-health';
import type { DialogueTree } from '../types';

/** Node ids (reachable from the root) with no route to an ungated ending. */
export function stuckNodes(tree: DialogueTree): string[] {
    // A choice with a `requires` gate may be hidden, so it cannot be the way out.
    const open = (id: string) => (tree.nodes[id]?.choices ?? []).filter(c => c.requires === undefined);
    const canLeave = new Set<string>();
    let grew = true;
    while (grew) {
        grew = false;
        for (const id of Object.keys(tree.nodes)) {
            if (canLeave.has(id)) continue;
            if (open(id).some(c => c.nextNodeId === undefined || canLeave.has(c.nextNodeId))) {
                canLeave.add(id);
                grew = true;
            }
        }
    }
    const reached = new Set<string>();
    const queue = [tree.rootId];
    while (queue.length > 0) {
        const id = queue.pop()!;
        if (reached.has(id)) continue;
        reached.add(id);
        for (const c of tree.nodes[id]?.choices ?? []) if (c.nextNodeId !== undefined) queue.push(c.nextNodeId);
    }
    return [...reached].filter(id => !canLeave.has(id));
}

const IN_PLAY: Array<{ tree: DialogueTree; where: string }> = [
    ...dialogueTrees(collectRosterSources()),
    { tree: FIXTURE_NPC.dialogueTree!, where: 'fixture-npc' },
    { tree: LONG_START_DIALOGUE, where: 'long-start' },
];

describe('dialogue exits', () => {
    it('has trees to check', () => {
        expect(IN_PLAY.length).toBeGreaterThan(0);
    });

    it.each(IN_PLAY.map(t => [t.where, t.tree] as const))('%s: every node can reach an ending choice', (_where, tree) => {
        expect(stuckNodes(tree)).toEqual([]);
    });

    it('flags a closing node with no choices', () => {
        const tree: DialogueTree = {
            rootId: 'a',
            nodes: {
                a: { id: 'a', text: 'x', choices: [{ text: 'Go on.', nextNodeId: 'b' }] },
                b: { id: 'b', text: 'y' },
            },
        };
        expect(stuckNodes(tree)).toEqual(['a', 'b']);
    });

    it('flags a node whose only ending is gated', () => {
        const tree: DialogueTree = {
            rootId: 'a',
            nodes: { a: { id: 'a', text: 'x', choices: [{ text: 'Leave.', requires: { flag: 'f' } }] } },
        };
        expect(stuckNodes(tree)).toEqual(['a']);
    });
});
