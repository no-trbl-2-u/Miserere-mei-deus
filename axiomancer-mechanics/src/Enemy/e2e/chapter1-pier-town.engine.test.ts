/**
 * Hermetic E2E — Chapter 1's long pier and town (phase EN1g, A10): the
 * Brine-Widow, the Lamprey-Knot, the Green Jelly (reworked into a normal) and
 * the Curfew-Ringer play exactly the Appendix's moves, in order, with each
 * move's rider resolved by the engine (`Combat/combat.enemy-riders.ts`).
 *
 * Each foe fights at its Breakwater level, so every number is the Appendix's
 * scaled with `scaleMoveNumber` from the authored level 2. Counts, percentages
 * and the Green Jelly's "up to 10" stay as printed. Fixed RNG; no disk /
 * network / TTY.
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import type { Enemy } from '../types';
import { BrineWidow, CurfewRinger, ENEMY_REGISTRY, GreenJelly, LampreyKnot } from '../enemy.library';
import { enemyPhaseTarget, PHASES_AUTHORED_LEVEL } from '../enemy-phases';
import { befriendHpGateOpen } from '../befriend';
import { enemyVitae } from '../index';
import { moveKeywords } from '../enemy-keywords';
import { deepClone } from '../../Utils';
import { scaleEnemyToLevel } from '../../World/encounter';
import { sourceAtTier } from '../../World/encounter-tier';
import { BW_ENCOUNTER_FOES } from '../../World/MapEvents/content';
import { registerSandboxCards } from '../../Cards/cards.sandbox';
import {
    freeLineBlock, initializeCombatEncounter, playCombatCard, rollEncounterDice, resolveThreatPhase, threatHits,
} from '../../Combat/combat.engine';
import { scaleMoveNumber } from '../../Combat/combat.threat';
import { CURFEW_REFUSAL, playLimitBlock, riderAfterPlay } from '../../Combat/combat.enemy-riders';
import { initProgramLedger, programSignatureHeal } from '../../Combat/combat.card-program';
import { initElementState } from '../../Combat/combat.elements';
import { initSpikeState } from '../../Combat/combat.spikes';
import { wordsOf } from '../../Combat/combat.enemy-words';
import type { CombatEncounterState } from '../../Combat/combat.encounter.types';

const rng = (): number => 0.5;

registerSandboxCards([
    {
        id: 'qa-en1g-free', name: 'QA Pier', color: 'body',
        description: 'pier fixture', tier: 1, targetType: 'enemy', rank: 1, cardType: 'spell',
        free: { damage: 1 },
    },
]);
const DECK = ['qa-en1g-free'];

function makePlayer(): Character {
    const p = deepClone(Player);
    p.knownCards = DECK.slice();
    p.baseStats = { heart: 5, body: 5, mind: 5 };
    p.health = 500; p.maxHealth = 500;
    p.effects = [];
    return p;
}

/** The foe as its Breakwater node fights it. */
function atLevel(foe: Enemy, level: number): Enemy {
    return { ...scaleEnemyToLevel(foe, level), effects: [] };
}

/** Opens the fight with the foe about to play `move` (in `phase`, 0 = the opening loop). */
function at(foe: Enemy, move: string, phase = 0): CombatEncounterState {
    const s = rollEncounterDice(initializeCombatEncounter(makePlayer(), foe, DECK, 7), rng).state;
    const idx = s.threatPhases.findIndex(p => p.enemyMove?.name === move && p.enemyMove.phase === phase);
    expect(idx, `${foe.id} has no ${move} in phase ${phase}`).toBeGreaterThanOrEqual(0);
    return { ...s, currentPhaseIndex: idx, hand: [], guard: 0 };
}

/** The foe's turn: what the player lost, and the state after. */
function foeTurn(s: CombatEncounterState): { lost: number; next: CombatEncounterState; events: ReturnType<typeof resolveThreatPhase>['events'] } {
    const res = resolveThreatPhase(s, rng);
    return { lost: s.player.health - res.state.player.health, next: res.state, events: res.events };
}

const cards = (n: number) => Array.from({ length: n }, (_u, i) => ({ uid: `h${i}`, cardId: 'qa-en1g-free' }));
const s4 = (n: number) => scaleMoveNumber(n, 4, PHASES_AUTHORED_LEVEL.normal);
const s5 = (n: number) => scaleMoveNumber(n, 5, PHASES_AUTHORED_LEVEL.normal);
const noWords = { ward: 0, brine: 0, leechTurns: 0, leechPotency: 0 };

