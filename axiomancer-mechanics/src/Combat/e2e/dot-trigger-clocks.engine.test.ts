/**
 * Hermetic e2e — trigger-clock DoT substrate.
 *
 * On live data POISON ticks the card-played clock, BLEED the damage-instance
 * clock, MARK is battle-long (`calendarExpiry: false`), and
 * `debuff_creeping_doom` grows per enemy action. The scenarios here register SYNTHETIC effects
 * into the shared effect registry (removed in `afterAll`; vitest isolates
 * module state per file) so the SUBSTRATE semantics stay pinned independently
 * of the library's tuning numbers.
 *
 * Covered:
 *   1. `fireDotTrigger` unit semantics — trigger matching, exact no-op,
 *      POISON ramp, MARK flat amplification, BLEED `decaysPerTick` washout.
 *   2. The round clock: an untagged DoT ticks at round start only.
 *   3. Engine call sites: 'card-played' fires on a PLAYER spell play (PAID
 *      bottom or FREE top);
 *      'damage-instance' fires on the shared enemy-damage funnel (a card hit).
 *   4. `calendarExpiry: false` persistence (no round-end countdown) and the
 *      Soul-on-decay-consumed law (Harvest must not starve without calendars).
 *   5. `growth: 'per-enemy-action'` — Doom deepens when the enemy acts, and
 *      NOT when its turn is denied.
 *   6. Expected-trigger fuel math (`EXPECTED_TRIGGERS_PER_ROUND`) in
 *      `getPendingDotTotal` / `computeRoundsToKill`.
 *   7. Untagged parity — an UNTAGGED DoT keeps the round-clock behavior: no
 *      event clock ever ticks it, its fuel math is exactly the
 *      perTick × max(1, remainingDuration) walk, and its calendar counts
 *      down.
 *
 * Fixture/RNG conventions follow `card-effectiveness.engine.test.ts`
 * (shared builder in `src/test-utils/card-fixture.ts`, `mockSequentialRng(0.5)`,
 * `vi.restoreAllMocks()` in afterEach).
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';

import type { ActiveEffect, Effect, EffectPayload } from '../../Effects/types';
import { effectsLibrary, lookupEffect } from '../../Effects/effects.library';
import { mockSequentialRng } from '../../test-utils/rng';
import { buildFixtureState } from '../../test-utils/card-fixture';
import { playCombatCard, resolveThreatPhase } from '../combat.engine';
import type { CombatEncounterState, CombatEvent } from '../combat.encounter.types';
import {
    fireDotTrigger, growPerEnemyActionDots, EXPECTED_TRIGGERS_PER_ROUND,
    getPendingDotTotal, computeRoundsToKill, tickAllEffects,
    processRoundStartEffects, processRoundEndEffects,
} from '../effects';
import { rampedDamagePerRound, getDotAmplificationByEffect } from '../effect-modifiers';

afterEach(() => vi.restoreAllMocks());

// ── Synthetic effects (registered for this file only) ────────────────────────

function syntheticDot(id: string, dot: NonNullable<EffectPayload['damageOverTime']>, dotModifiers?: EffectPayload['dotModifiers']): Effect {
    return {
        id, name: id,
        description: 'WS3 synthetic trigger-clock test effect',
        type: 'debuff', category: 'damage',
        duration: 4, stacking: 'intensity', tier: 1,
        payload: { damageOverTime: dot, ...(dotModifiers ? { dotModifiers } : {}) },
    };
}

const SYNTHETICS: readonly Effect[] = [
    // One per event clock.
    syntheticDot('ws3x_card_played', { damagePerRound: 3, damageType: 'body', trigger: 'card-played' }),
    syntheticDot('ws3x_damage_instance', { damagePerRound: 2, damageType: 'body', trigger: 'damage-instance' }),
    syntheticDot('ws3x_payoff', { damagePerRound: 4, damageType: 'body', trigger: 'payoff' }),
    // BLEED-shaped event DoT with no calendar: decays per tick, washes out.
    syntheticDot('ws3x_cp_decay', { damagePerRound: 5, damageType: 'body', trigger: 'card-played' },
        { decaysPerTick: true, calendarExpiry: false }),
    // POISON-shaped ramping event DoT.
    syntheticDot('ws3x_ramp', { damagePerRound: 2, damageType: 'body', trigger: 'card-played' },
        { escalatesPerTurn: true, rampFactor: 1 }),
    // Round-clocked decaying DoT with no calendar (Soul-on-decay-consumed law).
    syntheticDot('ws3x_round_decay_nocal', { damagePerRound: 2, damageType: 'body' },
        { decaysPerTick: true, calendarExpiry: false }),
    // No-calendar, non-decaying round DoT (pure persistence witness).
    syntheticDot('ws3x_no_calendar', { damagePerRound: 1, damageType: 'body' }, { calendarExpiry: false }),
    // The Doom species shape (WS3.4): grows per enemy action, no calendar.
    syntheticDot('ws3x_doom', { damagePerRound: 1, damageType: 'body' },
        { growth: 'per-enemy-action', calendarExpiry: false }),
    // A skipTurn control (the deleted debuff_stun shape) for the deny witness.
    {
        id: 'ws3x_stun', name: 'ws3x_stun', description: 'WS3 synthetic skipTurn control',
        type: 'debuff', category: 'control', duration: 2, stacking: 'none', tier: 2,
        payload: { actionRestriction: { skipTurn: true } },
    },
    // Untagged twin of ws3x_card_played — identical numbers, NO trigger.
    syntheticDot('ws3x_legacy', { damagePerRound: 3, damageType: 'body' }),
];

beforeAll(() => { for (const e of SYNTHETICS) effectsLibrary.registry.set(e.id, e); });
afterAll(() => { for (const e of SYNTHETICS) effectsLibrary.registry.delete(e.id); });

// ── Helpers ───────────────────────────────────────────────────────────────────

const ae = (effectId: string, intensity: number, remainingDuration: number, appliedAt = 0): ActiveEffect =>
    ({ effectId, intensity, remainingDuration, appliedAt, tier: 1 });

/** Clean fixture with the given effects staged on the ENEMY. PAID plays
 *  name its wild die `fx-die` (there is no implicit powering die). */
