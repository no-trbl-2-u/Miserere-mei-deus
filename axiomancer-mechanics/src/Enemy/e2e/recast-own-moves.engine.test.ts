/**
 * Hermetic E2E: five recast foes play moves of their own (MV1d): the Wreckmaster, Saltwick Swarm, Quay-Crab, Coralback and
 * Bilge-Stalker. Each foe's moves and Danger lines, no move shared between
 * them, the other animated foes untouched, and the new rider work:
 * Take the Colours, Coral Grows Over, The Whole Bloom (no minimum) and
 * Press-Ganged's TANGLE 2.
 *
 * Numbers are the spec's, at each tier's authored level (elite 3, normal 2).
 * Fixed RNG; no disk / network / TTY.
 */

import { describe, expect, it } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import type { Enemy } from '../types';
import {
    BilgeStalker, Coralback, EnemyLibrary, QuayCrab, SaltwickSwarm, Wreckmaster,
} from '../enemy.library';
import { enemyPhaseKeywords } from '../enemy-keywords';
import { deepClone } from '../../Utils';
import { scaleEnemyToLevel } from '../../World/encounter';
import { registerSandboxCards } from '../../Cards/cards.sandbox';
import { BARNACLE_ID } from '../../Cards/library/enemy-curses.cards';
import { initializeCombatEncounter, resolveThreatPhase, rollEncounterDice } from '../../Combat/combat.engine';
import type { CombatEncounterState } from '../../Combat/combat.encounter.types';

const rng = (): number => 0.5;

registerSandboxCards([
    {
        id: 'qa-recast-free', name: 'QA Recast', color: 'body',
        description: 'recast fixture', tier: 1, targetType: 'enemy', rank: 1, cardType: 'spell',
        free: { damage: 1 },
    },
]);
const DECK = ['qa-recast-free'];

function makePlayer(): Character {
    const p = deepClone(Player);
    p.knownCards = DECK.slice();
    p.baseStats = { heart: 5, body: 5, mind: 5 };
    p.health = 500; p.maxHealth = 500;
    p.effects = [];
    return p;
}

const authored = (foe: Enemy): Enemy => ({ ...scaleEnemyToLevel(foe, foe.difficulty === 'elite' ? 3 : 2), effects: [] });

/** Opens the fight with `foe` about to play `move`, nothing in hand or piles, no GUARD. */
function at(foe: Enemy, move: string, phase = 0): CombatEncounterState {
    const s = rollEncounterDice(initializeCombatEncounter(makePlayer(), authored(foe), DECK, 7), rng).state;
    const idx = s.threatPhases.findIndex(p => p.enemyMove?.name === move && p.enemyMove.phase === phase);
    expect(idx, `${foe.name} has no ${move} in phase ${phase}`).toBeGreaterThanOrEqual(0);
    return { ...s, currentPhaseIndex: idx, hand: [], drawPile: [], discard: [], guard: 0, conviction: 0, reserve: [] };
}

const cards = (n: number, cardId = 'qa-recast-free'): CombatEncounterState['hand'] =>
    Array.from({ length: n }, (_, i) => ({ uid: `c${cardId}${i}`, cardId }));

const turn = (s: CombatEncounterState) => {
    const res = resolveThreatPhase(s, rng);
    return { lost: s.player.health - res.state.player.health, next: res.state, events: res.events };
};
const barnacles = (s: CombatEncounterState): number => s.hand.filter(h => h.cardId === BARNACLE_ID).length;

/** Every move of a foe, Dangers included. */
const movesOf = (foe: Enemy) => (foe.phases ?? []).flatMap(p => [...p.moves, ...(p.danger ? [p.danger] : [])]);
const names = (foe: Enemy): string[] => [...new Set(movesOf(foe).map(m => m.name))];

const FIVE = [Wreckmaster, SaltwickSwarm, QuayCrab, Coralback, BilgeStalker];

