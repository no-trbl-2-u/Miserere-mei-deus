/**
 * Hermetic e2e — OBJECTIVE FUNCTION v2, the Combat Quality Index.
 *
 * Drives the metric through its highest public entry points
 * (`scoreCombatObjective`, `foldObjectiveEvents`, `assertLockedMechanicsFirstClass`)
 * and pins three things:
 *
 *   1. **The locked-mechanics guard.** Conviction, the Surge meter and the Dice
 *      system are permanent (bearings § "LOCKED MECHANICS"). The suite fails if
 *      any of them is dropped from the score, zero-weighted, or demoted below
 *      the spine floor — and fails if a deck that IGNORES one of them can score
 *      as well as a deck that uses it.
 *   2. **The arithmetic**, case by case: every component's zero case, plateau,
 *      shoulder and clamp.
 *   3. **The aggregation law**: pooled telemetry scored once === the correct
 *      rollup (component scores are nonlinear, so averaging them is wrong).
 *
 * Pure arithmetic + synthetic transcripts: no RNG, no I/O, no fights.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import type { CombatEvent, CombatManaDie } from '../combat.encounter.types';
import {
    COMBAT_QUALITY_CALIBRATION, COMBAT_QUALITY_WEIGHTS, LOCKED_MECHANIC_TERMS,
    LOCKED_SPINE_WEIGHT_FLOOR, SPINE_SUBWEIGHTS,
    assertLockedMechanicsFirstClass, formatCombatQuality, scoreArcShape,
    scoreCombatObjective, scoreConvictionUse, scoreDeckIdentity, scoreDecisionWidth,
    scoreDiceUse, scoreSurgeUse,
    type CombatQualityWeights, type LockedMechanicTerm,
} from '../combat.objective';
import {
    DICE_ECONOMY_VERBS, damageCentroid, diceEconomyBreadth, emptyObjectiveTelemetry,
    foldObjectiveEvents, mergeObjectiveTelemetry, poolObjectiveTelemetry,
    type CombatObjectiveTelemetry,
} from '../combat.objective.telemetry';

afterEach(() => vi.restoreAllMocks());

// ─── Fixtures ────────────────────────────────────────────────────────────────

const die = (id: string): CombatManaDie => ({
    id, color: 'heart', state: 'available', temporary: false,
});

/** A telemetry struct that uses ALL THREE locked systems well, plus a healthy
 *  arc / width / identity. The baseline every "ignores X" fixture is derived
 *  from by zeroing exactly one system. */
function healthyTelemetry(): CombatObjectiveTelemetry {
    const t = emptyObjectiveTelemetry();
    t.runs = 10;
    t.rounds = 50;
    // Conviction: fed at the target rate and more than half of it spent.
    t.convictionGained = 100;
    t.convictionSpent = 60;
    t.signatureCasts = 20;
    t.specialsFired = 15;
    // Surge: the chain is driven and most chains complete.
    t.momentumAdvances = 80;
    t.surges = 20;
    t.momentumBreaks = 5;
    t.surgeDiceSpent = 15;
    // Dice: rolled dice become paid lines, and the die economy is played.
    t.diceRolled = 200;
    t.diceSpent = 120;
    t.diceEconomyVerbs = {
        'die-banked': 30, 'die-forged': 10, 'die-floated': 8, 'die-cracked': 6,
    };
    // Arc / width / identity.
    t.arcRuns = 10;
    t.arcCentroidSum = 10 * COMBAT_QUALITY_CALIBRATION.arcTargetCentroid;
    t.decisionPoints = 100;
    t.liveOptions = 300;
    t.damageByCard = { 'lead-card': 300, 'second-card': 250, 'third-card': 250, 'fourth-card': 200 };
    return t;
}

/** `healthyTelemetry` with exactly ONE locked system silenced. */
function ignoring(system: LockedMechanicTerm): CombatObjectiveTelemetry {
    const t = healthyTelemetry();
    if (system === 'conviction') {
        t.convictionGained = 0;
        t.convictionSpent = 0;
        t.signatureCasts = 0;
        t.specialsFired = 0;
    } else if (system === 'surge') {
        t.momentumAdvances = 0;
        t.surges = 0;
        t.momentumBreaks = 0;
        t.surgeDiceSpent = 0;
    } else {
        t.diceSpent = 0;
        t.diceEconomyVerbs = {};
    }
    return t;
}

