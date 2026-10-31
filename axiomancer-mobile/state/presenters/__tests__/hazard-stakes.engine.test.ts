import { describe, expect, it } from '@jest/globals';

import { createMapState, getMapDefinition } from '@mechanics';
import { HAZARD_STAKES_CTA, selectHazardStakes } from '../hazard-stakes.engine';

function stateAt(nodeId: string, hazardId = 'cracked-cliff') {
    const map = createMapState(getMapDefinition('coastal-continent', 'breakwater'));
    return {
        hazard: { session: { hazardId } },
        world: { currentMap: { ...map, currentNode: nodeId } },
    } as never;
}

const line = (vm: NonNullable<ReturnType<typeof selectHazardStakes>>, key: string) =>
    vm.lines.find((l) => l.key === key);

describe('the hazard stakes card', () => {
    it('H4, the wreck, names its place and the road it opens', () => {
        const vm = selectHazardStakes(stateAt('bw-h4'));
        expect(vm).not.toBeNull();
        expect(vm!.place).toBe('The wreck');
        expect(vm!.kindLine).toBe('Hazard · holds the road');
        expect(line(vm!, 'opens')).toEqual({ key: 'opens', label: 'Opens', values: ['the road to Moored ship'] });
        expect(vm!.cta).toBe(HAZARD_STAKES_CTA);
        expect(vm!.cta).toBe('Face it');
    });

    it('T5, a plain hazard, is plain: no held road, no Opens line', () => {
        const vm = selectHazardStakes(stateAt('bw-t5'));
        expect(vm!.place).toBe('Back lanes');
        expect(vm!.kindLine).toBe('Hazard');
        expect(line(vm!, 'opens')).toBeUndefined();
    });

    it('states failing costs, clearing pay and routes as the engine has them', () => {
        const vm = selectHazardStakes(stateAt('bw-t5'))!;
        const fail = line(vm, 'fail')!.values.join(' | ');
        expect(fail).toMatch(/−2 VITAE per lost round/);
        expect(fail).toMatch(/−4 VITAE per lost round/);
        expect(line(vm, 'clear')!.values.join(' | ')).toMatch(/Normal reward/);
        expect(line(vm, 'routes')!.values).toHaveLength(2);
    });

    it('falls back to the hazard title off the Breakwater, and is null with no session', () => {
        const off = { hazard: { session: { hazardId: 'cracked-cliff' } }, world: { currentMap: null } } as never;
        expect(selectHazardStakes(off)!.place).toBeTruthy();
        expect(selectHazardStakes({ hazard: { session: null }, world: null } as never)).toBeNull();
    });
});
