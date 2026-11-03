/**
 * A save made while befriending was still in the game, loaded the way the app
 * loads one (`unwrap`, the one load path): the ring's new words and signature on
 * every screen that reads it, the old story flag under its new name, and a fight
 * that plays.
 */

import { describe, expect, it } from '@jest/globals';
import {
    createNewGameState, GAME_STATE_VERSION, getRelicById, getSignatureSkill, initializeCombatEncounter,
    playSignatureSkill, rollEncounterDice, signatureText, ENEMY_REGISTRY,
} from '@mechanics';

import { CURRENT_SCHEMA_VERSION, unwrap } from '@/state/persistence/migrations';
import { selectEquipmentDetailViewModel } from '@/state/presenters/equipment-detail.engine';

const RING_ID = 'relic-disarming-plea';
const SIG_ID = 'sig-disarming-plea';
const OLD_RING_WORDS = 'Offer a foe that can be befriended the choice of mercy, once it is low enough.';

/** The save as it sat on disk, at the version it carried. */
function oldEnvelope() {
    const fresh = createNewGameState({ startMap: 'breakwater' });
    const oldRing = { ...getRelicById(RING_ID)!, description: OLD_RING_WORDS };
    const state = JSON.parse(JSON.stringify({
        ...fresh,
        version: 41,
        flags: [...fresh.flags, 'befriended-green-jelly'],
        codex: { unlockedEntries: ['codex-green-jelly'], defeatedEnemies: ['green-jelly'] },
        player: {
            ...fresh.player,
            inventory: [...fresh.player.inventory, oldRing],
            equipment: { ...fresh.player.equipment, relics: [oldRing, null, null] },
        },
    }));
    return { schemaVersion: CURRENT_SCHEMA_VERSION, state };
}

describe('a save from before the mercy check, through the app load path', () => {
    it('the saved shape did not change, so the save is not turned away', () => {
        expect(GAME_STATE_VERSION).toBe(41);
        expect(() => unwrap(oldEnvelope())).not.toThrow();
    });

    it('the ring on its long-press card reads the new signature and the new words', () => {
        const state = unwrap(oldEnvelope());
        const vm = selectEquipmentDetailViewModel(state as never, RING_ID);
        expect(vm?.signature?.id).toBe(SIG_ID);
        expect(vm?.signature?.description).toBe(signatureText(getSignatureSkill(SIG_ID)!, state.player.baseStats));
        expect(vm?.flavor).toBe(getRelicById(RING_ID)!.description);
        expect(vm?.flavor).not.toContain('befriended');
    });

    it('carries the flag and keeps the codex', () => {
        const state = unwrap(oldEnvelope());
        expect(state.flags).toContain('spared-green-jelly');
        expect(state.flags).not.toContain('befriended-green-jelly');
        expect(state.codex.unlockedEntries).toEqual(['codex-green-jelly']);
        expect(state.codex.defeatedEnemies).toEqual(['green-jelly']);
    });

    it('plays: a fight from the save casts The Open Hand and goes on', () => {
        const { player } = unwrap(oldEnvelope());
        const foe = ENEMY_REGISTRY['float-eye'];
        let fight = rollEncounterDice(initializeCombatEncounter(player, { ...foe }, undefined, 3)).state;
        expect(fight.signatures).toEqual([SIG_ID]);
        fight = { ...fight, conviction: 4 };
        const cast = playSignatureSkill(fight, SIG_ID).state;
        expect(cast.program?.mercy?.clock).toBe(3);
        expect(cast.program?.mercy?.total).toBeGreaterThan(0);
        expect(cast.finalOutcome).toBeNull();
    });
});