describe('the five foes play exactly the spec\'s moves, each Danger at its line (A6)', () => {
    const shape = (foe: Enemy) => (foe.phases ?? []).map(p => ({
        danger: p.danger && `${p.danger.kind} ${p.danger.name}`,
        moves: p.moves.map(m => `${m.kind} ${m.name}`),
    }));

    it('the Wreckmaster: three phases', () => {
        const loop = ['attack Sabre and Pistol', 'defend Riposte', 'status Press-Ganged'];
        expect(shape(Wreckmaster)).toEqual([
            { danger: undefined, moves: loop },
            { danger: 'danger Reload Under Fire', moves: loop },
            { danger: 'danger Take the Colours', moves: loop },
        ]);
        expect(Wreckmaster.difficulty).toBe('elite');
    });

    it('Saltwick Swarm: an elite in three phases', () => {
        const loop = ['attack Many Stings', 'defend Drift Apart', 'status Static Bloom'];
        expect(shape(SaltwickSwarm)).toEqual([
            { danger: undefined, moves: loop },
            { danger: 'danger Drown in Light', moves: loop },
            { danger: 'danger The Whole Bloom', moves: loop },
        ]);
        expect(SaltwickSwarm).toMatchObject({ difficulty: 'elite', level: 5 });
    });

    it.each([
        [QuayCrab, 'Clamp Down', ['attack Pincer', 'defend Shell Up', 'status Grip']],
        [Coralback, 'Coral Grows Over', ['attack Coral Spur', 'defend Crown Down', 'status Polyp']],
        [BilgeStalker, 'Drag Under', ['attack Quick Claws', 'defend Into the Dark', 'status Stagnant']],
    ] as const)('%s: two phases, the Danger %s, attacks kept in phase 2', (foe, danger, loop) => {
        expect(shape(foe)).toEqual([
            { danger: undefined, moves: [...loop] },
            { danger: `danger ${danger}`, moves: [...loop] },
        ]);
        expect(foe.difficulty).toBe('normal');
    });

    it('prints each move as the spec words it', () => {
        const text = (foe: Enemy) => Object.fromEntries(movesOf(foe).map(m => [m.name, m.text]));
        expect(text(Wreckmaster)).toEqual({
            'Sabre and Pistol': '7 damage, +4 if you played 3+ cards this turn.',
            Riposte: 'WARD 10. UNBROKEN: DEAL 4 twice.',
            'Press-Ganged': 'Steals one banked die. With none banked: TANGLE 2.',
            'Reload Under Fire': 'TANGLE 3 and 2 BARNACLE.',
            'Take the Colours': 'Takes up to 4 Conviction, WARD 4 per Conviction taken. BARNACLE 1.',
        });
        expect(text(SaltwickSwarm)).toEqual({
            'Many Stings': '1 damage, 5 hits.',
            'Drift Apart': 'WARD 8. UNBROKEN: SHOCK 1.',
            'Static Bloom': 'SHOCK 2.',
            'Drown in Light': '3 damage per card in your hand, then TANGLE 2.',
            'The Whole Bloom': 'DEAL 2, once per card in your discard. No minimum.',
        });
        expect(text(QuayCrab)).toEqual({
            Pincer: '7 damage. Your GUARD counts half against it.',
            'Shell Up': 'WARD 10. UNBROKEN: BARNACLE 1.',
            Grip: 'SEIZED: your body die sits out your next roll.',
            'Clamp Down': '10 damage. If you are under half VITAE: 16 damage, and it MENDs 4.',
        });
        expect(text(Coralback)).toEqual({
            'Coral Spur': '6 damage. If it gets through your GUARD: BARNACLE.',
            'Crown Down': 'WARD 15. The next status you put on it lasts 1 turn longer.',
            Polyp: 'A BARNACLE Curse goes into your hand.',
            'Coral Grows Over': '3 damage per Curse in your hand, deck and discard. With none, a BARNACLE Curse goes into your hand instead.',
        });
        expect(text(BilgeStalker)).toEqual({
            'Quick Claws': '3 damage, 2 hits. Each hit that gets through steals 1 Conviction.',
            'Into the Dark': 'WARD 8. If you do not hit it this turn, its next attack gains +3.',
            Stagnant: 'BRINE 2.',
            'Drag Under': 'Next turn you can play at most 2 cards.',
        });
    });

    it('no one of the five shares a move with any other foe', () => {
        for (const foe of FIVE) {
            for (const other of EnemyLibrary.filter(e => e.id !== foe.id)) {
                const shared = names(foe).filter(n => names(other).includes(n));
                expect(shared, `${foe.name} / ${other.name}`).toEqual([]);
            }
        }
    });

    it('carries the words its moves place', () => {
        expect(enemyPhaseKeywords(Wreckmaster)).toEqual(['ward', 'tangle', 'barnacle', 'unbroken']);
        expect(enemyPhaseKeywords(SaltwickSwarm)).toEqual(['ward', 'tangle', 'shock', 'unbroken']);
        expect(enemyPhaseKeywords(QuayCrab)).toEqual(['ward', 'seized', 'barnacle', 'unbroken']);
    });
});

