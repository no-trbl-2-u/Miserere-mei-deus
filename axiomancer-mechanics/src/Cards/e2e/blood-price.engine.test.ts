/**
 * Hermetic E2E — the Blood Price trial set and the program runtime it rides.
 *
 * The set's own test (the only test that names its card ids). Pins:
 *   · the set: 30 lane cards (11 red / 8 blue / 11 purple), the grey Curse
 *     kept out of every lane, deck and reward pool, the lane and its 20-card
 *     test deck (built by role: SACRIFICE sources behind every payoff);
 *   · the rulings: SACRIFICE as an unscaled cost with a 1-VITAE floor, WAIVE,
 *     HEAL capped at max VITAE, "heal the damage dealt" unscaled, EXILE, the
 *     Global lifecycle (FREE 3 turn starts, PAID rest of combat; copies
 *     stack as independent instances, experimental), Global triggers, the Curse (cannot be scrapped), TETHER, LEECH
 *     as a stacking debuff (turns and potency), the next-DEAL bonus, the
 *     death ward, the delayed HEAL;
 *   · printed equals applied: every plain line lands the numbers its face
 *     prints, at neutral stats and at raised stats;
 *   · every card has a line that can be played in some state.
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../../Character/characters.mock';
import { Sandbag_01, FloatEye } from '../../Enemy/enemy.library';
import type { Enemy } from '../../Enemy/types';
import { getCardById, cardLibrary } from '../cards.library';
import { programLineBlock, programLineShortfall } from '../../Combat/combat.engine';
import { getCardLane, CARD_LANES } from '../card.lanes';
import { BLOOD_PRICE_SET } from '../library/blood-price.cards';
import { deepClone } from '../../Utils';
import { COMBAT_REWARD_POOL } from '../../Combat/combat.rewards';
import { dropUnknownCardIds } from '../../Game/game.migrate';
import type { GameState } from '../../Game/types';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard, discardCombatCard,
    startTurn, resolveThreatPhase, handCards, PROGRAM_KIT, playSignatureSkill, SIGNATURE_COST,
} from '../../Combat/combat.engine';
import {
    programIllegalReason, programXRange, programDrawFallback, programLineValue,
    programRecordDamage, programRollRound, initProgramLedger,
} from '../../Combat/combat.card-program';
import { runOneEncounter } from '../../Combat/combat.encounter.sim';
import type { CombatEncounterState } from '../../Combat/combat.encounter.types';
import type { BaseStats } from '../../Character/types';

const CURSE = 'bp-curse';
const FILLER = 'grey-strike';
const LANE_CARDS = BLOOD_PRICE_SET.cards.filter(c => c.cardType !== 'curse');
const WILD = { id: 'w', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };

/** A fight against a 500-VITAE sandbag with `hand` in hand, the player at
 *  `vitae`, one wild die on the table. */
function fight(hand: string[], vitae = 100, stats?: BaseStats, foe: Enemy = Sandbag_01): CombatEncounterState {
    const enemy = { ...deepClone(foe), health: 500, maxHealth: 500 };
    const player = { ...deepClone(Player), ...(stats ? { baseStats: stats } : {}) };
    let s = initializeCombatEncounter(player, enemy, [...hand, ...Array(10).fill(FILLER)], 7);
    s = rollEncounterDice(s).state;
    return {
        ...s,
        hand: hand.map((cardId, i) => ({ uid: `t${i}`, cardId })),
        player: { ...s.player, health: vitae },
        dice: [{ ...WILD }],
        reserve: [],
        guard: 0,
        conviction: 0,
    };
}

const play = (s: CombatEncounterState, uid: string, paid: boolean, x?: number): CombatEncounterState =>
    playCombatCard({ ...s, dice: [{ ...WILD }] }, { uid }, paid, paid ? 'w' : undefined, undefined, x).state;

/** The five Curse cards revision 2 cut. */
const CUT = ['bp-e-01a', 'bp-e-05c', 'bp-e-08b', 'bp-m-04c', 'bp-e-09c'];

/** Cards whose lines SACRIFICE (or whose Global does). */
function sacrifices(id: string): boolean {
    return /SACRIFICE (\d|any)/.test(JSON.stringify([
        getCardById(id)?.program?.free?.text, getCardById(id)?.program?.paid?.text, getCardById(id)?.program?.global?.text,
    ]));
}