function stateWithEnemyEffects(effects: ActiveEffect[], hand: { uid: string; cardId: string }[] = []): CombatEncounterState {
    const s = buildFixtureState({ clean: true });
    return { ...s, hand, enemy: { ...s.enemy, effects } };
}

function findEvents<K extends CombatEvent['kind']>(events: CombatEvent[], kind: K): Extract<CombatEvent, { kind: K }>[] {
    return events.filter((e): e is Extract<CombatEvent, { kind: K }> => e.kind === kind);
}

/** The played card's OWN direct damage on the foe. Direct damage is a
 *  first-class verb, so an enemy-HP delta is not "the clock tick and nothing
 *  else" — subtract the card's own hit to isolate what the DoT clock
 *  contributed. */
function directDamageToEnemy(events: CombatEvent[]): number {
    return findEvents(events, 'damage-dealt')
        .filter(e => e.target === 'enemy')
        .reduce((sum, e) => sum + e.amount, 0);
}

// ── 1. fireDotTrigger unit semantics ─────────────────────────────────────────

describe('fireDotTrigger — per-clock tick semantics', () => {
    it('clamps lethal ticks and receipts to the VITAE actually removed', () => {
        const base = stateWithEnemyEffects([
            ae('ws3x_card_played', 2, 4),
            ae('ws3x_ramp', 2, 4),
        ]).enemy;
        const enemy = { ...base, health: 5, maxHealth: 5 };

        const result = fireDotTrigger(enemy, 'card-played', 1);

        expect(result.target.health).toBe(0);
        expect(result.damage).toBe(5);
        expect(result.perEffect.reduce((sum, tick) => sum + tick.amount, 0)).toBe(5);
    });

    it('ticks exactly the effects whose trigger matches, leaving the rest untouched', () => {
        const enemy = stateWithEnemyEffects([
            ae('ws3x_card_played', 2, 4),
            ae('ws3x_damage_instance', 2, 4),
            ae('ws3x_legacy', 2, 4),
        ]).enemy;

        const cardPlayed = fireDotTrigger(enemy, 'card-played', 1);
        expect(cardPlayed.damage).toBe(6); // floor(3 × 2)
        expect(cardPlayed.perEffect).toEqual([{ effectId: 'ws3x_card_played', label: 'ws3x_card_played', amount: 6 }]);
        expect(enemy.health - cardPlayed.target.health).toBe(6);
        // Non-decaying: all three instances survive with intensities intact.
        expect(cardPlayed.target.effects.map(e => `${e.effectId}:${e.intensity}`)).toEqual([
            'ws3x_card_played:2', 'ws3x_damage_instance:2', 'ws3x_legacy:2',
        ]);

        const dmgInstance = fireDotTrigger(enemy, 'damage-instance', 1);
        expect(dmgInstance.damage).toBe(4); // floor(2 × 2)
    });

    it('is an exact no-op (same object) when no effect matches the clock', () => {
        const enemy = stateWithEnemyEffects([ae('ws3x_legacy', 2, 4)]).enemy;
        for (const trigger of ['card-played', 'damage-instance', 'payoff'] as const) {
            const res = fireDotTrigger(enemy, trigger, 1);
            expect(res.damage).toBe(0);
            expect(res.target).toBe(enemy); // identity — byte-identical legacy state
            expect(res.washedOut).toEqual([]);
        }
    });

    it('applies the POISON ramp (escalatesPerTurn) with the threaded round', () => {
        const enemy = stateWithEnemyEffects([ae('ws3x_ramp', 1, 4, 1)]).enemy;
        // dprEff = 2 + floor(1 × (4 − 1)) = 5
        const res = fireDotTrigger(enemy, 'card-played', 4);
        expect(res.damage).toBe(5);
    });

    it('adds MARK flat amplification per ticking effect', () => {
        const enemy = stateWithEnemyEffects([
            ae('ws3x_card_played', 1, 4),
            ae('debuff_mark', 2, 3), // tickAmplifyFlat 1 × intensity 2
        ]).enemy;
        const res = fireDotTrigger(enemy, 'card-played', 1);
        expect(res.damage).toBe(3 + 2);
    });

    it('decays decaysPerTick effects per tick and reports the washout', () => {
        const enemy = stateWithEnemyEffects([ae('ws3x_cp_decay', 2, -1)]).enemy;
        const first = fireDotTrigger(enemy, 'card-played', 1);
        expect(first.damage).toBe(10); // 5 × 2
        expect(first.washedOut).toEqual([]);
        expect(first.target.effects[0].intensity).toBe(1);

        const second = fireDotTrigger(first.target, 'card-played', 1);
        expect(second.damage).toBe(5); // 5 × 1 — then the instance is spent
        expect(second.washedOut.map(w => w.effectId)).toEqual(['ws3x_cp_decay']);
        expect(second.target.effects).toEqual([]);
    });
});

