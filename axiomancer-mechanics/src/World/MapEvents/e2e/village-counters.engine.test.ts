/**
 * MapEvents 'village' kind, its counters — hermetic dispatcher coverage.
 * NK1c adds the paid rest and the card shop beside the Anvil (their parts
 * close the file). A village may carry an `anvil` counter of variant-gear offers;
 * the handler is a validated pass-through (the anvil session is fully
 * sandboxed) that touches no state and rejects illegal (cap-violating) variant
 * gear at resolution time.
 *
 * Also pins where the Anvil lives in play: one village per Act 1 region, near
 * its exit — `ACT1_ANVIL_NODES` (bw-16, cw-18, bc-12, ld-14) — and that
 * `blacksmith` is no longer a map-event kind.
 */

import { describe, expect, it } from 'vitest';

import { createNewGameState } from '../../../Game/game.reducer';
import { applyPayload, resolveVillage } from '../handlers';
import { resolveMapEvent, getNodePrimaryEventKind } from '../resolve-map-event';
import { ACT1_ANVIL_NODES } from '../content';
import { MAP_REGISTRY, createMapState } from '../../map.registry';
import { BLACKSMITH_WITNESS_VARIANTS, HEART_RICH_PAYLOAD_VARIANT } from '../../Blacksmith/blacksmith.content';
import type { VillagePayload } from '../types';
import type { MapDefinition } from '../../types';
import type { GameState } from '../../../Game/types';
import {
    FRESH_VILLAGE_VISIT, VILLAGE_TUNING, restAtVillage, villageCardShopFor, villageRestQuote,
} from '../../Village';

const PAYLOAD: VillagePayload = {
    kind: 'village',
    villageName: 'Smithy',
    anvil: { variants: [HEART_RICH_PAYLOAD_VARIANT] },
};

describe("MapEvents 'village' kind, the Anvil counter", () => {
    it('resolves to the authored counter without touching state', () => {
        const state = createNewGameState();
        const result = resolveVillage(state, PAYLOAD);
        expect(result.state).toBe(state);
        expect(result.event).toMatchObject({
            kind: 'village',
            villageName: 'Smithy',
            anvil: { variants: [HEART_RICH_PAYLOAD_VARIANT] },
        });
    });

    it('a village without a smith carries no anvil counter', () => {
        const result = resolveVillage(createNewGameState(), { kind: 'village', villageName: 'Hamlet' });
        expect(result.event).toMatchObject({ kind: 'village' });
        expect((result.event as { anvil?: unknown }).anvil).toBeUndefined();
    });

    it('dispatches through applyPayload', () => {
        const state = createNewGameState();
        const result = applyPayload(state, PAYLOAD, () => 0.5);
        expect(result.event.kind).toBe('village');
    });

    it('rejects a cap-violating variant at resolution time', () => {
        const state = createNewGameState();
        const bad: VillagePayload = {
            kind: 'village',
            villageName: 'Smithy',
            anvil: {
                variants: [{
                    id: 'bad-variant',
                    name: 'Overforged',
                    gear: { dieColor: 'heart', specialFaces: 3, manaFaces: 2, specialConviction: 2 },
                }],
            },
        };
        expect(() => resolveVillage(state, bad)).toThrow(/illegal anvil variant/);
    });
});

// ── The four regional Anvils ────────────────────────────────────────────────

const ACT1_MAPS = ['breakwater', 'charcoal-wood', 'beacon-crags', 'lantern-deep'] as const;

/** The registered definition of an Act 1 map, whichever continent holds it. */
function act1Map(name: string): MapDefinition {
    const def = Object.values(MAP_REGISTRY)
        .flatMap(maps => Object.values(maps))
        .find((d): d is MapDefinition => d !== undefined && d.name === name);
    if (!def) throw new Error(`${name} is not registered`);
    return def;
}

/** A fresh game standing, unconsumed, on `nodeId` of `def`. */
function standingOn(def: MapDefinition, nodeId: string): GameState {
    const base = createNewGameState();
    return {
        ...base,
        world: { ...base.world, currentMap: { ...createMapState(def), currentNode: nodeId } },
    };
}

describe('the regional Anvils — one per Act 1 map (D61, R3b)', () => {
    it('names exactly one Anvil node for each Act 1 map', () => {
        expect(ACT1_ANVIL_NODES).toEqual({
            'breakwater':    'bw-16',
            'charcoal-wood': 'cw-18',
            'beacon-crags':  'bc-12',
            'lantern-deep':  'ld-14',
        });
    });

    it.each(ACT1_MAPS.map(m => [m, ACT1_ANVIL_NODES[m]!]))(
        '%s: %s resolves to a village whose Anvil offers the witness variants',
        (mapName, nodeId) => {
            const def = act1Map(mapName);
            const result = resolveMapEvent(standingOn(def, nodeId), () => 0.5);
            expect(result.event.kind).toBe('village');
            if (result.event.kind !== 'village') return;
            expect(result.event.anvil?.variants).toEqual(BLACKSMITH_WITNESS_VARIANTS);
            expect(result.event.anvil?.variants?.map(v => v.id)).toContain(HEART_RICH_PAYLOAD_VARIANT.id);
        },
    );

    it.each(ACT1_MAPS.map(m => [m]))('%s carries exactly one village, and it is the Anvil node', mapName => {
        const def = act1Map(mapName);
        const villages = def.nodes
            .filter(n => getNodePrimaryEventKind(def.continent, def.name, n.id) === 'village')
            .map(n => n.id);
        expect(villages).toEqual([ACT1_ANVIL_NODES[mapName]]);
    });

    it('no map event pool authors a blacksmith kind', () => {
        for (const mapName of ACT1_MAPS) {
            const def = act1Map(mapName);
            for (const n of def.nodes) {
                expect(getNodePrimaryEventKind(def.continent, def.name, n.id) as string).not.toBe('blacksmith');
            }
        }
    });
});

