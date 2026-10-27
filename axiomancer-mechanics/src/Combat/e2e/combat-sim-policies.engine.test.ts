/**
 * Hermetic e2e — the combat sim policy roster (`combat.sim-policies`) and the
 * policy-driven sim extensions (`combat.encounter.sim`).
 *
 * Verifies the roster resolves, `greedy`/`blind` still encode their ranking
 * EXACTLY (pinned decision sequences on seeded encounters — the determinism
 * guarantee behind the balance oracle), `chaos` randomness flows
 * only through the injected seeded rng (never `Math.random`), and the new
 * per-card telemetry + deck/focus options are consistent with the aggregate
 * counters. Doctrine: status effects are the MAIN fun — greedy's ranking must
 * put status cards above pure strikes, because status is the efficient path.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import { FloatEye, DeathBeholder } from '../../Enemy/enemy.library';
import { getCardById } from '../../Cards/cards.library';
import { registerSandboxCards } from '../../Cards/cards.sandbox';
import { lookupEffect } from '../../Effects';
import { deepClone } from '../../Utils';
import {
    COMBAT_SIM_POLICIES, COMBAT_SIM_POLICY_ORDER, getSimPolicy, listSimPolicies,
    type CombatSimPolicyId,
} from '../combat.sim-policies';
import { runOneEncounter } from '../combat.encounter.sim';
import { initializeCombatEncounter } from '../combat.engine';
import { toCombatCard } from '../combat.cards';
import type { CombatCard, CombatEncounterState } from '../combat.encounter.types';

// The "no status game" card is a statusless utility fixture.
const QA_STATUSLESS = 'qa-statusless-utility';
registerSandboxCards([
    {
        id: QA_STATUSLESS,
        name: 'QA Statusless Utility (test fixture)',
        color: 'body',
        description: 'Test-only fixture: a card with no status payload, used to witness status-first ranking.',
        tier: 1,
        rank: 1,
        cardType: 'spell',
        targetType: 'enemy',
    },
]);

afterEach(() => {
    vi.restoreAllMocks();
});

const ALL_POLICY_IDS: readonly CombatSimPolicyId[] = [
    'greedy', 'blind', 'dot-weaver', 'control-lock', 'aggro-brute', 'turtle', 'chaos', 'mercy-seeker',
];

function loadout(cards: string[]): Character {
    const p = deepClone(Player);
    p.knownCards = cards.slice();
    // Neutral stats (S3): printed numbers land as printed.
    p.baseStats = { heart: 5, body: 5, mind: 5 };
    p.health = 150;
    p.maxHealth = 150;
    return p;
}

// The starter mix: the grey office's three roles — A Plain Word (the
// VULNERABLE status card), two Plain Blows (direct damage), A Plain Ward
// (GUARD).
const MIX = ['grey-word', 'grey-strike', 'grey-strike', 'grey-ward'];
/** The status card of MIX (VULNERABLE) — the seat the DoT starter held. */
const STATUS_CARD = 'grey-word';

function card(id: string): CombatCard {
    const projected = toCombatCard(id, getCardById, lookupEffect);
    if (!projected) throw new Error(`test setup: card '${id}' failed to project`);
    return projected;
}

/** A never-consumed rng — trips the test if a deterministic policy touches it. */
const forbiddenRng = (): number => {
    throw new Error('deterministic policy consumed rng');
};

function freshState(seed = 5): CombatEncounterState {
    return initializeCombatEncounter(loadout(MIX), deepClone(FloatEye), undefined, seed);
}