// ── 2. The round clock ────────────────────────────────────────────────────────

describe('round clock — an untagged DoT ticks at round start', () => {
    it('an untagged DoT ticks at round start; round end only counts down', () => {
        const enemy = stateWithEnemyEffects([ae('ws3x_legacy', 2, 3)]).enemy;
        const start = processRoundStartEffects(enemy, 1);
        expect(start.dotDamage).toBe(6);
        const end = processRoundEndEffects(enemy);
        expect(end.target.health).toBe(enemy.health);
    });

    it('event-clocked DoTs never tick at the round boundary', () => {
        const enemy = stateWithEnemyEffects([
            ae('ws3x_card_played', 2, 4), ae('ws3x_damage_instance', 2, 4), ae('ws3x_payoff', 2, 4),
        ]).enemy;
        expect(processRoundStartEffects(enemy, 1).dotDamage).toBe(0);
    });
});

// ── 3. Engine call sites ──────────────────────────────────────────────────────

describe("engine call site — 'card-played' (player-side plays only, ratified)", () => {
    it('a player bottom play advances the card-played clock on the enemy', () => {
        mockSequentialRng(0.5);
        const before = stateWithEnemyEffects(
            [ae('ws3x_card_played', 2, 4)],
            [{ uid: 't1', cardId: 'grey-strike' }],
        );
        const { state: after, events } = playCombatCard(before, { uid: 't1' }, true, 'fx-die');

        // Everything the foe lost beyond the card's own hit IS the clock tick
        // (Blow lands no DoT of its own).
        expect(before.enemy.health - after.enemy.health).toBe(directDamageToEnemy(events) + 6);
        const ticks = findEvents(events, 'dot-tick').filter(e => e.effectId === 'ws3x_card_played');
        expect(ticks).toEqual([{ kind: 'dot-tick', effectId: 'ws3x_card_played', label: 'ws3x_card_played', amount: 6, target: 'enemy' }]);
        // The play itself never ticks calendars — duration untouched.
        const inst = after.enemy.effects.find(e => e.effectId === 'ws3x_card_played');
        expect(inst).toMatchObject({ intensity: 2, remainingDuration: 4 });
    });

    // The FREE line is a player-side spell play and advances the same clock,
    // so a free-line-heavy deck's POISON ticks as the projection bills it.
    it('a player FREE (top) spell play advances the card-played clock on the enemy', () => {
        mockSequentialRng(0.5);
        const before = stateWithEnemyEffects(
            [ae('ws3x_card_played', 2, 4)],
            // Ward's FREE line (GUARD 2) deals nothing itself, so the
            // whole enemy delta is the clock tick.
            [{ uid: 't1', cardId: 'grey-ward' }],
        );
        const { state: after, events } = playCombatCard(before, { uid: 't1' }, false);

        expect(before.enemy.health - after.enemy.health).toBe(6);
        const ticks = findEvents(events, 'dot-tick').filter(e => e.effectId === 'ws3x_card_played');
        expect(ticks).toEqual([{ kind: 'dot-tick', effectId: 'ws3x_card_played', label: 'ws3x_card_played', amount: 6, target: 'enemy' }]);
        expect(after.directDamageDealt - before.directDamageDealt).toBe(6);
        const inst = after.enemy.effects.find(e => e.effectId === 'ws3x_card_played');
        expect(inst).toMatchObject({ intensity: 2, remainingDuration: 4 });
    });

    it('a FREE play advances card-played DoTs the PLAYER bears (pre-existing stacks only)', () => {
        mockSequentialRng(0.5);
        const base = stateWithEnemyEffects([], [{ uid: 't1', cardId: 'grey-ward' }]);
        const before: CombatEncounterState = {
            ...base,
            player: { ...base.player, effects: [ae('ws3x_card_played', 1, 4)] },
        };
        const { state: after, events } = playCombatCard(before, { uid: 't1' }, false);
        const selfTicks = findEvents(events, 'dot-tick').filter(e => e.target === 'self');
        expect(selfTicks).toEqual([{ kind: 'dot-tick', effectId: 'ws3x_card_played', label: 'ws3x_card_played', amount: 3, target: 'self' }]);
        expect(before.player.health - after.player.health).toBe(3);
    });
});

