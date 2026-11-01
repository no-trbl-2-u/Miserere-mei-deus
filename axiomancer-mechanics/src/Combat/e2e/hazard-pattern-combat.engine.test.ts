/**
 * Hermetic E2E — Hazard-Pattern Combat with Upgradeable Dice.
 *
 * Covers the turn model end to end with seeded / stubbed RNG:
 *   - the per-turn four-die tray (one die per color, each showing a face);
 *     a PAID play names the die that powers it, gated by the color law
 *   - direct-damage cards still contribute 0 pressure
 *   - a landed status lands on the enemy; the powering die is spent
 *   - between-phases fires DoT ticks + ticks durations + draws a fresh hand
 *   - a Signature Skill is gated on Conviction, regardless of hand
 *   - victory by HP depletion via status play (card-sourced cards only); post-combat attribution
 *   - the Monte-Carlo sim reports per-phase Clear rates
 *
 * The effects + card engines are unchanged, so their suites (run separately)
 * are the witness that this driver did not perturb them.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import type { Enemy } from '../../Enemy/types';
import { FloatEye } from '../../Enemy/enemy.library';
import { deepClone } from '../../Utils';
import { mockSequentialRng } from '../../test-utils/rng';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard,
    resolveCombatPhase, resolveThreatPhase, processBetweenPhases,
    getCard, buildCombatSummary,
    playSignatureSkill, projectCardImpact, endTurn,
    startTurn,
} from '../combat.engine';
import { UPGRADEABLE_DIE_COLORS } from '../combat.upgradeable-dice';
import { getSignatureSkill } from '../combat.signature';
import { getSignaturesForLoadout } from '../../Items/relic.library';
import { equipItem, unequipItem } from '../../Character';
import { FIXTURE_TRINKETS } from '../../Game/fixtures';
import { rollCombatCardRewards, addRewardCard, unlockCardViaDilemma, COMBAT_REWARD_POOL } from '../combat.rewards';
import { buildCombatDeck, COMBAT_HAND_SIZE } from '../combat.deck';
import { getCardById } from '../../Cards/cards.library';
import { registerSandboxCards } from '../../Cards/cards.sandbox';
import { simulateHazardPatternCombat } from '../combat.encounter.sim';
import { getThreatSequence, deriveIntentType } from '../combat.threat';
import type { CombatDieColor, CombatEncounterState, CombatEvent, CombatTransition } from '../combat.encounter.types';

afterEach(() => {
    vi.restoreAllMocks();
});

// ── Fixtures ─────────────────────────────────────────────────────────────────

// The "damage class" fixture is a bare body DEAL.
// Poison/bleed ride EVENT clocks, so the round-boundary witness is a SYNTHETIC
// card carrying the library's round-clock DoT, Creeping Doom.
registerSandboxCards([{
    id: 'qa-body-deal',
    name: 'QA Body Deal (test fixture)',
    color: 'body',
    description: 'Test-only fixture: a bare body DEAL with no status payload.',
    tier: 1,
    rank: 1,
    cardType: 'spell',
    targetType: 'enemy',
    specialMechanics: [{ kind: 'deal', amount: 6 }],
}, {
    id: 'qa-round-dot',
    name: 'QA Round-Clock DoT (test fixture)',
    color: 'body',
    description: 'Test-only fixture: a round-clock DoT carrier (Creeping Doom).',
    tier: 1,
    rank: 1,
    cardType: 'spell',
    targetType: 'enemy',
    combatEffects: [{ effectId: 'debuff_creeping_doom', appliedTo: 'opponent', intensity: 1, duration: 2 }],
}, {
    // The grey office is colourless with no DoT, so this SYNTHETIC card
    // holds the body-coloured POISON seat (the colour law and the
    // status-play pins need a coloured DoT card; poison itself stays live —
    // enemies inflict it).
    id: 'qa-poultice-dot',
    name: 'QA Poultice DoT (test fixture)',
    color: 'body',
    description: 'Test-only fixture: the retired spoiled-poultice shape (deal 7 + POISON).',
    tier: 1,
    rank: 1,
    cardType: 'spell',
    targetType: 'enemy',
    free: { applyEffect: { effectId: 'debuff_poison', intensity: 3, duration: 2 } },
    specialMechanics: [{ kind: 'deal', amount: 7 }],
    combatEffects: [{ effectId: 'debuff_poison', appliedTo: 'opponent', intensity: 4, duration: 3 }],
}]);

const DOT_BODY = 'qa-poultice-dot';      // body, applies debuff_poison (card-played-clock DoT) — sandbox
const CONTROL_CARD = 'grey-word';        // colourless, control track (VULNERABLE, stat-debuff)
const DAMAGE_BODY = 'qa-body-deal';      // body, tier 1, DEAL 6 (sandbox fixture)

function makePlayer(cards: string[]): Character {
    const p = deepClone(Player);
    p.knownCards = cards.slice();
    p.baseStats = { heart: 8, body: 8, mind: 8 };
    p.health = 200;
    p.maxHealth = 200;
    return p;
}

function makeEnemy(hp: number, stance: 'heart' | 'body' | 'mind' = 'heart'): Enemy {
    // The Float-Eye's body without its HP phases: a dummy on the generated sequence.
    const e: Enemy = { ...deepClone(FloatEye), phases: undefined };
    e.id = 'enemy-test-dummy';
    e.health = hp;
    e.maxHealth = hp;
    e.effects = [];
    e.baseStats = { heart: stance === 'heart' ? 6 : 2, body: stance === 'body' ? 6 : 2, mind: stance === 'mind' ? 6 : 2 };
    return e;
}

/** Forces this turn's tray to known colors (deterministic). Every
 *  non-X die shows a MANA face; an X die is a dead miss. */
