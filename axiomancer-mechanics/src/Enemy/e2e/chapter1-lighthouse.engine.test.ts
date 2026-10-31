/**
 * Hermetic E2E — the lighthouse path's two elites (phase EN1k, A16, A17).
 *
 * The Lamplighter plays the Appendix's three phases with its lamp as fight
 * state (`enemyRiders.lamp`, absent = Lit): while Dark every intent reads
 * UNKNOWN and Glare is skipped, and after The Lamp Goes Out it stays Dark.
 * The Wrecker plays its three phases; its Bait telegraphs UNKNOWN and reads
 * your GUARD as your turn ends: GUARD up gives it WARD, none takes the hit.
 *
 * Both fight at `bw-l4`'s level 7, so every number is the Appendix's scaled
 * with `scaleMoveNumber` from the elite's authored level 3. Counts (INFERNO,
 * TANGLE, BARNACLE, Conviction, VULNERABLE's %) stay as printed. Fixed RNG;
 * no disk / network / TTY.
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import type { Enemy } from '../types';
import { ENEMY_REGISTRY, Lamplighter, Wrecker } from '../enemy.library';
import { PHASES_AUTHORED_LEVEL } from '../enemy-phases';
import { enemyVitae } from '../index';
import { enemyPhaseKeywords } from '../enemy-keywords';
import { deepClone } from '../../Utils';
import { scaleEnemyToLevel } from '../../World/encounter';
import { registerSandboxCards } from '../../Cards/cards.sandbox';
import { BARNACLE_ID } from '../../Cards/library/enemy-curses.cards';
import {
    initializeCombatEncounter, playCombatCard, rollEncounterDice, resolveThreatPhase, threatHits,
} from '../../Combat/combat.engine';
import { scaleMoveNumber } from '../../Combat/combat.threat';
import { yourInferno, initElementState } from '../../Combat/combat.elements';
import { applyRiderAfterMove, baitSet, intentsInTheDark, lampOf } from '../../Combat/combat.enemy-riders';
import type { CombatEncounterState, CombatEvent, CombatManaDie } from '../../Combat/combat.encounter.types';

const rng = (): number => 0.5;

registerSandboxCards([
    {
        id: 'qa-en1k-guard', name: 'QA Lantern', color: 'any',
        description: 'lighthouse fixture', tier: 1, targetType: 'self', rank: 1, cardType: 'skill',
        free: { guard: 3 },
    },
]);
const DECK = ['qa-en1k-guard'];

function makePlayer(): Character {
    const p = deepClone(Player);
    p.knownCards = DECK.slice();
    p.baseStats = { heart: 5, body: 5, mind: 5 };
    p.health = 500; p.maxHealth = 500;
    p.effects = [];
    return p;
}

const lamplighter: Enemy = { ...scaleEnemyToLevel(Lamplighter, 7), effects: [] };
const wrecker: Enemy = { ...scaleEnemyToLevel(Wrecker, 7), effects: [] };

/** Opens the fight with `foe` about to play `move` (in `phase`, 0 = the opening loop). */
function at(foe: Enemy, move: string, phase = 0): CombatEncounterState {
    const s = rollEncounterDice(initializeCombatEncounter(makePlayer(), foe, DECK, 7), rng).state;
    const idx = s.threatPhases.findIndex(p => p.enemyMove?.name === move && p.enemyMove.phase === phase);
    expect(idx, `${foe.name} has no ${move} in phase ${phase}`).toBeGreaterThanOrEqual(0);
    return { ...s, currentPhaseIndex: idx, hand: [], guard: 0 };
}

/** The foe's turn: what the player lost, and the state after. */
function foeTurn(s: CombatEncounterState): { lost: number; next: CombatEncounterState; events: CombatEvent[] } {
    const res = resolveThreatPhase(s, rng);
    return { lost: s.player.health - res.state.player.health, next: res.state, events: res.events };
}

const s7 = (n: number) => scaleMoveNumber(n, 7, PHASES_AUTHORED_LEVEL.elite);
const dark = (s: CombatEncounterState, lamp: 'dark' | 'out' = 'dark'): CombatEncounterState =>
    ({ ...s, enemyRiders: { ...s.enemyRiders, lamp } });
const vulnerableOn = (s: CombatEncounterState): boolean =>
    s.player.effects.some(e => e.effectId === 'debuff_vulnerable');
const burnOn = (s: CombatEncounterState): number => yourInferno(s.program?.el ?? initElementState());
const shape = (foe: Enemy) => (foe.phases ?? []).map(p => ({
    danger: p.danger && `${p.danger.kind} ${p.danger.name}`,
    moves: p.moves.map(m => `${m.kind} ${m.name}`),
}));
const below = (s: CombatEncounterState, line: number): CombatEncounterState =>
    ({ ...s, enemy: { ...s.enemy, health: Math.floor(s.enemy.maxHealth * line) } });