describe("engine call site — 'damage-instance' (shared enemy-damage funnel)", () => {
    it('a card hit on the enemy advances the damage-instance clock', () => {
        mockSequentialRng(0.5);
        const before = stateWithEnemyEffects(
            [ae('ws3x_damage_instance', 2, 4)],
            [{ uid: 't1', cardId: 'grey-strike' }],
        );
        const { state: after, events } = playCombatCard(before, { uid: 't1' }, true, 'fx-die');

        const ticks = findEvents(events, 'dot-tick').filter(e => e.effectId === 'ws3x_damage_instance');
        expect(ticks).toEqual([{ kind: 'dot-tick', effectId: 'ws3x_damage_instance', label: 'ws3x_damage_instance', amount: 4, target: 'enemy' }]);
        // The hit plus the clock tick (4) is the WHOLE enemy delta.
        expect(before.enemy.health - after.enemy.health).toBe(directDamageToEnemy(events) + 4);
    });
});

// ── 4. calendarExpiry: false — persistence + Soul-on-decay-consumed ──────────

describe('calendarExpiry: false — no countdown, decay still pays Souls', () => {
    it('tickAllEffects never decrements a no-calendar instance', () => {
        const enemy = stateWithEnemyEffects([
            ae('ws3x_no_calendar', 1, 5),
            ae('ws3x_legacy', 1, 5),
        ]).enemy;
        const { target, expired } = tickAllEffects(enemy);
        expect(expired).toEqual([]);
        expect(target.effects.find(e => e.effectId === 'ws3x_no_calendar')?.remainingDuration).toBe(5);
        expect(target.effects.find(e => e.effectId === 'ws3x_legacy')?.remainingDuration).toBe(4);
    });

    it('a no-calendar instance survives a full engine round untouched', () => {
        mockSequentialRng(0.5);
        const before = stateWithEnemyEffects([ae('ws3x_no_calendar', 1, 5)]);
        const { state: after } = resolveThreatPhase(before);
        expect(after.enemy.effects.find(e => e.effectId === 'ws3x_no_calendar')).toMatchObject({
            intensity: 1, remainingDuration: 5,
        });
    });

    it('a round-clock decay washout of a no-calendar debuff yields the expiry Soul', () => {
        mockSequentialRng(0.5);
        const before = stateWithEnemyEffects([ae('ws3x_round_decay_nocal', 1, -1)]);
        const { state: after, events } = resolveThreatPhase(before);
        expect(after.enemy.effects).toEqual([]); // washed out by its own tick
        expect(after.souls).toBe(1);
        expect(findEvents(events, 'soul-gained')).toEqual([
            { kind: 'soul-gained', amount: 1, total: 1, reason: 'expiry' },
        ]);
    });
});

