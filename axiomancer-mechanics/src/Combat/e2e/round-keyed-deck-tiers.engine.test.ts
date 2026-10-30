/**
 * Hermetic E2E — ROUND-KEYED DECK TIERS.
 *
 * "Enemy decks increase in tier as the rounds increase." Aeon's End's tiered
 * nemesis deck is the model: tier 1 on top, tier 3 on the bottom, so the fight
 * gets worse because of how the deck was BUILT rather than because a rule says
 * so. A deck may now be authored as `{ tier1, tier2, tier3, tier2AtRound,
 * tier3AtRound }`; a flat `string[]` deck still works and has its tiers
 * DERIVED from the cards' own `grade`.
 *
 * The evidence pinned here is the CONTRACT, not the numbers (the weights and
 * the roster are retuned freely):
 *   (a) a flat deck compiles to exactly the steps it compiled to before —
 *       same cards, same order, same stakes/riders — plus round
 *       gates that add no delay to the 2-3 card majority;
 *   (b) a tiered deck shows only tier 1 in round 1, opens tier 2 at its
 *       authored round and tier 3 strictly later;
 *   (c) a tier never reverts (tiers and gates are non-decreasing);
 *   (d) the sequence NEVER stalls — the first phase is never gated and a round-gated
 *       candidate merely holds the pointer on a phase that still acts;
 *   (e) a hand-authored boss's late tier hits strictly harder than its
 *       opening tier.
 *
 * Pure math + direct state construction only; no disk / network / TTY.
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import type { Enemy } from '../../Enemy/types';
import { EnemyLibrary } from '../../Enemy/enemy.library';
import { deepClone } from '../../Utils';
import { initializeCombatEncounter, processBetweenPhases } from '../combat.engine';
import { ENEMY_CARD_LIBRARY, type EnemyCard } from '../combat.enemy-cards';
import {
    ENEMY_DECKS, ENEMY_DECK_IDS, compileEnemyDeck, deckCardIds, isTieredDeck,
    planDeckTiers, TIER1_MIN_CARDS, TIER2_DEFAULT_ROUND, TIER3_DEFAULT_ROUND,
    type DeckTier,
} from '../combat.enemy-decks';
import { getThreatSequence, isBranchStep, type AuthoredThreatStep } from '../combat.threat';

// ── fixtures ────────────────────────────────────────────────────────────────

function makePlayer(): Character {
    const p = deepClone(Player);
    p.knownCards = [];
    p.baseStats = { heart: 8, body: 8, mind: 8 };
    p.health = 100000;
    p.maxHealth = 100000;
    p.effects = [];
    return p;
}

function enemyById(id: string): Enemy {
    const found = (EnemyLibrary as readonly Enemy[]).find(e => e.id === id);
    expect(found, `${id} missing from EnemyLibrary`).toBeDefined();
    const e = deepClone(found!);
    e.effects = [];
    e.health = 100000;
    e.maxHealth = 100000;
    return e;
}

/** The round gate a compiled step carries (a branch step keeps it on its forks). */
function gateOf(step: AuthoredThreatStep): number | undefined {
    return isBranchStep(step) ? step.branch.else.unlockAfterRound : step.unlockAfterRound;
}

/** The phase index the pointer stands on in each of rounds 1..`maxRound`. */
function pointerByRound(enemy: Enemy, maxRound: number): number[] {
    const base = initializeCombatEncounter(makePlayer(), enemy, undefined, 7);
    const seen: number[] = [];
    let index = 0;
    for (let round = 1; round <= maxRound; round++) {
        seen.push(index);
        index = processBetweenPhases({ ...base, currentPhaseIndex: index, round }).state.currentPhaseIndex;
    }
    return seen;
}

const FLAT_DECK_IDS = ENEMY_DECK_IDS.filter(id => !isTieredDeck(ENEMY_DECKS[id]));
const TIERED_DECK_IDS = ENEMY_DECK_IDS.filter(id => isTieredDeck(ENEMY_DECKS[id]));

// ── (a) the flat form still compiles to today's behaviour ───────────────────

