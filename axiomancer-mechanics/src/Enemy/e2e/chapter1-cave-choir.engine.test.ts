/**
 * Hermetic E2E — the sea cave's second elite (phase EN1j, A15): the Cave
 * Choir plays the Appendix's three phases and two DANGERs, keeps its VERSE
 * count as fight state (`enemyRiders.verse`), and its Antiphon telegraphs
 * UNKNOWN and answers what you did last turn.
 *
 * It fights at `bw-c1`'s level 5, so every number is the Appendix's scaled
 * with `scaleMoveNumber` from the elite's authored level 3. Counts (VERSE,
 * hits, TANGLE, BARNACLE) stay as printed. Fixed RNG; no disk / network / TTY.
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import type { Enemy } from '../types';
import { CaveChoir, ENEMY_REGISTRY } from '../enemy.library';
import { PHASES_AUTHORED_LEVEL } from '../enemy-phases';
import { enemyVitae } from '../index';
import { moveKeywords } from '../enemy-keywords';
import { deepClone } from '../../Utils';
import { scaleEnemyToLevel } from '../../World/encounter';
import { registerSandboxCards } from '../../Cards/cards.sandbox';
import { BARNACLE_ID } from '../../Cards/library/enemy-curses.cards';
import {
    initializeCombatEncounter, playCombatCard, rollEncounterDice, resolveThreatPhase, startTurn, threatHits,
} from '../../Combat/combat.engine';
import { scaleMoveNumber } from '../../Combat/combat.threat';
import { antiphonAnswer, verseOf } from '../../Combat/combat.enemy-riders';
import type { CombatEncounterState, CombatEvent } from '../../Combat/combat.encounter.types';

const rng = (): number => 0.5;

registerSandboxCards([
    {
        id: 'qa-en1j-free', name: 'QA Cave', color: 'body',
        description: 'cave fixture', tier: 1, targetType: 'enemy', rank: 1, cardType: 'spell',
        free: { damage: 1 },
    },
]);
const DECK = ['qa-en1j-free'];

function makePlayer(): Character {
    const p = deepClone(Player);
    p.knownCards = DECK.slice();
    p.baseStats = { heart: 5, body: 5, mind: 5 };
    p.health = 500; p.maxHealth = 500;
    p.effects = [];
    return p;
}

const choir: Enemy = { ...scaleEnemyToLevel(CaveChoir, 5), effects: [] };

/** Opens the fight with the choir about to play `move` (in `phase`, 0 = the opening loop). */
function at(move: string, phase = 0): CombatEncounterState {
    const s = rollEncounterDice(initializeCombatEncounter(makePlayer(), choir, DECK, 7), rng).state;
    const idx = s.threatPhases.findIndex(p => p.enemyMove?.name === move && p.enemyMove.phase === phase);
    expect(idx, `the choir has no ${move} in phase ${phase}`).toBeGreaterThanOrEqual(0);
    return { ...s, currentPhaseIndex: idx, hand: [], guard: 0 };
}

/** The choir's turn: what the player lost, and the state after. */
function foeTurn(s: CombatEncounterState): { lost: number; next: CombatEncounterState; events: CombatEvent[] } {
    const res = resolveThreatPhase(s, rng);
    return { lost: s.player.health - res.state.player.health, next: res.state, events: res.events };
}

const s5 = (n: number) => scaleMoveNumber(n, 5, PHASES_AUTHORED_LEVEL.elite);
const withVerse = (s: CombatEncounterState, verse: number): CombatEncounterState =>
    ({ ...s, enemyRiders: { ...s.enemyRiders, verse } });
const riderEvents = (events: readonly CombatEvent[]) =>
    events.filter((e): e is Extract<CombatEvent, { kind: 'enemy-rider' }> => e.kind === 'enemy-rider');

