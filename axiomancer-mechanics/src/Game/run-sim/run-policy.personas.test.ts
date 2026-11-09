/**
 * The four personas' seams over fixture contexts (phase SM2c, A7): their
 * rests, roads, withdrawals, trips and hazard crossings.
 */

import { describe, expect, it } from 'vitest';

import { CHARACTER_ROSTER } from '../../Character/roster';
import { PERSONA_FIGHT } from './run-policy.fight';
import {
    CAUTIOUS_POLICY as C, EXPLORER_POLICY as E, PERSONA_POLICIES, RECKLESS_POLICY as R, RUSHER_POLICY as U,
} from './run-policy.personas';
import { getRunPolicy } from './run-policy.registry';
import type { RunFightContext, RunRestContext, RunRoadContext, RunRoadOption, RunTravelContext } from './run-policy.types';

const road = (nodeId: string, over: Partial<RunRoadOption> = {}): RunRoadOption => ({
    nodeId, via: 'road', nodeKind: 'encounter', unfinished: true, distanceToUnfinished: 0,
    elite: false, story: false, distanceToStory: null, distanceToExit: null, ...over,
});
const at = (options: RunRoadOption[], health = 100): RunRoadContext => ({
    mapName: 'm', currentNodeId: 'here', options, health, maxHealth: 100, dying: false,
});
const fight = (health: number, over: Partial<RunFightContext> = {}): RunFightContext => ({
    enemyName: 'x', isBoss: false, isElite: false, fleeAllowed: true, fledHere: 0, health, maxHealth: 100, deck: [], ...over,
});
const rest = (health: number, upgradeEnabled = true): RunRestContext => ({
    health, maxHealth: 100, currency: 9,
    offers: [{ id: 'rest', cost: 0, enabled: true }, { id: 'upgrade', cost: 1, enabled: upgradeEnabled }],
    upgradableCardIds: ['c1', 'c2'], deck: [],
});
const trip = (over: Partial<RunTravelContext>): RunTravelContext => ({
    fromNodeId: 'a', toNodeId: 'b', toMap: null, leavesMap: false, destinationVisited: false, unfinishedReachable: 0, ...over,
});

describe('the personas, all four', () => {
    it('are registered, open as the first roster character and fight with the player witness', () => {
        for (const p of PERSONA_POLICIES) {
            expect(getRunPolicy(p.id)).toBe(p);
            expect(p.chooseCharacter(CHARACTER_ROSTER)).toBe(CHARACTER_ROSTER[0]!.id);
            expect(p.fightPolicy(fight(100))).toBe(PERSONA_FIGHT);
            expect(() => p.chooseCharacter([])).toThrow(/no character/);
        }
    });

    it('take the first card, the elite upgrade, the highest stat and every wearable item', () => {
        for (const p of PERSONA_POLICIES) {
            expect(p.pickReward({ source: 'fight', offers: ['a', 'b'], upgradeFromCardId: null, deck: [] })).toEqual({ kind: 'card', cardId: 'a' });
            expect(p.pickReward({ source: 'elite', offers: ['a'], upgradeFromCardId: 'z', deck: [] })).toEqual({ kind: 'upgrade' });
            expect(p.pickReward({ source: 'fight', offers: [], upgradeFromCardId: null, deck: [] })).toEqual({ kind: 'skip' });
            expect(p.raiseStat({ level: 2, baseStats: { heart: 1, body: 3, mind: 2 }, availableStatPoints: 1 })).toBe('body');
            expect(p.raiseStat({ level: 2, baseStats: { heart: 2, body: 2, mind: 5 }, availableStatPoints: 1 })).toBe('mind');
            expect(p.raiseStat({ level: 2, baseStats: { heart: 2, body: 2, mind: 2 }, availableStatPoints: 1 })).toBe('heart');
            expect(p.takeItem({ itemId: 'i', category: 'x', wearable: true })).toBe('equip');
            expect(p.takeItem({ itemId: 'i', category: 'x', wearable: false })).toBe('keep');
        }
    });
});

describe('rests and beds', () => {
    const edges: [typeof C, number][] = [[C, 60], [R, 50], [E, 50], [U, 30]];
    it.each(edges)('%s rests under its line, upgrades at or over it', (p, line) => {
        expect(p.chooseRest(rest(line - 1))).toEqual({ offer: 'rest' });
        expect(p.chooseRest(rest(line))).toEqual({ offer: 'upgrade', cardId: 'c1' });
        expect(p.chooseRest(rest(100, false))).toEqual({ offer: 'rest' });
        const village = (health: number, price = 5, currency = 9) => p.visitVillage({
            health, maxHealth: 100, currency, rest: { price, enabled: true }, shop: [], removal: null, hasAnvil: false, deck: [],
        });
        expect(village(line - 1).rest).toBe(true);
        expect(village(line).rest).toBe(false);
        expect(village(line - 1, 5, 4).rest).toBe(false);
        expect(village(line - 1)).toMatchObject({ buy: [], remove: [] });
    });
});

