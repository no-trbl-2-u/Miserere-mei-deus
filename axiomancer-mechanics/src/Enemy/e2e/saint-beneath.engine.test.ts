/**
 * Hermetic E2E — the Saint Beneath plays moves of its own: four HP phases at
 * the boss lines, Communion's Curse count, and the DANGERs that count your
 * hand after their own two BARNACLE land.
 *
 * Numbers are the spec's at the boss's authored level 2, then pinned at the
 * level 1 (a scaling check; the chapter door now fights it at level 8, at its
 * full VITAE, pinned in breakwater.engine.test). Fixed RNG; no disk /
 * network / TTY.
 */

import { describe, expect, it } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import type { Enemy } from '../types';
import { DeathBeholder, ENEMY_REGISTRY, SaintBeneath } from '../enemy.library';
import { enemyPhaseKeywords } from '../enemy-keywords';
import { escalationApplies } from '../enemy-phases';
import { deepClone } from '../../Utils';
import { scaleEnemyToLevel } from '../../World/encounter';
import { registerSandboxCards } from '../../Cards/cards.sandbox';
import { BARNACLE_ID } from '../../Cards/library/enemy-curses.cards';
import { applyEffect, lookupEffect } from '../../Effects';
import {
    initializeCombatEncounter, resolveThreatPhase, rollEncounterDice, startTurn, threatHits,
} from '../../Combat/combat.engine';
import { ENEMY_DECKS } from '../../Combat/combat.enemy-decks';
import type { CombatEncounterState, CombatEvent } from '../../Combat/combat.encounter.types';

const rng = (): number => 0.5;

registerSandboxCards([
    {
        id: 'qa-saint-free', name: 'QA Saint', color: 'body',
        description: 'saint fixture', tier: 1, targetType: 'enemy', rank: 1, cardType: 'spell',
        free: { damage: 1 },
    },
]);
const DECK = ['qa-saint-free'];

function makePlayer(): Character {
    const p = deepClone(Player);
    p.knownCards = DECK.slice();
    p.baseStats = { heart: 5, body: 5, mind: 5 };
    p.health = 500; p.maxHealth = 500;
    p.effects = [];
    return p;
}

const saintAt = (level: number): Enemy => ({ ...scaleEnemyToLevel(SaintBeneath, level), effects: [] });
const AUTHORED = saintAt(2);
const DOOR = saintAt(1);

/** Opens the fight with the Saint about to play `move`, nothing in hand or piles. */
function at(move: string, phase = 0, foe: Enemy = AUTHORED): CombatEncounterState {
    const s = rollEncounterDice(initializeCombatEncounter(makePlayer(), foe, DECK, 7), rng).state;
    const idx = s.threatPhases.findIndex(p => p.enemyMove?.name === move && p.enemyMove.phase === phase);
    expect(idx, `the Saint has no ${move} in phase ${phase}`).toBeGreaterThanOrEqual(0);
    return { ...s, currentPhaseIndex: idx, hand: [], drawPile: [], discard: [], guard: 0 };
}

/** A hand of `n` plain cards. */
const hand = (n: number): CombatEncounterState['hand'] =>
    Array.from({ length: n }, (_, i) => ({ uid: `h${i}`, cardId: 'qa-saint-free' }));

function foeTurn(s: CombatEncounterState): { lost: number; next: CombatEncounterState; events: CombatEvent[] } {
    const res = resolveThreatPhase(s, rng);
    return { lost: s.player.health - res.state.player.health, next: res.state, events: res.events };
}

const barnacles = (s: CombatEncounterState): number => s.hand.filter(h => h.cardId === BARNACLE_ID).length;

