/**
 * The four archetype bots' seams over fixture states (phase SM1f, A11): the
 * reward each picks, the rest it takes, the road it walks hurt and whole,
 * when it walks away from an elite, the stat it raises, what it wears and
 * what it has removed. Card ids come from the lane registry, never typed.
 */

import { describe, expect, it } from 'vitest';

import { CARD_LANES, GREY_LANE, getCardLane } from '../../Cards/card.lanes';
import { CHARACTER_ROSTER } from '../../Character/roster';
import { relicLibrary } from '../../Items/relic.library';
import {
    ARCHETYPE_POLICIES,
    BLOOD_PRICE_POLICY,
    DEFENDER_POLICY,
    ELEMENTALIST_POLICY,
    MERCIFUL_POLICY,
    MIN_DECK_SIZE,
    bestLaneOffer,
    offLaneRemovals,
} from './run-policy.archetypes';
import { characterForLane, laneKeywordOverlap, laneKeywords, laneStat } from './run-policy.lanes';
import { getRunPolicy, RUN_POLICY_IDS } from './run-policy.registry';
import type { RunFightContext, RunPolicy, RunRoadContext, RunRoadOption } from './run-policy.types';

const cardsOf = (laneId: string): readonly string[] => getCardLane(laneId)!.cardIds;
const card = (laneId: string, i = 0): string => cardsOf(laneId)[i]!;
const GREY = GREY_LANE.cardIds[0]!;

const road = (nodeId: string, over: Partial<RunRoadOption> = {}): RunRoadOption => ({
    nodeId, via: 'road', nodeKind: 'encounter', unfinished: false, distanceToUnfinished: 1, ...over,
});
const roads = (health: number, options: RunRoadOption[]): RunRoadContext => ({
    mapName: 'breakwater', currentNodeId: 'here', options, health, maxHealth: 100, dying: false,
});
const fight = (over: Partial<RunFightContext> = {}): RunFightContext => ({
    enemyName: 'x', isBoss: false, isElite: true, fleeAllowed: true, fledHere: 0, health: 10, maxHealth: 100, deck: [], ...over,
});