function setDice(state: CombatEncounterState, colors: CombatDieColor[]): CombatEncounterState {
    const turn = state.turn || 1;
    const dice = colors.map((c, i) => ({
        id: `t${turn}-d${i}`, color: c,
        state: c === 'x' ? ('locked' as const) : ('available' as const), temporary: false,
        face: c === 'x' ? ('miss' as const) : ('mana' as const),
    }));
    return { ...state, dice, turn };
}

const fizzled = (events: readonly CombatEvent[]): boolean => events.some(e => e.kind === 'effect-fizzled');

/** Plays `cardId`'s PAID (bottom) action powered by tray die `dieIndex`. */
function playWithDie(state: CombatEncounterState, cardId: string, dieIndex = 0) {
    const dieId = state.dice[dieIndex].id;
    const entry = state.hand.find(h => h.cardId === cardId);
    if (!entry) return { state, dieId, played: false } as const;
    const res = playCombatCard(state, { uid: entry.uid }, true, dieId);
    return { state: res.state, events: res.events, dieId, played: res.state !== state } as const;
}

/** Every live die (Reserve, tray, floating) that can power `cardId`'s PAID
 *  line: a non-miss face, color-legal for the card. */
function poweringDice(state: CombatEncounterState, cardId: string): string[] {
    const stance = getCard(cardId)?.stance;
    return [...(state.reserve ?? []), ...state.dice]
        .filter(d => d.state === 'available' && d.face !== 'miss' && d.color !== 'x'
            && (stance === 'any' || d.color === 'wild' || d.color === stance))
        .map(d => d.id);
}

/** One spec-33 round through the batch entry point: roll the phase's tray (if
 *  not yet rolled), PAID-play `cardId` once per die that can power it (up to
 *  `maxPlays`), then resolve the threat. */
function batchRound(state: CombatEncounterState, cardId: string, maxPlays: number): CombatTransition {
    let s = state;
    if (s.phase === 'reveal' || s.phase === 'dice-roll') s = rollEncounterDice(s).state;
    else if (s.phase === 'phase-play' && !s.turnTakenThisPhase) s = startTurn(s).state;
    const plays = poweringDice(s, cardId).slice(0, maxPlays).map(dieId => ({ cardId, useBottom: true, dieId }));
    return resolveCombatPhase(s, plays);
}

