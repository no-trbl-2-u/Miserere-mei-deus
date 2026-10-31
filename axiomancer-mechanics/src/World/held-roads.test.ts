import { describe, expect, it } from 'vitest';
import { getMapDefinition } from './map.registry';
import { heldRoadPlaces, heldRoadTargets, nodePlace } from './held-roads';
import { isRoadHeld } from './roads';
import { BREAKWATER_CHAPTER_HELD } from './Continents/Coastal-Village/breakwater-chapter';

const def = getMapDefinition('coastal-continent', 'breakwater');

describe('held roads', () => {
    it('names the node beyond the wreck', () => {
        expect(heldRoadTargets(def, 'bw-h4')).toEqual(['bw-h5']);
        expect(heldRoadPlaces(def, 'bw-h4')).toEqual(['Moored ship']);
    });

    it('holds nothing at a plain hazard', () => {
        expect(heldRoadTargets(def, 'bw-t5')).toEqual([]);
        expect(heldRoadPlaces(def, 'bw-t5')).toEqual([]);
    });

    it('every held node leads somewhere with a place name', () => {
        for (const id of BREAKWATER_CHAPTER_HELD) expect(heldRoadPlaces(def, id).length).toBeGreaterThan(0);
        expect(nodePlace('bw-h4')).toBe('The wreck');
        expect(nodePlace('nowhere')).toBeNull();
    });

    it('agrees with the road rule: the wreck holds its far road until spent', () => {
        const fresh = { currentNode: 'bw-h4', completedNodes: [], consumedNodes: [], blockedRoutes: [] };
        expect(isRoadHeld(def, fresh, 'bw-h4', 'bw-h5')).toBe(true);
        expect(isRoadHeld(def, { ...fresh, consumedNodes: ['bw-h4'] }, 'bw-h4', 'bw-h5')).toBe(false);
    });
});
