// guard-test: pins SM1f's archetype seams (mutation survivors on #1259)
/**
 * The archetype seams at their edges (phase SM1f follow-up, from the PR's
 * mutation report): the VITAE threshold itself, which roads count as a rest
 * or an errand, the trip rule, the reward order when an upgrade is on offer,
 * cards in no lane at a removal, and an unpriced or unaffordable removal.
 */

import { describe, expect, it } from 'vitest';

import { CARD_LANES, GREY_LANE, getCardLane } from '../../Cards/card.lanes';
import { ENEMY_CURSE_CARDS } from '../../Cards/library/enemy-curses.cards';
import { DEFENDER_POLICY, MIN_DECK_SIZE, offLaneRemovals } from './run-policy.archetypes';
import { cardLaneId, laneKeywordOverlap, laneKeywords } from './run-policy.lanes';
import type { RunRoadContext, RunRoadOption, RunVillageContext } from './run-policy.types';

const P = DEFENDER_POLICY;
/** The Defender rests under 35% of max VITAE. */
const THRESHOLD = 35;
const own = (i = 0): string => getCardLane('defender')!.cardIds[i]!;
const GREY = GREY_LANE.cardIds[0]!;
const OTHER = CARD_LANES.find(l => l.id !== 'defender' && l.id !== 'grey')!.cardIds[0]!;
const NO_LANE = ENEMY_CURSE_CARDS.map(c => c.id).find(id => cardLaneId(id) === undefined)!;
/** Another lane's card that prints none of the Defender's keywords: never drafted. */
const PLAIN = CARD_LANES.filter(l => l.id !== 'defender' && l.id !== 'grey').flatMap(l => l.cardIds)
    .find(id => laneKeywordOverlap(id, laneKeywords('defender')) === 0)!;

const road = (nodeId: string, over: Partial<RunRoadOption> = {}): RunRoadOption => ({
    nodeId, via: 'road', nodeKind: 'encounter', unfinished: true, distanceToUnfinished: 0,
    elite: false, story: false, distanceToStory: null, distanceToExit: null, ...over,
});
const at = (health: number, options: RunRoadOption[]): RunRoadContext => ({
    mapName: 'breakwater', currentNodeId: 'here', options, health, maxHealth: 100, dying: false,
});
const village = (over: Partial<RunVillageContext>): RunVillageContext => ({
    health: 100, maxHealth: 100, currency: 0, rest: null, shop: [], removal: null, hasAnvil: false,
    deck: Array(MIN_DECK_SIZE + 5).fill(GREY), ...over,
});

describe('the archetype seams at their edges', () => {
    it('is whole at its threshold exactly, and hurt one under it', () => {
        const options = [road('fight'), road('rest', { nodeKind: 'rest' })];
        expect(P.chooseRoad(at(THRESHOLD, options))).toBe('fight');
        expect(P.chooseRoad(at(THRESHOLD - 1, options))).toBe('rest');
        expect(P.hazardPolicy({ hazardId: 'h', health: THRESHOLD, maxHealth: 100 })).toBe('greedy');
        expect(P.flee({ enemyName: 'x', isBoss: false, isElite: true, fleeAllowed: true, fledHere: 0, health: THRESHOLD, maxHealth: 100, deck: [] }))
            .toBe(false);
    });

    it('walks hurt only to an unfinished rest on a road, not a spent one, a trip, or a node of no kind', () => {
        const fight = road('fight');
        expect(P.chooseRoad(at(5, [fight, road('spent', { nodeKind: 'rest', unfinished: false, distanceToUnfinished: 1 })]))).toBe('fight');
        expect(P.chooseRoad(at(5, [fight, road('trip', { nodeKind: 'rest', via: 'travel' })]))).toBe('fight');
        expect(P.chooseRoad(at(5, [fight, road('blank', { nodeKind: null })]))).toBe('fight');
        expect(P.chooseRoad(at(5, [fight, road('village', { nodeKind: 'village' })]))).toBe('fight');
    });

    it('runs a hurt errand only to an unfinished errand node on a road', () => {
        const fight = road('fight');
        expect(P.chooseRoad(at(5, [fight, road('done', { nodeKind: 'quest', unfinished: false, distanceToUnfinished: 1 })]))).toBe('fight');
        expect(P.chooseRoad(at(5, [fight, road('trip', { nodeKind: 'cutscene', via: 'travel' })]))).toBe('fight');
        expect(P.chooseRoad(at(5, [fight, road('blank', { nodeKind: null })]))).toBe('fight');
        expect(P.chooseRoad(at(5, [fight, road('hazard', { nodeKind: 'hazard' })]))).toBe('fight');
        expect(P.chooseRoad(at(5, [fight, road('quest', { nodeKind: 'quest' })]))).toBe('quest');
    });

    it('takes a trip somewhere new or off the map, never back to where it has stood', () => {
        const trip = { fromNodeId: 'a', toNodeId: 'b', toMap: null, leavesMap: false, destinationVisited: false, unfinishedReachable: 0 };
        expect(P.takeTravel(trip)).toBe(true);
        expect(P.takeTravel({ ...trip, destinationVisited: true })).toBe(false);
        expect(P.takeTravel({ ...trip, leavesMap: true, toNodeId: null, toMap: 'next', destinationVisited: true })).toBe(true);
    });

    it('drafts its own lane over an elite upgrade, and takes any upgrade over a card it would not draft', () => {
        const elite = { source: 'elite' as const, deck: [] };
        expect(P.pickReward({ ...elite, offers: [PLAIN, own()], upgradeFromCardId: own(1) })).toEqual({ kind: 'card', cardId: own() });
        expect(P.pickReward({ ...elite, offers: [PLAIN], upgradeFromCardId: GREY })).toEqual({ kind: 'upgrade' });
        expect(P.pickReward({ ...elite, offers: [PLAIN], upgradeFromCardId: null })).toEqual({ kind: 'skip' });
    });

    it('has another lane removed first, then a card in no lane, then the grey office', () => {
        expect(offLaneRemovals({ laneId: 'defender' }, [GREY, NO_LANE, OTHER, own()], 40, 9)).toEqual([OTHER, NO_LANE, GREY]);
    });

    it('takes as many free removals as it may, and only as many paid ones as it can pay for', () => {
        const removal = (price: number) => ({ price, enabled: true, cardIds: [OTHER, NO_LANE, GREY] });
        expect(P.visitVillage(village({ removal: removal(0) })).remove).toEqual([OTHER, NO_LANE, GREY]);
        expect(P.visitVillage(village({ currency: 5, removal: removal(2) })).remove).toEqual([OTHER, NO_LANE]);
        expect(P.visitVillage(village({ currency: 1, removal: removal(2) })).remove).toEqual([]);
        expect(P.visitVillage(village({ currency: 9, removal: { ...removal(1), enabled: false } })).remove).toEqual([]);
    });
});
