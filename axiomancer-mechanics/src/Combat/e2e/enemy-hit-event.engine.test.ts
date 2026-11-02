/**
 * Hermetic E2E - a landed enemy hit reports that it landed (phase AN6b).
 *
 * `resolveThreatPhase` lowered the player's health and said nothing, while every
 * hit effect on the board waits on `damage-dealt` target `self`. These pin the
 * event against the health it claims to have taken: the roster table walks the
 * 17 framed enemies through a real fight with no cards, and the rest pin
 * `blocked`, the death ward and the two ways a fight can end on a hit.
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../../Character/characters.mock';
import { EnemyLibrary } from '../../Enemy/enemy.library';
import type { Enemy } from '../../Enemy/types';
import { deepClone } from '../../Utils';
import {
    endTurn, initializeCombatEncounter, resolveThreatPhase, rollEncounterDice, startTurn,
} from '../combat.engine';
import { initProgramLedger } from '../combat.card-program';
import type { CombatEncounterState, CombatEvent } from '../combat.encounter.types';

const rng = () => 0.5;
const TURNS = 24;

/** The enemies with installed frame sets, by the art key the mobile registry reads. */
const FRAMED = [
    'death-beholder', 'float-eye', 'gallows-crow', 'net-mender', 'crane-hook', 'brine-widow',
    'lamprey-knot', 'curfew-ringer', 'wreck-picker', 'tithe-collector', 'cave-choir', 'lamplighter',
    'wrecker', 'toll-keeper', 'smokehouse-gutter', 'tide-gate', 'green-jelly',
];

const framedEnemy = (art: string) => EnemyLibrary.find(e => e.portraitAsset === art) as Enemy;

/** A fight neither side can end, with an empty deck, opened the way the live route opens one. */
function fight(enemy: Enemy): CombatEncounterState {
    const player = deepClone(Player);
    player.knownCards = [];
    player.health = 100000;
    player.maxHealth = 100000;
    player.effects = [];
    const foe = deepClone(enemy);
    foe.health = 100000;
    foe.maxHealth = 100000;
    foe.effects = [];
    return rollEncounterDice(initializeCombatEncounter(player, foe, [], 7), rng).state;
}

const selfHits = (events: readonly CombatEvent[]) =>
    events.filter((e): e is Extract<CombatEvent, { kind: 'damage-dealt' }> => e.kind === 'damage-dealt' && e.target === 'self');

const selfTicks = (events: readonly CombatEvent[]) =>
    events.filter((e): e is Extract<CombatEvent, { kind: 'dot-tick' }> => e.kind === 'dot-tick' && e.target === 'self');

const sumAmounts = (events: readonly { amount: number }[]) => events.reduce((sum, e) => sum + e.amount, 0);

/** The first strike of the enemy's opening move, at full size against nothing. */
function firstHit(state: CombatEncounterState): number {
    const opened = resolveThreatPhase(endTurn(state).state, rng);
    return selfHits(opened.events)[0].amount;
}

/** The enemy with a one-hit opener, so a soak number below reads off one strike. */
const ONE_HITTER = framedEnemy('float-eye');

describe('the roster reports what it took (A1)', () => {
    it('names 17 framed enemies the library holds', () => {
        expect(FRAMED).toHaveLength(17);
        for (const art of FRAMED) expect(framedEnemy(art), art).toBeDefined();
    });

    it.each(FRAMED)('%s: hits and ticks sum to the health lost, on each of 24 turns', art => {
        let state = fight(framedEnemy(art));
        let reported = 0;
        for (let turn = 0; turn < TURNS; turn += 1) {
            const before = state.player.health;
            const ended = endTurn(state);
            const resolved = resolveThreatPhase(ended.state, rng);
            const events = [...ended.events, ...resolved.events];
            const lost = before - resolved.state.player.health;
            expect(sumAmounts(selfHits(events)) + sumAmounts(selfTicks(events)), `${art} turn ${turn}`).toBe(lost);
            reported += selfHits(events).length;
            state = resolved.state;
            if (state.phase === 'phase-play' && state.dice.length === 0) state = startTurn(state, rng).state;
        }
        // Not vacuous: an enemy that never hit would pass the sum at 0 = 0.
        expect(reported, art).toBeGreaterThan(0);
    });
});