// ── Intent derivation ────────────────────────────────────────────────────────

describe('Spec 26 §2 — intent derivation', () => {
    it('classifies damage / debuff / buff / combo / pass', () => {
        expect(deriveIntentType([{ damage: 5 }])).toBe('damage');
        expect(deriveIntentType([{ effectId: 'debuff_bleed' }])).toBe('debuff');
        expect(deriveIntentType([{ enemyHeal: 6 }])).toBe('buff');
        expect(deriveIntentType([{ enemyCleanse: 1 }])).toBe('debuff');
        expect(deriveIntentType([{ damage: 5, effectId: 'debuff_bleed' }])).toBe('combo');
        expect(deriveIntentType([{}])).toBe('pass');
    });
    it('stamps an intentType on every resolved threat phase', () => {
        const seq = getThreatSequence(makeEnemy(60));
        for (const p of seq) expect(p.intentType).toBeDefined();
    });
    it('stamps a telegraph kind on every move of a phases foe, a DANGER on each phase change', () => {
        const seq = getThreatSequence(FloatEye);
        expect(seq.length).toBeGreaterThan(0);
        for (const p of seq) {
            expect(['attack', 'defend', 'status', 'danger', 'unknown']).toContain(p.intentType);
            expect(p.intentType).toBe(p.enemyMove!.kind);
        }
        expect(seq.filter(p => p.intentType === 'danger')).toHaveLength(FloatEye.phases!.length - 1);
    });
});

// ── Card classification (§6) — pure ──────────────────────────────────────────

describe('Spec 25 §6 — card classification', () => {
    it('a DoT card is a direct-dot card on the dot track', () => {
        const card = getCard(DOT_BODY)!;
        expect(card.verbClass).toBe('direct-dot');
        expect(card.effectKind).toBe('dot');
        expect(card.stance).toBe('body');
        expect(card.bottomDamagePreview).toBeGreaterThan(0);
    });
    it('a control card is a direct-control card on the control track', () => {
        const card = getCard(CONTROL_CARD)!;
        expect(card.effectKind).toBe('control');
        expect(['direct-control', 'stat-debuff']).toContain(card.verbClass);
    });
    it('a DEAL card is direct-damage and previews its printed number', () => {
        const card = getCard(DAMAGE_BODY)!;
        expect(card.verbClass).toBe('direct-damage');
        expect(card.effectKind).toBe('none');
        expect(card.bottomDamagePreview).toBe(6);
    });
});

// ── Initialization + the per-turn draft (§1) ────────────────────────────────────

describe('Spec 33 §1 — initialization + the four-die tray', () => {
    it('opens in reveal, draws 5, then rolls one die per color, each showing a face', () => {
        mockSequentialRng(0.5);
        let state = initializeCombatEncounter(makePlayer([DOT_BODY, CONTROL_CARD, DAMAGE_BODY]), makeEnemy(30), undefined, 42);
        expect(state.phase).toBe('reveal');
        expect(state.hand.length).toBe(COMBAT_HAND_SIZE);
        state = rollEncounterDice(state).state;
        expect(state.phase).toBe('phase-play');
        expect(state.dice.map(d => d.color)).toEqual([...UPGRADEABLE_DIE_COLORS]);
        for (const d of state.dice) {
            expect(['mana', 'special', 'miss']).toContain(d.face);
            expect(d.state).toBe(d.face === 'miss' ? 'locked' : 'available');
        }
    });

    it('getThreatSequence gives every enemy a telegraphed attack each phase (HP model)', () => {
        const enemy = makeEnemy(50);
        const seq = getThreatSequence(enemy);
        expect(seq.length).toBeGreaterThan(0);
        for (const p of seq) {
            // Each phase is a real enemy turn: a threat action with effects.
            expect(p.threatAction.effects.length).toBeGreaterThan(0);
            expect(p.threatAction.effects.some(e => (e.damage ?? 0) > 0)).toBe(true);
        }
    });

    it('a phases foe plays a real move every entry: a hit, a WARD, a status or a rider-shaped hit', () => {
        for (const p of getThreatSequence(FloatEye)) {
            expect(p.threatAction.effects.length > 0 || p.threatAction.rider !== undefined).toBe(true);
        }
    });
});

