/**
 * The elite reward (Phase UP1f, A9 of the UP1 brief).
 *
 * The contract this file pins, against the live elite (the Green Jelly, once
 * the brine-hag):
 *   · a fight pays the elite reward exactly when its foe is `difficulty: 'elite'`;
 *   · the cards are the best three of the reward pool (the worn relics'
 *     lanes, the grey office when none is worn), highest rarity first, so the
 *     one rare (Blood for Blood) is always offered once its lane is worn;
 *   · at least one offer comes from a lane the player's deck draws on;
 *   · the other option upgrades one random owned card at the highest rarity
 *     the player owns that can still take an upgrade;
 *   · the upgrade option is null (hidden) when nothing owned can be upgraded;
 *   · the roll is seeded, and its upgrade is a valid `replaceCard` input.
 */

import { describe, it, expect } from 'vitest';

import {
    isEliteEnemy, rollEliteCardRewards, rollEliteReward, rollEliteUpgrade, rewardPoolFor,
    STARTING_CARD_IDS,
} from '../combat.rewards';
import { deckLaneIds, getCardLane, GREY_LANE } from '../../Cards/card.lanes';
import { cardLibrary, getCardById } from '../../Cards/cards.library';
import { upgradeLimit } from '../../Cards/card-upgrades';
import { replaceCard } from '../../Cards/card.engine';
import { rankToRarity } from '../../Cards/types';
import { DeathBeholder, FloatEye, GreenJelly } from '../../Enemy/enemy.library';
import { Player } from '../../Character/characters.mock';
import { deepClone } from '../../Utils';
import type { Character } from '../../Character/types';
import type { Equipment } from '../../Items/types';

/** The library's one rare, Blood for Blood, found by its limit (no trial id is named outside the set). */
const BLOOD_FOR_BLOOD = cardLibrary.find(card => upgradeLimit(card) === 3)!.id;
const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

function seededRng(seed: number): () => number {
    let state = seed % 2147483647 || 1;
    return () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
    };
}

/** The mock player wears the Suppliant's Ring, which opens the Merciful lane; these fixtures wear no relic unless `wearing` says so. */
function playerWith(knownCards: readonly string[], combatRewardCards: readonly string[] = []): Character {
    const player = deepClone(Player);
    return {
        ...player, knownCards: [...knownCards], combatRewardCards: [...combatRewardCards],
        equipment: { ...player.equipment, relics: [] },
    };
}

/** The player wearing one fixture relic relic per lane id (no library relic names a lane yet). */
function wearing(player: Character, ...laneIds: string[]): Character {
    const relics: Equipment[] = laneIds.map((laneId, i) => ({
        id: `fixture-relic-${laneId}-${i}`, name: `Fixture ${laneId}`, description: '',
        category: 'equipment', slot: 'relic', laneId,
    } as Equipment));
    return { ...player, equipment: { weapon: null, armor: null, relics: relics } };
}

const greyPlayer = (): Character => playerWith(STARTING_CARD_IDS);
const bloodPricePlayer = (): Character => playerWith(getCardLane('blood-price')!.testDeck);

function rarityOf(id: string) {
    return rankToRarity(getCardById(id)!.rank);
}

describe('which fights pay the elite reward', () => {
    it('an elite slot pays it; the Green Jelly on its own, the Float-Eye and the Death Beholder do not', () => {
        expect(isEliteEnemy({ ...GreenJelly, difficulty: 'elite' })).toBe(true);
        expect(isEliteEnemy(GreenJelly)).toBe(false);
        expect(isEliteEnemy(FloatEye)).toBe(false);
        expect(isEliteEnemy(DeathBeholder)).toBe(false);
    });
});

describe('deckLaneIds', () => {
    it('names the lanes a deck draws on, upgraded copies counted as their base', () => {
        expect(deckLaneIds(STARTING_CARD_IDS)).toEqual(['grey']);
        expect(deckLaneIds(['grey-strike+', `${BLOOD_FOR_BLOOD}++`])).toEqual(['grey', 'blood-price']);
        expect(deckLaneIds([])).toEqual([]);
        expect(deckLaneIds(['no-such-card'])).toEqual([]);
    });
});

