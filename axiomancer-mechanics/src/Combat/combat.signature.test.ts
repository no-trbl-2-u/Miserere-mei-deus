/**
 * The signature kit (`plan/revamp/relics.md`): The Open Hand opens the mercy
 * choice on a foe that can be befriended once it is low enough; the three
 * Blood Price signatures (phase LR1d): Crimson Return (the Crimson Circlet)
 * makes the next SACRIFICE heal instead of cost, Ruby Tithe (the Ruby Signet)
 * makes it add LEECH equal to the VITAE paid, and Open Vein (the Bleeding
 * Signet) HEALs 5 and triggers the foe's LEECH. Each pays its own cost.
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../Character/characters.mock';
import { GreenJelly, FloatEye, DeathBeholder, Sandbag_01 } from '../Enemy/enemy.library';
import type { Enemy } from '../Enemy/types';
import {
    initializeCombatEncounter, rollEncounterDice, playSignatureSkill, selectMercyChoice, playCombatCard, PROGRAM_KIT,
} from './combat.engine';
import {
    SIGNATURE_SKILL_LIST, getSignatureSkill, signatureCastBlock, OPEN_VEIN_HEAL,
} from './combat.signature';
import { LEECH_TURNS_PER_APPLICATION, initProgramLedger, programTurnStart } from './combat.card-program';
import { scaleFor } from './stat-scaling';
import type { CombatEncounterState, SignatureSkill } from './combat.encounter.types';
import { equipItem } from '../Character/equipment.reducer';
import { getRelicById } from '../Items/relic.library';
import { deepClone } from '../Utils';
import { BLOOD_PRICE_SET } from '../Cards/library/blood-price.cards';

const OPEN_HAND = 'sig-disarming-plea';
const CIRCLET = 'sig-crimson-circlet';
const RUBY = 'sig-ruby-signet';
const VEIN = 'sig-bleeding-signet';
const cost = (id: string): number => getSignatureSkill(id)!.cost;
/** Forfeit Strike (FREE: SACRIFICE 2, DEAL 7), found by name so no trial card id is written here. */
const FORFEIT = BLOOD_PRICE_SET.cards.find(c => c.name === 'Forfeit Strike')!.id;

function encounter(enemy: Enemy, hpFrac = 1, conviction = cost(OPEN_HAND)): CombatEncounterState {
    let s = initializeCombatEncounter(Player, enemy, ['grey-strike', 'grey-ward', 'grey-word'], 1);
    s = rollEncounterDice(s).state;
    const health = Math.floor(s.enemy.maxHealth * hpFrac);
    return { ...s, conviction, enemy: { ...s.enemy, health } };
}

const WILD = { id: 'w', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };

/** A program fight on a 500-VITAE sandbag: Forfeit Strike (FREE: SACRIFICE 2,
 *  DEAL 7) in hand, the player at `vitae`, `conviction` banked. */
function sacFight(vitae: number, conviction: number): CombatEncounterState {
    const enemy = { ...deepClone(Sandbag_01), health: 500, maxHealth: 500 };
    let s = initializeCombatEncounter(Player, enemy, [FORFEIT, ...Array(10).fill('grey-strike')], 7);
    s = rollEncounterDice(s).state;
    return {
        ...s, hand: [{ uid: 't0', cardId: FORFEIT }],
        player: { ...s.player, health: vitae }, dice: [{ ...WILD }], reserve: [], guard: 0, conviction,
    };
}
const strike = (s: CombatEncounterState): CombatEncounterState => playCombatCard(s, { uid: 't0' }, false).state;

describe('the signature kit', () => {
    it('is The Open Hand and the three Blood Price signatures, each at its own cost', () => {
        expect(SIGNATURE_SKILL_LIST.map(s => [s.id, s.kind, s.cost])).toEqual([
            [OPEN_HAND, 'mercy', 4],
            [CIRCLET, 'sacrifice-heals', 5],
            [RUBY, 'sacrifice-leech', 3],
            [VEIN, 'heal-trigger-leech', 4],
        ]);
    });

    it('an unknown id resolves to nothing', () => {
        expect(getSignatureSkill('sig-unknown')).toBeUndefined();
        expect(getSignatureSkill('sig-crimson-covenant')).toBeUndefined();
    });
});

