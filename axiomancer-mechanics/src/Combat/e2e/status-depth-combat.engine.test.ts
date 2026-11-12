/**
 * Hermetic E2E — status-depth mechanics, LIVE through the HP-model combat
 * engine (no basePower, no chip; RIPOSTE fires only on a FULL block).
 *
 * Covers each surviving behavior end to end (DoT-amplification honesty,
 * BARRIER / RIPOSTE), an INVARIANT guard that the
 * shared hot path stays quiet without its marker, and the card-projection /
 * reward-pool contract for the library. BARRIER / RIPOSTE are pinned as
 * state-driven laws (no live card plays them).
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import type { Enemy } from '../../Enemy/types';
import { FloatEye } from '../../Enemy/enemy.library';
import { deepClone } from '../../Utils';
import { mockSequentialRng } from '../../test-utils/rng';
import { getCardById } from '../../Cards/cards.library';
import { lookupEffect } from '../../Effects';
import type { ActiveEffect } from '../../Effects/types';
import {
    initializeCombatEncounter, rollEncounterDice,
    resolveThreatPhase, processBetweenPhases,
    getEnemyIncomingDamageMultiplier,
} from '../combat.engine';
import { classifyVerbClass, toCombatCard } from '../combat.cards';
import { getActiveDotTotal, getActiveDotAmplifications } from '../effect-modifiers';
import { COMBAT_REWARD_POOL } from '../combat.rewards';
import type { CombatEvent } from '../combat.encounter.types';

afterEach(() => { vi.restoreAllMocks(); });

const ae = (effectId: string, intensity = 1, remainingDuration = 4, tier: 1 | 2 | 3 = 2): ActiveEffect =>
    ({ effectId, intensity, remainingDuration, appliedAt: 1, tier });

function makePlayer(cards: string[], effects: ActiveEffect[] = []): Character {
    const p = deepClone(Player);
    p.knownCards = cards.slice();
    p.baseStats = { heart: 8, body: 8, mind: 8 };
    p.health = 200; p.maxHealth = 200; p.effects = effects;
    return p;
}

function makeEnemy(hp: number, stance: 'heart' | 'body' | 'mind' = 'mind', effects: ActiveEffect[] = []): Enemy {
    const e = deepClone(FloatEye);
    e.id = 'enemy-test-dummy';
    e.health = hp; e.maxHealth = hp; e.effects = effects;
    e.baseStats = { heart: stance === 'heart' ? 6 : 2, body: stance === 'body' ? 6 : 2, mind: stance === 'mind' ? 6 : 2 };
    return e;
}

const enemyDotSum = (events: readonly CombatEvent[]): number =>
    events.filter(e => e.kind === 'dot-tick' && e.target === 'enemy')
        .reduce((s, e) => s + (e as { amount: number }).amount, 0);

// ── AMPLIFICATION surface (Hemorrhage) ───────────────────────────────────────

describe('AMPLIFICATION — the combo registry is surfaced honestly', () => {
    it('poison+bleed surface the Hemorrhage combo; event clocks never round-tick', () => {
        const base = initializeCombatEncounter(makePlayer([]), makeEnemy(300, 'mind'), undefined, 7);
        const enemyEffects = [ae('debuff_poison', 2), ae('debuff_bleed', 1)];
        const res = processBetweenPhases({ ...base, enemy: { ...base.enemy, effects: enemyEffects } });
        const lost = 300 - res.state.enemy.health;
        // Poison (card-played clock) and bleed (damage-instance clock) do not
        // tick at the round boundary — the boundary leaves them
        // untouched, honestly (emitted == landed == 0).
        expect(lost).toBe(0);
        expect(enemyDotSum(res.events)).toBe(0);

        // The per-tick amplification surface is clock-agnostic:
        // poison floor(2×2×1.5)=6 (Hemorrhage) + bleed floor(3×1)=3.
        expect(getActiveDotTotal(enemyEffects).total).toBe(9);
        const amps = getActiveDotAmplifications(enemyEffects);
        expect(amps).toHaveLength(1);
        expect(amps[0].comboName).toBe('Hemorrhage');
        expect(amps[0].multiplier).toBe(1.5);
    });

    it('an unmarked foe has an incoming-damage multiplier of exactly 1', () => {
        const state = initializeCombatEncounter(
            makePlayer([]), makeEnemy(300, 'mind', [ae('debuff_poison', 2)]), undefined, 7);
        expect(getEnemyIncomingDamageMultiplier(state)).toBe(1);
    });
});

// ── BARRIER — stacking, persistent soak (distinct from one-shot GUARD) ────────

describe('BARRIER — a persistent, stacking soak', () => {

    it('persists across a phase (only the absorbed amount is spent) while GUARD resets', () => {
        mockSequentialRng(0.05);
        const base = initializeCombatEncounter(makePlayer([]), makeEnemy(300, 'mind'), undefined, 7);
        // guard 1 (small one-shot) + a big persistent barrier; the hit exceeds the
        // guard so the barrier must absorb the remainder.
        const state = { ...rollEncounterDice(base).state, guard: 1, barrier: 50 };
        const res = resolveThreatPhase(state);
        expect(res.events.some(e => e.kind === 'barrier-absorbed')).toBe(true);
        expect(res.state.guard).toBe(0);                 // one-shot guard resets
        expect(res.state.barrier ?? 0).toBeGreaterThan(0); // barrier persists…
        expect(res.state.barrier ?? 0).toBeLessThan(50);   // …minus what it absorbed
        expect(res.state.player.health).toBe(200);         // the hit was fully soaked
    });
});

// ── RIPOSTE — fires ONLY on a FULL block ─────────────────────────────────────

describe('RIPOSTE — counters only when Guard/Barrier fully blocked the attack', () => {
    it('fires the counter when the hit is FULLY blocked, then clears', () => {
        mockSequentialRng(0.05);
        const base = initializeCombatEncounter(makePlayer([]), makeEnemy(300, 'mind'), undefined, 7);
        const armed = {
            ...rollEncounterDice(deepClone(base)).state,
            guard: 100,                             // over-guards the telegraphed hit
            riposte: { damage: 8, reduce: 0 },
        };
        const hpBefore = armed.enemy.health;
        const res = resolveThreatPhase(armed);
        const fired = res.events.find(e => e.kind === 'riposte-fired') as { amount: number } | undefined;
        expect(fired).toBeDefined();
        expect(fired!.amount).toBe(8);
        expect(hpBefore - res.state.enemy.health).toBe(8);
        expect(res.state.player.health).toBe(200);      // the block held
        expect(res.state.riposte).toBeUndefined();      // cleared each phase
    });

    it('phase 32 part 2: scales the counter to the prevented blow when it exceeds the printed floor', () => {
        mockSequentialRng(0.05);
        const base = initializeCombatEncounter(makePlayer([]), makeEnemy(300, 'mind'), undefined, 7);
        const armed = {
            ...rollEncounterDice(deepClone(base)).state,
            guard: 100,                              // over-guards the telegraphed hit
            riposte: { damage: 1, reduce: 0 },        // floor far below the real blow
        };
        const hpBefore = armed.enemy.health;
        const res = resolveThreatPhase(armed);
        const fired = res.events.find(e => e.kind === 'riposte-fired') as { amount: number } | undefined;
        expect(fired).toBeDefined();
        expect(fired!.amount).toBeGreaterThan(1);       // scaled past the printed floor
        expect(hpBefore - res.state.enemy.health).toBe(fired!.amount);
    });

    it('phase 32 part 2: floors at the printed damage when the prevented blow is smaller', () => {
        mockSequentialRng(0.05);
        const base = initializeCombatEncounter(makePlayer([]), makeEnemy(300, 'mind'), undefined, 7);
        const armed = {
            ...rollEncounterDice(deepClone(base)).state,
            guard: 100,
            riposte: { damage: 500, reduce: 0 },       // floor far above the real blow
        };
        const res = resolveThreatPhase(armed);
        const fired = res.events.find(e => e.kind === 'riposte-fired') as { amount: number } | undefined;
        expect(fired!.amount).toBe(500);
    });

    it('does NOT fire when the hit lands (no full block)', () => {
        mockSequentialRng(0.05);
        const base = initializeCombatEncounter(makePlayer([]), makeEnemy(300, 'mind'), undefined, 7);
        const armed = { ...rollEncounterDice(deepClone(base)).state, riposte: { damage: 8, reduce: 0 } };
        const res = resolveThreatPhase(armed);
        expect(res.state.player.health).toBeLessThan(200);          // the hit landed
        expect(res.events.some(e => e.kind === 'riposte-fired')).toBe(false);
        expect(res.state.riposte).toBeUndefined();                  // still clears
    });
});

// ── INVARIANT — the shared hot path is untouched without the new markers ──────

describe('INVARIANT — no new behavior fires without its marker', () => {
    const NEW_KINDS = new Set([
        'rupture-detonated',
        'barrier-absorbed', 'riposte-fired', 'reaped', 'staggered',
        'soul-gained',
    ]);

    it('a plain enemy + plain player emit ZERO new-kind events and un-amplified DoT', () => {
        mockSequentialRng(0.05);
        // One control (stance lock) → below every deny threshold; one
        // ROUND-CLOCKED DoT, no combo. (Poison rides the card-played clock, so
        // the round-tick witness here is Creeping Doom: dpr 1.)
        const enemyEffects = [ae('test_ctrl_root', 1), ae('debuff_creeping_doom', 2)];
        const base = initializeCombatEncounter(makePlayer([]), makeEnemy(300, 'mind', enemyEffects), undefined, 7);
        const state = rollEncounterDice(base).state;
        const res = resolveThreatPhase(state); // fires threat + processBetweenPhases

        for (const ev of res.events) expect(NEW_KINDS.has(ev.kind), ev.kind).toBe(false);
        expect(res.events.some(e => e.kind === 'dot-tick' && e.effectId === 'vulnerable-surcharge')).toBe(false);
        // Doom i2 grows to i3 when the enemy acts, then ticks at round
        // start, no combo → floor(1×3)=3 exactly.
        const tick = res.events.find(e => e.kind === 'dot-tick' && e.effectId === 'debuff_creeping_doom') as { amount: number } | undefined;
        expect(tick!.amount).toBe(3);
        expect(res.events.some(e => e.kind === 'threat-fired')).toBe(true); // enemy still acts
    });
});

// ── Projection / verbClass / reward-pool contract ────────────────────────────

describe('card projection — the grey office classifies + advertises sensibly', () => {
    // The library is the grey office. Blow is deliberately
    // NOT pinned here: `classifyVerbClass` has no branch for a plain `deal`,
    // so it reads 'buff-self' — a classification gap reported for a source
    // fix rather than frozen into this contract.
    const cases: Array<[string, string, string]> = [
        // [cardId, expected verbClass, expected effectKind/track]
        ['grey-ward', 'defend', 'none'],            // GUARD
        ['grey-word', 'stat-debuff', 'control'],    // VULNERABLE
    ];

    for (const [id, verbClass, track] of cases) {
        it(`${id} → ${verbClass}/${track} and is reachable via COMBAT_REWARD_POOL`, () => {
            const sourceCard = getCardById(id);
            expect(sourceCard, `${id} must be a real card`).toBeDefined();
            const c = classifyVerbClass(sourceCard!, lookupEffect);
            expect(c.verbClass, id).toBe(verbClass);
            expect(c.track, id).toBe(track);
            const card = toCombatCard(id, getCardById, lookupEffect)!;
            expect(card.bottomDamagePreview).toBeGreaterThanOrEqual(0);
            expect(COMBAT_REWARD_POOL, id).toContain(id);
        });
    }

    it('Blow previews its printed DEAL and is reachable via COMBAT_REWARD_POOL', () => {
        const card = toCombatCard('grey-strike', getCardById, lookupEffect)!;
        expect(card.bottomDamagePreview).toBe(5);
        expect(COMBAT_REWARD_POOL).toContain('grey-strike');
    });
});