/** Every foe's phases as `kind name` lines, and its DANGER. */
function shape(foe: Enemy): { moves: string[][]; dangers: (string | undefined)[] } {
    return {
        moves: (foe.phases ?? []).map(p => p.moves.map(m => `${m.kind} ${m.name}`)),
        dangers: (foe.phases ?? []).map(p => p.danger && `${p.danger.kind} ${p.danger.name}`),
    };
}

describe('A10 — the four foes play exactly the Appendix', () => {
    it('the Brine-Widow: Throw the Salt at 30%, Keening\'s BRINE rises to 5', () => {
        expect(shape(BrineWidow)).toEqual({
            moves: [
                ['attack Salt the Wound', 'attack Keening', 'defend Black Veil', 'status Mourning'],
                ['attack Salt the Wound', 'attack Keening', 'defend Black Veil', 'status Mourning'],
            ],
            dangers: [undefined, 'danger Throw the Salt'],
        });
        expect(BrineWidow.phases![0].moves[1].brine).toBe(3);
        expect(BrineWidow.phases![1].moves[1].brine).toBe(5);
    });

    it('the Lamprey-Knot: Unravel at 30%, Writhe rises to 4 hits', () => {
        expect(shape(LampreyKnot)).toEqual({
            moves: [
                ['attack Latch', 'attack Writhe', 'defend Knot Up', 'status Mouthful'],
                ['attack Latch', 'attack Writhe', 'defend Knot Up', 'status Mouthful'],
            ],
            dangers: [undefined, 'danger Unravel'],
        });
        expect(LampreyKnot.phases![0].moves[1].hits).toBe(3);
        expect(LampreyKnot.phases![1].moves[1].hits).toBe(4);
    });

    it('the Green Jelly (reworked): Spit It Out at 30%, Engulf holds 2 cards', () => {
        expect(shape(GreenJelly)).toEqual({
            moves: [
                ['attack Engulf', 'attack Show You Your Face', 'defend Settle', 'status Reflection'],
                ['attack Engulf', 'attack Show You Your Face', 'defend Settle', 'status Reflection'],
            ],
            dangers: [undefined, 'danger Spit It Out'],
        });
        expect(GreenJelly.phases![0].moves[0].rider).toEqual({ kind: 'engulf-hold', cards: 1 });
        expect(GreenJelly.phases![1].moves[0].rider).toEqual({ kind: 'engulf-hold', cards: 2 });
    });

    it('the Curfew-Ringer: Curfew at 30%, then Toll comes every other turn', () => {
        expect(shape(CurfewRinger)).toEqual({
            moves: [
                ['attack Toll', 'attack Clapper', 'defend Bar the Door', 'status Hush'],
                [
                    'attack Toll', 'attack Clapper', 'attack Toll', 'defend Bar the Door',
                    'attack Toll', 'status Hush',
                ],
            ],
            dangers: [undefined, 'danger Curfew'],
        });
    });

    it('each is a registered normal with its own id, portrait key and enemy words', () => {
        for (const [slug, foe] of [
            ['brine-widow', BrineWidow], ['lamprey-knot', LampreyKnot], ['green-jelly', GreenJelly],
            ['curfew-ringer', CurfewRinger],
        ] as const) {
            expect(ENEMY_REGISTRY[slug]).toBe(foe);
            expect(foe.id).toBe(`enemy-${slug}`);
            expect(foe.portraitAsset).toBe(slug);
            expect(foe.difficulty).toBe('normal');
            expect(foe.stages).toEqual([]);
        }
        const words = (foe: Enemy) => new Set((foe.phases ?? []).flatMap(p => [...p.moves, ...(p.danger ? [p.danger] : [])]).flatMap(moveKeywords));
        expect([...words(BrineWidow)].sort()).toEqual(['brine', 'vulnerable', 'ward']);
        expect([...words(LampreyKnot)].sort()).toEqual(['leech', 'mend', 'ward']);
        expect([...words(CurfewRinger)].sort()).toEqual(['tangle', 'ward']);
    });

    it('the town and pier nodes bind them, every foe under level 10', () => {
        expect(BW_ENCOUNTER_FOES['bw-h7']).toEqual({ slug: 'brine-widow', level: 4 });
        expect(BW_ENCOUNTER_FOES['bw-t1']).toEqual({ slug: 'lamprey-knot', level: 4 });
        expect(BW_ENCOUNTER_FOES['bw-t2']).toEqual({ slug: 'green-jelly', level: 5 });
        expect(BW_ENCOUNTER_FOES['bw-t3']).toEqual({ slug: 'curfew-ringer', level: 5 });
        expect(BW_ENCOUNTER_FOES['bw-t6']).toEqual({ slug: 'green-jelly', level: 5 });
        for (const row of Object.values(BW_ENCOUNTER_FOES)) expect(row.level).toBeLessThan(10);
    });
});