describe('round-keyed deck tiers — a flat deck still compiles to what it always did', () => {
    it('flat decks keep their exact card order', () => {
        expect(FLAT_DECK_IDS.length).toBeGreaterThan(0);
        for (const id of FLAT_DECK_IDS) {
            const authored = ENEMY_DECKS[id] as readonly string[];
            expect(deckCardIds(ENEMY_DECKS[id])).toEqual(authored);
            expect(compileEnemyDeck(id)).toHaveLength(authored.length);
        }
    });

    it('every compiled step still carries its card\'s payload verbatim — only the gate is new', () => {
        for (const id of FLAT_DECK_IDS) {
            const cardIds = deckCardIds(ENEMY_DECKS[id]);
            compileEnemyDeck(id).forEach((step, i) => {
                const card = ENEMY_CARD_LIBRARY[cardIds[i]];
                if (isBranchStep(step)) {
                    // A branch card still projects both authored forks.
                    expect(card.branch, `${id}[${i}] compiled a branch from a linear card`).toBeDefined();
                    expect(step.branch.condition).toEqual(card.branch!.condition);
                    expect(step.branch.then.actionText).toBe(card.branch!.then.actionText);
                    expect(step.branch.else.actionText).toBe(card.branch!.else.actionText);
                    return;
                }
                expect(step.damageWeight, `${id}[${i}] weight`).toBe(card.damageWeight);
                expect(step.threatEffectId, `${id}[${i}] effect`).toBe(card.effectId);
                expect(step.actionText).toContain(card.name);
                expect(step.isFinalPhase, `${id}[${i}] final`).toBe(i === cardIds.length - 1);
            });
        }
    });

    it('a 2-3 card deck gains NO delay it did not already author on a card', () => {
        // No live deck is short since the Float-Eye moved to HP phases, so a
        // fixture deck stands in for the duration of the test.
        const FIXTURE = 'enemy-short-fixture';
        (ENEMY_DECKS as Record<string, unknown>)[FIXTURE] = ['dp-wet-congregation', 'dp-lead-bell', 'dp-breaking-sea'];
        try {
            const cardIds = deckCardIds(ENEMY_DECKS[FIXTURE]);
            compileEnemyDeck(FIXTURE).forEach((step, i) => {
                const naturalRound = i + 1; // the round the pointer reaches index i unaided
                const cardsOwnGate = ENEMY_CARD_LIBRARY[cardIds[i]].unlockAfterRound ?? 0;
                expect(gateOf(step) ?? 0, `${FIXTURE}[${i}] gained a delay`)
                    .toBeLessThanOrEqual(Math.max(naturalRound, cardsOwnGate));
            });
        } finally {
            delete (ENEMY_DECKS as Record<string, unknown>)[FIXTURE];
        }
    });

    it('derives tiers from card GRADE, with the opening pair always tier 1', () => {
        for (const id of FLAT_DECK_IDS) {
            const plan = planDeckTiers(id)!;
            expect(plan.authored).toBe(false);
            expect(plan.tiers.slice(0, TIER1_MIN_CARDS).every(t => t === 1)).toBe(true);
            plan.tiers.forEach((tier, i) => {
                if (i < TIER1_MIN_CARDS) return;
                const grade = ENEMY_CARD_LIBRARY[plan.cardIds[i]].grade;
                const fromGrade: DeckTier = grade === 'signature' ? 3 : grade === 'escalation' ? 2 : 1;
                // Running max: a card is at least its grade's tier, and at
                // least whatever tier the deck had already reached.
                expect(tier, `${id}[${i}]`).toBeGreaterThanOrEqual(fromGrade);
                expect(tier).toBeGreaterThanOrEqual(plan.tiers[i - 1]);
            });
        }
    });

    it('a foe with HP phases has no deck: the Float-Eye and Chapter 1 normals left ENEMY_DECKS', () => {
        for (const id of ['enemy-float-eye', 'enemy-gallows-crow', 'enemy-net-mender', 'enemy-crane-hook']) {
            expect(ENEMY_DECK_IDS, id).not.toContain(id);
            expect(enemyById(id).phases?.length, id).toBe(2);
        }
        expect(FLAT_DECK_IDS).toEqual(['enemy-green-jelly']);
    });
});

// ── (b) a tiered deck is keyed to the round ─────────────────────────────────

