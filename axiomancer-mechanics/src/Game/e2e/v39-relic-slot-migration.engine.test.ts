/**
 * Hermetic engine test — the v38 → v39 hop: the third slot kind is `relic`.
 *
 * A v38 save stored relics with the old slot name and a flavour kind, and the
 * loadout's relic row under its old name. The hop re-slots every equipment
 * object wherever it sits (inventory, worn loadout, an inline quest reward)
 * and renames the row, and nothing the player wears, carries or fights with
 * changes.
 */

import { describe, it, expect } from 'vitest';
import { migrate } from '../game.migrate';
import { createNewGameState, GAME_STATE_VERSION, gameReducer } from '../game.reducer';
import type { GameState } from '../types';
import { reslotRelicPiece, reslotRelicSave } from '../legacy-slots';
import { createCharacter } from '../../Character';
import type { Character } from '../../Character/types';
import { grantItem } from '../../Items/item-grant';
import { cloneRelic, getRelicById } from '../../Items/relic.library';
import type { Equipment } from '../../Items/types';
import { initializeCombatEncounter } from '../../Combat/combat.engine';
import { FloatEye } from '../../Enemy/enemy.library';
import { deepClone } from '../../Utils';

const RING_ID = 'relic-disarming-plea';
const SIGNET_ID = 'relic-bleeding-signet';

/** A relic as a v38 save stored it: the old slot name and a kind. */
function asV38Piece(piece: Equipment): Record<string, unknown> {
    return { ...piece, slot: 'accessory', accessoryKind: 'ring' };
}

/** The player of today, wearing the Signet and carrying the Ring. */
function player(): Character {
    const bare = createCharacter({ name: 'Player', level: 3, baseStats: { heart: 5, body: 5, mind: 5 } });
    const worn = grantItem(bare, getRelicById(SIGNET_ID)!, { equip: true }).character;
    return grantItem(worn, getRelicById(RING_ID)!, { equip: false }).character;
}

/** The same player, a quest reward and all, written in the v38 shape. */
function v38Save(): { raw: Record<string, unknown>; today: Character } {
    const fresh = createNewGameState();
    const today = player();
    const { relics, ...rest } = today.equipment;
    const questReward = asV38Piece(cloneRelic(getRelicById(RING_ID)!));
    const raw = {
        ...fresh,
        version: 38,
        player: {
            ...today,
            inventory: today.inventory.map(it => (it.category === 'equipment' ? asV38Piece(it as Equipment) : it)),
            equipment: { ...rest, accessories: relics.map(asV38Piece) },
        },
        quests: {
            ...fresh.quests,
            active: [{
                name: 'test-quest', description: '', mapName: fresh.world.currentMap,
                objectives: [], status: 'active',
                reward: { kind: 'item', item: questReward },
            }],
        },
    } as unknown as Record<string, unknown>;
    return { raw, today };
}

describe('migrate v38 → v39 — the relic slot', () => {
    it('is the current version', () => {
        expect(GAME_STATE_VERSION).toBe(39);
        expect(migrate(v38Save().raw, 38).version).toBe(39);
    });

    it('keeps the same pieces worn and carried, under relics', () => {
        const { raw, today } = v38Save();
        const migrated = migrate(raw, 38);
        expect(migrated.player.equipment.relics.map(r => r.id)).toEqual([SIGNET_ID]);
        expect(migrated.player.equipment.relics.every(r => r.slot === 'relic')).toBe(true);
        expect(migrated.player.inventory.map(i => i.id)).toEqual(today.inventory.map(i => i.id));
        expect(migrated.player.equipment).toEqual(today.equipment);
        expect(migrated.player.inventory).toEqual(today.inventory);
    });

    it('keeps maxHealth and the signatures for the next fight', () => {
        const { raw, today } = v38Save();
        const migrated = migrate(raw, 38) as GameState;
        expect(migrated.player.maxHealth).toBe(today.maxHealth);
        const staged = gameReducer(migrated, { type: 'START_COMBAT', payload: { target: deepClone(FloatEye) } });
        const fight = initializeCombatEncounter(staged.player, deepClone(FloatEye), undefined, 7);
        const expected = initializeCombatEncounter(today, deepClone(FloatEye), undefined, 7);
        expect(fight.signatures).toEqual(['sig-bleeding-signet']);
        expect(fight.signatures).toEqual(expected.signatures);
    });

    it('re-slots an inline quest reward too', () => {
        const migrated = migrate(v38Save().raw, 38);
        const reward = migrated.quests.active[0]!.reward as { kind: 'item'; item: Equipment };
        expect(reward.item.slot).toBe('relic');
        expect('accessoryKind' in reward.item).toBe(false);
    });

    it('leaves no old slot word anywhere in the save', () => {
        const json = JSON.stringify(migrate(v38Save().raw, 38));
        expect(json).not.toMatch(/accessoryKind|"accessories"|"accessory"/);
    });

    it('the re-slot is idempotent and keeps references on a current save', () => {
        const once = reslotRelicSave(v38Save().raw);
        expect(reslotRelicSave(once)).toBe(once);
        const ring = getRelicById(RING_ID)!;
        expect(reslotRelicPiece(ring)).toBe(ring);
    });
});