// ─── 1. THE LOCKED-MECHANICS GUARD ───────────────────────────────────────────

describe('locked mechanics — the guard the phase row asks for', () => {
    it('the three locked systems are exactly Conviction, Surge and Dice', () => {
        expect([...LOCKED_MECHANIC_TERMS]).toEqual(['conviction', 'surge', 'dice']);
        expect(Object.keys(SPINE_SUBWEIGHTS).sort()).toEqual([...LOCKED_MECHANIC_TERMS].sort());
    });

    it('every locked system carries a positive sub-weight and SPINE is the heaviest component', () => {
        for (const term of LOCKED_MECHANIC_TERMS) {
            expect(SPINE_SUBWEIGHTS[term], `sub-weight for '${term}'`).toBeGreaterThan(0);
        }
        const { spine, arc, width, identity } = COMBAT_QUALITY_WEIGHTS;
        expect(spine).toBeGreaterThanOrEqual(LOCKED_SPINE_WEIGHT_FLOOR);
        expect(spine).toBeGreaterThan(arc);
        expect(spine).toBeGreaterThan(width);
        expect(spine).toBeGreaterThan(identity);
        expect(spine + arc + width + identity).toBeCloseTo(1, 10);
    });

    it('the shipped weights pass the guard', () => {
        expect(() => assertLockedMechanicsFirstClass()).not.toThrow();
        expect(() => assertLockedMechanicsFirstClass(COMBAT_QUALITY_WEIGHTS, SPINE_SUBWEIGHTS)).not.toThrow();
    });

    // THE WITNESS: the metric must refuse to compute if a future balance pass
    // tries to tune a locked system out of the objective function.
    it.each(LOCKED_MECHANIC_TERMS)('ZERO-WEIGHTING %s is rejected', (term) => {
        const subWeights = { ...SPINE_SUBWEIGHTS, [term]: 0 };
        expect(() => assertLockedMechanicsFirstClass(COMBAT_QUALITY_WEIGHTS, subWeights))
            .toThrow(/LOCKED MECHANICS/);
        expect(() => scoreCombatObjective(
            healthyTelemetry(), COMBAT_QUALITY_WEIGHTS, subWeights as Record<LockedMechanicTerm, number>,
        )).toThrow(/LOCKED MECHANICS/);
    });

    it.each(LOCKED_MECHANIC_TERMS)('DROPPING %s from the weights is rejected', (term) => {
        const subWeights: Record<string, number> = { ...SPINE_SUBWEIGHTS };
        delete subWeights[term];
        expect(() => assertLockedMechanicsFirstClass(COMBAT_QUALITY_WEIGHTS, subWeights))
            .toThrow(new RegExp(`LOCKED MECHANICS.*'${term}'`));
    });

    it.each(LOCKED_MECHANIC_TERMS)('a NEGATIVE weight on %s is rejected', (term) => {
        expect(() => assertLockedMechanicsFirstClass(
            COMBAT_QUALITY_WEIGHTS, { ...SPINE_SUBWEIGHTS, [term]: -0.1 },
        )).toThrow(/LOCKED MECHANICS/);
    });

    it('demoting the SPINE component below the floor is rejected', () => {
        const weights: CombatQualityWeights = {
            ...COMBAT_QUALITY_WEIGHTS,
            spine: LOCKED_SPINE_WEIGHT_FLOOR - 0.01,
        };
        expect(() => scoreCombatObjective(healthyTelemetry(), weights))
            .toThrow(/SPINE weight/);
    });

    it('an unknown spine sub-weight is rejected (no smuggling a fourth term in)', () => {
        expect(() => assertLockedMechanicsFirstClass(
            COMBAT_QUALITY_WEIGHTS, { ...SPINE_SUBWEIGHTS, vibes: 0.5 },
        )).toThrow(/unknown spine sub-weight/);
    });

    // THE BEHAVIOURAL WITNESS: ignoring a locked system must COST score.
    it.each(LOCKED_MECHANIC_TERMS)('a deck that ignores %s scores strictly worse', (term) => {
        const good = scoreCombatObjective(healthyTelemetry());
        const bad = scoreCombatObjective(ignoring(term));
        expect(bad.spineComponents[term]).toBe(0);
        expect(good.spineComponents[term]).toBeGreaterThan(0);
        expect(bad.index).toBeLessThan(good.index);
        // The penalty is the system's full share of the spine weight — big
        // enough that no other component can buy it back.
        const share = COMBAT_QUALITY_WEIGHTS.spine * SPINE_SUBWEIGHTS[term];
        expect(good.index - bad.index).toBeGreaterThan(share * good.spineComponents[term] * 0.9);
    });

    it('a deck that ignores ALL THREE cannot reach the score of one that uses them', () => {
        const blind = emptyObjectiveTelemetry();
        blind.runs = 10;
        blind.rounds = 50;
        // Perfect arc, perfect width, perfect identity — and no spine at all.
        blind.arcRuns = 10;
        blind.arcCentroidSum = 10 * COMBAT_QUALITY_CALIBRATION.arcTargetCentroid;
        blind.decisionPoints = 100;
        blind.liveOptions = 100 * COMBAT_QUALITY_CALIBRATION.widthTargetOptions;
        blind.damageByCard = { a: 30, b: 25, c: 25, d: 20 };
        blind.diceRolled = 200; // rolled, never spent — the tray ignored
        const score = scoreCombatObjective(blind);
        expect(score.components.spine).toBe(0);
        expect(score.components.arc).toBe(1);
        expect(score.components.width).toBe(1);
        expect(score.components.identity).toBe(1);
        // Ceiling for a spine-blind deck = 1 − spine weight.
        expect(score.index).toBeCloseTo(1 - COMBAT_QUALITY_WEIGHTS.spine, 10);
        expect(score.index).toBeLessThan(scoreCombatObjective(healthyTelemetry()).index + 1);
        expect(score.index).toBeLessThan(1 - LOCKED_SPINE_WEIGHT_FLOOR + 1e-9);
    });
});