describe('the Saint Beneath has no deck, no stages and no copied page (A4)', () => {
    it('plays exactly the six moves, in four phases, each DANGER opening its phase', () => {
        const shape = (SaintBeneath.phases ?? []).map(p => ({
            danger: p.danger && `${p.danger.kind} ${p.danger.name}`,
            moves: p.moves.map(m => `${m.kind} ${m.name}`),
        }));
        const loop = ['attack Communion', 'defend The Faithful Gather', 'status Hear Me'];
        expect(shape).toEqual([
            { danger: undefined, moves: loop },
            { danger: 'danger Swell', moves: loop },
            { danger: 'danger Tithe of the Drowned', moves: loop },
            { danger: 'danger Pull Under', moves: loop },
        ]);
    });

    it('prints each move as the spec words it', () => {
        const saint = SaintBeneath.phases!;
        const opening = Object.fromEntries(saint[0]!.moves.map(m => [m.name, m.text]));
        expect(opening).toEqual({
            Communion: '2 damage per Curse in your hand, deck and discard. With none, a BARNACLE Curse goes into your hand instead.',
            'The Faithful Gather': 'MEND 10 and it SCOURs one status off itself.',
            'Hear Me': 'SEIZED: your heart and mind dice sit out your next roll.',
        });
        expect(saint[1]!.danger!.text).toBe('2 BARNACLE, then TANGLE 1 per card in your hand.');
        expect(saint[2]!.danger!.text).toBe('2 BARNACLE, then 3 damage per card in your hand.');
        expect(saint[3]!.danger!.text).toBe('16 damage. If you are under half VITAE: 24 damage, and it MENDs 12.');
    });

    it('is the boss tier at 320 VITAE, with no enemy deck, stages or Beholder text', () => {
        expect(ENEMY_REGISTRY['saint-beneath']).toBe(SaintBeneath);
        expect(SaintBeneath).toMatchObject({ difficulty: 'boss', maxHealth: 320 });
        expect(ENEMY_DECKS['enemy-saint-beneath']).toBeUndefined();
        expect(SaintBeneath.stages).toEqual([]);
        expect(SaintBeneath.journalEntry?.body).toBe(
            'He was a fisherman once and he stood up in the square against the men who held the town and he asked the others to stand with him and they did not. They watched from their doorways. The gang held him under at the foot of the quay until the bubbles quit and then they put what was left of him in the river and the river carried him down to the sea. He did not go easy into it. Something in the dark took up his anger and made a body for it, a great length of scale and gristle with the old man\'s face set in the front of it like a mask nailed to a prow. Now it lies beneath the Breakwater with its mouth open and no boat leaves and no one walks out and the town keeps the vigil it once refused him. They call it a saint. It has never forgiven anyone.',
        );
    });

    it('its words include the TANGLE and BARNACLE its riders place', () => {
        expect(enemyPhaseKeywords(SaintBeneath)).toEqual(['mend', 'scour', 'tangle', 'seized', 'barnacle']);
    });

    it('keeps the boss clock: phases do not switch escalation off for a boss', () => {
        expect(escalationApplies(SaintBeneath)).toBe(true);
    });
});

describe('the boss lines (A4)', () => {
    it('crosses 75%, 50% and 25% one DANGER per turn', () => {
        let s = at('Communion');
        for (const [line, phase, danger] of [[0.75, 1, 'Swell'], [0.5, 2, 'Tithe of the Drowned'], [0.25, 3, 'Pull Under']] as const) {
            const crossed = foeTurn({ ...s, enemy: { ...s.enemy, health: Math.floor(s.enemy.maxHealth * line) } });
            expect(crossed.events).toContainEqual({ kind: 'enemy-phase-entered', enemyId: AUTHORED.id, phase, danger });
            s = crossed.next;
            expect(s.threatPhases[s.currentPhaseIndex]!.enemyMove).toMatchObject({ name: danger, danger: true });
        }
    });

    it('a hit across two lines enters one phase now', () => {
        const s = at('Communion');
        const crossed = foeTurn({ ...s, enemy: { ...s.enemy, health: Math.floor(s.enemy.maxHealth * 0.4) } });
        expect(crossed.next.threatPhases[crossed.next.currentPhaseIndex]!.enemyMove).toMatchObject({ name: 'Swell', phase: 1 });
    });
});

describe('Communion counts the Curses you carry', () => {
    it('2 damage per Curse in your hand, draw pile and discard', () => {
        const s = at('Communion');
        const carrying = {
            ...s, hand: [{ uid: 'b1', cardId: BARNACLE_ID }], drawPile: [BARNACLE_ID], discard: [BARNACLE_ID, BARNACLE_ID],
        };
        expect(threatHits(carrying)).toEqual([8]);
        const fired = foeTurn(carrying);
        expect(fired.lost).toBe(8);
        expect(fired.events.some(e => e.kind === 'enemy-word' && e.word === 'barnacle' && e.op === 'gained')).toBe(false);
    });

    it('with no Curse it deals nothing and a BARNACLE goes into your hand', () => {
        const s = at('Communion');
        expect(threatHits(s)).toEqual([]);
        const fired = foeTurn(s);
        expect(fired.lost).toBe(0);
        expect(barnacles(fired.next)).toBe(1);
        expect(fired.events).toContainEqual({ kind: 'enemy-word', word: 'barnacle', op: 'gained', amount: 1 });
    });
});

