/**
 * Hazard presenter — cost cards on the board. A staged cost is counted in
 * the projected meters, a total below zero reads as a debt (never clamped
 * to zero), and the printed and spoken numbers carry a true minus sign.
 * One card per cost direction: a Toll (TURN THE STONES, cost on the free
 * line only), a Debt (PAWNED BREATH, cost on both lines) and an Overdrive
 * (BREAKNECK HAUL, the cost grows when powered).
 */

import { describe, expect, it } from '@jest/globals';

import {
    createHazardSession,
    finishHazardRolling,
    hazardStarterBag,
    powerHazardCard,
    selectHazardRoute,
    stageHazardCard,
} from '@mechanics';
import type { HazardSessionState } from '@mechanics';
import {
    hazardMeterSpokenLabel,
    hazardSignedNumber,
    hazardStagedValueLabel,
    hazardStatPairLabel,
    selectHazardViewModel,
} from '@/state/presenters/hazard.engine';

type HazardDie = HazardSessionState['dice'][number];

const BAG = hazardStarterBag();
const MINUS = '−';

function vmOf(session: HazardSessionState) {
    return selectHazardViewModel({ hazard: { session } });
}

/** A playing round holding exactly `cardIds` in hand and `dice` on the tray, with no momentum. */
function boardWith(route: 'safe' | 'risk', cardIds: string[], dice: HazardDie[] = []): HazardSessionState {
    const s = finishHazardRolling(selectHazardRoute(createHazardSession(7, BAG, 'cracked-cliff'), route, BAG));
    return {
        ...s,
        hand: cardIds.map((cardId, i) => ({ uid: `c${i}`, cardId, dieId: null })),
        play: [],
        dice,
        progressBase: { force: 0, escape: 0 },
    };
}

describe('hazardSignedNumber', () => {
    it('prints a cost with a true minus sign and leaves gains and zero bare', () => {
        expect(hazardSignedNumber(-2)).toBe(`${MINUS}2`);
        expect(hazardSignedNumber(0)).toBe('0');
        expect(hazardSignedNumber(3)).toBe('3');
    });

    it('announces a cost pair with its minus sign', () => {
        expect(hazardStatPairLabel(-2, 0)).toBe(`FORCE ${MINUS}2, ESCAPE 0`);
    });
});

describe('hazard presenter — a Toll staged and powered', () => {
    it('in hand: the free line prints the cost, the meter is untouched', () => {
        const vm = vmOf(boardWith('safe', ['stones']));
        expect(vm.hand[0].free).toEqual({ force: -2, escape: 0 });
        expect(vm.hand[0].powered).toEqual({ force: 2, escape: 0 });
        expect(vm.meters[0].value).toBe(0);
        expect(vm.meters[0].debt).toBe(false);
    });

    it('staged without a die: the projected meter shows a debt, not zero', () => {
        const s = stageHazardCard(boardWith('safe', ['stones']), 'c0', BAG);
        const vm = vmOf(s);
        const meter = vm.meters[0];
        expect(meter.value).toBe(-2);
        expect(meter.debt).toBe(true);
        expect(meter.valueLabel).toBe(`${MINUS}2`);
        expect(meter.met).toBe(false);
        expect(vm.meterDetail).toBe(`FORCE ${MINUS}2 · ESCAPE 0 — either type counts`);
        expect(hazardMeterSpokenLabel(meter)).toBe(
            `PASSAGE — FORCE + ESCAPE progress: debt of 2, goal ${meter.need} - not yet met`,
        );
        expect(hazardStagedValueLabel(vm.play[0])).toBe(`Counts ${MINUS}2 force, 0 escape.`);
    });

    it('powered by a red die: the die cancels the toll and the meter climbs out of debt', () => {
        let s = stageHazardCard(boardWith('safe', ['stones'], [{ id: 'd1', kind: 'red', state: 'available' }]), 'c0', BAG);
        s = powerHazardCard(s, 'c0', 'd1', BAG);
        const vm = vmOf(s);
        expect(vm.meters[0].value).toBe(2);
        expect(vm.meters[0].debt).toBe(false);
        expect(vm.meters[0].valueLabel).toBe('2');
        expect(hazardStagedValueLabel(vm.play[0])).toBe('Counts 2 force, 0 escape.');
    });

    it('sums a staged cost with a staged gain in the projection', () => {
        let s = boardWith('safe', ['stones', 'haul']);
        s = stageHazardCard(stageHazardCard(s, 'c0', BAG), 'c1', BAG);
        // DEAD-MAN HAUL free 3 FORCE, TURN THE STONES free -2 FORCE.
        expect(vmOf(s).meters[0].value).toBe(1);
    });
});

describe('hazard presenter — a Debt on both lines', () => {
    it('staged and powered, PAWNED BREATH still owes on both risk meters', () => {
        let s = stageHazardCard(boardWith('risk', ['pawn'], [{ id: 'd1', kind: 'purple', state: 'available' }]), 'c0', BAG);
        const staged = vmOf(s);
        expect(staged.meters.map((m) => m.value)).toEqual([-2, -2]);
        expect(staged.meters.every((m) => m.debt)).toBe(true);
        s = powerHazardCard(s, 'c0', 'd1', BAG);
        const powered = vmOf(s);
        expect(powered.meters.map((m) => m.valueLabel)).toEqual([`${MINUS}2`, `${MINUS}2`]);
        expect(powered.meters.every((m) => m.debt)).toBe(true);
    });
});

describe('hazard presenter — an Overdrive', () => {
    it('BREAKNECK HAUL free costs 1 ESCAPE; powered it costs 3 while FORCE climbs', () => {
        let s = stageHazardCard(boardWith('risk', ['breakneck'], [{ id: 'd1', kind: 'red', state: 'available' }]), 'c0', BAG);
        const free = vmOf(s);
        expect(free.meters.map((m) => [m.key, m.value, m.debt])).toEqual([
            ['force', 3, false],
            ['escape', -1, true],
        ]);
        s = powerHazardCard(s, 'c0', 'd1', BAG);
        const powered = vmOf(s);
        expect(powered.meters.map((m) => [m.key, m.value, m.debt])).toEqual([
            ['force', 6, false],
            ['escape', -3, true],
        ]);
        expect(hazardStagedValueLabel(powered.play[0])).toBe(`Counts 6 force, ${MINUS}3 escape.`);
    });
});