// ─── 2. THE ARITHMETIC ───────────────────────────────────────────────────────

describe('component arithmetic — Conviction (locked)', () => {
    it('empty telemetry scores 0', () => {
        expect(scoreConvictionUse(emptyObjectiveTelemetry())).toBe(0);
    });

    it('earned but never spent scores 0 (a dead bank is not use)', () => {
        const t = emptyObjectiveTelemetry();
        t.rounds = 10;
        t.convictionGained = 40;
        t.convictionSpent = 0;
        expect(scoreConvictionUse(t)).toBe(0);
    });

    it('spent but never earned scores 0 (nothing fed the resource)', () => {
        const t = emptyObjectiveTelemetry();
        t.rounds = 10;
        t.convictionSpent = 40;
        expect(scoreConvictionUse(t)).toBe(0);
    });

    it('rises with income up to the calibrated per-round target, then clamps', () => {
        const at = (gained: number): number => {
            const t = emptyObjectiveTelemetry();
            t.rounds = 10;
            t.convictionGained = gained;
            t.convictionSpent = gained; // spend share pinned at 1
            return scoreConvictionUse(t);
        };
        const target = COMBAT_QUALITY_CALIBRATION.convictionIncomePerRound * 10;
        expect(at(target / 4)).toBeLessThan(at(target / 2));
        expect(at(target / 2)).toBeLessThan(at(target));
        expect(at(target)).toBeCloseTo(1, 10);
        expect(at(target * 4)).toBeCloseTo(1, 10);
    });
});

describe('component arithmetic — the Surge meter (locked)', () => {
    it('empty telemetry scores 0', () => {
        expect(scoreSurgeUse(emptyObjectiveTelemetry())).toBe(0);
    });

    it('a chain that only ever BREAKS scores 0 even when driven hard', () => {
        const t = emptyObjectiveTelemetry();
        t.rounds = 10;
        t.momentumAdvances = 100;
        t.momentumBreaks = 40;
        t.surges = 0;
        expect(scoreSurgeUse(t)).toBe(0);
    });

    it('completing chains beats breaking them at identical drive', () => {
        const drive = (surges: number, breaks: number): number => {
            const t = emptyObjectiveTelemetry();
            t.rounds = 10;
            t.momentumAdvances = 20;
            t.surges = surges;
            t.momentumBreaks = breaks;
            return scoreSurgeUse(t);
        };
        expect(drive(8, 2)).toBeGreaterThan(drive(2, 8));
    });
});