describe('roads', () => {
    it('cautious puts the safe errand before a fight at the same distance, and an elite last', () => {
        const options = [road('fight'), road('rest', { nodeKind: 'rest' })];
        expect(C.chooseRoad(at(options))).toBe('rest');
        expect(C.chooseRoad(at([road('elite', { elite: true, distanceToUnfinished: 0 }), road('far', { distanceToUnfinished: 2 })]))).toBe('far');
        expect(C.chooseRoad(at([road('elite', { elite: true })]))).toBe('elite');
        expect(C.chooseRoad(at([road('x', { distanceToUnfinished: null })]))).toBeNull();
    });

    it('cautious walks to an unfinished rest when hurt', () => {
        const options = [road('fight'), road('quest', { nodeKind: 'quest' }), road('rest', { nodeKind: 'rest', distanceToUnfinished: 1 })];
        expect(C.chooseRoad(at(options, 59))).toBe('rest');
        expect(C.chooseRoad(at(options, 60))).toBe('quest');
    });

    it('reckless takes an elite or hazard first, else the nearest work', () => {
        expect(R.chooseRoad(at([road('near'), road('elite', { elite: true, distanceToUnfinished: 2 })]))).toBe('elite');
        expect(R.chooseRoad(at([road('near'), road('haz', { nodeKind: 'hazard' })]))).toBe('haz');
        expect(R.chooseRoad(at([road('far', { distanceToUnfinished: 3 }), road('near', { distanceToUnfinished: 1 })]))).toBe('near');
    });

    it('explorer walks to the nearest work and leaves the exit for last', () => {
        const exit = road('exit', { distanceToExit: 0, nodeKind: 'travel' });
        expect(E.chooseRoad(at([exit, road('far', { distanceToUnfinished: 2 })]))).toBe('far');
        expect(E.chooseRoad(at([exit]))).toBe('exit');
    });

    it('rusher heads for the story, then the exit, and skips the side work', () => {
        const side = road('side', { distanceToUnfinished: 0 });
        expect(U.chooseRoad(at([side, road('story', { story: true, distanceToStory: 0, distanceToUnfinished: 3 })]))).toBe('story');
        expect(U.chooseRoad(at([side, road('way', { distanceToStory: 2 }), road('close', { distanceToStory: 1 })]))).toBe('close');
        expect(U.chooseRoad(at([side, road('out', { distanceToExit: 1 })]))).toBe('out');
        expect(U.chooseRoad(at([side]))).toBe('side');
    });
});

describe('withdrawals, trips and hazards', () => {
    it('cautious withdraws under 40%, and from an elite under 60%, once a node', () => {
        expect(C.flee(fight(39))).toBe(true);
        expect(C.flee(fight(40))).toBe(false);
        expect(C.flee(fight(59, { isElite: true }))).toBe(true);
        expect(C.flee(fight(60, { isElite: true }))).toBe(false);
        expect(C.flee(fight(10, { fledHere: 1 }))).toBe(false);
    });

    it('the others never withdraw', () => {
        for (const p of [R, E, U]) expect(p.flee(fight(1, { isElite: true }))).toBe(false);
    });

    it('explorer leaves the map only with no work reachable', () => {
        const exit = trip({ leavesMap: true, toNodeId: null, toMap: 'next' });
        expect(E.takeTravel({ ...exit, unfinishedReachable: 2 })).toBe(false);
        expect(E.takeTravel(exit)).toBe(true);
        expect(E.takeTravel(trip({ unfinishedReachable: 4 }))).toBe(true);
        expect(E.takeTravel(trip({ destinationVisited: true }))).toBe(false);
        for (const p of [C, R, U]) expect(p.takeTravel({ ...exit, unfinishedReachable: 2 })).toBe(true);
    });

    it('cross hazards as each is named', () => {
        const h = (health: number) => ({ hazardId: 'h', health, maxHealth: 100 });
        expect(C.hazardPolicy(h(100))).toBe('conservative');
        expect(R.hazardPolicy(h(1))).toBe('greedy');
        expect(U.hazardPolicy(h(1))).toBe('greedy');
        expect(E.hazardPolicy(h(49))).toBe('conservative');
        expect(E.hazardPolicy(h(50))).toBe('greedy');
    });
});
