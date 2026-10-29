/**
 * The empty waypoint on the map (phase NK1a, A3).
 *
 * A node with no event pool (the seven former gathering nodes) is not a fight:
 * it draws as a waypoint, with its own glyph, tag and tooltip, and walking onto
 * it never commits combat. Walks every Act 1 map's real pools.
 */

import { describe, it, expect } from '@jest/globals';
import { createStartingWorld, getNodeEventPool } from '@mechanics';

import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { createAppStore } from '@/state/store';
import {
    ACTION_ICON_BY_TYPE,
    NODE_KIND_LABEL,
    selectExplorationViewModel,
} from '@/state/presenters/exploration.engine';
import { selectTooltipContentFor } from '@/state/presenters/tooltip.engine';

const NO_STATE = {} as Parameters<typeof selectTooltipContentFor>[2];
const ACT_1_MAPS = ['breakwater', 'charcoal-wood', 'beacon-crags', 'lantern-deep'] as const;
const CONTINENT_OF = {
    'breakwater': 'coastal-continent',
    'charcoal-wood': 'coastal-continent',
    'beacon-crags': 'northern-continent',
    'lantern-deep': 'northern-continent',
} as const;

function nodesOf(map: (typeof ACT_1_MAPS)[number]) {
    const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: createStartingWorld(map) } });
    const vm = selectExplorationViewModel(store.getState());
    return vm.nodes.map((n) => ({ ...n, pooled: getNodeEventPool(CONTINENT_OF[map], map, n.id) !== undefined }));
}

describe('the empty waypoint on the map', () => {
    it('every node with no pool draws as a waypoint, and only those do', () => {
        const nodes = ACT_1_MAPS.flatMap((m) => nodesOf(m));
        const waypoints = nodes.filter((n) => n.type === 'waypoint').map((n) => n.id).sort();
        expect(waypoints).toEqual(['bc-7', 'bw-11', 'bw-4', 'cw-14', 'cw-4', 'cw-8', 'ld-7']);
        expect(nodes.filter((n) => (n.type === 'waypoint') === n.pooled).map((n) => n.id)).toEqual([]);
    });

    it('never commits combat', () => {
        for (const n of ACT_1_MAPS.flatMap((m) => nodesOf(m)).filter((x) => x.type === 'waypoint')) {
            expect(n.triggersCombat).toBe(false);
        }
    });

    it('wears its own glyph, tag and tooltip, not an encounter\'s', () => {
        expect(ACTION_ICON_BY_TYPE.waypoint).toBe('flee');
        expect(ACTION_ICON_BY_TYPE.waypoint).not.toBe(ACTION_ICON_BY_TYPE.encounter);
        expect(NODE_KIND_LABEL.waypoint).toBe('WAYPOINT');
        expect(selectTooltipContentFor('map-node', 'waypoint', NO_STATE)?.title).toBe('WAYPOINT');
    });
});
