/**
 * ET1a: the Breakwater's encounter arrival lines and tier reads.
 */
import { describe, it, expect } from 'vitest';
import {
    BREAKWATER_ARRIVAL_LINES, BREAKWATER_ENCOUNTER_NODES, arrivalLineAt, breakwaterEncounterTier, heldRoadPlaceAt,
} from '../arrival-lines';

describe('ET1a: arrival lines', () => {
    it('holds a line for each of the 18 Breakwater encounter nodes', () => {
        expect(BREAKWATER_ENCOUNTER_NODES).toHaveLength(18);
        for (const id of BREAKWATER_ENCOUNTER_NODES) {
            expect(BREAKWATER_ARRIVAL_LINES[id], id).toBeTruthy();
            expect(BREAKWATER_ARRIVAL_LINES[id]).toMatch(/^\[content\]/);
        }
    });

    it('gives a node with no line none', () => {
        expect(arrivalLineAt('bw-w1')).toBeUndefined();
        expect(arrivalLineAt('bw-h4')).toBeUndefined();
        expect(arrivalLineAt(undefined)).toBeUndefined();
    });
});

describe('ET1a: tier reads', () => {
    it('reads the elites, the boss and a plain fight from the node list', () => {
        expect(breakwaterEncounterTier('bw-w5')).toBe('elite');
        expect(breakwaterEncounterTier('bw-c1')).toBe('elite');
        expect(breakwaterEncounterTier('bw-l4')).toBe('elite');
        expect(breakwaterEncounterTier('bw-k2')).toBe('boss');
        expect(breakwaterEncounterTier('bw-w2')).toBe('fight');
        expect(breakwaterEncounterTier('bw-h4')).toBeUndefined();
    });

    it('names the place each elite holds the road to', () => {
        expect(heldRoadPlaceAt('bw-w5')).toBe('Keep gate');
        expect(heldRoadPlaceAt('bw-c1')).toBe("Fishermen's camp");
        expect(heldRoadPlaceAt('bw-l4')).toBe('Lighthouse');
        expect(heldRoadPlaceAt('bw-w2')).toBeUndefined();
        expect(heldRoadPlaceAt('bw-k2')).toBeUndefined();
    });
});