describe('the archetype bots', () => {
    it('are registered by their lane ids beside the wanderer', () => {
        expect(RUN_POLICY_IDS).toEqual(['wanderer', 'blood-price', 'defender', 'merciful', 'elementalist']);
        for (const p of ARCHETYPE_POLICIES) {
            expect(getRunPolicy(p.id)).toBe(p);
            expect(getCardLane(p.id)).toBeDefined();
        }
    });

    it('open as the roster character that opens their lane, else the closest fit', () => {
        for (const p of ARCHETYPE_POLICIES) {
            expect(p.chooseCharacter(CHARACTER_ROSTER)).toBe(characterForLane(CHARACTER_ROSTER, p.id).id);
        }
        expect(() => DEFENDER_POLICY.chooseCharacter([])).toThrow(/no character/);
    });

    it('pick their own lane first, then the elite upgrade of a lane card, then a card of their keywords, else skip', () => {
        for (const p of ARCHETYPE_POLICIES) {
            const others = CARD_LANES.filter(l => l.id !== p.id && l.id !== 'grey');
            const off = others.map(l => l.cardIds[0]!);
            const base = { source: 'fight' as const, upgradeFromCardId: null, deck: [] };
            expect(p.pickReward({ ...base, offers: [...off, card(p.id)] })).toEqual({ kind: 'card', cardId: card(p.id) });
            expect(p.pickReward({ ...base, source: 'elite', offers: off, upgradeFromCardId: card(p.id, 1) }))
                .toEqual({ kind: 'upgrade' });
            // A card printing the lane's keywords, from another lane, beats one that prints none.
            const words = laneKeywords(p.id);
            const kin = others.flatMap(l => l.cardIds).find(id => laneKeywordOverlap(id, words) > 0);
            const plain = others.flatMap(l => l.cardIds).find(id => laneKeywordOverlap(id, words) === 0);
            if (kin && plain) {
                expect(p.pickReward({ ...base, offers: [plain, kin] })).toEqual({ kind: 'card', cardId: kin });
            }
            if (plain) expect(p.pickReward({ ...base, offers: [plain] })).toEqual({ kind: 'skip' });
            expect(p.pickReward({ ...base, offers: [] })).toEqual({ kind: 'skip' });
        }
    });

    it('rest under their VITAE threshold and otherwise upgrade a card of their lane', () => {
        const offers = [{ id: 'rest' as const, cost: 0, enabled: true }, { id: 'upgrade' as const, cost: 0, enabled: true }];
        for (const p of ARCHETYPE_POLICIES) {
            const ctx = { currency: 0, offers, upgradableCardIds: [GREY, card(p.id)], deck: [] };
            expect(p.chooseRest({ ...ctx, health: 10, maxHealth: 100 })).toEqual({ offer: 'rest' });
            expect(p.chooseRest({ ...ctx, health: 100, maxHealth: 100 })).toEqual({ offer: 'upgrade', cardId: card(p.id) });
            expect(p.chooseRest({ ...ctx, health: 100, maxHealth: 100, upgradableCardIds: [] })).toEqual({ offer: 'rest' });
        }
    });

    it('walk to a rest next door when hurt, run a safe errand before a fight, and try the node underfoot last', () => {
        const options = [
            road('fight', { unfinished: true, distanceToUnfinished: 0 }),
            road('cache', { nodeKind: 'loot-cache', unfinished: true, distanceToUnfinished: 0 }),
            road('rest', { nodeKind: 'rest', unfinished: true, distanceToUnfinished: 0 }),
        ];
        for (const p of ARCHETYPE_POLICIES) {
            expect(p.chooseRoad(roads(100, options))).toBe('fight');
            expect(p.chooseRoad(roads(5, options))).toBe('rest');
            expect(p.chooseRoad(roads(5, options.slice(0, 2)))).toBe('cache');
            const retry = [road('here', { via: 'retry', unfinished: true, distanceToUnfinished: 0 }), road('back', { distanceToUnfinished: 1 })];
            expect(p.chooseRoad(roads(5, retry))).toBe('back');
            expect(p.chooseRoad(roads(100, retry))).toBe('here');
            expect(p.chooseRoad(roads(5, [road('nowhere', { distanceToUnfinished: null })]))).toBeNull();
        }
    });

    it('walk away from an elite once when hurt, never from a boss or a plain foe', () => {
        for (const p of ARCHETYPE_POLICIES) {
            expect(p.flee(fight())).toBe(true);
            expect(p.flee(fight({ fledHere: 1 }))).toBe(false);
            expect(p.flee(fight({ health: 100 }))).toBe(false);
            expect(p.flee(fight({ isElite: false }))).toBe(false);
            expect(p.flee(fight({ isBoss: true }))).toBe(false);
        }
    });

    it('cross a hazard carefully when hurt', () => {
        for (const p of ARCHETYPE_POLICIES) {
            expect(p.hazardPolicy({ hazardId: 'h', health: 5, maxHealth: 100 })).toBe('conservative');
            expect(p.hazardPolicy({ hazardId: 'h', health: 100, maxHealth: 100 })).toBe('greedy');
        }
    });

    it('raise their lane\'s stat and keep a relic that opens another lane in the satchel', () => {
        for (const p of ARCHETYPE_POLICIES) {
            expect(p.raiseStat({ level: 2, baseStats: { heart: 5, body: 5, mind: 5 }, availableStatPoints: 1 })).toBe(laneStat(p.id));
            const own = relicLibrary.find(r => r.laneId === p.id);
            const other = relicLibrary.find(r => r.laneId && r.laneId !== p.id)!;
            if (own) expect(p.takeItem({ itemId: own.id, category: 'equipment', wearable: true })).toBe('equip');
            expect(p.takeItem({ itemId: other.id, category: 'equipment', wearable: true })).toBe('keep');
            expect(p.takeItem({ itemId: 'a-plain-sword', category: 'equipment', wearable: true })).toBe('equip');
            expect(p.takeItem({ itemId: 'a-potion', category: 'consumable', wearable: false })).toBe('keep');
        }
    });

    it('take a cache\'s card only when they would draft it', () => {
        for (const p of ARCHETYPE_POLICIES) {
            const off = CARD_LANES.find(l => l.id !== p.id && l.id !== 'grey')!.cardIds
                .find(id => laneKeywordOverlap(id, laneKeywords(p.id)) === 0);
            expect(p.chooseCacheOffer({ cardCandidate: card(p.id), itemIds: ['i'], currency: 0, deck: [] })).toBe('card');
            if (off) {
                expect(p.chooseCacheOffer({ cardCandidate: off, itemIds: ['i'], currency: 0, deck: [] })).toBe('item');
                expect(p.chooseCacheOffer({ cardCandidate: off, itemIds: [], currency: 0, deck: [] })).toBe('card');
            }
        }
    });

    it('at a village rest when hurt, buy their lane and have off-lane cards removed while they can pay', () => {
        const other = CARD_LANES.find(l => l.id !== 'defender' && l.id !== 'grey')!.cardIds[0]!;
        const deck = [...Array(MIN_DECK_SIZE).fill(GREY), card('defender'), other];
        const visit = DEFENDER_POLICY.visitVillage({
            health: 10, maxHealth: 100, currency: 10,
            rest: { price: 2, enabled: true },
            shop: [
                { cardId: card('defender', 1), price: 3, enabled: true },
                { cardId: other, price: 1, enabled: true },
                { cardId: card('defender', 2), price: 99, enabled: true },
            ],
            removal: { price: 2, enabled: true, cardIds: [GREY, card('defender'), other] },
            hasAnvil: false, deck,
        });
        expect(visit.rest).toBe(true);
        expect(visit.buy).toEqual([card('defender', 1)]);
        // 10 - 2 (bed) - 3 (card) leaves 5: two removals, another lane's card before the grey office.
        expect(visit.remove).toEqual([other, GREY]);
        const whole = DEFENDER_POLICY.visitVillage({
            health: 100, maxHealth: 100, currency: 0, rest: { price: 2, enabled: true }, shop: [], removal: null, hasAnvil: true, deck,
        });
        expect(whole).toEqual({ rest: false, buy: [], remove: [] });
    });

    it('never shrink a deck under the dealt size, and never remove their own lane', () => {
        const other = card('merciful');
        expect(offLaneRemovals({ laneId: 'defender' }, [card('defender'), GREY, other], MIN_DECK_SIZE + 1, 5)).toEqual([other]);
        expect(offLaneRemovals({ laneId: 'defender' }, [GREY, other], MIN_DECK_SIZE, 5)).toEqual([]);
        expect(offLaneRemovals({ laneId: 'defender' }, [card('defender')], 40, 5)).toEqual([]);
    });

    it('rank offers by lane, then by keyword overlap', () => {
        const k = { laneId: 'blood-price', keywords: laneKeywords('blood-price') };
        expect(bestLaneOffer(k, [GREY, card('blood-price')])).toBe(card('blood-price'));
        expect(bestLaneOffer(k, [])).toBeNull();
    });

    it('fight with their own lane\'s ranking', () => {
        const names: Record<string, RunPolicy> = {
            'Blood Price': BLOOD_PRICE_POLICY, Defender: DEFENDER_POLICY, Merciful: MERCIFUL_POLICY, Elementalist: ELEMENTALIST_POLICY,
        };
        for (const [name, p] of Object.entries(names)) {
            expect(p.fightPolicy(fight()).name).toContain(name);
        }
        expect(MERCIFUL_POLICY.fightPolicy(fight()).mercyChoice).toBe('spare');
        expect(DEFENDER_POLICY.fightPolicy(fight()).mercyChoice).toBe('exploit');
    });
});