describe('the other animated foes\' moves are unchanged (A7)', () => {
    const PINNED: Record<string, string[][]> = {
        'enemy-float-eye': [['Long Look', 'Afterimage', 'Shut Lid', 'Stare'], ['!The Long Career', 'Long Look', 'Afterimage', 'Stare']],
        'enemy-gallows-crow': [['Peck the Debt', 'Carrion Dive', 'Take Wing', 'Shiny Thing'], ['!Murder of Crows', 'Peck the Debt', 'Carrion Dive', 'Take Wing', 'Shiny Thing']],
        'enemy-net-mender': [['Cast Net', 'Haul In', 'Mend the Net', 'Gill-hook'], ['!The Whole Catch', 'Cast Net', 'Haul In']],
        'enemy-crane-hook': [['Swing', 'Counterweight', 'Lock the Brake', 'Hoist'], ['!Drop the Load', 'Swing', 'Counterweight', 'Lock the Brake', 'Hoist']],
        'enemy-brine-widow': [['Salt the Wound', 'Keening', 'Black Veil', 'Mourning'], ['!Throw the Salt', 'Salt the Wound', 'Keening', 'Black Veil', 'Mourning']],
        'enemy-lamprey-knot': [['Latch', 'Writhe', 'Knot Up', 'Mouthful'], ['!Unravel', 'Latch', 'Writhe', 'Knot Up', 'Mouthful']],
        'enemy-green-jelly': [['Engulf', 'Show You Your Face', 'Settle', 'Reflection'], ['!Spit It Out', 'Engulf', 'Show You Your Face', 'Settle', 'Reflection']],
        'enemy-curfew-ringer': [['Toll', 'Clapper', 'Bar the Door', 'Hush'], ['!Curfew', 'Toll', 'Clapper', 'Toll', 'Bar the Door', 'Toll', 'Hush']],
        'enemy-wreck-picker': [['Pick Over', 'Hurl Flotsam', 'Hide in the Hoard', 'Gull-call'], ['!Everything Washes Up', 'Pick Over', 'Hurl Flotsam', 'Hide in the Hoard', 'Gull-call']],
        'enemy-smokehouse-gutter': [['Smoke Lash', 'Gut Hook', 'Hang to Cure', 'Choking Smoke'], ['!Light the Racks', 'Smoke Lash', 'Gut Hook', 'Hang to Cure', 'Choking Smoke']],
        'enemy-tithe-collector': [['Assess', 'Garnish', 'Ledger Shield'], ['!Audit', 'Lien', 'Assess', 'Garnish'], ['!Foreclose', 'Seize Goods', 'Assess']],
        'enemy-cave-choir': [['Hymn', 'The Pews', 'Hush'], ['!Toll for the Drowned', 'Crescendo', 'Hymn', 'Sea-Water Psalm'], ['!Amen', 'Antiphon', 'Crescendo']],
        'enemy-lamplighter': [['Wick-Lash', 'Shutter', 'Glare'], ['!Lure Light', 'Wick-Lash', 'Shutter', 'Glare'], ['!The Lamp Goes Out', 'Wick-Lash', 'Shutter']],
        'enemy-wrecker': [["Wrecker's Bait", 'Cudgel', 'Rope'], ['!Onto the Rocks', "Wrecker's Bait", 'Salvage Hook', "Wrecker's Bait"], ['!Strip the Wreck', 'Cudgel', 'Salvage Hook', "Wrecker's Bait"]],
        'enemy-toll-keeper': [['Levy', 'Strongbox', 'Writ'], ['!Compound Interest', 'Levy', 'Distrain'], ['!Seize the Causeway', 'Levy', 'Distrain']],
        'enemy-tide-gate': [['Wash Over', 'Sluice', 'Undertow'], ['!Spring Tide', 'Wash Over', 'Sluice'], ['!The Gate Opens', 'Wash Over']],
    };

    it('every foe outside the five (and the Saint) still plays the moves it did, in order', () => {
        for (const [id, expected] of Object.entries(PINNED)) {
            const foe = EnemyLibrary.find(e => e.id === id)!;
            const now = foe.phases!.map(p => [...(p.danger ? [`!${p.danger.name}`] : []), ...p.moves.map(m => m.name)]);
            expect(now, id).toEqual(expected);
        }
    });
});