describe('component arithmetic — the Dice system (locked)', () => {
    it('empty telemetry scores 0', () => {
        expect(scoreDiceUse(emptyObjectiveTelemetry())).toBe(0);
    });

    it('rolling without spending scores 0', () => {
        const t = emptyObjectiveTelemetry();
        t.diceRolled = 100;
        t.diceEconomyVerbs = { 'die-banked': 10, 'die-forged': 5, 'die-floated': 5, 'die-cracked': 5 };
        expect(scoreDiceUse(t)).toBe(0);
    });

    it('spending without ever touching the die ECONOMY scores 0 (breadth is required)', () => {
        const t = emptyObjectiveTelemetry();
        t.diceRolled = 100;
        t.diceSpent = 100;
        expect(diceEconomyBreadth(t)).toBe(0);
        expect(scoreDiceUse(t)).toBe(0);
    });

    it('breadth counts DISTINCT economy verbs, saturating at the calibrated target', () => {
        const t = emptyObjectiveTelemetry();
        t.diceRolled = 100;
        t.diceSpent = 100;
        const verbs = [...DICE_ECONOMY_VERBS];
        for (let i = 0; i < COMBAT_QUALITY_CALIBRATION.diceEconomyBreadth; i++) {
            t.diceEconomyVerbs[verbs[i]] = 1;
        }
        expect(diceEconomyBreadth(t)).toBe(COMBAT_QUALITY_CALIBRATION.diceEconomyBreadth);
        expect(scoreDiceUse(t)).toBeCloseTo(1, 10);
        // A thousand plays of ONE verb is still breadth 1.
        const narrow = emptyObjectiveTelemetry();
        narrow.diceRolled = 100;
        narrow.diceSpent = 100;
        narrow.diceEconomyVerbs = { 'die-banked': 1000 };
        expect(diceEconomyBreadth(narrow)).toBe(1);
        expect(scoreDiceUse(narrow)).toBeLessThan(scoreDiceUse(t));
    });
});

describe('component arithmetic — ARC', () => {
    it('a fight with no scoreable arc reports null and scores 0', () => {
        const { score, centroid } = scoreArcShape(emptyObjectiveTelemetry());
        expect(score).toBe(0);
        expect(centroid).toBeNull();
    });

    it('peaks at the calibrated target centroid and reaches 0 at the tolerance', () => {
        const at = (centroid: number): number => {
            const t = emptyObjectiveTelemetry();
            t.arcRuns = 4;
            t.arcCentroidSum = 4 * centroid;
            return scoreArcShape(t).score;
        };
        const { arcTargetCentroid: target, arcTolerance: tol } = COMBAT_QUALITY_CALIBRATION;
        expect(at(target)).toBeCloseTo(1, 10);
        expect(at(target - tol)).toBeCloseTo(0, 10);
        expect(at(Math.max(0, target - tol - 0.1))).toBe(0);
        // A front-loaded burst-then-coast fight scores below a flat one, and a
        // flat one below a setup→payoff ramp.
        expect(at(0.2)).toBeLessThan(at(0.5));
        expect(at(0.5)).toBeLessThan(at(0.65));
    });

    it('damageCentroid reads the shape of the HP series', () => {
        // Uniform loss every round → dead centre.
        expect(damageCentroid([100, 75, 50, 25, 0])).toBeCloseTo(0.5, 10);
        // Everything in round one, then a long coast → early.
        expect(damageCentroid([100, 0, 0, 0, 0])).toBeLessThan(0.2);
        // Setup rounds, then the payoff → late.
        expect(damageCentroid([100, 99, 98, 0])).toBeGreaterThan(0.7);
        // Too short to have an arc, or no damage at all.
        expect(damageCentroid([100, 50])).toBeNull();
        expect(damageCentroid([100])).toBeNull();
        expect(damageCentroid([100, 100, 100, 100])).toBeNull();
        // Enemy HEALING between samples never produces negative weight.
        const healed = damageCentroid([100, 60, 90, 0]);
        expect(healed).not.toBeNull();
        expect(healed!).toBeGreaterThanOrEqual(0);
        expect(healed!).toBeLessThanOrEqual(1);
    });
});

describe('component arithmetic — WIDTH', () => {
    it('no decision points scores 0', () => {
        expect(scoreDecisionWidth(emptyObjectiveTelemetry()).score).toBe(0);
    });

    it('one legal option is not a decision (0); the calibrated target saturates (1)', () => {
        const at = (mean: number): number => {
            const t = emptyObjectiveTelemetry();
            t.decisionPoints = 100;
            t.liveOptions = 100 * mean;
            return scoreDecisionWidth(t).score;
        };
        expect(at(1)).toBe(0);
        expect(at(0.5)).toBe(0);
        expect(at(2)).toBeGreaterThan(0);
        expect(at(2)).toBeLessThan(1);
        expect(at(COMBAT_QUALITY_CALIBRATION.widthTargetOptions)).toBeCloseTo(1, 10);
        expect(at(12)).toBeCloseTo(1, 10);
    });
});