describe('the Brine-Widow\'s riders (level 4)', () => {
    const widow = atLevel(BrineWidow, 4);

    it('Salt the Wound: 5, doubled while you carry any status', () => {
        const s = at(widow, 'Salt the Wound');
        expect(threatHits(s)).toEqual([s4(5)]);
        const afflicted = {
            ...s,
            player: {
                ...s.player,
                effects: [{ effectId: 'debuff_bleed', remainingDuration: 2, intensity: 1, appliedAt: 1, tier: 1 as const }],
            },
        };
        expect(threatHits(afflicted)).toEqual([s4(5) * 2]);
        // (The affliction's own tick lands on top of the doubled hit.)
        expect(foeTurn(afflicted).lost).toBeGreaterThanOrEqual(s4(5) * 2);
        // A LEECH on you is a status too; so is your own INFERNO.
        expect(threatHits({ ...s, enemyWords: { ...noWords, leechTurns: 2, leechPotency: 2 } })).toEqual([s4(5) * 2]);
        const burning = { ...s, program: { ...initProgramLedger(), el: { ...initElementState(), infSelf: 1 } } };
        expect(threatHits(burning)).toEqual([s4(5) * 2]);
    });

    it('Keening: 4 and BRINE 3, then BRINE 5 in its second phase', () => {
        const first = foeTurn(at(widow, 'Keening'));
        expect(first.lost).toBe(s4(4));
        expect(first.next.enemyWords?.brine).toBe(s4(3));
        expect(foeTurn(at(widow, 'Keening', 1)).next.enemyWords?.brine).toBe(s4(5));
    });

    it('Black Veil: WARD 6, and your HEAL is halved until its next turn', () => {
        const veiled = foeTurn(at(widow, 'Black Veil')).next;
        expect(veiled.enemyWords?.ward).toBe(s4(6));
        expect(veiled.enemyRiders?.veil).toBe(true);
        const hurt = { ...veiled, player: { ...veiled.player, health: 100 } };
        const healed = programSignatureHeal(hurt, 8, 'qa').state.player.health - 100;
        const open = programSignatureHeal({ ...hurt, enemyRiders: {} }, 8, 'qa').state.player.health - 100;
        expect(open).toBeGreaterThan(1);
        expect(healed).toBe(Math.floor(open / 2));
        // Its next turn lifts the veil.
        expect(foeTurn(veiled).next.enemyRiders?.veil).toBeUndefined();
    });

    it('Mourning: you are VULNERABLE 25%', () => {
        const { next } = foeTurn(at(widow, 'Mourning'));
        expect(next.player.effects.find(e => e.effectId === 'debuff_vulnerable')?.intensity).toBe(25);
    });

    it('Throw the Salt: strips THORNS, REFLECT and INFERNO first, then 3 damage for each one stripped', () => {
        const s = at(widow, 'Throw the Salt', 1);
        expect(threatHits(s)).toEqual([]);
        const armed = {
            ...s,
            program: {
                ...initProgramLedger(),
                spikes: { ...initSpikeState(), thorns: 4, reflect: 30, reflectTurns: 2 },
                el: { ...initElementState(), infSelf: 2 },
            },
        };
        expect(threatHits(armed)).toEqual([s4(3) * 3]);
        const res = foeTurn(armed);
        expect(res.lost).toBe(s4(3) * 3);
        expect(res.next.program?.spikes.thorns).toBe(0);
        expect(res.next.program?.spikes.reflect).toBe(0);
        expect(res.next.program?.el?.infSelf).toBe(0);
        // The stripped spikes never answered the strikes.
        expect(res.next.enemy.health).toBe(armed.enemy.health);
        expect(res.events).toContainEqual({ kind: 'enemy-rider', rider: 'strip-weather-hits', amount: 3 });
        // One of the three standing is one hit.
        const one = { ...s, program: { ...initProgramLedger(), spikes: { ...initSpikeState(), thorns: 2 } } };
        expect(threatHits(one)).toEqual([s4(3)]);
    });
});

