/**
 * The signature kit (`plan/revamp/relics.md`): The Open Hand is MERCY 6 on the
 * foe, always cast when you can pay; the three
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
    initializeCombatEncounter, rollEncounterDice, playSignatureSkill, playCombatCard, resolveThreatPhase, startTurn, PROGRAM_KIT,
} from './combat.engine';
import {
    SIGNATURE_SKILL_LIST, getSignatureSkill, signatureCastBlock, signatureText, OPEN_HAND_MERCY, OPEN_VEIN_HEAL,
} from './combat.signature';
import { LEECH_TURNS_PER_APPLICATION, initProgramLedger, programTurnStart, programHoldsGuard } from './combat.card-program';
import { weatherReading, foeInferno, yourInferno, type ElementState } from './combat.elements';
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
const E_SIGNET = 'sig-elementalist-signet';
const E_BROOCH = 'sig-elementalist-brooch';
const E_BELT = 'sig-elementalist-belt';
const D_SIGNET = 'sig-defender-signet';
const D_BROOCH = 'sig-defender-brooch';
const D_BELT = 'sig-defender-belt';
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
            [E_SIGNET, 'clear-yours-trigger-storm', 6],
            [E_BROOCH, 'foe-inferno-to-storm', 4],
            [E_BELT, 'blizzard-to-storm', 3],
            [D_SIGNET, 'guard-to-thorns', 5],
            [D_BROOCH, 'reflect-half', 3],
            [D_BELT, 'hold-guard', 4],
            ['sig-merciful-locket', 'overheal-guard', 3],
            ['sig-merciful-brooch', 'absolve', 3],
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

describe('The Open Hand is MERCY 6 on the foe', () => {
    const hand = getSignatureSkill(OPEN_HAND)!;
    /** What MERCY 6 comes to for this fight's Heart, as a card's MERCY scales. */
    const amount = (s: CombatEncounterState): number => scaleFor(OPEN_HAND_MERCY, s.player.baseStats, 'heart', 'repeating');

    it('is ◆4 and base MERCY 6, and the ring names no number to go stale', () => {
        expect(OPEN_HAND_MERCY).toBe(6);
        expect(hand.name).toBe('The Open Hand');
        expect(hand.cost).toBe(4);
        expect(signatureText(hand, undefined)).toMatch(/^MERCY 6 on the foe/);
        expect(getRelicById('relic-disarming-plea')!.description).toMatch(/^Grants The Open Hand/);
        expect(getRelicById('relic-disarming-plea')!.description).not.toMatch(/\d/);
        expect(hand.description).not.toMatch(/spare|exploit/i);
    });

    it('prints the number it applies: at Heart 8 it reads 7, heals 7 and adds 7', () => {
        const base = encounter(GreenJelly, 0.5);
        const s = { ...base, player: { ...base.player, baseStats: { ...base.player.baseStats, heart: 8 } } };
        const added = playSignatureSkill(s, OPEN_HAND).events.find(e => e.kind === 'mercy-added');
        expect(added).toMatchObject({ amount: 7, healed: 7, total: 7 });
        expect(signatureText(hand, s.player.baseStats)).toBe(
            'MERCY 7 on the foe: it heals 7, and its MERCY grows by 7. When the clock runs out, MERCY bursts for twice its total.',
        );
    });

    it('heals the foe, adds to its total and starts the 3-turn clock, and the fight goes on', () => {
        const s = encounter(GreenJelly, 0.5);
        const r = playSignatureSkill(s, OPEN_HAND);
        const n = amount(s);
        expect(r.events).toContainEqual(expect.objectContaining({ kind: 'signature-cast', signatureId: OPEN_HAND, cost: 4 }));
        expect(r.events).toContainEqual({
            kind: 'mercy-added', cardId: OPEN_HAND, healed: n, amount: n, total: n, turnsLeft: 3,
        });
        expect(r.state.enemy.health).toBe(s.enemy.health + n);
        expect(r.state.program!.mercy).toEqual({ total: n, clock: 3 });
        expect(r.state.conviction).toBe(0);
        expect(r.state.phase).toBe('phase-play');
        expect(r.state.finalOutcome).toBeNull();
    });

    it('scales with Heart as a card\'s MERCY does', () => {
        const s = encounter(GreenJelly, 0.5);
        const hearty = { ...s, player: { ...s.player, baseStats: { ...s.player.baseStats, heart: 25 } } };
        const r = playSignatureSkill(hearty, OPEN_HAND);
        expect(r.state.program!.mercy!.total).toBe(scaleFor(6, hearty.player.baseStats, 'heart', 'repeating'));
        expect(r.state.program!.mercy!.total).toBeGreaterThan(playSignatureSkill(s, OPEN_HAND).state.program!.mercy!.total);
    });

    it('a second cast adds to the total and leaves the clock where it is', () => {
        const once = playSignatureSkill(encounter(GreenJelly, 0.5), OPEN_HAND).state;
        const n = once.program!.mercy!.total;
        const ticked = { ...once, program: { ...once.program!, mercy: { total: n, clock: 2 } }, conviction: 4 };
        expect(playSignatureSkill(ticked, OPEN_HAND).state.program!.mercy).toEqual({ total: 2 * n, clock: 2 });
    });

    it('bursts for twice the total on the third foe turn, on a deck with no trial card', () => {
        const big = { ...deepClone(Sandbag_01), health: 500, maxHealth: 500 };
        const s = encounter(big, 0.5);
        expect(s.program).toBeUndefined();
        let live = playSignatureSkill(s, OPEN_HAND).state;
        const total = live.program!.mercy!.total;
        for (const left of [2, 1]) {
            live = startTurn(resolveThreatPhase(live).state).state;
            expect(live.program!.mercy).toEqual({ total, clock: left });
        }
        const before = live.enemy.health;
        const burst = resolveThreatPhase(live);
        expect(burst.events).toContainEqual(expect.objectContaining({ kind: 'mercy-burst', total, onClock: true }));
        expect(burst.state.program!.mercy).toEqual({ total: 0, clock: 0 });
        expect(burst.state.enemy.health).toBeLessThanOrEqual(before - 2 * total);
    });

    it.each([
        ['at full VITAE', GreenJelly, 1],
        ['a boss near death', DeathBeholder, 0.05],
        ['a normal at its old line', FloatEye, 0.3],
    ])('always casts when you can pay: %s', (_name, enemy, frac) => {
        const s = encounter(enemy, frac);
        expect(signatureCastBlock(s, hand)).toBeNull();
        const r = playSignatureSkill(s, OPEN_HAND);
        expect(r.state.conviction).toBe(0);
        expect(r.state.program!.mercy!.total).toBe(amount(s));
    });

    it('the one refusal is the Conviction, and it spends nothing', () => {
        const s = encounter(GreenJelly, 0.1, cost(OPEN_HAND) - 1);
        expect(signatureCastBlock(s, hand)).toBe('Need 4 ◆ Conviction');
        const r = playSignatureSkill(s, OPEN_HAND);
        expect(r.state.conviction).toBe(cost(OPEN_HAND) - 1);
        expect(r.state.enemy.health).toBe(s.enemy.health);
        expect(r.events.some(e => e.kind === 'effect-fizzled')).toBe(true);
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

    it('prints the HEAL the engine applies, Mind-scaled', () => {
        const s = sacFight(60, 4);
        const minded = { ...s, player: { ...s.player, baseStats: { ...s.player.baseStats, mind: 25 } } };
        const skill = getSignatureSkill(VEIN)!;
        const applied = playSignatureSkill(minded, VEIN).state.player.health - 60;
        expect(applied).toBeGreaterThan(OPEN_VEIN_HEAL);
        expect(signatureText(skill, minded.player.baseStats)).toContain(`HEAL ${applied}.`);
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

/** A weather fight: the sandbag with the given elements up and `conviction` banked. */
function weatherFight(el: Partial<ElementState>, conviction = 6): CombatEncounterState {
    const s = sacFight(100, conviction);
    const base = s.program ?? initProgramLedger();
    return { ...s, program: { ...base, el: { ...base.el, ...el } } };
}
const reading = (s: CombatEncounterState) => weatherReading(s.program!.el);

describe('A15 · Eye of the Storm (the Elementalist\'s Signet)', () => {
    it('clears your INFERNO (the shared stack goes foe-only) and triggers the STORM without growth', () => {
        const s = weatherFight({ infShared: 4, infSelf: 3, storm: 5 });
        const r = playSignatureSkill(s, E_SIGNET);
        expect(r.state.conviction).toBe(0);
        expect(r.state.program!.el).toMatchObject({ infShared: 0, infFoe: 4, infSelf: 0, storm: 5 });
        expect(yourInferno(r.state.program!.el)).toBe(0);
        expect(r.state.enemy.health).toBe(495);
    });

    it('with INFERNO and no STORM it only clears; with STORM and no INFERNO it only triggers', () => {
        const burn = playSignatureSkill(weatherFight({ infSelf: 2 }), E_SIGNET).state;
        expect(yourInferno(burn.program!.el)).toBe(0);
        expect(burn.enemy.health).toBe(500);
        const storm = playSignatureSkill(weatherFight({ storm: 3 }), E_SIGNET).state;
        expect(storm.enemy.health).toBe(497);
        expect(reading(storm).storm).toBe(3);
    });

    it('is refused with no INFERNO on you and no STORM, spending nothing; a lone shared 1 burns you for 0, so it is refused too', () => {
        for (const el of [{}, { infFoe: 4 }, { blizzard: 2 }, { infShared: 1 }] as Partial<ElementState>[]) {
            const s = weatherFight(el);
            expect(signatureCastBlock(s, getSignatureSkill(E_SIGNET)!)).toBe('No INFERNO on you and no STORM to trigger');
            const r = playSignatureSkill(s, E_SIGNET);
            expect(r.state.conviction).toBe(6);
            expect(r.state.program!.el).toEqual(s.program!.el);
        }
    });

    it('is refused in a fight with no program ledger', () => {
        const s = encounter(FloatEye, 1, 6);
        expect(signatureCastBlock(s, getSignatureSkill(E_SIGNET)!)).toBe('No INFERNO on you and no STORM to trigger');
    });

    it('needs 6 Conviction', () => {
        expect(signatureCastBlock(weatherFight({ storm: 2 }, 5), getSignatureSkill(E_SIGNET)!)).toBe('Need 6 ◆ Conviction');
    });
});

describe('A15 · Kindle the Gale (the Elementalist\'s Brooch)', () => {
    it('turns only the foe-only INFERNO into STORM, added to any STORM up; you keep burning', () => {
        const s = weatherFight({ infShared: 4, infFoe: 3, infSelf: 1, storm: 2 }, 4);
        const burnBefore = yourInferno(s.program!.el);
        const r = playSignatureSkill(s, E_BROOCH);
        expect(r.state.conviction).toBe(0);
        expect(r.state.program!.el).toMatchObject({ infShared: 4, infFoe: 0, infSelf: 1, storm: 5 });
        expect(yourInferno(r.state.program!.el)).toBe(burnBefore);
        expect(foeInferno(r.state.program!.el)).toBe(4);
        expect(r.events).toContainEqual(expect.objectContaining({ kind: 'weather-changed', element: 'storm', from: 2, to: 5 }));
    });

    it('is refused with no foe-only INFERNO, even with a shared stack up', () => {
        for (const el of [{}, { infShared: 6 }, { infSelf: 2 }, { blizzard: 3, storm: 2 }] as Partial<ElementState>[]) {
            const s = weatherFight(el, 4);
            expect(signatureCastBlock(s, getSignatureSkill(E_BROOCH)!)).toBe('The foe has no INFERNO of its own to turn');
            expect(playSignatureSkill(s, E_BROOCH).state.conviction).toBe(4);
        }
    });
});

describe('A15 · Thaw into Thunder (the Elementalist\'s Belt)', () => {
    it('turns all BLIZZARD into STORM, added to any STORM up', () => {
        const r = playSignatureSkill(weatherFight({ blizzard: 4, storm: 1, infFoe: 2 }, 3), E_BELT);
        expect(r.state.conviction).toBe(0);
        expect(r.state.program!.el).toMatchObject({ blizzard: 0, storm: 5, infFoe: 2 });
    });

    it('is refused with no BLIZZARD, spending nothing', () => {
        const s = weatherFight({ storm: 3, infFoe: 2 }, 3);
        expect(signatureCastBlock(s, getSignatureSkill(E_BELT)!)).toBe('No BLIZZARD to turn');
        expect(playSignatureSkill(s, E_BELT).state.conviction).toBe(3);
    });
});

describe('the Bleeding Signet worn beside the Suppliant\'s Ring', () => {
    it('adds +5 Mind to the fighter (no max VITAE) and both signatures reach the fight', () => {
        const worn = equipItem(deepClone(Player), deepClone(getRelicById('relic-bleeding-signet')!));
        expect(worn.maxHealth).toBe(Player.maxHealth);
        expect(worn.baseStats).toEqual(Player.baseStats);
        expect(worn.equipment.relics.flatMap((a) => (a ? [a.id] : []))).toEqual(['relic-disarming-plea', 'relic-bleeding-signet']);
        const s = initializeCombatEncounter(worn, FloatEye, ['grey-strike'], 1);
        expect(s.signatures).toEqual([OPEN_HAND, VEIN]);
        expect(s.player.baseStats).toEqual({ ...Player.baseStats, mind: Player.baseStats.mind + 5 });
    });

    it('a saved Signet copy from before the rework grants the new signature and stats (read by id)', () => {
        const stale = { ...deepClone(getRelicById('relic-bleeding-signet')!),
            grantsSignature: 'sig-crimson-covenant' as never, statModifiers: [{ stat: 'maxHp' as const, value: 20 }] };
        const worn = { ...deepClone(Player), equipment: { ...Player.equipment, relics: [...Player.equipment.relics, stale] } };
        const s = initializeCombatEncounter(worn, FloatEye, ['grey-strike'], 1);
        expect(s.signatures).toEqual([OPEN_HAND, VEIN]);
        expect(s.player.baseStats.mind).toBe(Player.baseStats.mind + 5);
    });
});

describe('DF1e · the Defender\'s three signatures', () => {
    const withGuard = (guard: number, conviction: number): CombatEncounterState => ({ ...sacFight(100, conviction), guard });

    it('Thorn Mantle gives THORNS equal to your GUARD, and is refused with no GUARD', () => {
        const sig = getSignatureSkill(D_SIGNET)!;
        expect(signatureCastBlock(withGuard(0, 5), sig)).toBe('No GUARD to turn into THORNS');
        const refused = playSignatureSkill(withGuard(0, 5), D_SIGNET);
        expect(refused.state.conviction).toBe(5);
        expect(refused.state.program?.spikes?.thorns ?? 0).toBe(0);
        const cast = playSignatureSkill(withGuard(7, 5), D_SIGNET);
        expect(cast.state.conviction).toBe(0);
        expect(cast.state.program!.spikes.thorns).toBe(7);
        expect(cast.state.guard).toBe(7);
        expect(cast.events).toContainEqual(expect.objectContaining({ kind: 'spikes-changed', spike: 'thorns', from: 0, to: 7 }));
    });

    it('Mirror Ward adds REFLECT 50% for 2 turns, and a second cast adds and refreshes', () => {
        const first = playSignatureSkill(withGuard(0, 6), D_BROOCH);
        expect(first.state.conviction).toBe(3);
        expect(first.state.program!.spikes).toMatchObject({ reflect: 50, reflectTurns: 2 });
        const second = playSignatureSkill(first.state, D_BROOCH);
        expect(second.state.program!.spikes).toMatchObject({ reflect: 100, reflectTurns: 2 });
        expect(playSignatureSkill(withGuard(0, 2), D_BROOCH).state.program?.spikes?.reflect ?? 0).toBe(0);
    });

    it('Hold the Line keeps your GUARD through this round\'s foe turn, and is refused when already held', () => {
        const sig = getSignatureSkill(D_BELT)!;
        const start = withGuard(4, 8);
        expect(programHoldsGuard(start)).toBe(false);
        const cast = playSignatureSkill(start, D_BELT);
        expect(cast.state.conviction).toBe(4);
        expect(programHoldsGuard(cast.state)).toBe(true);
        expect(signatureCastBlock(cast.state, sig)).toBe('Your GUARD is already held');
        const again = playSignatureSkill(cast.state, D_BELT);
        expect(again.state.conviction).toBe(4);
    });
});