describe('component arithmetic — IDENTITY', () => {
    /** A damage ledger whose LEAD card holds exactly `share` of the total; the
     *  remainder is split into enough followers that none of them out-leads it. */
    const withShare = (share: number): CombatObjectiveTelemetry => {
        const t = emptyObjectiveTelemetry();
        const lead = share * 1000;
        const rest = 1000 - lead;
        const buckets = Math.max(1, Math.ceil(rest / Math.max(1e-9, lead * 0.999)));
        t.damageByCard = { lead };
        for (let i = 0; i < buckets; i++) t.damageByCard[`follower-${i}`] = rest / buckets;
        return t;
    };

    it('a fight nothing was attributed to scores 0', () => {
        expect(scoreDeckIdentity(emptyObjectiveTelemetry())).toEqual({ score: 0, dominantShare: 0 });
    });

    it('full marks inside the band; 0 at monoculture', () => {
        const [low, high] = COMBAT_QUALITY_CALIBRATION.identityBand;
        expect(scoreDeckIdentity(withShare(low)).score).toBeCloseTo(1, 10);
        expect(scoreDeckIdentity(withShare((low + high) / 2)).score).toBeCloseTo(1, 10);
        expect(scoreDeckIdentity(withShare(high)).score).toBeCloseTo(1, 10);
        expect(scoreDeckIdentity(withShare(COMBAT_QUALITY_CALIBRATION.identityMonocultureShare)).score)
            .toBeCloseTo(0, 10);
    });

    it('the card-tuning loop spam flag (dominant share > 0.70) already scores badly', () => {
        expect(scoreDeckIdentity(withShare(0.71)).score).toBeLessThan(0.4);
        expect(scoreDeckIdentity(withShare(0.95)).score).toBe(0);
    });

    it('a vacuum (no card led the fight) scores below the band too', () => {
        const t = emptyObjectiveTelemetry();
        // Twenty cards, none leading — the generic engine won it.
        for (let i = 0; i < 20; i++) t.damageByCard[`c${i}`] = 50;
        const { score, dominantShare } = scoreDeckIdentity(t);
        expect(dominantShare).toBeCloseTo(0.05, 10);
        expect(score).toBeLessThan(1);
        expect(score).toBeGreaterThan(0);
    });
});

// ─── 3. TELEMETRY: FOLDING, MERGING, SCORING ─────────────────────────────────

describe('telemetry — folding a transcript reads the locked systems', () => {
    it('reads Conviction, Surge and Dice off their OWN events', () => {
        const events: CombatEvent[] = [
            { kind: 'conviction-gained', amount: 2, total: 2, reason: 'effect' },
            { kind: 'conviction-gained', amount: 1, total: 3, reason: 'scrap' },
            { kind: 'signature-cast', signatureId: 'sig-disarming-plea', name: 'The Open Hand', cost: 2 },
            { kind: 'special-fired', dieId: 'die-0', conviction: 2, total: 4 },
            { kind: 'momentum-advanced', color: 'heart', length: 1 },
            { kind: 'momentum-advanced', color: 'body', length: 2 },
            { kind: 'momentum-surged', dieId: 'surge-1-2' },
            { kind: 'momentum-broken', by: 'heart' },
            { kind: 'die-overflowed', source: 'surge', total: 5 },
            { kind: 'die-overflowed', source: 'kindle', total: 6 },
            { kind: 'turn-dice-rolled', turn: 1, dice: [die('die-0'), die('die-1'), die('die-2')] },
            { kind: 'die-spent', dieId: 'die-0', color: 'heart' },
            { kind: 'floating-die-spent', dieId: 'surge-1-2', color: 'wild', poolSize: 0 },
            { kind: 'die-banked', dieId: 'die-1', color: 'heart', pips: 0 },
            { kind: 'die-cracked', dieId: 'die-3', color: 'heart' },
        ];
        const t = foldObjectiveEvents(events, emptyObjectiveTelemetry());

        expect(t.convictionGained).toBe(3);
        expect(t.convictionSpent).toBe(2);
        expect(t.signatureCasts).toBe(1);
        expect(t.specialsFired).toBe(1);

        expect(t.momentumAdvances).toBe(2);
        expect(t.momentumBreaks).toBe(1);
        // momentum-surged + the surge-sourced overflow; the kindle overflow is NOT a surge.
        expect(t.surges).toBe(2);
        expect(t.surgeDiceSpent).toBe(1);

        expect(t.diceRolled).toBe(3);
        expect(t.diceSpent).toBe(2);
        // die-overflowed + die-banked + die-cracked (the two overflows are one verb).
        expect(diceEconomyBreadth(t)).toBe(3);
    });

    it('an empty transcript leaves every counter at 0 and scores 0', () => {
        const t = foldObjectiveEvents([], emptyObjectiveTelemetry());
        expect(t).toEqual(emptyObjectiveTelemetry());
        const score = scoreCombatObjective(t);
        expect(score.index).toBe(0);
        expect(score.components).toEqual({ spine: 0, arc: 0, width: 0, identity: 0 });
        expect(score.readings.arcCentroid).toBeNull();
    });
});

