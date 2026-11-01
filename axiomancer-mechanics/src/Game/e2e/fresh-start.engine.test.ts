/**
 * Hermetic engine test — the very start.
 *
 * A brand-new run begins with NOTHING: no items, no worn equipment, no coin,
 * no experience, and no relic. Nothing hands one over later: resolving a node
 * and staging a fight leave the player exactly as they were. The Suppliant's
 * Ring stays in the library, unsourced. Presets build the same relic-free
 * character.
 */

import { describe, it, expect } from 'vitest';
import { createNewGameState, gameReducer } from '../game.reducer';
import { createCharacter } from '../../Character';
import { getRelicById, getSignaturesForLoadout, relicLibrary } from '../../Items/relic.library';
import { buildCharacterFromPreset, characterPresets } from '../../Character/presets';
import { initializeCombatEncounter } from '../../Combat/combat.engine';
import { FloatEye } from '../../Enemy/enemy.library';
import { deepClone } from '../../Utils';

describe('createNewGameState — the very start', () => {
    it('seeds no items, no equipment, no coin and no experience', () => {
        const s = createNewGameState();
        expect(s.player.inventory).toEqual([]);
        expect(s.player.equipment.weapon).toBeNull();
        expect(s.player.equipment.armor).toBeNull();
        expect(s.player.equipment.relics).toEqual([null, null, null]);
        expect(s.player.currency).toBe(0);
        expect(s.player.experience).toBe(0);
        expect(s.player.level).toBe(1);
        expect(getSignaturesForLoadout(s.player.equipment)).toEqual([]);
    });

    it('keeps the apprentice baseline stats (5/5/5) — the floor is items, not stats', () => {
        const s = createNewGameState();
        expect(s.player.baseStats).toEqual({ heart: 5, body: 5, mind: 5 });
        const bare = createCharacter({ name: 'Bare', level: 1, baseStats: { heart: 5, body: 5, mind: 5 } });
        expect(s.player.maxHealth).toBe(bare.maxHealth);
    });

    it('resolving the first node and staging the first fight hand over nothing', () => {
        const s = createNewGameState();
        const afterNode = gameReducer(s, { type: 'PROCESS_NODE' });
        const staged = gameReducer(afterNode, { type: 'START_COMBAT', payload: { target: deepClone(FloatEye) } });
        expect(staged.player.inventory.filter(i => i.category === 'equipment')).toEqual([]);
        expect(staged.player.equipment.relics).toEqual([null, null, null]);
        expect(staged.flags).not.toContain('first-node-relic-granted');
        const fight = initializeCombatEncounter(staged.player, deepClone(FloatEye), undefined, 3);
        expect(fight.signatures).toEqual([]);
    });
});

describe("the Suppliant's Ring — kept in the library, unsourced", () => {
    it('still resolves by id and carries no stat modifier', () => {
        const ring = getRelicById('relic-disarming-plea');
        expect(ring?.grantsSignature).toBe('sig-disarming-plea');
        expect(ring!.statModifiers).toEqual([]);
        expect(relicLibrary.map(r => r.id)).toContain('relic-disarming-plea');
    });
});

describe('presets start relic-free too', () => {
    it('a preset-built character wears no relic', () => {
        const c = buildCharacterFromPreset(characterPresets[0]!);
        expect(getSignaturesForLoadout(c.equipment)).toEqual([]);
    });
});