describe('The Faithful Gather and Hear Me', () => {
    it('MEND 10 and SCOUR one status, the last one included', () => {
        const s = at('The Faithful Gather');
        const applied = applyEffect(s.enemy.effects, lookupEffect('debuff_vulnerable')!, s.round, {
            intensityDelta: 25, uncapped: true, durationMode: 'additive', durationDelta: 3, sourceId: 'x',
        });
        const hurt = { ...s, enemy: { ...s.enemy, health: 100, effects: applied.activeEffects } };
        const fired = foeTurn(hurt);
        expect(fired.next.enemy.health).toBe(110);
        expect(fired.next.enemy.effects.some(ae => ae.effectId === 'debuff_vulnerable')).toBe(false);
    });

    it('Hear Me seizes the Heart and Mind dice from your next roll', () => {
        const fired = foeTurn(at('Hear Me'));
        expect(fired.next.enemyWords).toMatchObject({ undertow: 'heart', undertowAlso: 'mind' });
        const colors = startTurn(fired.next, rng).state.dice.map(d => d.color);
        expect(colors).not.toContain('heart');
        expect(colors).not.toContain('mind');
    });
});

describe('Swell and the Tithe count the hand after their own two BARNACLE', () => {
    it('Swell: an existing hand of 5 means TANGLE 7, no damage, and 2 BARNACLE land', () => {
        const fired = foeTurn({ ...at('Swell', 1), hand: hand(5) });
        expect(fired.next.enemyWords?.tangle).toBe(7);
        expect(fired.lost).toBe(0);
        expect(fired.next.hand).toHaveLength(7);
        expect(barnacles(fired.next)).toBe(2);
    });

    it('Swell with an empty hand still counts its own two', () => {
        expect(foeTurn(at('Swell', 1)).next.enemyWords?.tangle).toBe(2);
    });

    it('the Tithe: an existing hand of 5 means 21 damage, one hit, and 2 BARNACLE land', () => {
        const s = { ...at('Tithe of the Drowned', 2), hand: hand(5) };
        expect(threatHits(s)).toEqual([21]);
        const fired = foeTurn(s);
        expect(fired.lost).toBe(21);
        expect(barnacles(fired.next)).toBe(2);
    });

    it('a hand already holding Barnacles counts them as cards', () => {
        const held = [...hand(3), { uid: 'b1', cardId: BARNACLE_ID }];
        expect(threatHits({ ...at('Tithe of the Drowned', 2), hand: held })).toEqual([18]);
    });
});

describe('Pull Under, the renamed Drowning Mercy', () => {
    it('16 damage at or above half VITAE', () => {
        const s = at('Pull Under', 3);
        const fired = foeTurn({ ...s, enemy: { ...s.enemy, health: 100 } });
        expect(fired.lost).toBe(16);
        expect(fired.next.enemy.health).toBe(100);
    });

    it('under half VITAE: 24 damage, and it MENDs 12', () => {
        const s = at('Pull Under', 3);
        const low = { ...s, player: { ...s.player, health: 200 }, enemy: { ...s.enemy, health: 100 } };
        const fired = foeTurn(low);
        expect(fired.lost).toBe(24);
        expect(fired.next.enemy.health).toBe(112);
    });
});

describe('scaled to level 1 (a scaling check; the chapter door fights at level 8)', () => {
    it('scales each number as the fight applies it, measured', () => {
        const doorHits = (name: string, phase: number): number[] => {
            const s = { ...at(name, phase, DOOR), hand: hand(5) };
            return threatHits(s);
        };
        expect(doorHits('Tithe of the Drowned', 2)).toEqual([21]);
        expect(doorHits('Pull Under', 3)).toEqual([14]);
        const s = { ...at('Pull Under', 3, DOOR), player: { ...at('Pull Under', 3, DOOR).player, health: 200 }, enemy: { ...DOOR, health: 50 } };
        const fired = foeTurn(s);
        expect(fired.lost).toBe(21);
        expect(fired.next.enemy.health).toBe(61);
        const c = { ...at('Communion', 0, DOOR), discard: [BARNACLE_ID, BARNACLE_ID] };
        expect(threatHits(c)).toEqual([4]);
    });
});

describe('the Death Beholder is untouched (A5)', () => {
    it('keeps its deck and its stages, and no phases', () => {
        expect(ENEMY_DECKS['enemy-death-beholder']).toBeDefined();
        expect(DeathBeholder.stages?.map(st => st.at.vitaePct)).toEqual([0.75, 0.5, 0.25]);
        expect(DeathBeholder.phases ?? []).toEqual([]);
    });
});