describe('the Lamprey-Knot\'s riders (level 4)', () => {
    const knot = atLevel(LampreyKnot, 4);

    it('Latch: 4 and LEECH 2 on you', () => {
        const res = foeTurn(at(knot, 'Latch'));
        expect(res.lost).toBe(s4(4));
        expect(wordsOf(res.next).leechPotency).toBe(s4(2));
        expect(wordsOf(res.next).leechTurns).toBeGreaterThan(0);
    });

    it('Writhe: 3 hits of 2, then 4 hits in its second phase', () => {
        expect(threatHits(at(knot, 'Writhe'))).toEqual([s4(2), s4(2), s4(2)]);
        expect(threatHits(at(knot, 'Writhe', 1))).toEqual([s4(2), s4(2), s4(2), s4(2)]);
    });

    it('Knot Up: WARD 5 and MEND 4', () => {
        const s = at(knot, 'Knot Up');
        const hurt = { ...s, enemy: { ...s.enemy, health: s.enemy.maxHealth - 30 } };
        const { next } = foeTurn(hurt);
        expect(next.enemyWords?.ward).toBe(s4(5));
        expect(next.enemy.health).toBe(hurt.enemy.health + s4(4));
    });

    it('Mouthful: LEECH 3 on you', () => {
        expect(wordsOf(foeTurn(at(knot, 'Mouthful')).next).leechPotency).toBe(s4(3));
    });

    it('Unravel: 4 damage per turn of LEECH left on you, then it lets go', () => {
        const s = at(knot, 'Unravel', 1);
        expect(threatHits(s)).toEqual([]);
        const leeched = { ...s, enemyWords: { ...noWords, leechTurns: 3, leechPotency: 2 } };
        expect(threatHits(leeched)).toEqual([s4(4) * 3]);
        const res = foeTurn(leeched);
        expect(res.lost).toBe(s4(4) * 3);
        expect(wordsOf(res.next).leechTurns).toBe(0);
        expect(wordsOf(res.next).leechPotency).toBe(0);
    });
});