describe('telemetry — merging is additive and pooling is the correct rollup', () => {
    it('merge adds every scalar and every keyed bucket', () => {
        const a = healthyTelemetry();
        const b = healthyTelemetry();
        b.damageByCard = { 'lead-card': 100, 'fifth-card': 50 };
        b.diceEconomyVerbs = { 'die-banked': 5, 'die-converted': 2 };
        const m = mergeObjectiveTelemetry(a, b);
        expect(m.runs).toBe(a.runs + b.runs);
        expect(m.convictionGained).toBe(a.convictionGained + b.convictionGained);
        expect(m.damageByCard['lead-card']).toBe(400);
        expect(m.damageByCard['fifth-card']).toBe(50);
        expect(m.diceEconomyVerbs['die-banked']).toBe(35);
        expect(m.diceEconomyVerbs['die-converted']).toBe(2);
        // Merging is pure — neither input is mutated.
        expect(a).toEqual(healthyTelemetry());
    });

    it('pooling then scoring is NOT the same as averaging scores (why rollups pool)', () => {
        const strong = healthyTelemetry();
        const weak = ignoring('surge');
        const pooled = scoreCombatObjective(poolObjectiveTelemetry([strong, weak]));
        const averaged = (scoreCombatObjective(strong).index + scoreCombatObjective(weak).index) / 2;
        expect(pooled.index).toBeGreaterThan(0);
        // The components are nonlinear, so the two disagree — the pooled value
        // is the honest one, and rollups must use it.
        expect(pooled.index).not.toBeCloseTo(averaged, 4);
    });

    it('pooling an empty list scores 0 rather than throwing', () => {
        expect(scoreCombatObjective(poolObjectiveTelemetry([])).index).toBe(0);
    });
});

describe('the index itself', () => {
    it('is the weighted sum of its four reported components, clamped to 0-1', () => {
        const score = scoreCombatObjective(healthyTelemetry());
        const { spine, arc, width, identity } = score.components;
        const w = COMBAT_QUALITY_WEIGHTS;
        expect(score.index).toBeCloseTo(
            spine * w.spine + arc * w.arc + width * w.width + identity * w.identity, 10,
        );
        expect(score.index).toBeGreaterThanOrEqual(0);
        expect(score.index).toBeLessThanOrEqual(1);
        for (const value of Object.values(score.components)) {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(1);
        }
        for (const value of Object.values(score.spineComponents)) {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(1);
        }
    });

    it('is deterministic and never consults Math.random', () => {
        const spy = vi.spyOn(Math, 'random');
        const a = scoreCombatObjective(healthyTelemetry());
        const b = scoreCombatObjective(healthyTelemetry());
        expect(b).toEqual(a);
        expect(spy).not.toHaveBeenCalled();
    });

    it('formats a one-line row naming the three locked systems', () => {
        const line = formatCombatQuality(scoreCombatObjective(healthyTelemetry()));
        expect(line).toMatch(/^cqi=/);
        expect(line).toContain('spine=');
        expect(line).toContain('con=');
        expect(line).toContain('sur=');
        expect(line).toContain('dic=');
        expect(line).toContain('arc=');
        expect(line).toContain('wid=');
        expect(line).toContain('idn=');
    });
});