describe('A16 — the Lamplighter plays exactly the Appendix', () => {
    it('three phases: Lure Light at 60%, The Lamp Goes Out at 30%, phase 3 in the dark', () => {
        expect(shape(Lamplighter)).toEqual([
            { danger: undefined, moves: ['attack Wick-Lash', 'defend Shutter', 'status Glare'] },
            { danger: 'danger Lure Light', moves: ['attack Wick-Lash', 'defend Shutter', 'status Glare'] },
            { danger: 'danger The Lamp Goes Out', moves: ['unknown Wick-Lash', 'unknown Shutter'] },
        ]);
    });

    it('is a registered elite with its own id, portrait key, VITAE and enemy words', () => {
        expect(ENEMY_REGISTRY.lamplighter).toBe(Lamplighter);
        expect(Lamplighter).toMatchObject({
            id: 'enemy-lamplighter', portraitAsset: 'lamplighter', name: 'The Lamplighter',
            difficulty: 'elite', level: 7, description: 'Kept the light until it went out. Now he lights lures.',
        });
        expect(lamplighter.maxHealth).toBe(enemyVitae(7, 'elite'));
        expect(enemyPhaseKeywords(Lamplighter)).toEqual(['ward', 'mend', 'vulnerable', 'tangle']);
    });

    it('crosses 60% into Lure Light and 30% into The Lamp Goes Out, one per turn', () => {
        const sixty = foeTurn(below(at(lamplighter, 'Wick-Lash'), 0.6));
        expect(sixty.events).toContainEqual({ kind: 'enemy-phase-entered', enemyId: lamplighter.id, phase: 1, danger: 'Lure Light' });
        // Lure Light MENDs as it fires, so the hit that crosses 30% lands well below it.
        const thirty = foeTurn(below(sixty.next, 0.2));
        expect(thirty.events).toContainEqual({ kind: 'enemy-phase-entered', enemyId: lamplighter.id, phase: 2, danger: 'The Lamp Goes Out' });
        expect(thirty.next.threatPhases[thirty.next.currentPhaseIndex]!.enemyMove).toMatchObject({ name: 'The Lamp Goes Out', danger: true });
    });
});

