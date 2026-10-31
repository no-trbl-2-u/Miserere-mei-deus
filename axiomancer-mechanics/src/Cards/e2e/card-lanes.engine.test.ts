/**
 * Card lanes — the registry behind the dev menu's CARDS section.
 *
 * The contract this file pins:
 *   · every lane's cards and test-deck cards resolve in the library;
 *   · lane ids are unique, and every library card that can be a reward
 *     sits in some lane, so the reward-pool grid can reach every one (a
 *     Curse is never a reward: a card adds it mid-combat, so it sits in no
 *     lane);
 *   · the grey lane's test deck is the fresh-run deck;
 *   · `laneRewardPool` merges lanes in order, once per card, skipping
 *     unknown ids;
 *   · `rewardPoolFor` narrows the draft to the checked lanes and, when the
 *     override is absent, empty or unknown, falls back to the real rule: the
 *     worn relics' lanes, the grey office when none is worn.
 */

import { describe, it, expect } from 'vitest';

import { CARD_LANES, GREY_LANE, getCardLane, laneRewardPool, type CardLane } from '../card.lanes';
import { cardLibrary, getCardById } from '../cards.library';
import { STARTING_CARD_IDS, rewardPoolFor, rollCombatCardRewards } from '../../Combat/combat.rewards';
import { Player } from '../../Character/characters.mock';
import { deepClone } from '../../Utils';

/** Two fixture lanes cut from the grey cards, so narrowing is observable. */
const FIXTURE_LANES: readonly CardLane[] = [
    { id: 'blows', name: 'Blows', cardIds: ['grey-strike'], testDeck: ['grey-strike'] },
    { id: 'guards', name: 'Guards', cardIds: ['grey-ward', 'grey-strike'], testDeck: ['grey-ward'] },
];

describe('the lane registry', () => {
    it('resolves every lane card and every test-deck card', () => {
        for (const lane of CARD_LANES) {
            for (const id of [...lane.cardIds, ...lane.testDeck]) {
                expect(getCardById(id), `${lane.id}: ${id}`).toBeDefined();
            }
        }
    });

    it('has unique lane ids and puts every library card but the Curses in a lane', () => {
        const ids = CARD_LANES.map(lane => lane.id);
        expect(new Set(ids).size).toBe(ids.length);
        const laned = new Set(CARD_LANES.flatMap(lane => lane.cardIds));
        for (const card of cardLibrary) {
            expect(laned.has(card.id), card.id).toBe(card.cardType !== 'curse');
        }
    });

    it('deals the fresh-run deck as the grey test deck', () => {
        expect(STARTING_CARD_IDS).toEqual(GREY_LANE.testDeck);
        expect(getCardLane('grey')).toBe(GREY_LANE);
        expect(getCardLane('no-such-lane')).toBeUndefined();
    });
});

describe('laneRewardPool', () => {
    it('merges the named lanes in order, each card once', () => {
        expect(laneRewardPool(['guards', 'blows'], FIXTURE_LANES)).toEqual(['grey-ward', 'grey-strike']);
    });

    it('skips unknown lane ids', () => {
        expect(laneRewardPool(['nope', 'blows'], FIXTURE_LANES)).toEqual(['grey-strike']);
        expect(laneRewardPool(['nope'], FIXTURE_LANES)).toEqual([]);
    });
});

describe('rewardPoolFor', () => {
    it('has no pool when the override is absent, empty or unknown and no lane is held', () => {
        expect(() => rewardPoolFor({}, FIXTURE_LANES)).toThrow(/no reward pool/);
        expect(() => rewardPoolFor({ devRewardLaneIds: [] }, FIXTURE_LANES)).toThrow(/no reward pool/);
        expect(() => rewardPoolFor({ devRewardLaneIds: ['nope'] }, FIXTURE_LANES)).toThrow(/no reward pool/);
    });

    it('narrows to the checked lanes', () => {
        expect(rewardPoolFor({ devRewardLaneIds: ['blows'] }, FIXTURE_LANES)).toEqual(['grey-strike']);
    });

    it('feeds the live draft: the grey override offers only grey cards', () => {
        const player = { ...deepClone(Player), devRewardLaneIds: ['grey'] };
        const offers = rollCombatCardRewards(player, () => 0.5, 3);
        for (const id of offers) expect(GREY_LANE.cardIds).toContain(id);
    });
});
