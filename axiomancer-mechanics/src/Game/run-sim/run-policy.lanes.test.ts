import { describe, expect, it } from 'vitest';

import { CARD_LANES, GREY_LANE, type CardLane } from '../../Cards/card.lanes';
import { getCardById } from '../../Cards/cards.library';
import { CHARACTER_ROSTER, type CharacterDefinition } from '../../Character/roster';
import { relicLibrary } from '../../Items/relic.library';
import {
    cardKeywords,
    cardLaneId,
    characterForLane,
    characterLaneFit,
    characterOpensLane,
    itemLaneId,
    laneKeywords,
    laneStat,
} from './run-policy.lanes';

/** A roster character with only the fields the lane rules read changed. */
const character = (over: Partial<CharacterDefinition>): CharacterDefinition => ({ ...CHARACTER_ROSTER[0]!, ...over });

describe('the lane knowledge the bots read', () => {
    it('finds every lane card\'s lane, upgraded copies included', () => {
        for (const l of CARD_LANES) {
            const first = l.cardIds[0]!;
            expect(cardLaneId(first)).toBe(l.id);
            expect(cardLaneId(`${first}+`)).toBe(l.id);
        }
        expect(cardLaneId('no-such-card')).toBeUndefined();
    });

    it('reads a lane\'s own vocabulary off its cards, without the grey office\'s words', () => {
        const grey = new Set(GREY_LANE.cardIds.flatMap(id => cardKeywords(id)));
        for (const l of CARD_LANES.filter(x => x.id !== 'grey')) {
            const words = laneKeywords(l.id);
            expect(words.size).toBeGreaterThan(0);
            for (const w of words) expect(grey.has(w)).toBe(false);
        }
        expect(laneKeywords('blood-price').has('SACRIFICE')).toBe(true);
        expect(laneKeywords('elementalist').has('INFERNO')).toBe(true);
        expect(laneKeywords('no-such-lane').size).toBe(0);
    });

    it('raises the stat most of a lane\'s cards are paid in', () => {
        for (const l of CARD_LANES) {
            const count = (c: string) => l.cardIds.filter(id => getCardById(id)?.color === c).length;
            const stat = laneStat(l.id);
            for (const c of ['heart', 'body', 'mind']) expect(count(stat)).toBeGreaterThanOrEqual(count(c));
        }
        // A fixture lane of one card raises that card's colour.
        const one = CARD_LANES.flatMap(l => l.cardIds).find(id => getCardById(id)?.color === 'mind')!;
        const fixture: CardLane[] = [{ id: 'fx', name: 'fx', cardIds: [one], testDeck: [] }];
        expect(laneStat('fx', fixture)).toBe(getCardById(one)!.color);
        expect(laneStat('nowhere', fixture)).toBe('heart');
    });

    it('reads which lane a relic opens from the relic library', () => {
        for (const relic of relicLibrary.filter(r => r.laneId)) {
            expect(itemLaneId(relic.id)).toBe(relic.laneId);
        }
        expect(itemLaneId('no-such-relic')).toBeUndefined();
    });

    it('rates how a character opens a lane: starting lane, starting relic, or not at all', () => {
        const def = CHARACTER_ROSTER[0]!;
        const relicLane = itemLaneId(def.startingRelicId)!;
        expect(characterLaneFit(def, def.startingLaneIds[0])).toBe(2);
        expect(characterLaneFit(def, relicLane)).toBe(1);
        const outside = CARD_LANES.find(l => l.id !== 'grey' && l.id !== relicLane && !def.startingLaneIds.includes(l.id));
        if (outside) {
            expect(characterLaneFit(def, outside.id)).toBe(0);
            expect(characterOpensLane(def, outside.id)).toBe(false);
        }
        expect(characterOpensLane(def, relicLane)).toBe(true);
    });

    it('opens as the character whose starting lanes hold the lane, else its relic\'s, else the closest fit', () => {
        const [a, b] = CARD_LANES.filter(l => l.id !== 'grey');
        const relic = relicLibrary.find(r => r.laneId === b!.id)!;
        const other = relicLibrary.find(r => r.laneId && r.laneId !== a!.id && r.laneId !== b!.id)!;
        const plain = character({ id: 'plain', startingLaneIds: ['x', 'y'], startingRelicId: other.id, baseStats: { heart: 9, body: 9, mind: 9 } });
        const ringed = character({ id: 'ringed', startingLaneIds: ['x', 'y'], startingRelicId: relic.id });
        const laned = character({ id: 'laned', startingLaneIds: [a!.id, 'y'], startingRelicId: other.id });
        expect(characterForLane([plain, ringed, laned], a!.id).id).toBe('laned');
        expect(characterForLane([plain, ringed, laned], b!.id).id).toBe('ringed');
        // No one opens the lane: the most of the lane's stat wins, then roster order.
        const strong = character({ id: 'strong', startingLaneIds: ['x', 'y'], startingRelicId: other.id, baseStats: { heart: 1, body: 1, mind: 1, [laneStat(a!.id)]: 13 } });
        expect(characterForLane([plain, strong], a!.id).id).toBe('strong');
        expect(() => characterForLane([], a!.id)).toThrow(/no character/);
    });
});