describe('A15 — the Cave Choir plays exactly the Appendix', () => {
    it('three phases: Toll for the Drowned at 60%, the Amen at 30%', () => {
        const shape = (CaveChoir.phases ?? []).map(p => ({
            danger: p.danger && `${p.danger.kind} ${p.danger.name}`,
            moves: p.moves.map(m => `${m.kind} ${m.name}`),
        }));
        expect(shape).toEqual([
            { danger: undefined, moves: ['attack Hymn', 'defend The Pews', 'status Hush'] },
            { danger: 'danger Toll for the Drowned', moves: ['attack Crescendo', 'attack Hymn', 'status Sea-Water Psalm'] },
            { danger: 'danger Amen', moves: ['unknown Antiphon', 'attack Crescendo'] },
        ]);
    });

    it('is a registered elite with its own id, portrait key, VITAE and enemy words', () => {
        expect(ENEMY_REGISTRY['cave-choir']).toBe(CaveChoir);
        expect(CaveChoir).toMatchObject({
            id: 'enemy-cave-choir', portraitAsset: 'cave-choir', name: 'The Cave Choir',
            difficulty: 'elite', level: 5, description: 'The drowned congregation, still at service under the cliff.',
        });
        expect(choir.maxHealth).toBe(enemyVitae(5, 'elite'));
        const words = new Set((CaveChoir.phases ?? []).flatMap(p => [...p.moves, ...(p.danger ? [p.danger] : [])])
            .flatMap(m => moveKeywords(m)));
        expect([...words].sort()).toEqual(['barnacle', 'tangle', 'undertow', 'ward']);
    });

    it('crosses its 60% line into Toll for the Drowned and its 30% line into the Amen, one per turn', () => {
        let s = at('Hymn');
        const sixty = foeTurn({ ...s, enemy: { ...s.enemy, health: Math.floor(s.enemy.maxHealth * 0.6) } });
        expect(sixty.events).toContainEqual({ kind: 'enemy-phase-entered', enemyId: choir.id, phase: 1, danger: 'Toll for the Drowned' });
        s = sixty.next;
        expect(s.threatPhases[s.currentPhaseIndex]!.intentType).toBe('danger');
        const thirty = foeTurn({ ...s, enemy: { ...s.enemy, health: Math.floor(s.enemy.maxHealth * 0.3) } });
        expect(thirty.events).toContainEqual({ kind: 'enemy-phase-entered', enemyId: choir.id, phase: 2, danger: 'Amen' });
        expect(thirty.next.threatPhases[thirty.next.currentPhaseIndex]!.enemyMove).toMatchObject({ name: 'Amen', danger: true });
    });
});

describe('VERSE: each Hymn adds one', () => {
    it('Hymn: 3 damage, 2 hits, +1 VERSE', () => {
        const s = at('Hymn');
        expect(threatHits(s)).toEqual([s5(3), s5(3)]);
        const fired = foeTurn(s);
        expect(fired.lost).toBe(2 * s5(3));
        expect(verseOf(fired.next)).toBe(1);
        expect(riderEvents(fired.events)).toContainEqual({ kind: 'enemy-rider', rider: 'verse-gain', amount: 1 });
        expect(verseOf(foeTurn({ ...at('Hymn'), enemyRiders: fired.next.enemyRiders }).next)).toBe(2);
    });

    it('VERSE outlasts the foe\'s turn end; the other moves leave it alone', () => {
        const pews = foeTurn(withVerse(at('The Pews'), 3));
        expect(verseOf(pews.next)).toBe(3);
        expect(pews.next.enemyWords?.ward).toBe(s5(10));
        expect(foeTurn(withVerse(at('Hush'), 3)).next.enemyWords?.tangle).toBe(2);
    });

    it('Crescendo: one hit of 2 damage per VERSE, and none with no VERSE', () => {
        expect(threatHits(withVerse(at('Crescendo', 1), 4))).toEqual([4 * s5(2)]);
        expect(foeTurn(withVerse(at('Crescendo', 1), 4)).lost).toBe(4 * s5(2));
        expect(threatHits(at('Crescendo', 1))).toEqual([]);
        expect(verseOf(foeTurn(withVerse(at('Crescendo', 1), 4)).next)).toBe(4);
    });

    it('Sea-Water Psalm: 2 BARNACLE Curses into your hand', () => {
        const hand = foeTurn(at('Sea-Water Psalm', 1)).next.hand;
        expect(hand.filter(h => h.cardId === BARNACLE_ID)).toHaveLength(2);
    });
});

