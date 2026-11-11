/**
 * ET1a: the reveal's tier frame, by the node the fight was walked to.
 */
import { describe, expect, it } from '@jest/globals';

import { buildRevealFrame, buildRevealVM } from './encounter-reveal.engine';

describe('buildRevealVM', () => {
    const foe = { name: 'Quay Crab', level: 3, hp: 42 };

    it('gives a normal fight its numbers and no chip', () => {
        expect(buildRevealVM('bw-w2', foe)).toEqual({
            tier: 'fight', name: 'Quay Crab', level: 3, vitae: 42, chip: null, bossCard: null,
        });
    });

    it('chips an elite ELITE', () => {
        const v = buildRevealVM('bw-w5', foe);
        expect(v.tier).toBe('elite');
        expect(v.chip).toBe('ELITE');
        expect(v.bossCard).toBeNull();
    });

    it('carries the boss card with its place and no chip', () => {
        const v = buildRevealVM('bw-k2', foe);
        expect(v.tier).toBe('boss');
        expect(v.chip).toBeNull();
        expect(v.bossCard).toEqual({ place: 'Sea keep', subtitle: 'Chapter 1 boss' });
    });

    it('reads a node off the chapter as a plain fight', () => {
        for (const id of ['mw-3', undefined]) {
            expect(buildRevealVM(id, foe)).toMatchObject({ tier: 'fight', chip: null, bossCard: null, level: 3, vitae: 42 });
        }
    });
});

describe('buildRevealFrame', () => {
    it('leaves a normal fight as it was, with its arrival line', () => {
        const f = buildRevealFrame('bw-w2');
        expect(f.tier).toBe('fight');
        expect(f.heldLine).toBeNull();
        expect(f.bossCard).toBeNull();
        expect(f.arrivalLine).toMatch(/^\[content\]/);
    });

    it.each([
        ['bw-w5', 'Keep gate'],
        ['bw-c1', "Fishermen's camp"],
        ['bw-l4', 'Lighthouse'],
    ])('frames the elite %s with the road it holds', (node, place) => {
        const f = buildRevealFrame(node);
        expect(f.tier).toBe('elite');
        expect(f.heldLine).toBe(`Holds the road to ${place}`);
        expect(f.bossCard).toBeNull();
        expect(f.arrivalLine).not.toBeNull();
    });

    it('holds the boss behind a title card', () => {
        const f = buildRevealFrame('bw-k2');
        expect(f.tier).toBe('boss');
        expect(f.bossCard).toEqual({ place: 'Sea keep', subtitle: 'Chapter 1 boss' });
        expect(f.heldLine).toBeNull();
    });

    it('reads a node off the chapter, or no node, as a plain fight with no line', () => {
        for (const id of ['mw-3', undefined]) {
            const f = buildRevealFrame(id);
            expect(f).toMatchObject({ tier: 'fight', arrivalLine: null, heldLine: null, bossCard: null });
        }
    });
});
