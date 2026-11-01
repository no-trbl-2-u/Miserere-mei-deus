/**
 * Hermetic engine test: the new-run kit. Every roster character opens a run
 * wearing the grey pair (the Opening Blade and the Bracing Coat) beside its
 * starting relic, carried in the inventory too; the pre-run shell wears
 * nothing; a save made before the pair existed loads with its slots as they
 * were, and the pair is never granted to it.
 */

import { describe, expect, it } from 'vitest';

import { CHARACTER_ROSTER } from '../../Character/roster';
import { getEquippedItems } from '../../Character';
import { unequipItem } from '../../Character/equipment.reducer';
import { initializeCombatEncounter, rollEncounterDice } from '../../Combat/combat.engine';
import { FloatEye } from '../../Enemy/enemy.library';
import { getEquipmentPieceById } from '../../Items/equipment.library';
import { deepClone } from '../../Utils';
import { migrate } from '../game.migrate';
import { createNewGameState, GAME_STATE_VERSION } from '../game.reducer';

describe('a new run wears the grey pair, for every roster character', () => {
    for (const def of CHARACTER_ROSTER) {
        describe(def.name, () => {
            const { player } = createNewGameState({ characterId: def.id });

            it('wears the Opening Blade and the Bracing Coat beside its starting relic', () => {
                expect(player.equipment.weapon?.id).toBe('weapon-opening-blade');
                expect(player.equipment.armor?.id).toBe('armor-bracing-coat');
                expect(player.equipment.relics[0]?.id).toBe(def.startingRelicId);
                expect(getEquippedItems(player.equipment)).toHaveLength(3);
            });

            it('carries the pair in the inventory too, as copies of the library pieces', () => {
                expect(player.inventory.map(i => i.id)).toEqual(['weapon-opening-blade', 'armor-bracing-coat']);
                expect(player.equipment.weapon).toEqual(getEquipmentPieceById('weapon-opening-blade'));
                expect(player.equipment.weapon).not.toBe(getEquipmentPieceById('weapon-opening-blade'));
                expect(player.inventory[0]).not.toBe(player.equipment.weapon);
            });

            it('adds no stat: max VITAE is the stats and the relic alone', () => {
                const bare = unequipItem(unequipItem(player, 'weapon'), 'armor');
                expect(player.maxHealth).toBe(bare.maxHealth);
                expect(player.health).toBe(player.maxHealth);
            });

            it('plays the first fight as today: a special pays +2 Conviction', () => {
                const fight = initializeCombatEncounter(deepClone(player), deepClone(FloatEye), undefined, 3);
                expect(rollEncounterDice(fight).state.equipmentDice?.special).toEqual({ kind: 'conviction', amount: 2 });
            });
        });
    }

    it('two runs never share a piece', () => {
        const a = createNewGameState({ characterId: CHARACTER_ROSTER[0]!.id }).player;
        const b = createNewGameState({ characterId: CHARACTER_ROSTER[0]!.id }).player;
        expect(a.equipment.weapon).not.toBe(b.equipment.weapon);
        expect(a.equipment.armor).not.toBe(b.equipment.armor);
    });

    it('the pre-run shell (no character) still wears nothing', () => {
        const { player } = createNewGameState();
        expect(player.equipment.weapon).toBeNull();
        expect(player.equipment.armor).toBeNull();
        expect(player.inventory).toEqual([]);
    });
});

describe('a save made before the pair existed', () => {
    it('loads with its slots as they were: nothing granted, nothing taken', () => {
        const saved = deepClone(createNewGameState({ characterId: CHARACTER_ROSTER[0]!.id }));
        saved.player.equipment = { ...saved.player.equipment, weapon: null, armor: null };
        saved.player.inventory = [];
        const loaded = migrate(deepClone(saved), GAME_STATE_VERSION);
        expect(loaded.player.equipment.weapon).toBeNull();
        expect(loaded.player.equipment.armor).toBeNull();
        expect(loaded.player.inventory).toEqual([]);
        expect(loaded).toEqual(saved);
    });

    it('a save that wears its pair round-trips the pair', () => {
        const saved = deepClone(createNewGameState({ characterId: CHARACTER_ROSTER[0]!.id }));
        const loaded = migrate(deepClone(saved), GAME_STATE_VERSION);
        expect(loaded.player.equipment.weapon?.id).toBe('weapon-opening-blade');
        expect(loaded.player.equipment.armor?.id).toBe('armor-bracing-coat');
        expect(loaded).toEqual(saved);
    });
});