describe('the event names the hit, and what stopped part of it', () => {
    it('sends the foe as the source, the amount through, and nothing blocked with no wall up', () => {
        const state = endTurn(fight(ONE_HITTER)).state;
        const r = resolveThreatPhase(state, rng);
        const [hit] = selfHits(r.events);
        expect(hit).toEqual({
            kind: 'damage-dealt', cardId: state.enemy.id, target: 'self',
            amount: state.player.health - r.state.player.health,
            blocked: 0,
        });
    });

    it('blocked is what GUARD took off a hit that got through', () => {
        const base = fight(ONE_HITTER);
        const full = firstHit(base);
        const r = resolveThreatPhase(endTurn({ ...base, guard: 1 }).state, rng);
        expect(selfHits(r.events)[0]).toMatchObject({ amount: full - 1, blocked: 1 });
    });

    it('blocked counts the parry, GUARD and BARRIER together', () => {
        const base = fight(ONE_HITTER);
        const full = firstHit(base);
        expect(full).toBeGreaterThan(3);
        const armed = { ...base, guard: 1, barrier: 1, riposte: { damage: 0, reduce: 1 } };
        const r = resolveThreatPhase(endTurn(armed).state, rng);
        expect(selfHits(r.events)[0]).toMatchObject({ amount: full - 3, blocked: 3 });
    });

    it('a fully blocked hit reports no hit at all', () => {
        const r = resolveThreatPhase(endTurn({ ...fight(ONE_HITTER), guard: 100000 }).state, rng);
        expect(selfHits(r.events)).toEqual([]);
        expect(r.events.some(e => e.kind === 'threat-fired')).toBe(true);
    });

    it('a hindered turn reports no hit', () => {
        const state = fight(ONE_HITTER);
        const stunned: CombatEncounterState = {
            ...state,
            enemy: { ...state.enemy, effects: [{ effectId: 'debuff_petrify', intensity: 1, remainingDuration: 2, appliedAt: 1, tier: 2 }] },
        };
        const r = resolveThreatPhase(endTurn(stunned).state, rng);
        expect(r.events.some(e => e.kind === 'threat-fired')).toBe(false);
        expect(selfHits(r.events)).toEqual([]);
    });
});

describe('the death ward clamps the amount, and blocked stays what the wall took', () => {
    it('reports the clamped amount, with blocked read before the clamp', () => {
        const base = fight(ONE_HITTER);
        const full = firstHit(base);
        const warded = endTurn({
            ...base,
            guard: 1,
            player: { ...base.player, health: 2 },
            program: { ...initProgramLedger(), deathWardRound: base.round },
        }).state;
        const r = resolveThreatPhase(warded, rng);
        expect(full - 1).toBeGreaterThan(1);
        expect(selfHits(r.events)).toEqual([expect.objectContaining({ amount: 1, blocked: 1 })]);
        expect(r.state.player.health).toBe(1);
    });

    it('a hit the ward wholly stops reports nothing, so the log never reads "deals 0"', () => {
        const base = fight(ONE_HITTER);
        const warded = endTurn({
            ...base,
            player: { ...base.player, health: 1 },
            program: { ...initProgramLedger(), deathWardRound: base.round },
        }).state;
        const r = resolveThreatPhase(warded, rng);
        expect(selfHits(r.events)).toEqual([]);
        expect(r.state.player.health).toBe(1);
    });
});

describe('a hit that ends the fight still reports', () => {
    it('a killing hit reports before the defeat', () => {
        const base = fight(ONE_HITTER);
        const r = resolveThreatPhase(endTurn({ ...base, player: { ...base.player, health: 1 } }).state, rng);
        expect(r.state.finalOutcome).toBe('defeat');
        expect(r.state.player.health).toBe(0);
        const kinds = r.events.map(e => e.kind);
        expect(selfHits(r.events)).toHaveLength(1);
        expect(kinds.indexOf('damage-dealt')).toBeLessThan(kinds.indexOf('combat-ended'));
        expect(r.state.log.filter(e => e.kind === 'damage-dealt' && e.target === 'self')).toHaveLength(1);
    });

    it('a hit whose THORNS kill the foe reports, and the fight is a victory', () => {
        const base = fight(ONE_HITTER);
        const ledger = initProgramLedger();
        const thorned = endTurn({
            ...base,
            enemy: { ...base.enemy, health: 1 },
            program: { ...ledger, spikes: { ...ledger.spikes, thorns: 5 } },
        }).state;
        const r = resolveThreatPhase(thorned, rng);
        expect(r.state.finalOutcome).toBe('victory');
        expect(selfHits(r.events)).toHaveLength(1);
        expect(r.events.some(e => e.kind === 'spike-struck')).toBe(true);
    });
});