describe('the Blood Price set', () => {
    it('holds 30 cards (10 red, 9 blue, 11 purple) and the grey Curse', () => {
        expect(LANE_CARDS).toHaveLength(30);
        const by = (c: string) => LANE_CARDS.filter(card => card.color === c).length;
        expect([by('body'), by('mind'), by('heart')]).toEqual([10, 9, 11]);
        expect(getCardById(CURSE)?.cardType).toBe('curse');
        expect(getCardById(CURSE)?.color).toBe('any');
        expect(LANE_CARDS.filter(c => c.cardType === 'global').map(c => c.id).sort())
            .toEqual(['bp-e-03d', 'bp-e-09n', 'bp-m-08d', 'bp-p-10c']);
    });

    it('revision 2: the five Curse cards are gone, five named SACRIFICE cards take their slots', () => {
        for (const id of CUT) expect(getCardById(id), id).toBeUndefined();
        const added = ['bp-e-01n', 'bp-e-05n', 'bp-e-08n', 'bp-e-09n', 'bp-m-04n'];
        expect(added.map(id => getCardById(id)?.name))
            .toEqual(['Bloodletting', 'Open Vein', 'Blood for Blood', 'Crimson Pact', 'Transfusion']);
        for (const id of added) expect(sacrifices(id) || getCardById(id)?.program?.global?.trigger === 'sac', id).toBe(true);
        // No card left in the lane names a Curse.
        for (const card of LANE_CARDS) expect(JSON.stringify(card.program), card.id).not.toMatch(/Curse/);
    });

    it('every lane card carries a real name: none still reads "Blood Price <slot>", and no two library cards share one', () => {
        for (const card of LANE_CARDS) {
            const name = getCardById(card.id)?.name ?? '';
            expect(name, card.id).not.toMatch(/^Blood Price /);
            expect(name.trim().length, card.id).toBeGreaterThan(0);
        }
        const names = cardLibrary.map(c => c.name);
        expect(new Set(names).size).toBe(names.length);
    });

    it('the grey Curse stays defined but sits in no lane, deck or reward pool', () => {
        for (const lane of CARD_LANES) {
            expect(lane.cardIds).not.toContain(CURSE);
            expect(lane.testDeck).not.toContain(CURSE);
        }
        expect(COMBAT_REWARD_POOL).not.toContain(CURSE);
    });

    it('a save that still names a cut card drops it on load', () => {
        const state = {
            version: 0,
            player: { ...deepClone(Player), knownCards: ['bp-e-01a', 'bp-p-01a', 'bp-m-04c'], combatRewardCards: ['bp-e-09c'] },
        } as unknown as GameState;
        const out = dropUnknownCardIds(state);
        expect(out.player.knownCards).toEqual(['bp-p-01a']);
        expect(out.player.combatRewardCards).toEqual([]);
    });

    it('registers the lane with the 30 cards and the 20-card test deck', () => {
        const lane = getCardLane('blood-price');
        expect(lane?.name).toBe('Blood Price');
        expect(lane?.cardIds).toEqual(LANE_CARDS.map(c => c.id));
        expect(lane?.testDeck).toHaveLength(20);
        expect(new Set(lane?.testDeck).size).toBe(20);
        for (const id of lane!.testDeck) expect(lane!.cardIds).toContain(id);
    });

    it('the test deck is built by role: 9+ SACRIFICE cards behind every payoff, 5+ of each colour, no Curse or half-VITAE cards', () => {
        const deck = getCardLane('blood-price')!.testDeck;
        expect(deck.filter(sacrifices).length).toBeGreaterThanOrEqual(9);
        const by = (c: string) => deck.filter(id => getCardById(id)?.color === c).length;
        for (const c of ['body', 'mind', 'heart']) expect(by(c), c).toBeGreaterThanOrEqual(5);
        for (const id of deck) {
            const text = JSON.stringify(getCardById(id)?.program);
            expect(text, id).not.toMatch(/Curse|half VITAE/);
        }
    });

    it('a fight without program cards carries no ledger', () => {
        const plain = initializeCombatEncounter(deepClone(Player), deepClone(Sandbag_01), ['grey-strike', 'grey-ward'], 1);
        expect(plain.program).toBeUndefined();
    });
});