describe('A16 — LIT and DARK', () => {
    it('the fight opens Lit, its intents shown', () => {
        const s = at(lamplighter, 'Wick-Lash');
        expect(lampOf(s)).toBe('lit');
        expect(intentsInTheDark(s)).toBe(false);
        // Only the Lamplighter carries a lamp.
        expect(lampOf(at(wrecker, 'Cudgel'))).toBeNull();
    });

    it('Wick-Lash while Lit: 6 damage and INFERNO 2 on you', () => {
        const fired = foeTurn(at(lamplighter, 'Wick-Lash'));
        expect(fired.lost).toBe(s7(6));
        expect(burnOn(fired.next)).toBe(2);
    });

    it('Wick-Lash while Dark: 6 damage and no INFERNO', () => {
        const fired = foeTurn(dark(at(lamplighter, 'Wick-Lash')));
        expect(fired.lost).toBe(s7(6));
        expect(burnOn(fired.next)).toBe(0);
    });

    it('Shutter: goes Dark with WARD 12, and from then on its intents are in the dark', () => {
        const fired = foeTurn(at(lamplighter, 'Shutter'));
        expect(fired.next.enemyWords?.ward).toBe(s7(12));
        expect(lampOf(fired.next)).toBe('dark');
        expect(intentsInTheDark(fired.next)).toBe(true);
        // Its next move, Glare, comes up while the lamp is Dark.
        expect(fired.next.threatPhases[fired.next.currentPhaseIndex]!.enemyMove?.name).toBe('Glare');
    });

    it('Glare while Lit: VULNERABLE 25% on you for 1 turn', () => {
        const fired = foeTurn(at(lamplighter, 'Glare'));
        expect(vulnerableOn(fired.next)).toBe(true);
        expect(fired.next.player.effects.find(e => e.effectId === 'debuff_vulnerable')!.intensity).toBe(25);
    });

    it('Glare while Dark is skipped: nothing lands', () => {
        const s = dark(at(lamplighter, 'Glare'));
        const fired = foeTurn(s);
        expect(fired.lost).toBe(0);
        expect(vulnerableOn(fired.next)).toBe(false);
        expect(lampOf(fired.next)).toBe('dark');
    });

    it('Lure Light: TANGLE 3, MEND 8, and it goes Lit', () => {
        const s = below(dark(at(lamplighter, 'Lure Light', 1)), 0.5);
        const fired = foeTurn(s);
        expect(fired.next.enemyWords?.tangle).toBe(3);
        expect(fired.next.enemy.health - s.enemy.health).toBe(s7(8));
        expect(lampOf(fired.next)).toBe('lit');
    });

    it('phase 2 Wick-Lash hits +3 while Dark, and burns while Lit', () => {
        expect(foeTurn(dark(at(lamplighter, 'Wick-Lash', 1))).lost).toBe(s7(6) + s7(3));
        const lit = foeTurn(at(lamplighter, 'Wick-Lash', 1));
        expect(lit.lost).toBe(s7(6));
        expect(burnOn(lit.next)).toBe(2);
    });

    it('phase 2 Shutter goes Dark every other time: Lit to Dark, then Dark to Lit, WARD 12 each time', () => {
        const first = foeTurn(at(lamplighter, 'Shutter', 1));
        expect(lampOf(first.next)).toBe('dark');
        expect(first.next.enemyWords?.ward).toBe(s7(12));
        const second = foeTurn(dark(at(lamplighter, 'Shutter', 1)));
        expect(lampOf(second.next)).toBe('lit');
        expect(second.next.enemyWords?.ward).toBe(s7(12));
    });

    it('The Lamp Goes Out: Dark for the rest of the fight, whatever relights it after', () => {
        const s = below(at(lamplighter, 'The Lamp Goes Out', 2), 0.2);
        const out = foeTurn(s).next;
        expect(lampOf(out)).toBe('dark');
        expect(out.enemyRiders?.lamp).toBe('out');
        expect(intentsInTheDark(out)).toBe(true);
        // Nothing lights it again: neither Lure Light's light nor a Shutter's flip.
        for (const to of ['lit', 'flip', 'dark'] as const) {
            const after = applyRiderAfterMove(out, { kind: 'lamp', to }, { fullyBlocked: false, guardBefore: 0 }).state;
            expect(lampOf(after), to).toBe('dark');
            expect(after.enemyRiders?.lamp, to).toBe('out');
        }
    });

    it('phase 3 hits +3: Wick-Lash in the dark is 9 and 3 more', () => {
        const s = dark(at(lamplighter, 'Wick-Lash', 2), 'out');
        expect(s.threatPhases[s.currentPhaseIndex]!.intentType).toBe('unknown');
        expect(threatHits(s)).toEqual([s7(9) + s7(3)]);
        expect(foeTurn(s).lost).toBe(s7(9) + s7(3));
    });
});

describe('A17 — the Wrecker plays exactly the Appendix', () => {
    it('three phases: Onto the Rocks at 60%, Strip the Wreck at 30%, the Bait twice in phase 2', () => {
        expect(shape(Wrecker)).toEqual([
            { danger: undefined, moves: ["unknown Wrecker's Bait", 'attack Cudgel', 'status Rope'] },
            { danger: 'danger Onto the Rocks', moves: ["unknown Wrecker's Bait", 'attack Salvage Hook', "unknown Wrecker's Bait"] },
            { danger: 'danger Strip the Wreck', moves: ['attack Cudgel', 'attack Salvage Hook', "unknown Wrecker's Bait"] },
        ]);
    });

    it('is a registered elite with its own id, portrait key, VITAE and enemy words', () => {
        expect(ENEMY_REGISTRY.wrecker).toBe(Wrecker);
        expect(Wrecker).toMatchObject({
            id: 'enemy-wrecker', portraitAsset: 'wrecker', name: 'The Wrecker',
            difficulty: 'elite', level: 7, description: 'Swings a false light on the rocks so ships come in wrong.',
        });
        expect(wrecker.maxHealth).toBe(enemyVitae(7, 'elite'));
        expect(enemyPhaseKeywords(Wrecker)).toEqual(['tangle']);
    });

    it('crosses 60% into Onto the Rocks and 30% into Strip the Wreck, one per turn', () => {
        const sixty = foeTurn(below(at(wrecker, 'Cudgel'), 0.6));
        expect(sixty.events).toContainEqual({ kind: 'enemy-phase-entered', enemyId: wrecker.id, phase: 1, danger: 'Onto the Rocks' });
        const thirty = foeTurn(below(sixty.next, 0.3));
        expect(thirty.events).toContainEqual({ kind: 'enemy-phase-entered', enemyId: wrecker.id, phase: 2, danger: 'Strip the Wreck' });
    });
});

