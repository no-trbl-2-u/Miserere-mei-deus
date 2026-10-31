import { describe, it, expect } from 'vitest';

import { buildAtlasData } from './atlas.data';
import { cardLibrary } from '../Cards/cards.library';
import { CARD_LANES, getCardLane } from '../Cards/card.lanes';
import { relicLibrary } from '../Items/relic.library';
import { SIGNATURE_SKILLS } from '../Combat/combat.signature';
import { experienceToNext } from '../Character/experience';
import { scaleAmount } from '../Combat/stat-scaling';
import { MAP_REGISTRY } from '../World/map.registry';
import { listQuestlines } from '../World/questline';
import { PLAYER_VITAE_BASE, RESOURCE_MULTIPLIERS } from '../Game/game-mechanics.constants';

const atlas = buildAtlasData({ commit: 'abc1234', generatedAt: '2026-10-31' });

describe('buildAtlasData', () => {
    it('lists every relic once, and every relic signature is a listed signature', () => {
        expect(atlas.relics.map(r => r.id)).toEqual(relicLibrary.map(r => r.id));
        const sigIds = new Set(atlas.signatures.map(s => s.id));
        for (const r of atlas.relics) {
            if (r.signatureId) expect(sigIds.has(r.signatureId)).toBe(true);
        }
    });

    it('lists every signature once', () => {
        expect(atlas.signatures.map(s => s.id).sort()).toEqual(Object.keys(SIGNATURE_SKILLS).sort());
    });

    it('lists every card once, in the lane the library gives it', () => {
        const ids = atlas.cards.map(c => c.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(new Set(ids)).toEqual(new Set(cardLibrary.map(c => c.id)));
        for (const c of atlas.cards) {
            const lane = CARD_LANES.find(l => l.cardIds.includes(c.id));
            expect(c.laneId).toBe(lane?.id ?? null);
            if (c.laneId) expect(getCardLane(c.laneId)?.cardIds).toContain(c.id);
        }
        expect(atlas.lanes.map(l => l.id)).toEqual(CARD_LANES.map(l => l.id));
    });

    it('holds the XP table level by level', () => {
        expect(atlas.xp.length).toBeGreaterThan(0);
        let running = 0;
        for (const row of atlas.xp) {
            expect(row.experienceToNext).toBe(experienceToNext(row.level));
            expect(row.total).toBe(running);
            running += row.experienceToNext;
        }
    });

    it('holds the scaling table as scaleAmount gives it', () => {
        expect(atlas.formulas.scaling.length).toBeGreaterThan(0);
        const base = atlas.formulas.scalingBase;
        for (const row of atlas.formulas.scaling) {
            expect(row.oneShot).toBe(scaleAmount(base, row.stat, 'one-shot'));
            expect(row.repeating).toBe(scaleAmount(base, row.stat, 'repeating'));
        }
    });

    it('exports the VITAE formula constants', () => {
        expect(atlas.formulas.PLAYER_VITAE_BASE).toBe(PLAYER_VITAE_BASE);
        expect(atlas.formulas.RESOURCE_MULTIPLIERS).toEqual(RESOURCE_MULTIPLIERS);
    });

    it('lists every registered region and questline', () => {
        const maps = Object.values(MAP_REGISTRY).flatMap(m => Object.keys(m));
        expect(atlas.regions.map(r => r.map).sort()).toEqual(maps.sort());
        for (const r of atlas.regions) {
            expect(Object.values(r.nodesByKind).reduce((a, b) => a + b, 0)).toBe(r.nodeCount);
        }
        expect(atlas.questlines.map(q => q.id)).toEqual(listQuestlines().map(q => q.id));
    });

    it('doubles foe VITAE for the live encounter', () => {
        for (const e of atlas.enemies) {
            expect(e.liveVitae).toBe(e.vitae * atlas.formulas.LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER);
        }
    });

    it('stamps the meta it is given', () => {
        expect(atlas.meta).toEqual({ commit: 'abc1234', generatedAt: '2026-10-31' });
    });
});
