/**
 * A new run opened as a character (CH1 A2): its relic worn, its stats and
 * the max VITAE they give, the ten-card character deck, and its id and two
 * starting lanes on the player. A run with no character is today's run, an
 * unknown id throws, and a saved run with no character round-trips through
 * `migrate` with neither field.
 */

import { describe, it, expect } from 'vitest';
import { createNewGameState, GAME_STATE_VERSION } from '../game.reducer';
import { migrate } from '../game.migrate';
import { getEquippedItems } from '../../Character';
import { CHARACTER_GREY_DECK, type CharacterDefinition } from '../../Character/roster';
import { getRelicById } from '../../Items/relic.library';
import { STARTING_CARD_IDS } from '../../Combat/combat.rewards';
import { calculateMaxHealth, deepClone } from '../../Utils';

/** The Crimson Circlet: a real relic with a +20 max VITAE line. */
const RELIC_ID = 'relic-crimson-circlet';

const FIXTURE: CharacterDefinition = {
    id: 'fixture-knight',
    name: 'Fixture Knight',
    portraitKey: 'portrait-1',
    startingRelicId: RELIC_ID,
    baseStats: { heart: 5, body: 7, mind: 3 },
    startingLaneIds: ['lane-x', 'lane-y'],
    startingCardIds: ['card-x', 'card-y'],
    playstyle: 'Bleeds to win.',
};

const ROSTER = [FIXTURE];

describe('createNewGameState with a character (CH1 A2)', () => {
    const run = () => createNewGameState({ characterId: FIXTURE.id, roster: ROSTER });

    it('wears the starting relic in the first relic position', () => {
        const worn = getEquippedItems(run().player.equipment);
        expect(worn.map(p => p.id)).toEqual([RELIC_ID]);
        expect(worn[0]).not.toBe(getRelicById(RELIC_ID));
    });

    it('takes the character\'s stats and the max VITAE they and the relic give', () => {
        const { player } = run();
        expect(player.baseStats).toEqual({ heart: 5, body: 7, mind: 3 });
        const relicBonus = getRelicById(RELIC_ID)!.statModifiers!.find(m => m.stat === 'maxHp')!.value;
        expect(player.maxHealth).toBe(calculateMaxHealth(1, FIXTURE.baseStats) + relicBonus);
        expect(player.health).toBe(player.maxHealth);
        expect(player.level).toBe(1);
    });

    it('deals the ten-card character deck: Blow 3, Ward 3, Word 2 and the two lane cards', () => {
        const { knownCards } = run().player;
        expect(knownCards).toEqual([...CHARACTER_GREY_DECK, 'card-x', 'card-y']);
        expect(knownCards).toHaveLength(10);
    });

    it('records the character id and its two starting lanes', () => {
        const { player } = run();
        expect(player.characterId).toBe(FIXTURE.id);
        expect(player.startingLaneIds).toEqual(['lane-x', 'lane-y']);
        expect(player.name).toBe(FIXTURE.name);
    });

    it('never aliases the definition', () => {
        const { player } = run();
        player.startingLaneIds!.push('lane-z');
        player.baseStats.body = 99;
        expect(FIXTURE.startingLaneIds).toEqual(['lane-x', 'lane-y']);
        expect(FIXTURE.baseStats.body).toBe(7);
    });

    it('throws on an unknown character id', () => {
        expect(() => createNewGameState({ characterId: 'no-such-character', roster: ROSTER }))
            .toThrow(/no-such-character/);
        expect(() => createNewGameState({ characterId: FIXTURE.id })).toThrow(/fixture-knight/);
    });

    it('throws when the character\'s relic is not in the library', () => {
        const lost = { ...FIXTURE, id: 'lost', startingRelicId: 'relic-missing' };
        expect(() => createNewGameState({ characterId: 'lost', roster: [lost] })).toThrow(/relic-missing/);
    });
});

describe('a run with no character is today\'s run', () => {
    it('keeps the apprentice baseline, wears nothing, deals no card and records no character', () => {
        const { player } = createNewGameState();
        expect(player.baseStats).toEqual({ heart: 5, body: 5, mind: 5 });
        expect(getEquippedItems(player.equipment)).toEqual([]);
        expect(player.knownCards).toEqual([]);
        expect(player).not.toHaveProperty('characterId');
        expect(player).not.toHaveProperty('startingLaneIds');
    });

    it('the grey office it is dealt later stays Blow 5, Ward 3, Word 2', () => {
        expect(STARTING_CARD_IDS.filter(id => id === 'grey-strike')).toHaveLength(5);
        expect(STARTING_CARD_IDS.filter(id => id === 'grey-ward')).toHaveLength(3);
        expect(STARTING_CARD_IDS.filter(id => id === 'grey-word')).toHaveLength(2);
    });

    it('a current-version save with no character loads unchanged through migrate', () => {
        const saved = deepClone(createNewGameState());
        const loaded = migrate(deepClone(saved), GAME_STATE_VERSION);
        expect(loaded).toEqual(saved);
        expect(loaded.player).not.toHaveProperty('characterId');
        expect(loaded.player).not.toHaveProperty('startingLaneIds');
    });

    it('a current-version character save keeps both fields through migrate', () => {
        const saved = deepClone(createNewGameState({ characterId: FIXTURE.id, roster: ROSTER }));
        const loaded = migrate(deepClone(saved), GAME_STATE_VERSION);
        expect(loaded.player.characterId).toBe(FIXTURE.id);
        expect(loaded.player.startingLaneIds).toEqual(['lane-x', 'lane-y']);
    });
});