describe('round-keyed deck tiers — an authored tiered deck opens its tiers by round', () => {
    it('every boss/unique that hand-authored tiers gates exactly by tier', () => {
        // The Death Beholder is the only hand-tiered deck.
        expect(TIERED_DECK_IDS).toEqual(['enemy-death-beholder']);
        for (const id of TIERED_DECK_IDS) {
            const plan = planDeckTiers(id)!;
            expect(plan.authored).toBe(true);
            expect(plan.tierRounds[1]).toBe(1);
            expect(plan.tierRounds[2]).toBeGreaterThan(1);
            expect(plan.tierRounds[3]).toBeGreaterThanOrEqual(plan.tierRounds[2]);
            compileEnemyDeck(id).forEach((step, i) => {
                const tier = plan.tiers[i];
                if (tier === 1) expect(gateOf(step), `${id}[${i}] tier 1 must be ungated`).toBeUndefined();
                else expect(gateOf(step), `${id}[${i}] tier ${tier}`).toBe(plan.tierRounds[tier]);
            });
        }
    });

    // The Death Beholder authors later gates than the defaults (4 and 7): its
    // fight runs about seven turns, so its finale opens on round 7.
    it('the Death Beholder shows only tier 1 until round 4, tier 2 at round 4, tier 3 at round 7', () => {
        const plan = planDeckTiers('enemy-death-beholder')!;
        expect(plan.tiers).toEqual([1, 1, 2, 2, 3, 3, 3]);
        expect(plan.tierRounds[2]).toBe(4);
        expect(plan.tierRounds[3]).toBe(7);

        const walk = pointerByRound(enemyById('enemy-death-beholder'), 9);
        const tierAtRound = walk.map(i => plan.tiers[i]);
        // Round 1 is tier 1 and nothing else…
        expect(tierAtRound[0]).toBe(1);
        // …tier 2 is unreachable before round 4, tier 3 before round 7…
        const firstTier2 = tierAtRound.indexOf(2) + 1;
        const firstTier3 = tierAtRound.indexOf(3) + 1;
        expect(firstTier2).toBe(4);
        expect(firstTier3).toBe(7);
        // …and the fight does actually get there.
        expect(tierAtRound[8]).toBe(3);
    });

    it('a branch card sitting in a GATED tier carries the gate on both of its forks', () => {
        // No live card is a branch, so the fixture
        // registers its own for the duration of the test.
        const FIXTURE = 'enemy-tier-fixture';
        const BRANCH = 'fixture-branch-card';
        (ENEMY_CARD_LIBRARY as Record<string, EnemyCard>)[BRANCH] = {
            name: 'Fixture Fork', archetype: 'drowned-parish', grade: 'escalation',
            branch: {
                condition: { kind: 'prior-threat-fully-blocked' },
                then: { actionText: 'then' },
                else: { actionText: 'else' },
            },
            actionText: 'fork',
        };
        (ENEMY_DECKS as Record<string, unknown>)[FIXTURE] = {
            tier1: ['dp-wet-congregation', 'dp-lead-bell'],
            tier2: [BRANCH],
            tier3: ['what-shuts-stays-shut'],
        };
        try {
            const step = compileEnemyDeck(FIXTURE)[2];
            expect(isBranchStep(step)).toBe(true);
            if (!isBranchStep(step)) return;
            // `resolveAuthored` reads the gate off the ELSE (pending) fork, so
            // both forks must carry it or the telegraph and the pointer
            // disagree about when the phase opens.
            expect(step.branch.then.unlockAfterRound).toBe(TIER2_DEFAULT_ROUND);
            expect(step.branch.else.unlockAfterRound).toBe(TIER2_DEFAULT_ROUND);
            expect(gateOf(compileEnemyDeck(FIXTURE)[3])).toBe(TIER3_DEFAULT_ROUND);
        } finally {
            delete (ENEMY_DECKS as Record<string, unknown>)[FIXTURE];
            delete (ENEMY_CARD_LIBRARY as Record<string, EnemyCard>)[BRANCH];
        }
    });
});

// ── (c) a tier never reverts ────────────────────────────────────────────────