describe('SACRIFICE, WAIVE, HEAL, EXILE', () => {
    it('SACRIFICE is an unscaled cost; DEAL lands its printed number', () => {
        const s = play(fight(['bp-p-01a']), 't0', false);
        expect(s.player.health).toBe(98);
        expect(s.enemy.health).toBe(493);
        expect(s.program!.sacrificePaid).toBe(2);
        expect(s.discard).toContain('bp-p-01a');
    });

    it('a line whose SACRIFICE would leave less than 1 VITAE cannot be played, and says why', () => {
        const before = fight(['bp-p-01a'], 2);
        expect(programIllegalReason(before, 't0', false, PROGRAM_KIT)).toMatch(/below 1 VITAE/);
        const after = playCombatCard(before, { uid: 't0' }, false);
        expect(after.events.some(e => e.kind === 'effect-fizzled')).toBe(true);
        expect(after.state.player.health).toBe(2);
        expect(after.state.hand).toHaveLength(1);
    });

    it('P-04c plays at any VITAE: FREE heals, PAID heals twice the VITAE lost this round, its own SACRIFICE included', () => {
        // No half-VITAE gate on either line any more.
        expect(programIllegalReason(fight(['bp-p-04c'], 100), 't0', false, PROGRAM_KIT)).toBeNull();
        expect(programIllegalReason(fight(['bp-p-04c'], 100), 't0', true, PROGRAM_KIT)).toBeNull();
        expect(play(fight(['bp-p-04c'], 50), 't0', false).player.health).toBe(60);
        // Nothing lost earlier this round: SACRIFICE 10, then HEAL 2 x 10.
        expect(play(fight(['bp-p-04c'], 50), 't0', true).player.health).toBe(60);
        // 15 lost earlier this round: SACRIFICE 10, then HEAL 2 x 25.
        const hit = fight(['bp-p-04c'], 50);
        const s = play({ ...hit, program: { ...hit.program!, lostThisRound: 15 } }, 't0', true);
        expect(s.player.health).toBe(90);
        expect(s.program!.exiled).toContain('bp-p-04c');
        // The SACRIFICE floor still applies: at 10 VITAE the PAID line cannot be paid.
        expect(programIllegalReason(fight(['bp-p-04c'], 10), 't0', true, PROGRAM_KIT)).toMatch(/below 1 VITAE/);
    });

    it('VITAE lost this round counts damage and SACRIFICE, and resets at the round boundary', () => {
        const l = programRecordDamage(initProgramLedger(), 7);
        expect(l.lostThisRound).toBe(7);
        expect(programRollRound(l).lostThisRound).toBe(0);
        expect(play(fight(['bp-p-01a'], 50), 't0', false).program!.lostThisRound).toBe(2);
    });

    it('HEAL is capped at max VITAE; healing past it becomes GUARD on M-09a', () => {
        const max = fight([]).player.maxHealth;
        expect(play(fight(['bp-m-01d'], max - 1), 't0', false).player.health).toBe(max);
        const s = play(fight(['bp-m-09a'], max - 1), 't0', false);
        expect(s.player.health).toBe(max);
        expect(s.guard).toBe(3);
    });

    it('"HEAL all the damage dealt" heals the actual amount, unscaled', () => {
        const s = play(fight(['bp-m-02b'], 100, { body: 10, mind: 10, heart: 5 }), 't0', true);
        // DEAL 6 at body 10 is 12; the heal copies it, capped at 8, and mind does not rescale it.
        expect(500 - s.enemy.health).toBe(12);
        expect(s.player.health).toBe(108);
        // A hit past the foe's last VITAE heals only what it had left.
        const low = fight(['bp-m-02b'], 100);
        const finisher = play({ ...low, enemy: { ...low.enemy, health: 5 } }, 't0', true);
        expect(finisher.enemy.health).toBe(0);
        expect(finisher.player.health).toBe(105);
    });

    it('P-07b deals the VITAE you lost, unscaled, up to its printed max', () => {
        const raised = { body: 19, mind: 5, heart: 5 };
        const lost = (n: number) => {
            const s = fight(['bp-p-07b'], 100, raised);
            return { ...s, program: { ...s.program!, lostThisCombat: n } };
        };
        expect(500 - play(lost(20), 't0', true).enemy.health).toBe(20);
        expect(500 - play(lost(200), 't0', true).enemy.health).toBe(30);
        expect(500 - play(lost(15), 't0', false).enemy.health).toBe(7);
        expect(500 - play(lost(200), 't0', false).enemy.health).toBe(10);
    });

    it('EXILE on a PAID line removes the card from combat', () => {
        const s = play(fight(['bp-m-06c']), 't0', true);
        expect(s.discard).not.toContain('bp-m-06c');
        expect(s.program!.exiled).toContain('bp-m-06c');
    });

    it('WAIVE: the next SACRIFICE pays nothing but still counts and fires 🩸 Globals', () => {
        let s = play(fight(['bp-p-10c', 'bp-e-04c', 'bp-p-01a']), 't0', false);
        s = play(s, 't1', true);
        s = play(s, 't2', false);
        expect(s.player.health).toBe(100);
        expect(s.program!.sacrificeCount).toBe(1);
        // P-10c's GUARD n fires for the WAIVED SACRIFICE 2.
        expect(s.guard).toBe(2);
        expect(s.conviction).toBe(1);
    });
});

