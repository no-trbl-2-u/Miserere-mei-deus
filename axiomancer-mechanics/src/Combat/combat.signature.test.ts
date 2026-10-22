/**
 * The signature kit (`plan/revamp/relics.md`): The Open Hand opens the mercy
 * choice on a foe that can be befriended once it is low enough; Crimson
 * Covenant (the Bleeding Signet) is TETHER 3 and the next SACRIFICE this turn
 * counts twice.
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../Character/characters.mock';
import { BrineHag, FloatEye, DeathBeholder } from '../Enemy/enemy.library';
import type { Enemy } from '../Enemy/types';
import {
    initializeCombatEncounter, rollEncounterDice, playSignatureSkill, selectMercyChoice,
} from './combat.engine';
import {
    SIGNATURE_SKILL_LIST, SIGNATURE_COST, getSignatureSkill, signatureCastBlock,
} from './combat.signature';
import type { CombatEncounterState } from './combat.encounter.types';
import { equipItem } from '../Character/equipment.reducer';
import { getRelicById } from '../Items/relic.library';
import { deepClone } from '../Utils';

const OPEN_HAND = 'sig-disarming-plea';
const COVENANT = 'sig-crimson-covenant';

function encounter(enemy: Enemy, hpFrac = 1, conviction = SIGNATURE_COST): CombatEncounterState {
    let s = initializeCombatEncounter(Player, enemy, ['grey-strike', 'grey-ward', 'grey-word'], 1);
    s = rollEncounterDice(s).state;
    const health = Math.floor(s.enemy.maxHealth * hpFrac);
    return { ...s, conviction, enemy: { ...s.enemy, health } };
}

describe('R4 — the signature kit', () => {
    it('is The Open Hand and Crimson Covenant, both at the flat cost', () => {
        expect(SIGNATURE_SKILL_LIST.map(s => s.id)).toEqual([OPEN_HAND, COVENANT]);
        expect(getSignatureSkill(OPEN_HAND)!.kind).toBe('mercy');
        expect(getSignatureSkill(COVENANT)!.kind).toBe('covenant');
        for (const sig of SIGNATURE_SKILL_LIST) expect(sig.cost).toBe(SIGNATURE_COST);
        expect(getSignatureSkill(COVENANT)!.description).toBe('TETHER 3. Your next SACRIFICE this turn counts twice.');
    });

    it('an unknown id resolves to nothing', () => {
        expect(getSignatureSkill('sig-unknown')).toBeUndefined();
    });
});

describe('R4 — The Open Hand is the befriend', () => {
    it('opens the mercy choice on the Brine Hag at or below 30% VITAE', () => {
        const s = encounter(BrineHag, 0.3);
        const r = playSignatureSkill(s, OPEN_HAND);
        expect(r.events.some(e => e.kind === 'signature-cast')).toBe(true);
        expect(r.events.some(e => e.kind === 'mercy-opened')).toBe(true);
        expect(r.state.mercyChoiceActive).toBe(true);
        expect(r.state.phase).toBe('mercy-choice');
        expect(r.state.conviction).toBe(0);
        expect(r.state.enemy.health).toBe(s.enemy.health); // no damage, no QUARTER
        expect(r.state.enemy.effects).toEqual(s.enemy.effects);
    });

    it('sparing the befriended Brine Hag ends the fight in mercy', () => {
        const opened = playSignatureSkill(encounter(BrineHag, 0.2), OPEN_HAND).state;
        const spared = selectMercyChoice(opened, 'spare');
        expect(spared.state.finalOutcome).toBe('mercy');
    });

    it('refuses above the Brine Hag\'s gate and spends nothing', () => {
        const s = encounter(BrineHag, 0.9);
        expect(signatureCastBlock(s, getSignatureSkill(OPEN_HAND)!)).toMatch(/not yet low enough/);
        const r = playSignatureSkill(s, OPEN_HAND);
        expect(r.state.conviction).toBe(SIGNATURE_COST);
        expect(r.state.mercyChoiceActive).toBeFalsy();
        expect(r.events.some(e => e.kind === 'effect-fizzled')).toBe(true);
    });

    it.each([
        ['Float-Eye', FloatEye],
        ['the Death Beholder', DeathBeholder],
    ])('refuses on %s, which cannot be befriended', (_name, enemy) => {
        const s = encounter(enemy, 0.05);
        expect(signatureCastBlock(s, getSignatureSkill(OPEN_HAND)!)).toMatch(/will not be befriended/);
        const r = playSignatureSkill(s, OPEN_HAND);
        expect(r.state.conviction).toBe(SIGNATURE_COST);
        expect(r.state.mercyChoiceActive).toBeFalsy();
    });

    it('names the Conviction shortfall first', () => {
        const s = encounter(BrineHag, 0.1, SIGNATURE_COST - 1);
        expect(signatureCastBlock(s, getSignatureSkill(OPEN_HAND)!)).toBe(`Need ${SIGNATURE_COST} ◆ Conviction`);
    });
});

describe('Crimson Covenant', () => {
    it('spends 4 Conviction: TETHER 3 from this turn, and the next SACRIFICE counts twice', () => {
        const s = encounter(FloatEye);
        expect(s.program).toBeUndefined();
        const r = playSignatureSkill(s, COVENANT);
        expect(r.events.some(e => e.kind === 'signature-cast')).toBe(true);
        expect(r.state.conviction).toBe(0);
        expect(r.state.program!.tetherUntil).toBe(s.round + 2);
        expect(r.state.program!.nextTwice).toBe(true);
    });

    it('refuses while a counts-twice is already waiting, and spends nothing', () => {
        const once = playSignatureSkill(encounter(FloatEye, 1, SIGNATURE_COST * 2), COVENANT).state;
        expect(signatureCastBlock(once, getSignatureSkill(COVENANT)!)).toMatch(/already counts twice/);
        const again = playSignatureSkill(once, COVENANT);
        expect(again.state.conviction).toBe(SIGNATURE_COST);
    });

    it('names the Conviction shortfall first', () => {
        const s = encounter(FloatEye, 1, SIGNATURE_COST - 1);
        expect(signatureCastBlock(s, getSignatureSkill(COVENANT)!)).toBe(`Need ${SIGNATURE_COST} ◆ Conviction`);
    });
});

describe('the Bleeding Signet worn beside the Suppliant\'s Ring', () => {
    it('adds 20 max VITAE and both signatures reach the fight; taking it off clamps VITAE', () => {
        const worn = equipItem(deepClone(Player), deepClone(getRelicById('relic-bleeding-signet')!));
        expect(worn.maxHealth).toBe(Player.maxHealth + 20);
        expect(worn.health).toBe(Player.health + 20);
        expect(worn.equipment.accessories.map(a => a.id)).toEqual(['relic-disarming-plea', 'relic-bleeding-signet']);
        const s = initializeCombatEncounter(worn, FloatEye, ['grey-strike'], 1);
        expect(s.signatures).toEqual([OPEN_HAND, COVENANT]);
        expect(s.player.maxHealth).toBe(Player.maxHealth + 20);
    });
});