describe('the Green Jelly\'s riders (level 5)', () => {
    const jelly = atLevel(GreenJelly, 5);

    /** The play that moves the first hand card to the discard. */
    function played(s: CombatEncounterState): { before: CombatEncounterState; after: CombatEncounterState } {
        const [first, ...rest] = s.hand;
        return { before: s, after: { ...s, hand: rest, discard: [...s.discard, first!.cardId] } };
    }

    it('Engulf: 5; the next card you play is HELD inside it, out of your discard', () => {
        const engulfed = foeTurn({ ...at(jelly, 'Engulf'), hand: cards(3) });
        expect(engulfed.lost).toBe(s5(5));
        expect(engulfed.next.enemyRiders?.holdArmed).toBe(1);
        const { before, after } = played(engulfed.next);
        const held = riderAfterPlay(before, after);
        expect(held.state.discard).toEqual([]);
        expect(held.state.enemyRiders?.held).toEqual(['qa-en1g-free']);
        expect(held.state.enemyRiders?.holdArmed).toBeUndefined();
        // Only the next one: a second play lands in the discard.
        const again = played(held.state);
        expect(riderAfterPlay(again.before, again.after).state.discard).toEqual(['qa-en1g-free']);
    });

    it('Engulf in its second phase holds 2 cards', () => {
        let s = foeTurn({ ...at(jelly, 'Engulf', 1), hand: cards(4) }).next;
        expect(s.enemyRiders?.holdArmed).toBe(2);
        for (let i = 0; i < 3; i++) {
            const p = played(s);
            s = riderAfterPlay(p.before, p.after).state;
        }
        expect(s.enemyRiders?.held).toHaveLength(2);
        expect(s.discard).toHaveLength(1);
    });

    it('a real play is held, and the engine keeps the card out of the discard', () => {
        const armed = { ...at(jelly, 'Settle'), phase: 'phase-play' as const, hand: cards(2), enemyRiders: { holdArmed: 1 } };
        const res = playCombatCard(armed, { uid: 'h0' }, false, undefined, rng);
        expect(res.state.hand).toHaveLength(1);
        expect(res.state.enemyRiders?.held).toEqual(['qa-en1g-free']);
        expect(res.state.discard).not.toContain('qa-en1g-free');
    });

    it('Show You Your Face: deals what you dealt it since its last turn, up to 10', () => {
        const s = at(jelly, 'Show You Your Face');
        const some = { ...s, directDamageDealt: 8, enemyRiders: { dealtMark: 0 } };
        expect(threatHits(some)).toEqual([8]);
        expect(foeTurn(some).lost).toBe(8);
        const big = { ...s, directDamageDealt: 90, enemyRiders: { dealtMark: 0 } };
        expect(threatHits(big)).toEqual([10]);
        expect(threatHits({ ...s, enemyRiders: { dealtMark: s.directDamageDealt } })).toEqual([]);
    });

    it('Settle: WARD 8, telegraphed as DEFEND', () => {
        const s = at(jelly, 'Settle');
        expect(s.threatPhases[s.currentPhaseIndex].intentType).toBe('defend');
        expect(foeTurn(s).next.enemyWords?.ward).toBe(s5(8));
    });

    it('Reflection: the last status you put on it lands on you', () => {
        const s = at(jelly, 'Reflection');
        const before = s;
        const struck = {
            ...s,
            enemy: { ...s.enemy, effects: [{ effectId: 'debuff_vulnerable', remainingDuration: 2, intensity: 25, appliedAt: 1, tier: 1 as const }] },
        };
        const noted = riderAfterPlay(before, struck).state;
        expect(noted.enemyRiders?.lastStatus).toEqual({ kind: 'effect', effectId: 'debuff_vulnerable', intensity: 25, turns: 2 });
        const { next } = foeTurn(noted);
        expect(next.player.effects.find(e => e.effectId === 'debuff_vulnerable')?.intensity).toBe(25);
        expect(next.enemyRiders?.lastStatus).toBeUndefined();
        // With nothing put on it, nothing comes back.
        expect(foeTurn(s).next.player.effects).toEqual([]);
    });

    it('Reflection throws back a LEECH and an INFERNO too', () => {
        const s = at(jelly, 'Reflection');
        const leeched = { ...s, program: { ...initProgramLedger(), leechTurns: 3, leechPotency: 2 } };
        const noted = riderAfterPlay(s, leeched).state;
        expect(noted.enemyRiders?.lastStatus).toEqual({ kind: 'leech', turns: 3, potency: 2 });
        expect(wordsOf(foeTurn(noted).next).leechPotency).toBe(2);
        const lit = { ...s, program: { ...initProgramLedger(), el: { ...initElementState(), infFoe: 3 } } };
        const burning = riderAfterPlay(s, lit).state;
        expect(foeTurn(burning).next.program?.el?.infSelf).toBe(3);
    });

    it('Spit It Out: every HELD card drops into your discard, 4 damage per card', () => {
        const s = at(jelly, 'Spit It Out', 1);
        expect(threatHits(s)).toEqual([]);
        const card = 'qa-en1g-free';
        const full = { ...s, discard: [card], enemyRiders: { held: [card, card, card] } };
        expect(threatHits(full)).toEqual([s5(4) * 3]);
        const res = foeTurn(full);
        expect(res.lost).toBe(s5(4) * 3);
        // The cards are back in play (the foe's turn may redraw some into your hand).
        const home = [...res.next.discard, ...res.next.drawPile, ...res.next.hand.map(h => h.cardId)];
        expect(home.filter(id => id === card).length).toBeGreaterThanOrEqual(4);
        expect(res.next.enemyRiders?.held).toBeUndefined();
    });

    it('is still befriendable at its 30% line, which is also where its second phase begins', () => {
        expect(jelly.befriendabilityConfig).toEqual({ hpGate: { belowPct: 0.3 } });
        const at40 = { ...jelly, health: Math.ceil(jelly.maxHealth * 0.4) };
        const at29 = { ...jelly, health: Math.floor(jelly.maxHealth * 0.29) };
        expect(befriendHpGateOpen(at40)).toBe(false);
        expect(befriendHpGateOpen(at29)).toBe(true);
        expect(enemyPhaseTarget(at40)).toBe(0);
        expect(enemyPhaseTarget(at29)).toBe(1);
    });

    it('stages as an elite in an elite slot: the elite pool, the elite lines, the same moves', () => {
        const slot = scaleEnemyToLevel(sourceAtTier(GreenJelly, 'elite'), 3);
        expect(slot.difficulty).toBe('elite');
        expect(slot.maxHealth).toBe(enemyVitae(3, 'elite'));
        expect(slot.maxHealth).toBeGreaterThan(scaleEnemyToLevel(GreenJelly, 3).maxHealth);
        expect(sourceAtTier(GreenJelly, undefined)).toBe(GreenJelly);
        const s = at({ ...slot, effects: [] }, 'Settle');
        expect(foeTurn(s).next.enemyWords?.ward).toBeGreaterThan(0);
    });
});