describe('Globals', () => {
    it('a FREE Global fires on 3 turn starts, then goes to discard', () => {
        let s = play(fight(['bp-e-03d']), 't0', false);
        expect(s.program!.globals).toEqual([{ uid: 'g1', cardId: 'bp-e-03d', paid: false, turnsLeft: 3 }]);
        for (let turn = 1; turn <= 3; turn++) {
            s = startTurn({ ...s, turnTakenThisPhase: false }).state;
            expect(s.program!.leechPotency).toBe(turn);
            expect(s.player.health).toBe(100 - 2 * turn);
        }
        expect(s.program!.globals).toEqual([]);
        expect(s.discard).toContain('bp-e-03d');
    });

    it('a PAID Global stays for the rest of combat', () => {
        let s = play(fight(['bp-e-03d']), 't0', true);
        expect(s.program!.globals).toEqual([{ uid: 'g1', cardId: 'bp-e-03d', paid: true, turnsLeft: null }]);
        for (let turn = 1; turn <= 5; turn++) s = startTurn({ ...s, turnTakenThisPhase: false }).state;
        expect(s.program!.globals).toHaveLength(1);
        expect(s.program!.leechPotency).toBe(5);
    });

    it('a SACRIFICE fires the 🩸 Globals: P-10c FREE is GUARD n, PAID is DEAL n', () => {
        const free = play(play(fight(['bp-p-10c', 'bp-p-01a']), 't0', false), 't1', false);
        expect(free.guard).toBe(2);
        expect(free.enemy.health).toBe(493);
        const paid = play(play(fight(['bp-p-10c', 'bp-p-01a']), 't0', true), 't1', false);
        expect(paid.enemy.health).toBe(500 - 7 - 2);
    });

    it('M-08d: each SACRIFICE applies LEECH 1', () => {
        let s = play(fight(['bp-m-08d', 'bp-e-02d']), 't0', false);
        s = play(s, 't1', false);
        expect(s.program!.leechPotency).toBe(2);
        expect(s.program!.leechTurns).toBe(6);
    });

    it('a ⟳ Global whose SACRIFICE cannot be paid does not resolve', () => {
        let s = play(fight(['bp-e-03d'], 2), 't0', false);
        s = startTurn({ ...s, turnTakenThisPhase: false }).state;
        expect(s.player.health).toBe(2);
        expect(s.program!.leechPotency).toBe(0);
    });
});

describe('Globals stack as independent instances (experimental, T 2026-10-14)', () => {
    it('a second copy is playable and enters as its own instance', () => {
        let s = play(fight(['bp-p-10c', 'bp-p-10c']), 't0', false);
        expect(programIllegalReason(s, 't1', false, PROGRAM_KIT)).toBeNull();
        expect(programIllegalReason(s, 't1', true, PROGRAM_KIT)).toBeNull();
        s = play(s, 't1', false);
        expect(s.program!.globals).toEqual([
            { uid: 'g1', cardId: 'bp-p-10c', paid: false, turnsLeft: 3 },
            { uid: 'g2', cardId: 'bp-p-10c', paid: false, turnsLeft: 3 },
        ]);
    });

    it('each copy fires its own trigger: one SACRIFICE, two P-10c, GUARD n twice', () => {
        let s = play(fight(['bp-p-10c', 'bp-p-10c', 'bp-p-01a']), 't0', false);
        s = play(s, 't1', false);
        s = play(s, 't2', false);
        expect(s.guard).toBe(4);
        expect(s.enemy.health).toBe(493);
    });

    it('two ⟳ copies apply their SACRIFICE 2 and LEECH 1 twice per turn', () => {
        let s = play(fight(['bp-e-03d', 'bp-e-03d']), 't0', false);
        s = play(s, 't1', false);
        for (let turn = 1; turn <= 3; turn++) {
            s = startTurn({ ...s, turnTakenThisPhase: false }).state;
            expect(s.program!.leechPotency).toBe(2 * turn);
            expect(s.player.health).toBe(100 - 4 * turn);
        }
        expect(s.program!.globals).toEqual([]);
        expect(s.discard.filter(id => id === 'bp-e-03d')).toHaveLength(2);
    });

    it('each copy leaves on its own expiry: the FREE copy goes, the later PAID copy stays', () => {
        let s = play(fight(['bp-e-03d', 'bp-e-03d']), 't0', false);
        s = startTurn({ ...s, turnTakenThisPhase: false }).state;
        s = play(s, 't1', true);
        expect(s.program!.globals.map(g => [g.uid, g.turnsLeft])).toEqual([['g1', 2], ['g2', null]]);
        s = startTurn({ ...s, turnTakenThisPhase: false }).state;
        s = startTurn({ ...s, turnTakenThisPhase: false }).state;
        expect(s.program!.globals).toEqual([{ uid: 'g2', cardId: 'bp-e-03d', paid: true, turnsLeft: null }]);
        expect(s.discard.filter(id => id === 'bp-e-03d')).toHaveLength(1);
    });

    it('the draw fallback takes one deck copy out per instance in play', () => {
        let s = play(fight(['bp-p-10c', 'bp-p-10c']), 't0', false);
        s = play(s, 't1', false);
        expect(s.deck.filter(id => id === 'bp-p-10c')).toHaveLength(2);
        expect(programDrawFallback(s).filter(id => id === 'bp-p-10c')).toHaveLength(0);
        const one = { ...s, program: { ...s.program!, globals: s.program!.globals.slice(1) } };
        expect(programDrawFallback(one).filter(id => id === 'bp-p-10c')).toHaveLength(1);
    });

    it('the witness values a copy with one already in play, and a stacked deck sims to an outcome', () => {
        const s = play(fight(['bp-p-10c', 'bp-p-10c', 'bp-e-03d', 'bp-e-03d']), 't0', false);
        const v = programLineValue(s, 't1', false, PROGRAM_KIT);
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThan(0);
        const deck = [
            'bp-p-10c', 'bp-p-10c', 'bp-p-10c', 'bp-e-03d', 'bp-e-03d', 'bp-e-03d',
            'bp-p-01a', 'bp-p-01a', 'bp-e-02d', 'bp-e-02d', ...Array(6).fill(FILLER),
        ];
        const player = { ...deepClone(Player), knownCards: [...new Set(deck)] };
        for (const seed of [1, 2, 3]) {
            const run = runOneEncounter(deepClone(player), deepClone(FloatEye), seed, 'greedy', { deck });
            expect(['victory', 'mercy', 'defeat']).toContain(run.outcome);
        }
    });
});