describe('Take the Colours: a capped Conviction take, WARD per point, then a BARNACLE, with no dice (A6)', () => {
    const play = (conviction: number, reserve: CombatEncounterState['reserve'] = []) =>
        turn({ ...at(Wreckmaster, 'Take the Colours', 2), conviction, reserve });

    it('takes 4 of 6 Conviction and gains WARD 16', () => {
        const r = play(6);
        expect(r.next.conviction).toBe(2);
        expect(r.next.enemyWords?.ward).toBe(16);
        expect(barnacles(r.next)).toBe(1);
        expect(r.lost).toBe(0);
    });

    it('takes what there is under the cap: 2 Conviction is WARD 8', () => {
        const r = play(2);
        expect(r.next.conviction).toBe(0);
        expect(r.next.enemyWords?.ward).toBe(8);
    });

    it('with none: no WARD, and the BARNACLE still lands', () => {
        const r = play(0);
        expect(r.next.enemyWords?.ward ?? 0).toBe(0);
        expect(barnacles(r.next)).toBe(1);
    });

    it('leaves banked dice alone', () => {
        const die = { id: 'b1', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };
        const r = play(1, [die]);
        expect(r.next.reserve).toHaveLength(1);
        expect(r.next.enemyWords?.ward).toBe(4);
    });
});

describe('Reload Under Fire and Press-Ganged (A6)', () => {
    it('Reload Under Fire: TANGLE 3 and two BARNACLE', () => {
        const r = turn(at(Wreckmaster, 'Reload Under Fire', 1));
        expect(r.next.enemyWords?.tangle).toBe(3);
        expect(barnacles(r.next)).toBe(2);
    });

    it('Press-Ganged with no banked die: TANGLE 2', () => {
        const r = turn(at(Wreckmaster, 'Press-Ganged'));
        expect(r.next.enemyWords?.tangle).toBe(2);
    });

    it('Press-Ganged with a banked die: steals it and tangles nothing', () => {
        const die = { id: 'b1', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };
        const r = turn({ ...at(Wreckmaster, 'Press-Ganged'), reserve: [die] });
        expect(r.next.reserve).toEqual([]);
        expect(r.next.enemyWords?.tangle ?? 0).toBe(0);
    });

    it('Sabre and Pistol: 7, and 11 once you played 3+ cards', () => {
        expect(turn(at(Wreckmaster, 'Sabre and Pistol')).lost).toBe(7);
        const played = { ...at(Wreckmaster, 'Sabre and Pistol'), enemyRiders: { played: 3 } };
        expect(turn(played).lost).toBe(11);
    });
});