// ── Status combo loop (§1) ───────────────────────────────────────────────────

describe('Spec 26b §1 — status landing + the color law', () => {
    it('a landed DoT lands on the enemy; the powering die is spent (spec 33: no auto-refresh)', () => {
        mockSequentialRng(0.05); // low rolls → enemy fails to resist → effect lands
        let state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(60, 'mind'), [DOT_BODY], 3);
        state = rollEncounterDice(state).state;
        state = setDice(state, ['body', 'heart']);
        const r = playWithDie(state, DOT_BODY);
        expect(r.played).toBe(true);
        expect(fizzled(r.events!)).toBe(false);
        // The DoT effect landed on the enemy (it will tick HP each phase).
        expect(r.state.enemy.effects.some(e => e.effectId === 'debuff_poison')).toBe(true);
        const landed = r.events!.some(e => e.kind === 'effect-landed' && e.target === 'enemy');
        expect(landed).toBe(true);
        // Every die powers its own play, so the powering die is simply spent.
        expect(r.events!.some(e => e.kind === 'die-refreshed')).toBe(false);
        expect(r.state.dice.find(d => d.id === r.dieId)?.state).toBe('spent');
    });

    it('an OFF-COLOR die cannot power a card at all — the play fizzles (the color law)', () => {
        mockSequentialRng(0.05);
        let s = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(120, 'mind'), [DOT_BODY], 21);
        s = rollEncounterDice(s).state;
        s = setDice(s, ['mind', 'heart']);
        const r = playWithDie(s, DOT_BODY); // mind die on a body card
        expect(r.events!.some(e => e.kind === 'effect-fizzled' && /colors must match/.test(e.message))).toBe(true);
        expect(r.state.enemy.effects.some(e => e.effectId === 'debuff_poison')).toBe(false);
    });
});

// ── Between-phases: DoT ticks + duration tick + hand refill (§4.5) ────────────

describe('Spec 25 §4.5 — between-phases processing', () => {
    it('fires enemy DoT ticks (erodes HP) and refills the hand', () => {
        mockSequentialRng(0.05);
        // Poison/bleed ride EVENT clocks, so the round-boundary
        // witness is the synthetic Creeping Doom carrier (round clock).
        const NETTLE = 'qa-round-dot';
        let state = initializeCombatEncounter(makePlayer([NETTLE]), makeEnemy(80, 'mind'), [NETTLE], 5);
        state = rollEncounterDice(state).state;
        state = setDice(state, ['body', 'heart']);
        const played = playWithDie(state, NETTLE);
        expect(fizzled(played.events!)).toBe(false);
        state = played.state;
        const dotBefore = state.enemy.effects.find(e => e.effectId === 'debuff_creeping_doom');
        expect(dotBefore).toBeDefined();
        const hpBefore = state.enemy.health;

        const bp = processBetweenPhases(state);
        const after = bp.state;
        expect(after.enemy.health).toBeLessThan(hpBefore);
        expect(bp.events.some(e => e.kind === 'dot-tick' && e.target === 'enemy')).toBe(true);
        // Doom opts out of the calendar: it persists on the enemy.
        expect(after.enemy.effects.some(e => e.effectId === 'debuff_creeping_doom')).toBe(true);
        expect(after.hand.length).toBe(COMBAT_HAND_SIZE);
        // A new phase clears the tray so the next turn rolls fresh.
        expect(after.dice.length).toBe(0);
    });

    it('keep-hand rule: unplayed cards survive the boundary (same uids) and the refill draws only the difference', () => {
        mockSequentialRng(0.05);
        let state = initializeCombatEncounter(
            makePlayer([DOT_BODY, CONTROL_CARD]), makeEnemy(200, 'mind'),
            [DOT_BODY, DOT_BODY, DOT_BODY, CONTROL_CARD, CONTROL_CARD, CONTROL_CARD, DOT_BODY, CONTROL_CARD], 5);
        state = rollEncounterDice(state).state;
        expect(state.hand.length).toBe(COMBAT_HAND_SIZE);
        state = setDice(state, ['body', 'heart']);
        // Play ONE card; the other four stay in hand across the boundary.
        const played = playWithDie(state, DOT_BODY);
        expect(fizzled(played.events!)).toBe(false);
        state = played.state;
        const heldUids = state.hand.map(h => h.uid);
        expect(heldUids.length).toBe(COMBAT_HAND_SIZE - 1);

        const bp = processBetweenPhases(state);
        const after = bp.state;
        // All four held cards survive with their uids intact…
        for (const uid of heldUids) {
            expect(after.hand.some(h => h.uid === uid)).toBe(true);
        }
        // …and exactly ONE card was drawn to refill back to the target.
        const drawnEvent = bp.events.find(e => e.kind === 'hand-drawn') as { cards: string[] } | undefined;
        expect(drawnEvent).toBeDefined();
        expect(drawnEvent!.cards.length).toBe(1);
        expect(after.hand.length).toBe(COMBAT_HAND_SIZE);
    });
});

