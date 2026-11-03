/**
 * A save made while befriending was still in the game.
 *
 * The fixture is shaped as such a save was written, through JSON and at the
 * version it carried: the Suppliant's Ring worn and in old words, the Green
 * Jelly's old story flag, its journal entry and ledger slug. It loads through
 * the load path, reads the ring's new signature, and plays.
 */

import { describe, it, expect } from 'vitest';

import { GreenJelly, FloatEye } from '../../Enemy/enemy.library';
import { playSignatureSkill, initializeCombatEncounter, rollEncounterDice, resolveThreatPhase } from '../../Combat/combat.engine';
import { getSignatureSkill } from '../../Combat/combat.signature';
import { scaleFor } from '../../Combat/stat-scaling';
import { getRelicById, getSignaturesForLoadout } from '../../Items/relic.library';
import { createGameStore } from '../store';
import { nullAdapter } from '../persistence/null.adapter';
import { createNewGameState, GAME_STATE_VERSION } from '../game.reducer';
import { dropCutNodes, dropRetiredFlags, dropUnknownCardIds, migrate, refreshRelicText } from '../game.migrate';
import type { GameState } from '../types';

/** The version such a save carries. A bump would turn it away (`migrate`), so the shape stays. */
const SAVE_VERSION = 41;
const RING_ID = 'relic-disarming-plea';
const SIG_ID = 'sig-disarming-plea';
const OLD_RING_WORDS = 'Offer a foe that can be befriended the choice of mercy, once it is low enough.';
const OLD_FLAG = 'befriended-green-jelly';
const NEW_FLAG = 'spared-green-jelly';

/** The save as it sat on disk: plain JSON, no live references. */
function oldSave(): unknown {
    const fresh = createNewGameState({ startMap: 'breakwater' });
    const oldRing = { ...getRelicById(RING_ID)!, description: OLD_RING_WORDS };
    return JSON.parse(JSON.stringify({
        ...fresh,
        version: SAVE_VERSION,
        flags: [...fresh.flags, OLD_FLAG],
        codex: { unlockedEntries: [GreenJelly.journalEntry!.id], defeatedEnemies: ['green-jelly'] },
        player: {
            ...fresh.player,
            inventory: [...fresh.player.inventory, oldRing],
            equipment: { ...fresh.player.equipment, relics: [oldRing, null, null] },
        },
    }));
}

/** The load path both clients run: `migrate`, then the load-time cleanups. */
function load(raw: unknown): GameState {
    const version = (raw as { version: number }).version;
    const state = migrate(raw, version);
    return refreshRelicText(dropCutNodes(dropRetiredFlags(dropUnknownCardIds(state))));
}

describe('a save made before the mercy check', () => {
    it('loads at the version it carries: the saved shape did not change', () => {
        expect(GAME_STATE_VERSION).toBe(SAVE_VERSION);
        expect(() => load(oldSave())).not.toThrow();
    });

    it('keeps the ring, and the ring reads its new words wherever it is carried', () => {
        const { player } = load(oldSave());
        const worn = player.equipment.relics[0]!;
        const carried = player.inventory.find(i => i.id === RING_ID)!;
        const words = getRelicById(RING_ID)!.description;
        expect(worn.id).toBe(RING_ID);
        expect(worn.description).toBe(words);
        expect(carried.description).toBe(words);
        expect(words).not.toBe(OLD_RING_WORDS);
    });

    it('the worn ring grants the signature under the id the save names', () => {
        const { player } = load(oldSave());
        expect(getSignaturesForLoadout(player.equipment)).toEqual([SIG_ID]);
        expect(getSignatureSkill(SIG_ID)!.name).toBe('The Open Hand');
    });

    it('plays: a fight from the save casts The Open Hand as MERCY on the foe, and goes on', () => {
        const { player } = load(oldSave());
        let fight = rollEncounterDice(initializeCombatEncounter(player, { ...FloatEye }, undefined, 3)).state;
        expect(fight.signatures).toEqual([SIG_ID]);
        fight = { ...fight, conviction: 4, enemy: { ...fight.enemy, health: 10 } };
        const cast = playSignatureSkill(fight, SIG_ID).state;
        const mercy = scaleFor(6, fight.player.baseStats, 'heart', 'repeating');
        expect(cast.program!.mercy).toEqual({ total: mercy, clock: 3 });
        expect(cast.enemy.health).toBe(10 + mercy);
        expect(cast.finalOutcome).toBeNull();
        expect(() => resolveThreatPhase(cast)).not.toThrow();
    });

    it('carries the old story flag to its new name, so a Spare does not grant it twice', () => {
        const loaded = load(oldSave());
        expect(loaded.flags).toContain(NEW_FLAG);
        expect(loaded.flags).not.toContain(OLD_FLAG);
        expect(GreenJelly.spareStory!.flagSet).toBe(NEW_FLAG);

        const store = createGameStore(nullAdapter, loaded);
        store.getState().startCombat(GreenJelly);
        const report = store.getState().endCombat('victory', undefined, { spared: true });
        expect(store.getState().flags.filter(f => f === NEW_FLAG)).toHaveLength(1);
        // The journal entry and the ledger came through: nothing is unlocked twice.
        expect(report.journalEntryUnlocked).toBeUndefined();
        expect(store.getState().codex.defeatedEnemies).toEqual(['green-jelly']);
    });

    it('a save holding both flag names keeps one', () => {
        const raw = oldSave() as { flags: string[] };
        const both = { ...raw, flags: [...raw.flags, NEW_FLAG] };
        const flags = load(both).flags;
        expect(flags.filter(f => f === NEW_FLAG)).toHaveLength(1);
        expect(flags).not.toContain(OLD_FLAG);
    });

    it('a save with nothing old comes back as itself', () => {
        const fresh = createNewGameState({ startMap: 'breakwater' });
        expect(refreshRelicText(fresh)).toBe(fresh);
        expect(dropRetiredFlags(fresh)).toBe(fresh);
    });
});