describe('A11 · each signature is gated and paid at its own cost', () => {
    it('a 3-cost signature casts at 3 Conviction and is refused at 2', () => {
        expect(signatureCastBlock(sacFight(100, 2), getSignatureSkill(RUBY)!)).toBe('Need 3 ◆ Conviction');
        const refused = playSignatureSkill(sacFight(100, 2), RUBY);
        expect(refused.state.conviction).toBe(2);
        expect(refused.state.program!.nextSacLeech).toBe(false);
        const cast = playSignatureSkill(sacFight(100, 3), RUBY);
        expect(cast.state.conviction).toBe(0);
        expect(cast.events).toContainEqual(expect.objectContaining({ kind: 'signature-cast', signatureId: RUBY, cost: 3 }));
    });

    it('a 6-cost signature is refused at 5; the 5-cost Circlet casts at 5 and is refused at 4', () => {
        const six: SignatureSkill = { ...getSignatureSkill(RUBY)!, cost: 6 };
        expect(signatureCastBlock(sacFight(100, 5), six)).toBe('Need 6 ◆ Conviction');
        expect(signatureCastBlock(sacFight(100, 6), six)).toBeNull();
        expect(signatureCastBlock(sacFight(100, 4), getSignatureSkill(CIRCLET)!)).toBe('Need 5 ◆ Conviction');
        expect(playSignatureSkill(sacFight(100, 5), CIRCLET).state.conviction).toBe(0);
    });
});

describe('The Open Hand is the befriend', () => {
    it('opens the mercy choice on the Green Jelly at or below 30% VITAE', () => {
        const s = encounter(GreenJelly, 0.3);
        const r = playSignatureSkill(s, OPEN_HAND);
        expect(r.events.some(e => e.kind === 'signature-cast')).toBe(true);
        expect(r.events.some(e => e.kind === 'mercy-opened')).toBe(true);
        expect(r.state.mercyChoiceActive).toBe(true);
        expect(r.state.phase).toBe('mercy-choice');
        expect(r.state.conviction).toBe(0);
        expect(r.state.enemy.health).toBe(s.enemy.health); // no damage, no QUARTER
        expect(r.state.enemy.effects).toEqual(s.enemy.effects);
    });

    it('sparing the befriended Green Jelly ends the fight in mercy', () => {
        const opened = playSignatureSkill(encounter(GreenJelly, 0.2), OPEN_HAND).state;
        const spared = selectMercyChoice(opened, 'spare');
        expect(spared.state.finalOutcome).toBe('mercy');
    });

    it('refuses above the Green Jelly\'s gate and spends nothing', () => {
        const s = encounter(GreenJelly, 0.9);
        expect(signatureCastBlock(s, getSignatureSkill(OPEN_HAND)!)).toMatch(/not yet low enough/);
        const r = playSignatureSkill(s, OPEN_HAND);
        expect(r.state.conviction).toBe(cost(OPEN_HAND));
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
        expect(r.state.conviction).toBe(cost(OPEN_HAND));
        expect(r.state.mercyChoiceActive).toBeFalsy();
    });

    it('names the Conviction shortfall first', () => {
        const s = encounter(GreenJelly, 0.1, cost(OPEN_HAND) - 1);
        expect(signatureCastBlock(s, getSignatureSkill(OPEN_HAND)!)).toBe('Need 4 ◆ Conviction');
    });
});

describe('A10 · Crimson Return (the Crimson Circlet)', () => {
    it('the next SACRIFICE heals what it would have cost instead of costing it, and still counts', () => {
        const armed = playSignatureSkill(sacFight(80, 5), CIRCLET).state;
        expect(armed.program!.nextSacHeals).toBe(true);
        const healed = strike(armed);
        const plain = strike(sacFight(80, 0));
        expect(plain.player.health).toBe(78);
        expect(healed.player.health).toBe(82);
        expect(healed.program!.sacrificeCount).toBe(plain.program!.sacrificeCount);
        expect(healed.program!.sacrificePaid).toBe(0);
        expect(healed.enemy.health).toBe(plain.enemy.health);
        expect(healed.program!.nextSacHeals).toBe(false);
    });

    it('lasts across a turn until a SACRIFICE spends it', () => {
        const armed = playSignatureSkill(sacFight(80, 5), CIRCLET).state;
        // The turn's SACRIFICE modifiers reset at turn start; this one does not.
        const next = programTurnStart({ ...armed, round: armed.round + 1 }, PROGRAM_KIT).state;
        expect(next.program!.nextSacHeals).toBe(true);
        expect(strike({ ...next, dice: [{ ...WILD }] }).player.health).toBe(82);
    });

    it('is refused while one is already pending, and spends nothing', () => {
        const once = playSignatureSkill(sacFight(80, 10), CIRCLET).state;
        expect(signatureCastBlock(once, getSignatureSkill(CIRCLET)!)).toBe('Your next SACRIFICE already heals you');
        expect(playSignatureSkill(once, CIRCLET).state.conviction).toBe(5);
    });

    it('creates the program ledger in a fight that has none', () => {
        const s = encounter(FloatEye, 1, 5);
        expect(s.program).toBeUndefined();
        expect(playSignatureSkill(s, CIRCLET).state.program!.nextSacHeals).toBe(true);
    });
});

