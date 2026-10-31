/**
 * The archetype bots' fight rankings over fixture hands (phase SM1f, A11).
 * Every card is found by what it does (its lane, keywords and verbs), never
 * by id.
 */

import { describe, expect, it } from 'vitest';

import { getCardLane, GREY_LANE } from '../../Cards/card.lanes';
import { Player } from '../../Character/characters.mock';
import { handCards, initializeCombatEncounter, rollEncounterDice } from '../../Combat/combat.engine';
import { initProgramLedger } from '../../Combat/combat.card-program';
import type { CombatCard, CombatEncounterState } from '../../Combat/combat.encounter.types';
import { SIGNATURE_SKILL_LIST } from '../../Combat/combat.signature';
import { COMBAT_SIM_POLICIES } from '../../Combat/combat.sim-policies';
import { Sandbag_01 } from '../../Enemy/enemy.library';
import { deepClone } from '../../Utils';
import {
    BLOOD_PRICE_SPEND_FLOOR,
    cardVerbs,
    foeMeansToHit,
    laneFightPolicy,
    newElements,
    sacrificePaysBack,
    selfBurnWouldEnd,
} from './run-policy.fight';
import { cardKeywords } from './run-policy.lanes';

const WILD = { id: 'w', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };
const GREY = GREY_LANE.cardIds[0]!;

/** A fight against a 500-VITAE sandbag with `hand` in hand and one wild die. */
function board(hand: string[], vitae = 100): CombatEncounterState {
    const enemy = { ...deepClone(Sandbag_01), health: 500, maxHealth: 500 };
    let s = initializeCombatEncounter(deepClone(Player), enemy, [...hand, ...Array(10).fill(GREY)], 7);
    s = rollEncounterDice(s).state;
    return {
        ...s,
        hand: hand.map((cardId, i) => ({ uid: `t${i}`, cardId })),
        player: { ...s.player, health: vitae, maxHealth: Math.max(100, vitae) },
        dice: [{ ...WILD }], reserve: [], guard: 0, conviction: 0, signatures: [],
    };
}

/** The foe's telegraph this phase, set to one intent with no hits (or its own hits). */
function telegraph(s: CombatEncounterState, intentType: 'attack' | 'buff', hits: boolean): CombatEncounterState {
    const i = Math.min(s.currentPhaseIndex, s.threatPhases.length - 1);
    const phase = s.threatPhases[i]!;
    const effects = hits ? [{ damage: 5 }] : [];
    const next = { ...phase, intentType, enemyMove: undefined, threatAction: { ...phase.threatAction, effects } };
    return { ...s, threatPhases: s.threatPhases.map((p, j) => (j === i ? next : p)) } as CombatEncounterState;
}

const view = (s: CombatEncounterState, cardId: string): CombatCard => handCards(s).find(c => c.card.id === cardId)!.card;
const rank = (lane: string, s: CombatEncounterState, cardId: string): number =>
    laneFightPolicy(lane).rankCard(s, view(s, cardId), () => 0);
const laneCards = (lane: string): readonly string[] => getCardLane(lane)!.cardIds;

describe('the lane fight rankings', () => {
    it('Blood Price spends VITAE when it can afford it or a signature pays it back, and holds it otherwise', () => {
        const sac = laneCards('blood-price').find(id => cardKeywords(id).includes('SACRIFICE'))!;
        expect(sac).toBeDefined();
        const whole = board([sac, GREY], 100);
        const low = board([sac, GREY], Math.floor(100 * BLOOD_PRICE_SPEND_FLOOR) - 1);
        expect(rank('blood-price', whole, sac)).toBeGreaterThan(rank('blood-price', whole, GREY));
        expect(rank('blood-price', low, sac)).toBe(-Infinity);
        const payback = SIGNATURE_SKILL_LIST.find(sig => sig.kind === 'sacrifice-heals')!;
        const paid = { ...low, signatures: [payback.id] };
        expect(sacrificePaysBack(paid)).toBe(true);
        expect(sacrificePaysBack(low)).toBe(false);
        expect(rank('blood-price', paid, sac)).toBeGreaterThan(rank('blood-price', paid, GREY));
    });

    it('the Defender guards first against a hit, and not when none is coming', () => {
        const probe = board(laneCards('defender').slice(0, 1));
        const guard = laneCards('defender').find(id => cardVerbs(probe, id).has('guard'))!;
        const strike = laneCards('defender').find(id => !cardVerbs(probe, id).has('guard') && !cardVerbs(probe, id).has('holdGuard'))!;
        const s = board([guard, strike]);
        const hit = telegraph(s, 'attack', true);
        const quiet = telegraph(s, 'buff', false);
        expect(foeMeansToHit(hit)).toBe(true);
        expect(foeMeansToHit(quiet)).toBe(false);
        expect(rank('defender', hit, guard)).toBeGreaterThan(rank('defender', hit, strike));
        expect(rank('defender', hit, guard) - rank('defender', quiet, guard)).toBeGreaterThan(1e10);
    });

    it('the Merciful plays a mercy line before a stronger blow, and spares', () => {
        const probe = board(laneCards('merciful').slice(0, 1));
        const mercy = laneCards('merciful').find(id => [...cardVerbs(probe, id)].some(v => v.toLowerCase().includes('mercy')))!;
        expect(mercy).toBeDefined();
        const s = board([GREY, mercy]);
        expect(rank('merciful', s, mercy)).toBeGreaterThan(rank('merciful', s, GREY));
        expect(laneFightPolicy('merciful').mercyChoice).toBe('spare');
        expect(laneFightPolicy('merciful').signatureKinds).toContain('mercy');
        expect(laneFightPolicy('defender').signatureKinds).not.toContain('mercy');
    });

    it('the Elementalist chains a new element onto the foe first', () => {
        const probe = board(laneCards('elementalist').slice(0, 1));
        const element = laneCards('elementalist').find(id => newElements(probe, cardVerbs(probe, id)) > 0)!;
        expect(element).toBeDefined();
        const s = board([GREY, element]);
        expect(rank('elementalist', s, element)).toBeGreaterThan(rank('elementalist', s, GREY));
        // Once every element it brings is already on the foe, the chain bonus is gone.
        const verbs = cardVerbs(s, element);
        const el = { ...initProgramLedger().el, infFoe: verbs.has('inferno') ? 3 : 0, blizzard: verbs.has('blizzard') ? 3 : 0, storm: verbs.has('storm') ? 3 : 0 };
        const carried = { ...s, program: { ...initProgramLedger(), el } };
        expect(newElements(carried, verbs)).toBe(0);
    });

    it('the Elementalist refuses a PAID line whose self-burn would end it', () => {
        // A card whose PAID line burns you too: at 1 VITAE it would end the run.
        const burner = laneCards('elementalist').find(id => selfBurnWouldEnd(board([id], 1), view(board([id], 1), id)));
        expect(burner).toBeDefined();
        const dying = board([burner!, GREY], 1);
        expect(rank('elementalist', dying, burner!)).toBe(-Infinity);
        expect(selfBurnWouldEnd(board([burner!], 100), view(board([burner!], 100), burner!))).toBe(false);
        // A line that burns no one is never refused.
        expect(selfBurnWouldEnd(dying, view(dying, GREY))).toBe(false);
    });

    it('refines the witness it starts from, keeping its seams', () => {
        for (const lane of ['blood-price', 'defender', 'merciful', 'elementalist', 'grey']) {
            const p = laneFightPolicy(lane);
            expect(Object.keys(COMBAT_SIM_POLICIES)).toContain(p.id);
            expect(p.name.toLowerCase()).toContain('lane bot');
        }
    });
});