describe('Crimson Pact: the next DEAL this turn deals +n', () => {
    it('a SACRIFICE n adds +n to the next DEAL, unscaled; the card\'s own DEAL takes it', () => {
        let s = play(fight(['bp-e-09n', 'bp-p-01a'], 100, { body: 10, mind: 5, heart: 5 }), 't0', false);
        s = play(s, 't1', false);
        // SACRIFICE 2 → +2; DEAL 7 at body 10 is 14, plus 2.
        expect(500 - s.enemy.health).toBe(16);
        expect(s.program!.nextDealBonus).toBe(0);
    });

    it('stacks across SACRIFICES, is spent by one DEAL, and what is left expires at the turn\'s end', () => {
        let s = play(fight(['bp-e-09n', 'bp-e-02d', 'bp-e-06b']), 't0', false);
        s = play(s, 't1', false);
        expect(s.program!.nextDealBonus).toBe(2);
        s = play(s, 't2', false);
        // DEAL 6 + 2, then E-06b's own SACRIFICE 2 leaves +2 waiting.
        expect(s.enemy.health).toBe(492);
        expect(s.program!.nextDealBonus).toBe(2);
        s = startTurn({ ...s, turnTakenThisPhase: false }).state;
        expect(s.program!.nextDealBonus).toBe(0);
    });

    it('TETHER\'s hit is a DEAL: it takes the bonus', () => {
        let s = play(fight(['bp-e-09n', 'bp-e-10d']), 't0', false);
        s = play(s, 't1', false);
        // TETHER 1, SACRIFICE 2: the bonus (+2) lands on TETHER's DEAL 2.
        expect(s.enemy.health).toBe(496);
    });
});

