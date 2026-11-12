/**
 * The removed story's node blurbs (177.12, A13): every node blurb of the
 * Charcoal Wood, the Beacon Crags and the Lantern Deep reads its place's
 * `[content] <place>.` placeholder, exactly.
 */

import { describe, expect, it } from '@jest/globals';
import { getMapLayout } from '../index';

describe('Chapters 2 to 4 node blurbs are placeholders', () => {
    for (const mapId of ['charcoal-wood', 'beacon-crags', 'lantern-deep'] as const) {
        it(`reads every ${mapId} blurb as its label in a placeholder`, () => {
            const layout = getMapLayout(mapId)!;
            expect(layout.nodes.length).toBeGreaterThan(0);
            for (const node of layout.nodes) {
                expect(node.description).toBe(`[content] ${node.label}.`);
            }
        });
    }

    it('reads two blurbs word for word', () => {
        expect(getMapLayout('charcoal-wood')!.nodes[0]!.description).toBe('[content] The River Bridge.');
        expect(getMapLayout('lantern-deep')!.nodes.find((n) => n.id === 'ld-15')!.description).toBe('[content] The Vault Door.');
    });
});