describe("A17 — Wrecker's Bait reads your turn end (UNKNOWN)", () => {
    it('telegraphs UNKNOWN, with its name, and is set while it is the next move', () => {
        const s = at(wrecker, "Wrecker's Bait");
        expect(s.threatPhases[s.currentPhaseIndex]!.intentType).toBe('unknown');
        expect(s.threatPhases[s.currentPhaseIndex]!.enemyMove).toMatchObject({ name: "Wrecker's Bait", kind: 'unknown' });
        expect(baitSet(s)).toBe(true);
        expect(baitSet(at(wrecker, 'Cudgel'))).toBe(false);
    });

    it('no GUARD at your turn end: 12 damage', () => {
        const s = at(wrecker, "Wrecker's Bait");
        expect(threatHits(s)).toEqual([s7(12)]);
        const fired = foeTurn(s);
        expect(fired.lost).toBe(s7(12));
        expect(fired.next.enemyWords?.ward ?? 0).toBe(0);
    });

    it('GUARD up at your turn end: it takes WARD 14 and does not hit', () => {
        const s = { ...at(wrecker, "Wrecker's Bait"), guard: 1 };
        expect(threatHits(s)).toEqual([]);
        const fired = foeTurn(s);
        expect(fired.lost).toBe(0);
        expect(fired.next.enemyWords?.ward).toBe(s7(14));
    });

    it('a GUARD card played on your turn turns the hit into WARD', () => {
        const s = { ...at(wrecker, "Wrecker's Bait"), phase: 'phase-play' as const, hand: [{ uid: 'h0', cardId: 'qa-en1k-guard' }] };
        expect(threatHits(s)).toEqual([s7(12)]);
        const played = playCombatCard(s, { uid: 'h0' }, false, undefined, rng).state;
        expect(played.guard).toBeGreaterThan(0);
        expect(threatHits(played)).toEqual([]);
        const fired = foeTurn({ ...played, phase: 'phase-resolve' });
        expect(fired.lost).toBe(0);
        expect(fired.next.enemyWords?.ward).toBe(s7(14));
    });
});

describe('the Wrecker\'s other moves', () => {
    const die = (id: string): CombatManaDie => ({ id, color: 'body', face: 'mana', state: 'available', temporary: false });
    const barnacles = (s: CombatEncounterState) => s.hand.filter(h => h.cardId === BARNACLE_ID).length;

    it('Cudgel: 7 damage, and a BARNACLE only if it gets through your GUARD', () => {
        const through = foeTurn(at(wrecker, 'Cudgel'));
        expect(through.lost).toBe(s7(7));
        expect(barnacles(through.next)).toBe(1);
        const blocked = foeTurn({ ...at(wrecker, 'Cudgel'), guard: 100 });
        expect(blocked.lost).toBe(0);
        expect(barnacles(blocked.next)).toBe(0);
    });

    it('Rope: TANGLE 2', () => {
        expect(foeTurn(at(wrecker, 'Rope')).next.enemyWords?.tangle).toBe(2);
    });

    it('Onto the Rocks: 4 damage per card in your hand', () => {
        const s = { ...below(at(wrecker, 'Onto the Rocks', 1), 0.5), hand: [0, 1, 2].map(i => ({ uid: `h${i}`, cardId: 'qa-en1k-guard' })) };
        expect(threatHits(s)).toEqual([3 * s7(4)]);
        expect(foeTurn(s).lost).toBe(3 * s7(4));
    });

    it('Salvage Hook: 6 damage and steals a banked die', () => {
        const fired = foeTurn({ ...at(wrecker, 'Salvage Hook', 1), reserve: [die('r1'), die('r2')] });
        expect(fired.lost).toBe(s7(6));
        expect(fired.next.reserve).toHaveLength(1);
    });

    it('Strip the Wreck: takes your banked dice and 4 Conviction, WARD 4 per thing taken', () => {
        const s = { ...below(at(wrecker, 'Strip the Wreck', 2), 0.2), reserve: [die('r1'), die('r2')], conviction: 6 };
        const fired = foeTurn(s);
        expect(fired.next.reserve).toEqual([]);
        expect(fired.next.conviction).toBe(2);
        expect(fired.next.enemyWords?.ward).toBe(s7(4) * 6);
    });

    it('Strip the Wreck with nothing to take leaves no WARD', () => {
        const s = { ...below(at(wrecker, 'Strip the Wreck', 2), 0.2), reserve: [], conviction: 0 };
        expect(foeTurn(s).next.enemyWords?.ward ?? 0).toBe(0);
    });

    it('phase 3 hits +3: Cudgel 10, Salvage Hook 9', () => {
        expect(threatHits(at(wrecker, 'Cudgel', 2))).toEqual([s7(10)]);
        expect(threatHits(at(wrecker, 'Salvage Hook', 2))).toEqual([s7(9)]);
    });
});