describe('the Curfew-Ringer\'s riders (level 5)', () => {
    const ringer = atLevel(CurfewRinger, 5);

    it('Toll: 4, +2 for every Toll already rung this fight, and each one rung adds to the count', () => {
        let s = at(ringer, 'Toll');
        expect(threatHits(s)).toEqual([s5(4)]);
        s = foeTurn(s).next;
        expect(s.enemyRiders?.tolls).toBe(1);
        const again = { ...at(ringer, 'Toll'), enemyRiders: s.enemyRiders };
        expect(threatHits(again)).toEqual([s5(4) + s5(2)]);
        expect(threatHits({ ...at(ringer, 'Toll'), enemyRiders: { tolls: 3 } })).toEqual([s5(4) + 3 * s5(2)]);
        expect(foeTurn({ ...at(ringer, 'Toll'), enemyRiders: { tolls: 3 } }).next.enemyRiders?.tolls).toBe(4);
    });

    it('Clapper: 7, +4 if you played 3+ cards this turn', () => {
        const s = at(ringer, 'Clapper');
        expect(threatHits(s)).toEqual([s5(7)]);
        expect(threatHits({ ...s, enemyRiders: { played: 2 } })).toEqual([s5(7)]);
        expect(threatHits({ ...s, enemyRiders: { played: 3 } })).toEqual([s5(7) + s5(4)]);
        expect(foeTurn({ ...s, enemyRiders: { played: 4 } }).lost).toBe(s5(7) + s5(4));
    });

    it('your plays are counted from the hand a play empties, and reset when the foe\'s turn ends', () => {
        const s = { ...at(ringer, 'Clapper'), hand: cards(4) };
        let state = s;
        for (let i = 0; i < 3; i++) {
            const after = { ...state, hand: state.hand.slice(1), discard: [...state.discard, 'qa-en1g-free'] };
            state = riderAfterPlay(state, after).state;
        }
        expect(state.enemyRiders?.played).toBe(3);
        const res = foeTurn(state);
        expect(res.lost).toBe(s5(7) + s5(4));
        expect(res.next.enemyRiders?.played).toBeUndefined();
    });

    it('Bar the Door: WARD 8 and Hush: TANGLE 2', () => {
        const barred = at(ringer, 'Bar the Door');
        expect(barred.threatPhases[barred.currentPhaseIndex].intentType).toBe('defend');
        expect(foeTurn(barred).next.enemyWords?.ward).toBe(s5(8));
        expect(foeTurn(at(ringer, 'Hush')).next.enemyWords?.tangle).toBe(2);
    });

    it('Curfew: next turn you can play at most 2 cards, FREE or PAID, and it ends at the foe\'s turn', () => {
        const fired = foeTurn({ ...at(ringer, 'Curfew', 1), hand: cards(5) });
        expect(fired.lost).toBe(0);
        expect(fired.next.enemyRiders?.curfew).toBe(2);
        expect(fired.events).toContainEqual({ kind: 'enemy-rider', rider: 'curfew', amount: 2 });
        // Your turn: two plays are fine, the third is refused by the engine and the board alike.
        let s: CombatEncounterState = { ...fired.next, phase: 'phase-play', hand: cards(5) };
        expect(playLimitBlock(s)).toBeNull();
        for (const uid of ['h0', 'h1']) {
            const res = playCombatCard(s, { uid }, false, undefined, rng);
            expect(res.state.hand.some(h => h.uid === uid), uid).toBe(false);
            s = res.state;
        }
        expect(s.enemyRiders?.played).toBe(2);
        expect(playLimitBlock(s)).toBe(CURFEW_REFUSAL);
        expect(freeLineBlock(s, 'h2')).toBe(CURFEW_REFUSAL);
        const refused = playCombatCard(s, { uid: 'h2' }, false, undefined, rng);
        expect(refused.state.hand.some(h => h.uid === 'h2')).toBe(true);
        expect(refused.events.some(e => e.kind === 'effect-fizzled')).toBe(true);
        // The foe's next turn lifts it.
        expect(foeTurn({ ...s, phase: 'phase-resolve', currentPhaseIndex: fired.next.currentPhaseIndex }).next.enemyRiders?.curfew).toBeUndefined();
    });

    it('no curfew stands before its DANGER', () => {
        const s = { ...at(ringer, 'Toll'), phase: 'phase-play' as const, hand: cards(5), enemyRiders: { played: 9 } };
        expect(playLimitBlock(s)).toBeNull();
        expect(freeLineBlock(s, 'h0')).toBeNull();
    });
});