describe('the revision 2 cards', () => {
    it('Bloodletting: SACRIFICE 3 for 2 Conviction, 6 for 4', () => {
        const free = play(fight(['bp-e-01n']), 't0', false);
        expect([free.player.health, free.conviction]).toEqual([97, 2]);
        const paid = play(fight(['bp-e-01n']), 't0', true);
        expect([paid.player.health, paid.conviction]).toEqual([94, 4]);
    });

    it('Open Vein: TETHER comes first, so its own SACRIFICE lands on the foe; PAID adds LEECH 2', () => {
        const free = play(fight(['bp-e-05n']), 't0', false);
        expect(free.player.health).toBe(98);
        expect(free.enemy.health).toBe(498);
        expect(free.program!.tetherUntil).toBe(free.round + 1);
        const paid = play(fight(['bp-e-05n']), 't0', true);
        expect(paid.player.health).toBe(96);
        expect(paid.enemy.health).toBe(496);
        expect(paid.program!.tetherUntil).toBe(paid.round + 2);
        expect([paid.program!.leechTurns, paid.program!.leechPotency]).toEqual([3, 2]);
    });

    it('Blood for Blood: FREE SACRIFICE 3, DEAL 6; PAID SACRIFICE X (max 12), DEAL 2X body-scaled', () => {
        const free = play(fight(['bp-e-08n']), 't0', false);
        expect([free.player.health, free.enemy.health]).toEqual([97, 494]);
        expect(programXRange(fight(['bp-e-08n']), 't0', true, PROGRAM_KIT)).toEqual({ min: 1, max: 12 });
        const paid = play(fight(['bp-e-08n']), 't0', true, 5);
        expect([paid.player.health, paid.enemy.health]).toEqual([95, 490]);
        const strong = play(fight(['bp-e-08n'], 100, { body: 10, mind: 5, heart: 5 }), 't0', true, 5);
        expect(strong.enemy.health).toBe(480);
    });

    it('Transfusion: SACRIFICE now, HEAL (mind-scaled) at the start of your next turn', () => {
        let s = play(fight(['bp-m-04n'], 100, { body: 5, mind: 10, heart: 5 }), 't0', false);
        expect(s.player.health).toBe(97);
        s = startTurn({ ...s, turnTakenThisPhase: false }).state;
        expect(s.player.health).toBe(97 + 12);
        let p = play(fight(['bp-m-04n']), 't0', true);
        expect(p.player.health).toBe(95);
        p = startTurn({ ...p, turnTakenThisPhase: false }).state;
        expect(p.player.health).toBe(107);
    });
});

describe('Crimson Covenant on the trial cards', () => {
    it('the next SACRIFICE counts twice: paid once, and each instance fires TETHER and the 🩸 Globals', () => {
        let s = play(fight(['bp-m-08d', 'bp-p-01a']), 't0', false);
        s = playSignatureSkill({ ...s, conviction: SIGNATURE_COST }, 'sig-crimson-covenant').state;
        s = play(s, 't1', false);
        expect(s.player.health).toBe(98);
        expect(s.program!.sacrificeCount).toBe(2);
        // TETHER 2 per instance, then DEAL 7.
        expect(s.enemy.health).toBe(500 - 2 - 2 - 7);
        expect([s.program!.leechTurns, s.program!.leechPotency]).toEqual([6, 2]);
        expect(s.program!.nextTwice).toBe(false);
    });
});

describe('the grey Curse', () => {
    it('cannot be scrapped; FREE costs 5, PAID costs 10 and EXILEs', () => {
        const s = fight([CURSE]);
        const scrap = discardCombatCard(s, 't0');
        expect(scrap.events.some(e => e.kind === 'effect-fizzled')).toBe(true);
        expect(scrap.state.hand).toContainEqual({ uid: 't0', cardId: CURSE });
        const free = play(s, 't0', false);
        expect(free.player.health).toBe(95);
        expect(free.discard).toContain(CURSE);
        const paid = play(fight([CURSE]), 't0', true);
        expect(paid.player.health).toBe(90);
        expect(paid.program!.exiled).toContain(CURSE);
    });
});