describe('A10 · Ruby Tithe (the Ruby Signet)', () => {
    it('the next SACRIFICE adds LEECH equal to the VITAE paid, unscaled, with its turns', () => {
        const armed = playSignatureSkill(sacFight(100, 3), RUBY).state;
        const after = strike(armed);
        expect(after.player.health).toBe(98);
        expect([after.program!.leechTurns, after.program!.leechPotency]).toEqual([LEECH_TURNS_PER_APPLICATION, 2]);
        expect(after.program!.nextSacLeech).toBe(false);
        // Spent: the next SACRIFICE adds nothing.
        const again = strike({ ...after, hand: [{ uid: 't0', cardId: FORFEIT }], dice: [{ ...WILD }] });
        expect(again.program!.leechPotency).toBe(2);
    });

    it('is refused while one is already pending', () => {
        const once = playSignatureSkill(sacFight(100, 6), RUBY).state;
        expect(signatureCastBlock(once, getSignatureSkill(RUBY)!)).toBe('Your next SACRIFICE already adds LEECH');
    });

    it('with the Circlet armed too, the LEECH reads what the SACRIFICE would have cost', () => {
        let s = playSignatureSkill(sacFight(80, 8), CIRCLET).state;
        s = playSignatureSkill(s, RUBY).state;
        const after = strike(s);
        expect(after.player.health).toBe(82);
        expect(after.program!.leechPotency).toBe(2);
    });
});

describe('A10 · Open Vein (the Bleeding Signet)', () => {
    const heal = scaleFor(OPEN_VEIN_HEAL, Player.baseStats, 'mind', 'one-shot');

    it('HEALs 5 (mind-scaled) and is not refused with no LEECH on the foe', () => {
        const s = sacFight(60, 4);
        expect(signatureCastBlock(s, getSignatureSkill(VEIN)!)).toBeNull();
        const r = playSignatureSkill(s, VEIN);
        expect(r.state.player.health).toBe(60 + heal);
        expect(r.state.enemy.health).toBe(500);
        expect(r.state.conviction).toBe(0);
    });

    it('triggers the foe\'s LEECH: it loses its potency now, you HEAL that, and no turn ticks off', () => {
        const base = sacFight(60, 4);
        const s = { ...base, program: { ...(base.program ?? initProgramLedger()), leechTurns: 2, leechPotency: 6 } };
        const r = playSignatureSkill(s, VEIN);
        expect(r.state.enemy.health).toBe(494);
        expect(r.state.player.health).toBe(60 + heal + 6);
        expect([r.state.program!.leechTurns, r.state.program!.leechPotency]).toEqual([2, 6]);
    });
});

describe('the Bleeding Signet worn beside the Suppliant\'s Ring', () => {
    it('adds +5 Mind to the fighter (no max VITAE) and both signatures reach the fight', () => {
        const worn = equipItem(deepClone(Player), deepClone(getRelicById('relic-bleeding-signet')!));
        expect(worn.maxHealth).toBe(Player.maxHealth);
        expect(worn.baseStats).toEqual(Player.baseStats);
        expect(worn.equipment.accessories.map(a => a.id)).toEqual(['relic-disarming-plea', 'relic-bleeding-signet']);
        const s = initializeCombatEncounter(worn, FloatEye, ['grey-strike'], 1);
        expect(s.signatures).toEqual([OPEN_HAND, VEIN]);
        expect(s.player.baseStats).toEqual({ ...Player.baseStats, mind: Player.baseStats.mind + 5 });
    });

    it('a saved Signet copy from before the rework grants the new signature and stats (read by id)', () => {
        const stale = { ...deepClone(getRelicById('relic-bleeding-signet')!),
            grantsSignature: 'sig-crimson-covenant' as never, statModifiers: [{ stat: 'maxHp' as const, value: 20 }] };
        const worn = { ...deepClone(Player), equipment: { ...Player.equipment, accessories: [...Player.equipment.accessories, stale] } };
        const s = initializeCombatEncounter(worn, FloatEye, ['grey-strike'], 1);
        expect(s.signatures).toEqual([OPEN_HAND, VEIN]);
        expect(s.player.baseStats.mind).toBe(Player.baseStats.mind + 5);
    });
});