describe('policy roster — every id resolves', () => {
    it('exposes exactly the eight contracted policies, resolvable by id', () => {
        expect(Object.keys(COMBAT_SIM_POLICIES).sort()).toEqual([...ALL_POLICY_IDS].sort());
        for (const id of ALL_POLICY_IDS) {
            const policy = getSimPolicy(id);
            expect(policy, `policy '${id}' must resolve`).toBeDefined();
            expect(policy!.id).toBe(id);
            expect(policy!.name.length).toBeGreaterThan(0);
            expect(policy!.description.length).toBeGreaterThan(0);
            expect(policy!.convictionThreshold).toBeGreaterThanOrEqual(1);
            expect(['spare', 'exploit']).toContain(policy!.mercyChoice);
        }
    });

    it('listSimPolicies returns the canonical roster order; unknown ids are undefined', () => {
        expect(listSimPolicies().map(p => p.id)).toEqual([...COMBAT_SIM_POLICY_ORDER]);
        expect(getSimPolicy('nope')).toBeUndefined();
    });

    it('greedy/blind keep the exact legacy witness configuration', () => {
        for (const id of ['greedy', 'blind'] as const) {
            const policy = COMBAT_SIM_POLICIES[id];
            expect(policy.signatureKinds).toEqual(['mercy', 'sacrifice-heals', 'sacrifice-leech', 'heal-trigger-leech']);
            expect(policy.convictionThreshold).toBe(7);
            expect(policy.mercyChoice).toBe('spare');
            expect(policy.rankSignature).toBeUndefined();
        }
    });

    it('aggro-brute is the doctrinal weak baseline: pure damage preview, no status awareness', () => {
        const s = freshState();
        const brute = COMBAT_SIM_POLICIES['aggro-brute'];
        const dot = card(STATUS_CARD);
        const plain = card(QA_STATUSLESS);
        // The brute ranks strictly by preview — it does NOT put status first.
        expect(brute.rankCard(s, dot, forbiddenRng)).toBe(dot.bottomDamagePreview);
        expect(brute.rankCard(s, plain, forbiddenRng)).toBe(plain.bottomDamagePreview);
    });
});

describe('greedy rankCard — the legacy ordering as scores (doctrine: status > everything)', () => {
    it('ranks a status card above a statusless card', () => {
        const s = freshState();
        expect(COMBAT_SIM_POLICIES.greedy.rankCard(s, card(STATUS_CARD), forbiddenRng))
            .toBeGreaterThan(COMBAT_SIM_POLICIES.greedy.rankCard(s, card(QA_STATUSLESS), forbiddenRng));
    });

    it('ranks a status NEW to the board above the same status already applied', () => {
        const s = freshState();
        const dot = card(STATUS_CARD);
        const freshScore = COMBAT_SIM_POLICIES.greedy.rankCard(s, dot, forbiddenRng);
        const applied = deepClone(s);
        applied.enemy.effects = [
            { effectId: dot.primaryEffectId! } as unknown as (typeof applied.enemy.effects)[number],
        ];
        const repeatScore = COMBAT_SIM_POLICIES.greedy.rankCard(applied, dot, forbiddenRng);
        expect(freshScore).toBeGreaterThan(repeatScore);
    });
});

describe('greedy object reproduces the pinned decision sequences', () => {
    // FIDELITY measurements of the current library + engine — a "the sim is
    // reproducible" detector, never a balance target. If they drift without a
    // library/engine change, a refactor changed greedy's behavior: fix the
    // refactor, never the pin. Re-measure them after a legitimate change; do
    // not tune the game to them.
    //
    // Seed 11 vs Float-Eye: a five-round victory, 22 plays, 5 VULNERABLE
    // lands, all from A Plain Word.
    it('seed 11 vs FloatEye: a status victory', () => {
        const r = runOneEncounter(loadout(MIX), FloatEye, 11, 'greedy');
        expect({ outcome: r.outcome, rounds: r.rounds, plays: r.plays, statusPlays: r.statusPlays })
            .toEqual({ outcome: 'victory', rounds: 4, plays: 19, statusPlays: 3 });
        expect(r.cardUsage['grey-word']).toEqual({
            cardId: 'grey-word', plays: 4, bottomPlays: 3, topPlays: 1, statusLands: 3, discards: 0,
        });
        // Telemetry stays internally consistent whatever the sequence is: the
        // per-card counters sum to the aggregates (the actual bug detector).
        const usage = Object.values(r.cardUsage);
        expect(usage.reduce((n, u) => n + u.plays, 0)).toBe(r.plays);
        expect(usage.reduce((n, u) => n + u.bottomPlays + u.topPlays, 0)).toBe(r.plays);
        expect(usage.reduce((n, u) => n + u.statusLands, 0)).toBe(r.statusPlays);
    });

    // A narrow fidelity pin on `greedy`'s decision sequence, not a balance
    // gate: the grey MIX at 5/5/5 loses this line in five rounds (plays 25,
    // statusPlays 5) — the grey office is the deck you outgrow.
    it('seed 11 vs DeathBeholder: the pinned sequence (Gate 0 law: one tray per phase)', () => {
        const r = runOneEncounter(loadout(MIX), DeathBeholder, 11, 'greedy');
        expect({ outcome: r.outcome, rounds: r.rounds, plays: r.plays, statusPlays: r.statusPlays })
            .toEqual({ outcome: 'defeat', rounds: 5, plays: 25, statusPlays: 5 });
        // Determinism, not balance: the same seed must reproduce the same
        // sequence byte-for-byte. (The exact figures above are a fidelity
        // measurement of the CURRENT library + engine and are expected to be
        // re-measured whenever either moves — they are not a target.)
        const again = runOneEncounter(loadout(MIX), DeathBeholder, 11, 'greedy');
        expect({ outcome: again.outcome, rounds: again.rounds, plays: again.plays, statusPlays: again.statusPlays })
            .toEqual({ outcome: r.outcome, rounds: r.rounds, plays: r.plays, statusPlays: r.statusPlays });
        expect(again.cardUsage).toEqual(r.cardUsage);
        // There is no retreat card — card-retreat can never appear in cardUsage.
    }, 30_000);
});