describe('the two DANGERs', () => {
    it('Toll for the Drowned: UNDERTOW on the Heart and Mind dice, then 8 damage', () => {
        const fired = foeTurn(at('Toll for the Drowned', 1));
        expect(fired.lost).toBe(s5(8));
        expect(fired.next.enemyWords).toMatchObject({ undertow: 'heart', undertowAlso: 'mind' });
        const next = startTurn(fired.next, rng);
        const colors = next.state.dice.map(d => d.color);
        expect(colors).not.toContain('heart');
        expect(colors).not.toContain('mind');
        expect(colors).toContain('body');
        expect(next.events).toContainEqual({ kind: 'enemy-word', word: 'undertow', op: 'spent', amount: 2 });
        expect(next.state.enemyWords?.undertow).toBeUndefined();
        expect(next.state.enemyWords?.undertowAlso).toBeUndefined();
    });

    it('the Amen spends every VERSE: 3 damage per VERSE, and it MENDs the same', () => {
        const s = withVerse(at('Amen', 2), 5);
        const hurt = { ...s, enemy: { ...s.enemy, health: Math.floor(s.enemy.maxHealth * 0.25) } };
        expect(threatHits(hurt)).toEqual([5 * s5(3)]);
        const fired = foeTurn(hurt);
        expect(fired.lost).toBe(5 * s5(3));
        expect(fired.next.enemy.health - hurt.enemy.health).toBe(5 * s5(3));
        expect(verseOf(fired.next)).toBe(0);
        expect(riderEvents(fired.events)).toContainEqual({ kind: 'enemy-rider', rider: 'verse-amen', amount: 5 });
    });

    it('an Amen with no VERSE sung hits and mends nothing', () => {
        const s = at('Amen', 2);
        const hurt = { ...s, enemy: { ...s.enemy, health: 10 } };
        const fired = foeTurn(hurt);
        expect(fired.lost).toBe(0);
        expect(fired.next.enemy.health).toBe(10);
    });
});

describe('the Antiphon answers your last turn (UNKNOWN)', () => {
    it('telegraphs UNKNOWN, with its name and no number', () => {
        const s = at('Antiphon', 2);
        expect(s.threatPhases[s.currentPhaseIndex]!.intentType).toBe('unknown');
        expect(s.threatPhases[s.currentPhaseIndex]!.enemyMove).toMatchObject({ name: 'Antiphon', kind: 'unknown' });
    });

    it('you attacked: it answers with The Pews (WARD 10, no hit, no VERSE)', () => {
        const s = withVerse({ ...at('Antiphon', 2), directDamageDealt: 7, enemyRiders: { dealtMark: 3 } }, 2);
        expect(antiphonAnswer(s)).toBe('pews');
        expect(threatHits(s)).toEqual([]);
        const fired = foeTurn(s);
        expect(fired.lost).toBe(0);
        expect(fired.next.enemyWords?.ward).toBe(s5(10));
        expect(verseOf(fired.next)).toBe(2);
    });

    it('you guarded: it answers with a Hymn worth +2 VERSE', () => {
        const s = withVerse({ ...at('Antiphon', 2), directDamageDealt: 3, enemyRiders: { dealtMark: 3 }, guard: 4 }, 2);
        expect(antiphonAnswer(s)).toBe('hymn');
        expect(threatHits(s)).toEqual([s5(3), s5(3)]);
        const fired = foeTurn(s);
        expect(fired.lost).toBe(Math.max(0, s5(3) - 4) + s5(3));
        expect(fired.next.enemyWords?.ward ?? 0).toBe(0);
        expect(verseOf(fired.next)).toBe(4);
        expect(riderEvents(fired.events)).toContainEqual({ kind: 'enemy-rider', rider: 'antiphon', amount: 2 });
    });

    it('a real attack on your turn turns the answer to The Pews', () => {
        const s = { ...at('Antiphon', 2), phase: 'phase-play' as const, hand: [{ uid: 'h0', cardId: 'qa-en1j-free' }] };
        expect(antiphonAnswer(s)).toBe('hymn');
        const played = playCombatCard(s, { uid: 'h0' }, false, undefined, rng).state;
        expect(played.directDamageDealt).toBeGreaterThan(s.directDamageDealt);
        expect(antiphonAnswer(played)).toBe('pews');
        const fired = foeTurn({ ...played, phase: 'phase-resolve' });
        expect(fired.lost).toBe(0);
        expect(fired.next.enemyWords?.ward).toBe(s5(10));
        // The foe's turn end re-marks what you dealt: the next read starts afresh.
        expect(antiphonAnswer(fired.next)).toBe('hymn');
    });
});