describe('the elite cards: the best three, one from the player\'s lanes', () => {
    it('offers three distinct, resolvable cards from the reward pool', () => {
        for (const seed of SEEDS) {
            const cards = rollEliteCardRewards(greyPlayer(), seededRng(seed));
            expect(cards).toHaveLength(3);
            expect(new Set(cards).size).toBe(3);
            for (const id of cards) expect(rewardPoolFor(greyPlayer())).toContain(id);
        }
    });

    it('always offers the library\'s one rare, Blood for Blood, once its lane is worn', () => {
        expect(rarityOf(BLOOD_FOR_BLOOD)).toBe('rare');
        for (const seed of SEEDS) {
            expect(rollEliteCardRewards(wearing(greyPlayer(), 'blood-price'), seededRng(seed))).toContain(BLOOD_FOR_BLOOD);
            expect(rollEliteCardRewards(wearing(bloodPricePlayer(), 'blood-price'), seededRng(seed))).toContain(BLOOD_FOR_BLOOD);
        }
    });

    it('with no lane relic worn, every elite card is grey', () => {
        for (const seed of SEEDS) {
            for (const player of [greyPlayer(), bloodPricePlayer()]) {
                for (const id of rollEliteCardRewards(player, seededRng(seed))) expect(GREY_LANE.cardIds).toContain(id);
            }
        }
    });

    it('a grey deck is always offered at least one grey card', () => {
        for (const seed of SEEDS) {
            const cards = rollEliteCardRewards(greyPlayer(), seededRng(seed));
            expect(cards.some(id => GREY_LANE.cardIds.includes(id)), `seed ${seed}: ${cards}`).toBe(true);
        }
    });

    it('after the lane pick, the best band left comes first: an Elementalist card, then the rare', () => {
        const elementalist = getCardLane('elementalist')!;
        const deck = [...STARTING_CARD_IDS, elementalist.cardIds[0]];
        for (const seed of SEEDS) {
            const player = wearing(playerWith(deck), 'blood-price', 'elementalist');
            const [lanePick, best] = rollEliteCardRewards(player, seededRng(seed));
            expect(elementalist.cardIds).toContain(lanePick);
            expect(best).toBe(BLOOD_FOR_BLOOD);
        }
    });

    it('is seeded: the same seed gives the same offer', () => {
        expect(rollEliteReward(greyPlayer(), seededRng(7))).toEqual(rollEliteReward(greyPlayer(), seededRng(7)));
    });
});

describe('the elite upgrade: a random owned card at the highest rarity owned', () => {
    it('a grey deck upgrades one of its own grey cards once', () => {
        for (const seed of SEEDS) {
            const up = rollEliteUpgrade(greyPlayer(), seededRng(seed))!;
            expect(GREY_LANE.cardIds).toContain(up.fromCardId);
            expect(up.toCardId).toBe(`${up.fromCardId}+`);
        }
    });

    it('a deck holding the rare always upgrades the rare', () => {
        for (const seed of SEEDS) {
            const up = rollEliteUpgrade(bloodPricePlayer(), seededRng(seed))!;
            expect(up).toEqual({ fromCardId: BLOOD_FOR_BLOOD, toCardId: `${BLOOD_FOR_BLOOD}+` });
        }
        const once = playerWith(['grey-strike'], [`${BLOOD_FOR_BLOOD}+`]);
        expect(rollEliteUpgrade(once, seededRng(3))).toEqual({
            fromCardId: `${BLOOD_FOR_BLOOD}+`, toCardId: `${BLOOD_FOR_BLOOD}++`,
        });
    });

    it('a rare at its limit falls back to the next rarity owned', () => {
        const player = playerWith(['grey-strike', `${BLOOD_FOR_BLOOD}+++`]);
        expect(rollEliteUpgrade(player, seededRng(5))).toEqual({ fromCardId: 'grey-strike', toCardId: 'grey-strike+' });
    });

    it('is null, and the option hides, when nothing owned can be upgraded', () => {
        const capped = playerWith(['grey-strike+', 'grey-ward+'], [`${BLOOD_FOR_BLOOD}+++`]);
        expect(rollEliteUpgrade(capped, seededRng(1))).toBeNull();
        expect(rollEliteReward(capped, seededRng(1)).upgrade).toBeNull();
        expect(rollEliteReward(capped, seededRng(1)).cards).toHaveLength(3);
        expect(rollEliteUpgrade(playerWith([]), seededRng(1))).toBeNull();
    });

    it('the upgrade is a valid replaceCard input: one copy changes', () => {
        const player = greyPlayer();
        const { upgrade } = rollEliteReward(player, seededRng(11));
        const next = replaceCard(player, upgrade!.fromCardId, upgrade!.toCardId);
        const all = [...next.knownCards, ...(next.combatRewardCards ?? [])];
        expect(all.filter(id => id === upgrade!.toCardId)).toHaveLength(1);
        expect(all).toHaveLength(STARTING_CARD_IDS.length);
    });
});