describe('chaos — randomness flows only through the injected seeded rng', () => {
    it('rankCard consumes the provided rng (and returns its value)', () => {
        const s = freshState();
        let calls = 0;
        const rng = (): number => { calls++; return 0.42; };
        const score = COMBAT_SIM_POLICIES.chaos.rankCard(s, card(STATUS_CARD), rng);
        expect(calls).toBe(1);
        expect(score).toBe(0.42);
        expect(COMBAT_SIM_POLICIES.chaos.rankSignature).toBeDefined();
    });

    it('a full chaos encounter never touches Math.random (hermeticity)', () => {
        const spy = vi.spyOn(Math, 'random');
        const r = runOneEncounter(loadout(MIX), FloatEye, 9, 'chaos');
        expect(spy).not.toHaveBeenCalled();
        expect(['victory', 'mercy', 'defeat', 'retreat']).toContain(r.outcome);
    }, 30_000);

    it('chaos runs are seed-deterministic', () => {
        const a = runOneEncounter(loadout(MIX), FloatEye, 9, 'chaos');
        const b = runOneEncounter(loadout(MIX), FloatEye, 9, 'chaos');
        expect(b).toEqual(a);
    }, 30_000);
});

describe('per-card telemetry — cardUsage is consistent with the aggregate counters', () => {
    it('usage sums match plays / bottom+top / statusPlays', () => {
        const r = runOneEncounter(loadout(MIX), FloatEye, 3, 'greedy');
        const rows = Object.values(r.cardUsage);
        const totalPlays = rows.reduce((n, row) => n + row.plays, 0);
        const totalBottom = rows.reduce((n, row) => n + row.bottomPlays, 0);
        const totalTop = rows.reduce((n, row) => n + row.topPlays, 0);
        const totalLands = rows.reduce((n, row) => n + row.statusLands, 0);
        expect(totalPlays).toBe(r.plays);
        expect(totalBottom + totalTop).toBe(r.plays);
        expect(totalLands).toBe(r.statusPlays);
        for (const row of rows) expect(row.cardId.length).toBeGreaterThan(0);
    });

    it('respects an explicit deck: only its ids appear in usage', () => {
        const deck = ['grey-word', 'grey-word', 'grey-ward'];
        const allowed = new Set(deck);
        const r = runOneEncounter(loadout(MIX), FloatEye, 4, 'greedy', { deck });
        expect(Object.keys(r.cardUsage).length).toBeGreaterThan(0);
        for (const key of Object.keys(r.cardUsage)) {
            expect(allowed.has(key), `unexpected card '${key}' in usage`).toBe(true);
        }
    });

    it('focusCardIds boosts a card to the front of ranking so it gets exercised', () => {
        // Greedy would normally power the status card before the guard; the
        // focus boost must force the guard into play (the card-coverage lever).
        const deck = ['grey-word', 'grey-ward', 'grey-ward', 'grey-strike'];
        const r = runOneEncounter(loadout(deck), FloatEye, 6, 'greedy', {
            deck, focusCardIds: ['grey-ward'],
        });
        expect(r.cardUsage['grey-ward']?.plays ?? 0).toBeGreaterThanOrEqual(1);
        expect(r.cardUsage['grey-ward']?.bottomPlays ?? 0).toBeGreaterThanOrEqual(1);
    });

    it('throws on an unknown policy id (honest failure, no silent fallback)', () => {
        expect(() => runOneEncounter(loadout(MIX), FloatEye, 1, 'nope' as CombatSimPolicyId))
            .toThrow(/Unknown combat sim policy/);
    });
});