// ── The paid rest and the card shop (NK1c) ──────────────────────────────────

describe("MapEvents 'village' kind, the rest and card-shop counters (NK1c)", () => {
    it('a village that lets a bed resolves its rest counter at the tuned price', () => {
        const result = resolveVillage(createNewGameState(), { kind: 'village', villageName: 'Inn', rest: true });
        if (result.event.kind !== 'village') throw new Error('not a village');
        expect(result.event.rest).toEqual({ price: VILLAGE_TUNING.restPrice });
        expect(result.event.cardShop).toBeUndefined();
    });

    it('a card shop resolves the seeded offer for the node the player stands on, the same each time this run', () => {
        const def = act1Map('breakwater');
        const state = standingOn(def, 'bw-16');
        const result = resolveMapEvent(state, () => 0.5);
        if (result.event.kind !== 'village') throw new Error('not a village');
        expect(result.event.cardShop).toEqual(villageCardShopFor(state, 'bw-16'));
        expect(result.event.cardShop?.price).toBe(VILLAGE_TUNING.cardPrice);
        const again = resolveMapEvent({ ...standingOn(def, 'bw-16'), runId: state.runId }, () => 0.1);
        if (again.event.kind !== 'village') throw new Error('not a village');
        expect(again.event.cardShop).toEqual(result.event.cardShop);
    });

    it('the village carries no item wares any more (A11)', () => {
        const result = resolveVillage(createNewGameState(), { kind: 'village', villageName: 'V', rest: true, cardShop: true });
        expect(Object.keys(result.event)).not.toContain('shop');
    });

    it.each(ACT1_MAPS.map(m => [m, ACT1_ANVIL_NODES[m]!]))(
        '%s: the %s village carries all three counters',
        (mapName, nodeId) => {
            const result = resolveMapEvent(standingOn(act1Map(mapName), nodeId), () => 0.5);
            if (result.event.kind !== 'village') throw new Error('not a village');
            expect(result.event.rest).toBeDefined();
            expect(result.event.cardShop?.cardIds.length).toBeGreaterThan(0);
            expect(result.event.anvil).toBeDefined();
        },
    );
});

describe('the paid rest (A8)', () => {
    function hurt(currency: number, health = 20): GameState {
        const base = createNewGameState();
        return { ...base, player: { ...base.player, currency, health, maxHealth: 100 } };
    }

    it('heals 25% of max VITAE for 6 shillings', () => {
        const r = restAtVillage(hurt(10), FRESH_VILLAGE_VISIT);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.healed).toBe(25);
        expect(r.spent).toBe(6);
        expect(r.state.player.health).toBe(45);
        expect(r.state.player.currency).toBe(4);
        expect(r.visit.rested).toBe(true);
    });

    it('rests once per visit; a fresh visit may rest again', () => {
        const first = restAtVillage(hurt(20), FRESH_VILLAGE_VISIT);
        if (!first.ok) throw new Error('first rest refused');
        expect(restAtVillage(first.state, first.visit)).toEqual({ ok: false, refusal: 'you have rested here this visit' });
        expect(restAtVillage(first.state, FRESH_VILLAGE_VISIT).ok).toBe(true);
    });

    it('is refused, with its reason, when the purse is short', () => {
        const state = hurt(5);
        const quote = villageRestQuote(state.player, FRESH_VILLAGE_VISIT);
        expect(quote).toEqual({ price: 6, heal: 25, refusal: "you can't cover the 6 it costs" });
        expect(restAtVillage(state, FRESH_VILLAGE_VISIT).ok).toBe(false);
    });

    it('is refused at full VITAE, and caps the heal at what is missing', () => {
        expect(villageRestQuote({ health: 100, maxHealth: 100, currency: 50 }, FRESH_VILLAGE_VISIT).refusal)
            .toBe('your VITAE is already full');
        expect(villageRestQuote({ health: 95, maxHealth: 100, currency: 50 }, FRESH_VILLAGE_VISIT).heal).toBe(5);
    });

    it('clears dying, as a rest node heal does', () => {
        const r = restAtVillage({ ...hurt(10), dying: true }, FRESH_VILLAGE_VISIT);
        if (!r.ok) throw new Error('refused');
        expect(r.state.dying).toBeUndefined();
    });
});