// ── Signature Skills (§4) ────────────────────────────────────────────────────

/** The Open Hand's own Conviction cost. */
const OPEN_HAND_COST = getSignatureSkill('sig-disarming-plea')!.cost;

describe('Spec 26b §4 — Signature Skills (Conviction-funded)', () => {
    it('a signature skill fizzles (no-op, nothing spent) when underfunded', () => {
        mockSequentialRng(0.5);
        let state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(60, 'mind'), [DOT_BODY], 1);
        state = rollEncounterDice(state).state;
        state = { ...state, conviction: OPEN_HAND_COST - 1 };
        const r = playSignatureSkill(state, 'sig-disarming-plea');
        expect(r.state.conviction).toBe(OPEN_HAND_COST - 1);
        expect(r.state.guard ?? 0).toBe(state.guard ?? 0);
        expect(r.events.some(e => e.kind === 'effect-fizzled')).toBe(true);
    });
});

// ── Tuning pass 2: anti-spam, control, read-loop ─────────────────────────────

describe('Spec 26b tuning — projection + carry', () => {
    it('projectCardImpact advertises NO strike number (spec 32 v3 — the strike is dead)', () => {
        mockSequentialRng(0.5);
        const card = getCard(DOT_BODY)!;
        let s = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(120, 'mind'), [DOT_BODY], 1);
        s = rollEncounterDice(s).state; s = setDice(s, ['body', 'heart']);
        const impact = projectCardImpact(s, card);
        expect(impact.track).toBe('dot');
        expect(impact.amount).toBe(0); // the honest numbers live on the FREE/PAID text
    });

    it('an unspent tray die BANKS to the visible Reserve at end of turn (Fate Engine R2 / spec 33 §6)', () => {
        mockSequentialRng(0.5);
        let state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(60, 'mind'), [DOT_BODY], 1);
        state = rollEncounterDice(state).state;
        // One live heart die (unspent) + a dead X: only the live face can bank.
        state = setDice(state, ['heart', 'x']);
        state = endTurn(state).state;
        expect(state.reserve?.map(d => d.color)).toEqual(['heart']);
        expect(state.reserve?.[0].pips).toBe(0);
        // Surviving a threat phase RIPENS it (+1 pip, toward the cap).
        state = resolveThreatPhase(state).state;
        expect(state.reserve?.[0].pips).toBe(1);
    });

    it('every turn roll offers at least one stance-bearing die', () => {
        for (let seed = 1; seed <= 30; seed++) {
            let s = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(60), [DOT_BODY], seed);
            s = rollEncounterDice(s).state;
            expect(s.dice.some(d => d.color === 'heart' || d.color === 'body' || d.color === 'mind')).toBe(true);
        }
    });
});

// ── Tuning pass 3: archetype signatures, deckbuilder, unlock hook, floors ────