describe('TETHER, LEECH and the wards', () => {
    it('TETHER: each SACRIFICE instance deals what it paid; a WAIVED one deals 0', () => {
        const s = play(fight(['bp-e-02d']), 't0', true);
        expect(s.player.health).toBe(97);
        expect(s.enemy.health).toBe(497);
        let t = play(fight(['bp-e-04c', 'bp-e-10d']), 't0', true);
        t = play(t, 't1', false);
        expect(t.enemy.health).toBe(500);
        expect(t.program!.sacrificeCount).toBe(1);
    });

    it('LEECH: each application adds 3 turns and adds n to the potency, the first included', () => {
        let s = play(fight(['bp-m-01d', 'bp-m-01d']), 't0', true);
        expect([s.program!.leechTurns, s.program!.leechPotency]).toEqual([3, 4]);
        s = play(s, 't1', true);
        expect([s.program!.leechTurns, s.program!.leechPotency]).toEqual([6, 8]);
    });

    it('LEECH: each foe turn the foe loses the potency (no decay), you heal what it lost, a turn ticks off; at 0 it resets', () => {
        let s = play(fight(['bp-m-01d'], 90), 't0', true);
        const vitae0 = s.player.health;
        let foe = s.enemy.health;
        for (let turn = 1; turn <= 3; turn++) {
            const r = resolveThreatPhase(s);
            const leeched = r.events.find(e => e.kind === 'damage-dealt' && e.target === 'enemy');
            expect(leeched && leeched.kind === 'damage-dealt' ? leeched.amount : 0).toBe(4);
            expect(r.events.some(e => e.kind === 'player-healed' && e.amount === 4)).toBe(true);
            s = r.state;
            expect(foe - s.enemy.health).toBeGreaterThanOrEqual(4);
            foe = s.enemy.health;
            s = startTurn(s).state;
        }
        expect([s.program!.leechTurns, s.program!.leechPotency]).toEqual([0, 0]);
        expect(s.program!.leechCardId).toBeNull();
        expect(vitae0).toBe(90);
    });

    it('LEECH is heart-scaled when applied', () => {
        const s = play(fight(['bp-m-01d'], 100, { body: 5, mind: 5, heart: 10 }), 't0', true);
        expect(s.program!.leechPotency).toBe(6);
    });

    it('the death ward keeps VITAE at 1 this turn; the delayed HEAL lands next turn', () => {
        const unwarded = resolveThreatPhase(fight(['bp-m-06c'], 2, undefined, FloatEye)).state;
        expect(unwarded.finalOutcome).toBe('defeat');
        let s = play(fight(['bp-m-06c'], 2, undefined, FloatEye), 't0', true);
        s = resolveThreatPhase(s).state;
        expect(s.player.health).toBe(1);
        expect(s.finalOutcome).toBeNull();
        const low = s.player.health;
        s = startTurn(s).state;
        expect(s.player.health).toBe(low + 5);
    });

    it('E-07b doubles the next SACRIFICE: cost and what it counts as', () => {
        let s = play(fight(['bp-e-07b', 'bp-p-01a']), 't0', false);
        s = play(s, 't1', false);
        expect(s.player.health).toBe(96);
        expect(s.program!.sacrificeCount).toBe(2);
    });

    it('SACRIFICE any amount takes the player\'s X, capped by the printed max and the 1-VITAE floor', () => {
        const s = fight(['bp-e-10d'], 10);
        expect(programXRange(s, 't0', true, PROGRAM_KIT)).toEqual({ min: 1, max: 9 });
        expect(programXRange(fight(['bp-e-10d'], 100), 't0', true, PROGRAM_KIT)).toEqual({ min: 1, max: 15 });
        expect(programXRange(s, 't0', false, PROGRAM_KIT)).toBeNull();
        const after = play(fight(['bp-e-10d'], 100), 't0', true, 7);
        expect(after.player.health).toBe(93);
        expect(after.enemy.health).toBe(493);
        expect(programIllegalReason(s, 't0', true, PROGRAM_KIT, 10)).toMatch(/below 1 VITAE/);
    });
});

/** Every number a plain line prints, summed per kind. */
const PLAIN = /^(?:(?:SACRIFICE \d+|DEAL \d+|GUARD \d+|HEAL \d+|gain \d+ Conviction|the foe loses \d+ VITAE|EXILE)[,.;]?\s*)+$/i;

function printedEqualsApplied(stats: BaseStats): { checked: number; mismatches: string[] } {
    const mismatches: string[] = [];
    let checked = 0;
    for (const card of LANE_CARDS) {
        if (card.program?.global) continue;
        for (const paid of [false, true]) {
            const before = fight([card.id], 100, stats);
            const hand = handCards(before).find(h => h.uid === 't0')!.card;
            const face = (paid ? hand.bottomActionText : hand.topActionText)
                .replace(/^(FREE|PAID) — /, '').replace(/ \(Ash\)$/, '').replace(/ Costs 1 die\.$/, '');
            if (!PLAIN.test(face)) continue;
            checked++;
            const sum = (re: RegExp): number => [...face.matchAll(re)].reduce((a, m) => a + Number(m[1]), 0);
            const want = {
                enemy: sum(/DEAL (\d+)/g) + sum(/loses (\d+) VITAE/g),
                player: -sum(/SACRIFICE (\d+)/g) + sum(/HEAL (\d+)/g),
                guard: sum(/GUARD (\d+)/g),
                conviction: sum(/gain (\d+) Conviction/gi),
            };
            const after = play(before, 't0', paid);
            const got = {
                enemy: before.enemy.health - after.enemy.health,
                player: after.player.health - before.player.health,
                guard: (after.guard ?? 0) - (before.guard ?? 0),
                conviction: after.conviction - before.conviction,
            };
            if (JSON.stringify(got) !== JSON.stringify(want)) {
                mismatches.push(`${card.id} ${paid ? 'PAID' : 'FREE'} "${face}" want ${JSON.stringify(want)} got ${JSON.stringify(got)}`);
            }
        }
    }
    return { checked, mismatches };
}