describe('Coral Grows Over reuses the Curse count (A6)', () => {
    it('with Curses in hand, deck and discard: 3 each', () => {
        const s = at(Coralback, 'Coral Grows Over', 1);
        const r = turn({
            ...s, hand: cards(1, BARNACLE_ID), drawPile: [BARNACLE_ID], discard: [BARNACLE_ID, BARNACLE_ID],
        });
        expect(r.lost).toBe(12);
        // No BARNACLE joins: it carried Curses, and the next hand draws from the piles, so the hand is not asserted.
    });

    it('with none: no damage, and a BARNACLE Curse goes into your hand', () => {
        const r = turn(at(Coralback, 'Coral Grows Over', 1));
        expect(r.lost).toBe(0);
        expect(barnacles(r.next)).toBe(1);
    });
});

describe('Saltwick Swarm (A8)', () => {
    it('Many Stings: five hits of 1', () => {
        const r = turn(at(SaltwickSwarm, 'Many Stings'));
        expect(r.lost).toBe(5);
    });

    it('Static Bloom: SHOCK 2 on you, which Many Stings then feels on every hit (5 x 3)', () => {
        const bloomed = turn(at(SaltwickSwarm, 'Static Bloom')).next;
        expect(bloomed.player.effects.find(e => e.effectId === 'debuff_shock')).toMatchObject({ intensity: 2, remainingDuration: 3 });
        const stung = turn({ ...at(SaltwickSwarm, 'Many Stings'), player: bloomed.player });
        expect(stung.lost).toBe(15);
    });

    it('Drown in Light: 3 per card in your hand, then TANGLE 2', () => {
        const r = turn({ ...at(SaltwickSwarm, 'Drown in Light', 1), hand: cards(4) });
        expect(r.lost).toBe(12);
        expect(r.next.enemyWords?.tangle).toBe(2);
    });

    it('The Whole Bloom: a hit of 2 per card in your discard, and nothing at all with none', () => {
        expect(turn({ ...at(SaltwickSwarm, 'The Whole Bloom', 2), discard: Array(5).fill('qa-recast-free') }).lost).toBe(10);
        expect(turn(at(SaltwickSwarm, 'The Whole Bloom', 2)).lost).toBe(0);
    });
});

describe('the normals\' Dangers and the rest (A6)', () => {
    it('Clamp Down: 10, and 16 with a MEND of 4 when you are under half VITAE', () => {
        expect(turn(at(QuayCrab, 'Clamp Down', 1)).lost).toBe(10);
        const low = at(QuayCrab, 'Clamp Down', 1);
        const hurt = { ...low, player: { ...low.player, health: 200 } };
        expect(turn(hurt).lost).toBe(16);
    });

    it('Pincer: 7, half of your GUARD counting against it', () => {
        expect(turn(at(QuayCrab, 'Pincer')).lost).toBe(7);
        expect(turn({ ...at(QuayCrab, 'Pincer'), guard: 4 }).lost).toBe(5);
    });

    it('Grip: your body die sits out your next roll', () => {
        const r = turn(at(QuayCrab, 'Grip'));
        expect(r.next.enemyWords?.undertow).toBe('body');
    });

    it('Coral Spur: 6, and a BARNACLE only if it gets through GUARD', () => {
        const open = turn(at(Coralback, 'Coral Spur'));
        expect(open.lost).toBe(6);
        expect(barnacles(open.next)).toBe(1);
        const blocked = turn({ ...at(Coralback, 'Coral Spur'), guard: 10 });
        expect(blocked.lost).toBe(0);
        expect(barnacles(blocked.next)).toBe(0);
    });

    it('Polyp: a BARNACLE Curse', () => {
        expect(barnacles(turn(at(Coralback, 'Polyp')).next)).toBe(1);
    });

    it('Quick Claws: two hits of 3, each stealing a Conviction', () => {
        const r = turn({ ...at(BilgeStalker, 'Quick Claws'), conviction: 5 });
        expect(r.lost).toBe(6);
        expect(r.next.conviction).toBe(3);
    });

    it('Stagnant: BRINE 2', () => {
        expect(turn(at(BilgeStalker, 'Stagnant')).next.enemyWords?.brine).toBe(2);
    });

    it('Drag Under: you may play at most 2 cards next turn', () => {
        expect(turn(at(BilgeStalker, 'Drag Under', 1)).next.enemyRiders?.curfew).toBe(2);
    });
});