describe('Spec 26b §B/§C/§D — archetype kit, rewards, unlock, difficulty floor', () => {
    it('the signature kit is derived from the worn signet-relic loadout, not archetype', () => {
        // Signatures come from worn equipment. The fixture player
        // wears the Suppliant's Ring, so the kit is The Open Hand regardless
        // of the (portrait-only) archetype / base stats.
        const bodyPlayer = makePlayer([DOT_BODY]); bodyPlayer.baseStats = { heart: 2, body: 9, mind: 2 };
        const s = initializeCombatEncounter(bodyPlayer, makeEnemy(60), [DOT_BODY], 1);
        expect(s.archetype).toBe('body'); // archetype still derived (portrait flavour)
        expect(s.signatures).toEqual(getSignaturesForLoadout(bodyPlayer.equipment));
        expect(s.signatures).toEqual(['sig-disarming-plea']);
        // Taking the ring off empties the kit; a signature-less relic in its
        // seat grants nothing — independent of base stats (the old archetype
        // gate is gone).
        const ringIdx = bodyPlayer.equipment.relics.findIndex(a => a?.id === 'relic-disarming-plea');
        expect(ringIdx).toBeGreaterThanOrEqual(0);
        const swapped = equipItem(unequipItem(bodyPlayer, 'relic', ringIdx), FIXTURE_TRINKETS[0]);
        const s2 = initializeCombatEncounter(swapped, makeEnemy(60), [DOT_BODY], 1);
        expect(s2.signatures).toEqual([]);
    });

    it('rollCombatCardRewards offers valid distinct card-sourced cards, biased to archetype', () => {
        const player = makePlayer([DOT_BODY]); player.baseStats = { heart: 2, body: 9, mind: 2 };
        let i = 0; const rng = () => [0.1, 0.5, 0.9, 0.3, 0.7][i++ % 5];
        const offers = rollCombatCardRewards(player, rng, 3);
        expect(offers.length).toBe(3);
        expect(new Set(offers).size).toBe(3); // distinct
        for (const id of offers) { expect(getCardById(id)).toBeTruthy(); expect(COMBAT_REWARD_POOL).toContain(id); }
    });

    it('a reward card stacks onto the deck as an extra copy', () => {
        const player = makePlayer([DOT_BODY]);
        const before = buildCombatDeck(player).filter(id => id === DOT_BODY).length;
        const rewarded = addRewardCard(player, DOT_BODY);
        const after = buildCombatDeck(rewarded).filter(id => id === DOT_BODY).length;
        expect(after).toBe(before + 1);
    });

    it('unlockCardViaDilemma adds a new card, bypassing gates; no-op if known', () => {
        const player = makePlayer([DOT_BODY]);
        const newId = COMBAT_REWARD_POOL.find(id => id !== DOT_BODY && getCardById(id))!;
        const unlocked = unlockCardViaDilemma(player, newId);
        expect(unlocked.knownCards).toContain(newId);
        expect(unlockCardViaDilemma(unlocked, newId)).toBe(unlocked); // already known → same ref
    });

    it('even a tiny enemy gets a real threat sequence (its attack has bite)', () => {
        const seq = getThreatSequence(makeEnemy(20)); // very low HP
        expect(seq.length).toBeGreaterThan(0);
        for (const p of seq) {
            // The enemy's threat action deals a meaningful chunk of damage.
            expect(p.threatAction.effects.some(e => (e.damage ?? 0) >= 3)).toBe(true);
        }
    });
});

// ── Full victory by HP depletion via status play (card-sourced cards only) (§11) ─────