// ── 5. growth: 'per-enemy-action' — the Doom species ─────────────────────────

describe("growth: 'per-enemy-action' — Doom deepens when the enemy acts", () => {
    it('grows +1 intensity when the enemy actually fires its telegraph', () => {
        mockSequentialRng(0.5);
        const before = stateWithEnemyEffects([ae('ws3x_doom', 1, 5)]);
        const { state: after, events } = resolveThreatPhase(before);
        expect(after.enemy.effects.find(e => e.effectId === 'ws3x_doom')).toMatchObject({
            intensity: 2, remainingDuration: 5, // no calendar — never counts down
        });
        expect(findEvents(events, 'dots-boosted')).toEqual([
            { kind: 'dots-boosted', intensity: 1, affected: ['ws3x_doom'] },
        ]);
    });

    it('does NOT grow when the enemy turn is denied (hindered)', () => {
        mockSequentialRng(0.5);
        const before = stateWithEnemyEffects([
            ae('ws3x_doom', 1, 5),
            ae('ws3x_stun', 1, 2), // skipTurn — hard denial
        ]);
        const { state: after, events } = resolveThreatPhase(before);
        expect(after.enemy.effects.find(e => e.effectId === 'ws3x_doom')?.intensity).toBe(1);
        expect(findEvents(events, 'dots-boosted')).toEqual([]);
    });

    it('growPerEnemyActionDots is a no-op for unmatched bearers', () => {
        const enemy = stateWithEnemyEffects([ae('ws3x_legacy', 1, 4)]).enemy;
        const res = growPerEnemyActionDots(enemy);
        expect(res.grown).toEqual([]);
        expect(res.combatant).toBe(enemy);
    });
});

// ── 6. Expected-trigger fuel math ─────────────────────────────────────────────

describe('fuel math — expected-trigger counts per clock', () => {
    it('event clocks price EXPECTED_TRIGGERS_PER_ROUND ticks per remaining round', () => {
        const bearer = (id: string, intensity: number, duration: number) =>
            stateWithEnemyEffects([ae(id, intensity, duration)]).enemy;

        // card-played: 2 ticks/round × 4 rounds × (3 × 2) = 48
        expect(EXPECTED_TRIGGERS_PER_ROUND['card-played']).toBe(2);
        expect(getPendingDotTotal(bearer('ws3x_card_played', 2, 4)).total).toBe(48);
        // payoff: 1 tick/round × 3 rounds × 4 = 12
        expect(getPendingDotTotal(bearer('ws3x_payoff', 1, 3)).total).toBe(12);
        // Untagged keeps EXACTLY the round-clock math: perTick × max(1, duration).
        expect(getPendingDotTotal(bearer('ws3x_legacy', 2, 4)).total).toBe(3 * 2 * 4);
        // No-calendar permanent (-1) counts ONE round of expected triggers,
        // decaying across ticks: 5×3 + 5×2 = 25.
        expect(getPendingDotTotal(bearer('ws3x_cp_decay', 3, -1)).total).toBe(25);
    });

    it('computeRoundsToKill walks event clocks at their expected per-round rate', () => {
        const base = stateWithEnemyEffects([]).enemy;
        const clocked = { ...base, health: 24, effects: [ae('ws3x_card_played', 2, 4)] };
        expect(computeRoundsToKill(clocked)).toBe(2);  // 12 HP expected per round
        const legacy = { ...base, health: 24, effects: [ae('ws3x_legacy', 2, 4)] };
        expect(computeRoundsToKill(legacy)).toBe(4);   // 6 HP per round — round-clock walk
    });
});