describe('printed equals applied', () => {
    it('every plain line lands the numbers its face prints, at neutral stats', () => {
        const r = printedEqualsApplied({ body: 5, mind: 5, heart: 5 });
        expect(r.checked).toBeGreaterThanOrEqual(15);
        expect(r.mismatches).toEqual([]);
    });

    it('and at raised stats (the face prints the scaled number)', () => {
        const r = printedEqualsApplied({ body: 8, mind: 7, heart: 9 });
        expect(r.checked).toBeGreaterThanOrEqual(15);
        expect(r.mismatches).toEqual([]);
    });

    it('a VULNERABLE face prints the heart-scaled percent it lands', () => {
        const s = fight(['bp-m-07a'], 100, { body: 5, mind: 5, heart: 10 });
        const face = handCards(s)[0].card.topActionText;
        expect(face).toContain('+20%');
        const after = play(s, 't0', false);
        expect(after.enemy.effects.find(e => e.effectId === 'debuff_vulnerable')?.intensity).toBe(20);
    });

    it('every card has a line that can be played in some state', () => {
        const never: string[] = [];
        for (const card of LANE_CARDS) {
            const states = [fight([card.id], 170), fight([card.id], 40)];
            const ok = states.some(s => [false, true].some(p => programIllegalReason(s, 't0', p, PROGRAM_KIT) === null));
            if (!ok) never.push(card.id);
        }
        expect(never).toEqual([]);
    });
});

describe('the SACRIFICE floor, as a number', () => {
    it('P-01a PAID at 4 VITAE cannot pay its SACRIFICE 4; at 5 it can', () => {
        const low = fight(['bp-p-01a'], 4);
        expect(programLineShortfall(low, 't0', true)).toEqual({ cost: 4, vitae: 4 });
        expect(programLineShortfall(low, 't0', false)).toBeNull();
        expect(programLineShortfall(fight(['bp-p-01a'], 5), 't0', true)).toBeNull();
    });

    it('a "SACRIFICE any amount" line falls short only past the floor', () => {
        const s = fight(['bp-e-10d'], 10);
        expect(programLineShortfall(s, 't0', true, 9)).toBeNull();
        expect(programLineShortfall(s, 't0', true, 10)).toEqual({ cost: 10, vitae: 10 });
    });

    it('is null for a card that is not in hand or has no program', () => {
        const s = fight([FILLER], 1);
        expect(programLineShortfall(s, 't0', true)).toBeNull();
        expect(programLineShortfall(s, 'nope', true)).toBeNull();
    });

    it('is non-null exactly when the line is refused at the floor', () => {
        const mismatch: string[] = [];
        for (const card of LANE_CARDS) {
            for (const vitae of [1, 3, 6, 12, 40]) {
                const s = fight([card.id], vitae);
                for (const paid of [false, true]) {
                    const atFloor = /below 1 VITAE/.test(programLineBlock(s, 't0', paid) ?? '');
                    if (atFloor !== (programLineShortfall(s, 't0', paid) !== null)) mismatch.push(`${card.id}@${vitae}/${paid}`);
                }
            }
        }
        expect(mismatch).toEqual([]);
    });
});

describe('Blood Price upgrades (Phase UP1b)', () => {
    it('an upgraded line prints and applies the bigger payoff, and keeps its SACRIFICE', () => {
        const up = getCardById('bp-p-01a+');
        expect(up?.program?.free?.text).toBe('SACRIFICE 2, DEAL {deal:10}.');
        expect(up?.program?.paid?.text).toBe('SACRIFICE 4, DEAL {deal:22}.');
        expect(getCardById('bp-p-07b+')?.program?.free?.text).toBe('DEAL half the VITAE you lost this combat (max 14).');
        expect(getCardById('bp-e-01n+')?.program?.paid?.text).toBe('SACRIFICE 6, gain 5 Conviction.');
    });

    it('a Global adds to its trigger amount', () => {
        expect(getCardById('bp-p-10c+')?.program?.global?.text).toBe('GUARD n+2.');
        expect(getCardById('bp-p-10c+')?.program?.global?.paidDelta).toBe('DEAL n+2 instead.');
        expect(getCardById('bp-e-09n+')?.program?.global?.text).toBe('your next DEAL this turn deals +n+2.');
    });

    it('Pinpricks and Name Your Price print no payoff, so their upgrade changes no number', () => {
        for (const id of ['bp-e-02d', 'bp-e-10d']) {
            const base = getCardById(id)?.program;
            const up = getCardById(`${id}+`)?.program;
            expect([up?.free?.text, up?.paid?.text]).toEqual([base?.free?.text, base?.paid?.text]);
        }
    });

    it('every lane card is common and takes exactly one upgrade', () => {
        for (const card of LANE_CARDS) {
            expect(getCardById(`${card.id}+`)?.id).toBe(`${card.id}+`);
            expect(getCardById(`${card.id}++`)).toBeUndefined();
        }
    });
});