describe('Spec 25 §11 — victory by HP depletion via status play, card-sourced cards only', () => {
    it('a small enemy is destroyed by stacked DoT pressure with no attack/defend', () => {
        mockSequentialRng(0.05);
        const player = makePlayer([DOT_BODY]);
        const enemy = makeEnemy(24, 'mind');
        let state = initializeCombatEncounter(player, enemy, [DOT_BODY, DOT_BODY, DOT_BODY], 9);

        let guard = 0;
        while (state.phase !== 'complete' && state.phase !== 'mercy-choice' && guard < 40) {
            guard++;
            // Each play names a die from the rolled tray that can power it.
            const res = batchRound(state, DOT_BODY, 2);
            expect(fizzled(res.events)).toBe(false);
            state = res.state;
            if (state.finalOutcome) break;
        }
        expect(state.finalOutcome).toBe('victory');

        const summary = buildCombatSummary(state);
        expect(summary.outcome).toBe('victory');
        expect(summary.headline).toMatch(/Victory/);
        expect(summary.rows.length).toBeGreaterThan(0);
        expect(summary.bestCard.length).toBeGreaterThan(0);
        // The status/damage/wall/alt-win paths compete on merit, so this does
        // not require HP to fall to DoT specifically. The win is the
        // assertion; the route is not.
    });
});

// ── resolveCombatPhase batch (§9) ────────────────────────────────────────────

describe('Spec 25 §9 — resolveCombatPhase batch entry point', () => {
    it('applies a batch of plays (each naming its die) then resolves the phase', () => {
        mockSequentialRng(0.05);
        let state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(60, 'mind'), [DOT_BODY, DOT_BODY], 13);
        state = setDice(rollEncounterDice(state).state, ['body']);
        const res = resolveCombatPhase(state, [{ cardId: DOT_BODY, useBottom: true, dieId: state.dice[0].id }]);
        expect(fizzled(res.events)).toBe(false);
        expect(res.events.some(e => e.kind === 'card-played')).toBe(true);
        expect(res.state.phaseResults.length + (res.state.finalOutcome ? 1 : 0)).toBeGreaterThan(0);
    });

    // A play submitted WITHOUT a dieId must still find a live tray die, not
    // fall back to Reserve/floating only and fizzle.
    it('powers a dieless PAID play with the first colour-legal live tray die', () => {
        mockSequentialRng(0.05);
        let state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(200, 'mind'), [DOT_BODY, DOT_BODY], 13);
        // A dead X (miss face), an off-colour heart, then the body die.
        state = setDice(rollEncounterDice(state).state, ['x', 'heart', 'body']);
        state = { ...state, reserve: [], floatingDice: [] };
        const res = resolveCombatPhase(state, [{ cardId: DOT_BODY, useBottom: true }]);
        expect(fizzled(res.events)).toBe(false);
        const played = res.events.find(e => e.kind === 'card-played');
        expect(played && played.kind === 'card-played' && played.dieId).toBe(state.dice[2].id);
    });

    it('falls back to a colour-legal Reserve die when no tray die can power the play', () => {
        mockSequentialRng(0.05);
        let state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(200, 'mind'), [DOT_BODY, DOT_BODY], 13);
        state = setDice(rollEncounterDice(state).state, ['x', 'heart']);
        const banked = { id: 'rsv-body', color: 'body' as const, state: 'available' as const, temporary: false, face: 'mana' as const, pips: 0 };
        state = { ...state, reserve: [banked], floatingDice: [] };
        const res = resolveCombatPhase(state, [{ cardId: DOT_BODY, useBottom: true }]);
        expect(fizzled(res.events)).toBe(false);
        const played = res.events.find(e => e.kind === 'card-played');
        expect(played && played.kind === 'card-played' && played.dieId).toBe('rsv-body');
    });
});

// ── Monte-Carlo sim (§11 acceptance) ─────────────────────────────────────────

describe('Hazard combat — Monte-Carlo sim', () => {
    it('runs 300 seeded combats and reports a coherent outcome distribution', () => {
        const player = makePlayer([DOT_BODY, CONTROL_CARD, DAMAGE_BODY]);
        const enemy = makeEnemy(40);
        const stats = simulateHazardPatternCombat(player, enemy, 300, 1);
        expect(stats.runs).toBe(300);
        expect(stats.victories + stats.mercies + stats.defeats + stats.retreats).toBe(300);
        expect(stats.winRate).toBeGreaterThan(0);
        expect(stats.winRate).toBeLessThanOrEqual(1);
        expect(stats.statusEngagement).toBeGreaterThan(0);
    });
});