// ── 7. Untagged parity — untagged DoTs keep the round-clock walk ─────────────

describe('legacy parity — an untagged DoT keeps exactly the old behavior', () => {
    it('pending fuel matches the pre-WS3 walk for real library DoTs', () => {
        // Hand-rolled round-clock getPendingDotTotal per-effect loop.
        const legacyPending = (bearer: { effects: ActiveEffect[] }, currentRound?: number): number => {
            const dotAmp = getDotAmplificationByEffect(bearer.effects);
            let total = 0;
            for (const inst of bearer.effects) {
                const def = lookupEffect(inst.effectId);
                const dot = def?.payload.damageOverTime;
                if (!def || !dot) continue;
                const intensity = inst.intensity ?? 1;
                const multiplier = dotAmp.get(inst.effectId) ?? 1;
                const ticks = Math.max(1, inst.remainingDuration);
                const decays = def.payload.dotModifiers?.decaysPerTick === true;
                for (let k = 0; k < ticks; k++) {
                    const tickIntensity = decays ? intensity - k : intensity;
                    if (tickIntensity <= 0) break;
                    const dpr = rampedDamagePerRound(
                        inst, dot.damagePerRound, def.payload.dotModifiers,
                        currentRound === undefined ? undefined : currentRound + k,
                    );
                    total += Math.floor(dpr * tickIntensity * multiplier);
                }
            }
            return total;
        };

        // The untagged witnesses (poison/bleed ride event clocks): the
        // library's Creeping Doom and the synthetic untagged DoT.
        const enemy = stateWithEnemyEffects([
            ae('debuff_creeping_doom', 3, 4), ae('ws3x_legacy', 3, 3),
        ]).enemy;
        expect(getPendingDotTotal(enemy, 2).total).toBe(legacyPending(enemy, 2));
        expect(getPendingDotTotal(enemy).total).toBe(legacyPending(enemy));
    });

    it('a player card play never ticks an untagged DoT', () => {
        mockSequentialRng(0.5);
        const before = stateWithEnemyEffects(
            [ae('ws3x_legacy', 2, 4)],
            [{ uid: 't1', cardId: 'grey-strike' }],
        );
        const { state: after, events } = playCombatCard(before, { uid: 't1' }, true, 'fx-die');
        // The card's own hit lands; the untagged DoT contributes NOTHING.
        expect(directDamageToEnemy(events), 'the play must actually land').toBeGreaterThan(0);
        expect(before.enemy.health - after.enemy.health).toBe(directDamageToEnemy(events));
        expect(findEvents(events, 'dot-tick')).toEqual([]);
        expect(after.enemy.effects.find(e => e.effectId === 'ws3x_legacy')).toMatchObject({
            intensity: 2, remainingDuration: 4,
        });
    });

    it('round clocks + calendars are unchanged for untagged DoTs', () => {
        const enemy = stateWithEnemyEffects([ae('ws3x_legacy', 2, 4)]).enemy;
        // Untagged — ticks at round start for 3 × 2.
        const start = processRoundStartEffects(enemy, 1);
        expect(start.dotDamage).toBe(6);
        expect(start.dotWashedOut).toEqual([]);
        // Round end: no tick, one calendar decrement.
        const end = processRoundEndEffects(start.target);
        expect(end.target.health).toBe(start.target.health);
        expect(end.target.effects[0].remainingDuration).toBe(3);
    });
});