describe('round-keyed deck tiers — a tier never reverts', () => {
    it('tiers and compiled gates are non-decreasing on every deck in the roster', () => {
        for (const id of ENEMY_DECK_IDS) {
            const plan = planDeckTiers(id)!;
            for (let i = 1; i < plan.tiers.length; i++) {
                expect(plan.tiers[i], `${id}[${i}] tier reverted`).toBeGreaterThanOrEqual(plan.tiers[i - 1]);
            }
            const gates = compileEnemyDeck(id).map(s => gateOf(s) ?? 0);
            for (let i = 1; i < gates.length; i++) {
                expect(gates[i], `${id}[${i}] gate reverted`).toBeGreaterThanOrEqual(gates[i - 1]);
            }
            expect(plan.tierRounds[3]).toBeGreaterThanOrEqual(plan.tierRounds[2]);
        }
    });
});

// ── (d) the fight never stalls ──────────────────────────────────────────────

describe('round-keyed deck tiers — the sequence never stalls', () => {
    it('no deck gates its OPENING phase, so round 1 always has a legal action', () => {
        for (const id of ENEMY_DECK_IDS) {
            expect(gateOf(compileEnemyDeck(id)[0]), `${id} gated its opener`).toBeUndefined();
        }
    });

    it('getThreatSequence strips a gate off phase 0 whatever the source authored', () => {
        const enemy = enemyById('enemy-death-beholder') as Enemy & { threatSequence?: unknown };
        enemy.threatSequence = [
            { index: 1, threatAction: { description: 'x', effects: [{ damage: 5 }] }, unlockAfterRound: 4 },
            { index: 2, threatAction: { description: 'y', effects: [{ damage: 9 }] }, isFinalPhase: true, unlockAfterRound: 4 },
        ];
        const seq = getThreatSequence(enemy as Enemy);
        expect(seq[0].unlockAfterRound).toBeUndefined();
        expect(seq[1].unlockAfterRound).toBe(4);
    });

    it('every roster enemy advances monotonically and always stands on a phase that acts', () => {
        for (const id of ENEMY_DECK_IDS) {
            const enemy = enemyById(id);
            const phases = getThreatSequence(enemy);
            const walk = pointerByRound(enemy, 12);
            for (let r = 0; r < walk.length; r++) {
                const phase = phases[walk[r]];
                expect(phase, `${id} round ${r + 1} pointed at nothing`).toBeDefined();
                expect(phase.threatAction.effects.length, `${id} round ${r + 1} had no action`)
                    .toBeGreaterThan(0);
                if (r > 0) expect(walk[r], `${id} pointer went backwards`).toBeGreaterThanOrEqual(walk[r - 1]);
            }
            // A twelve-round fight always reaches the deck's bottom card.
            expect(walk[walk.length - 1], `${id} never reached its finale`).toBe(phases.length - 1);
        }
    });
});

// ── (e) a boss's late tier hits harder than its opening ─────────────────────

function weights(cardIds: readonly string[]): number[] {
    return cardIds.map(id => ENEMY_CARD_LIBRARY[id].damageWeight ?? 1);
}
const mean = (ns: number[]): number => ns.reduce((a, b) => a + b, 0) / ns.length;

describe('round-keyed deck tiers — a boss gets worse the longer it runs', () => {
    it('every hand-authored tier 3 out-hits its own tier 1, in peak AND in average', () => {
        for (const id of TIERED_DECK_IDS) {
            const plan = planDeckTiers(id)!;
            const tier1 = weights(plan.cardIds.filter((_c, i) => plan.tiers[i] === 1));
            const tier3 = weights(plan.cardIds.filter((_c, i) => plan.tiers[i] === 3));
            expect(tier1.length, `${id} has no tier 1`).toBeGreaterThan(0);
            expect(tier3.length, `${id} has no tier 3`).toBeGreaterThan(0);
            expect(Math.max(...tier3), `${id} peak`).toBeGreaterThan(Math.max(...tier1));
            expect(mean(tier3), `${id} average`).toBeGreaterThan(mean(tier1));
        }
    });

    it('the damage actually on the pane in round 10 beats round 1, boss by boss', () => {
        for (const id of TIERED_DECK_IDS) {
            const enemy = enemyById(id);
            const phases = getThreatSequence(enemy);
            const walk = pointerByRound(enemy, 10);
            const damageAt = (round: number): number => {
                const effects = phases[walk[round - 1]].threatAction.effects;
                return effects.find(e => (e.damage ?? 0) > 0)?.damage ?? 0;
            };
            expect(damageAt(10), `${id} late damage`).toBeGreaterThan(damageAt(1));
        }
    });
});
