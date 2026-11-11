/**
 * Hermetic E2E — Hazard-Pattern Combat: helper-export coverage.
 *
 * The §11 acceptance suite (`hazard-pattern-combat.engine.test.ts`) drives the
 * engine end-to-end but pins many of the smaller public exports only indirectly.
 * This sibling suite gives each of those exports a direct contract test, with a
 * deliberate focus on the doctrine-critical surface:
 *
 *   - the self-reinforcing status-loop dice primitives (`combatDieCanPower` /
 *     `refreshOneDie`) — HP is the sole win condition;
 *   - the deck / threat / card-adapter / UI-preview helpers.
 *
 * Pure math + an explicit fixed RNG only; no disk / network / TTY.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import type { Enemy } from '../../Enemy/types';
import { FloatEye } from '../../Enemy/enemy.library';
import { deepClone } from '../../Utils';
import { getCardById } from '../../Cards/cards.library';
import { registerSandboxCards } from '../../Cards/cards.sandbox';
import { lookupEffect, applyEffect } from '../../Effects';
import { effectsLibrary } from '../../Effects/effects.library';
import type { Effect } from '../../Effects/types';

import {
    initializeCombatEncounter, rollEncounterDice,
    availableDice,
    handCards, resolveThreatPhase,
} from '../combat.engine';
import { recordAttribution, buildCombatSummary } from '../combat.attribution';
import type { CombatAttributionRow, LandedEffect } from '../combat.encounter.types';
import {
    combatDieCanPower, refreshOneDie,
} from '../combat.dice';
import { buildCombatDeck, COMBAT_HAND_SIZE } from '../combat.deck';
import { classifyVerbClass, toCombatCard, projectDeck } from '../combat.cards';
import { generateDefaultThreatSequence, AUTHORED_THREAT_ENEMY_IDS } from '../combat.threat';
import { ENEMY_REGISTRY } from '../../Enemy/enemy.library';
import type { CombatManaDie, CombatEvent } from '../combat.encounter.types';

// The library is the grey office. A Plain
// Word is its control-track card (VULNERABLE, stat-debuff) and A Plain Blow
// its direct-damage card; no library card prints a DoT, so a minimal
// sandbox POISON card (poison stays live — enemies inflict it) holds the DoT
// seat for the adapter and presenter contracts.
registerSandboxCards([{
    id: 'qa-poison-dot',
    name: 'QA Poison DoT (test fixture)',
    color: 'body',
    description: 'Test-only fixture: a plain poison applier.',
    tier: 1,
    rank: 1,
    cardType: 'spell',
    targetType: 'enemy',
    combatEffects: [{ effectId: 'debuff_poison', appliedTo: 'opponent', intensity: 3, duration: 3 }],
}]);

const DOT_BODY = 'qa-poison-dot';        // body, DoT (poison, card-played clock) — sandbox fixture
const CONTROL_HEART = 'grey-word';       // colourless, control track (VULNERABLE)
const DAMAGE_BODY = 'grey-strike';       // colourless, direct damage (attribution rows)

const SEED = 12345;

function makePlayer(cards: string[]): Character {
    const p = deepClone(Player);
    p.knownCards = cards.slice();
    p.baseStats = { heart: 8, body: 8, mind: 8 };
    p.health = 200;
    p.maxHealth = 200;
    return p;
}

function makeEnemy(hp: number, stance: 'heart' | 'body' | 'mind' = 'heart'): Enemy {
    const e = deepClone(FloatEye);
    e.id = 'enemy-helper-dummy';
    e.health = hp;
    e.maxHealth = hp;
    e.effects = [];
    e.baseStats = {
        heart: stance === 'heart' ? 6 : 2,
        body: stance === 'body' ? 6 : 2,
        mind: stance === 'mind' ? 6 : 2,
    };
    return e;
}

function die(id: string, color: CombatManaDie['color'], state: CombatManaDie['state']): CombatManaDie {
    return { id, color, state, temporary: false };
}

// ── Dice primitives (§4.2 / §4.7) — the self-reinforcing status loop ─────────

describe('Spec 25 §4.2 — combatDieCanPower', () => {
    it('a matching available colored die powers its card', () => {
        expect(combatDieCanPower(die('d', 'body', 'available'), 'body')).toBe(true);
    });

    it('a wild die powers any color; a colored die does not power a mismatch', () => {
        expect(combatDieCanPower(die('d', 'wild', 'available'), 'mind')).toBe(true);
        expect(combatDieCanPower(die('d', 'heart', 'available'), 'mind')).toBe(false);
    });

    it('spent / locked dice and X faces never power a card', () => {
        expect(combatDieCanPower(die('d', 'body', 'spent'), 'body')).toBe(false);
        expect(combatDieCanPower(die('d', 'x', 'available'), 'body')).toBe(false);
        expect(combatDieCanPower(die('d', 'body', 'locked'), 'body')).toBe(false);
    });
});

describe('Spec 25 §4.7 — refreshOneDie (status-loop reclaim)', () => {
    it('prefers an exact-color spent die', () => {
        const pool = [die('a', 'heart', 'spent'), die('b', 'wild', 'spent'), die('c', 'body', 'available')];
        const { dice, refreshedId } = refreshOneDie(pool, 'heart');
        expect(refreshedId).toBe('a');
        expect(dice.find(d => d.id === 'a')!.state).toBe('available');
        expect(dice.find(d => d.id === 'b')!.state).toBe('spent'); // wild untouched
    });

    it('falls back to a spent wild die when no exact color is spent', () => {
        const pool = [die('a', 'wild', 'spent'), die('b', 'body', 'available')];
        const { refreshedId, dice } = refreshOneDie(pool, 'heart');
        expect(refreshedId).toBe('a');
        expect(dice.find(d => d.id === 'a')!.state).toBe('available');
    });

    it('refreshes nothing (null) when no spent die matches', () => {
        const pool = [die('a', 'body', 'available'), die('b', 'mind', 'available')];
        const { dice, refreshedId } = refreshOneDie(pool, 'heart');
        expect(refreshedId).toBeNull();
        expect(dice.map(d => d.state)).toEqual(['available', 'available']);
    });
});

// ── Deck building (§4.3) ─────────────────────────────────────────────────────

describe('Spec 25 §4.3 — buildCombatDeck', () => {
    it('builds the deck from known cards, with no escape card appended', () => {
        const deck = buildCombatDeck(makePlayer([DOT_BODY, CONTROL_HEART]));
        expect(deck).toContain(DOT_BODY);
        expect(deck).toContain(CONTROL_HEART);
        expect(deck).not.toContain('card-retreat'); // no in-combat retreat exists
    });

    it('KEEPS duplicate known cards and preserves learn order', () => {
        // Copies are load-bearing in a deckbuilder, so the card base keeps
        // every authored copy — same as the reward list.
        const deck = buildCombatDeck(makePlayer([DOT_BODY, DOT_BODY, CONTROL_HEART]));
        expect(deck.filter(id => id === DOT_BODY)).toHaveLength(2);
        expect(deck.indexOf(DOT_BODY)).toBeLessThan(deck.indexOf(CONTROL_HEART));
    });

    it('yields an empty deck for a player with no cards (unreachable via any real preset)', () => {
        expect(buildCombatDeck(makePlayer([]))).toEqual([]);
    });
});

// ── Card adapters (§6) ───────────────────────────────────────────────────────

describe('Spec 25 §6 — card adapters', () => {
    it('classifyVerbClass routes a DoT card to the dot track', () => {
        const { verbClass, track } = classifyVerbClass(getCardById(DOT_BODY)!, lookupEffect);
        expect(verbClass).toBe('direct-dot');
        expect(track).toBe('dot');
    });

    it('classifyVerbClass routes a control card to the control track', () => {
        const { verbClass, track } = classifyVerbClass(getCardById(CONTROL_HEART)!, lookupEffect);
        expect(['direct-control', 'stat-debuff']).toContain(verbClass);
        expect(track).toBe('control');
    });

    it('toCombatCard returns null for the removed Retreat id (no in-combat retreat exists)', () => {
        expect(toCombatCard('card-retreat', getCardById, lookupEffect)).toBeNull();
    });

    it('toCombatCard returns null for an unknown card id', () => {
        expect(toCombatCard('not-a-real-card', getCardById, lookupEffect)).toBeNull();
    });

    it('projectDeck maps known ids and drops unknown ones', () => {
        const cards = projectDeck([DOT_BODY, 'not-a-real-card', CONTROL_HEART], getCardById, lookupEffect);
        expect(cards.map(c => c.id)).toEqual([DOT_BODY, CONTROL_HEART]);
    });
});

// ── Threat helpers (§10) ─────────────────────────────────────────────────────

describe('Spec 25 §10 — threat sequence helpers', () => {
    it('generateDefaultThreatSequence builds a multi-phase sequence of enemy attacks', () => {
        const seq = generateDefaultThreatSequence(makeEnemy(100, 'body'));
        expect(seq.length).toBeGreaterThanOrEqual(2);
        for (let i = 0; i < seq.length; i++) {
            expect(seq[i].index).toBe(i + 1);
            // Each phase is a real enemy turn: a telegraphed threat action.
            expect(seq[i].threatAction.effects.length).toBeGreaterThan(0);
        }
        expect(seq[seq.length - 1].isFinalPhase).toBe(true);
    });
});

// ── UI previews (§7) ─────────────────────────────────────────────────────────

describe('Spec 25 §7 — presenter previews', () => {
    it('availableDice counts only spendable (non-X, available) dice', () => {
        let state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(80, 'mind'), undefined, SEED);
        state = rollEncounterDice(state).state;
        const expected = state.dice.filter(d => d.state === 'available' && d.color !== 'x').length;
        expect(availableDice(state)).toBe(expected);
    });

});

// ── Press Fate partial re-roll ──────────────────────────────────────────────

describe('Spec 25 — constants', () => {
    it('COMBAT_HAND_SIZE is the draw cap', () => {
        expect(COMBAT_HAND_SIZE).toBeGreaterThan(0);
    });
});

// ── AUTHORED_THREAT_ENEMY_IDS ─────────────────────────────────────────────────

describe('Spec 25 — AUTHORED_THREAT_ENEMY_IDS', () => {
    it('every entry follows the "enemy-<slug>" naming convention', () => {
        for (const id of AUTHORED_THREAT_ENEMY_IDS) {
            expect(id).toMatch(/^enemy-/);
        }
    });

    it('every authored-threat enemy slug exists in the enemy registry', () => {
        const registryKeys = Object.keys(ENEMY_REGISTRY);
        for (const id of AUTHORED_THREAT_ENEMY_IDS) {
            const slug = id.replace(/^enemy-/, '');
            expect(registryKeys).toContain(slug);
        }
    });

    it('is frozen (immutable array)', () => {
        expect(Object.isFrozen(AUTHORED_THREAT_ENEMY_IDS)).toBe(true);
    });
});

// ── Hand presenter (§7) — `handCards` ────────────────────────────────────────

describe('Spec 25 §7 — handCards', () => {
    it('returns { uid, card } pairs for the opening hand (dealt by initializeCombatEncounter)', () => {
        const state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(80), undefined, SEED);
        const hand = handCards(state);
        expect(hand.length).toBe(state.hand.length);
        expect(hand.length).toBeGreaterThan(0);
        for (const entry of hand) {
            expect(typeof entry.uid).toBe('string');
            expect(entry.card).not.toBeNull();
            expect(typeof entry.card.id).toBe('string');
        }
    });

    it('uid values match state.hand slot uids (order preserved)', () => {
        const state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(80), undefined, SEED);
        const hand = handCards(state);
        expect(hand.map(h => h.uid)).toEqual(state.hand.map(h => h.uid));
    });

    it('returns empty when state.hand is empty (e.g. all cards played)', () => {
        const state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(80), undefined, SEED);
        const emptyHand = { ...state, hand: [] };
        expect(handCards(emptyHand)).toEqual([]);
    });
});

// ── Enemy threat resolver (§4.5) — `resolveThreatPhase` ─────────────────────

describe('Spec 25 §4.5 — resolveThreatPhase', () => {
    // The skipTurn-clear witness is a test-only fixture registered into the shared
    // registry (the same lookup the threat engine reads). Never touches the
    // library JSON.
    const THREAT_FIXTURES: Effect[] = [
        {
            id: 'test_skip', name: 'test sleep', description: 'test skipTurn control',
            type: 'debuff', category: 'control', duration: 3, stacking: 'none', tier: 2,
            payload: { actionRestriction: { skipTurn: true } },
        },
    ];
    beforeAll(() => { for (const e of THREAT_FIXTURES) effectsLibrary.registry.set(e.id, e); });
    afterAll(() => { for (const e of THREAT_FIXTURES) effectsLibrary.registry.delete(e.id); });

    it('fires the threat (mark=overwhelmed) when enemy can act', () => {
        let state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(100, 'heart'), undefined, SEED);
        state = rollEncounterDice(state).state;
        const result = resolveThreatPhase(state);
        const phaseEvent = result.events.find(e => e.kind === 'phase-resolved') as
            { kind: 'phase-resolved'; phaseIndex: number; mark: string } | undefined;
        expect(phaseEvent).toBeDefined();
        expect(phaseEvent!.mark).toBe('overwhelmed');
    });

    it('hinders the enemy (mark=clear) when a skipTurn effect is active on it', () => {
        const sleepEffect = lookupEffect('test_skip')!;
        const player = makePlayer([DOT_BODY]);
        const enemy = makeEnemy(100, 'heart');
        const { activeEffects: enemyEffects } = applyEffect(enemy.effects, sleepEffect, 1);
        let state = initializeCombatEncounter(player, { ...enemy, effects: enemyEffects }, undefined, SEED);
        state = rollEncounterDice(state).state;
        const result = resolveThreatPhase(state);
        const phaseEvent = result.events.find(e => e.kind === 'phase-resolved') as
            { kind: 'phase-resolved'; phaseIndex: number; mark: string } | undefined;
        expect(phaseEvent!.mark).toBe('clear');
    });

    it('is a no-op (returns same state) when combat is already complete', () => {
        const state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(100), undefined, SEED);
        const complete = { ...state, phase: 'complete' as const, finalOutcome: 'victory' as const };
        const result = resolveThreatPhase(complete);
        expect(result.state).toBe(complete);
        expect(result.events).toEqual([]);
    });

});

// ── Attribution ledger (§7.7) — `recordAttribution` ─────────────────────────

describe('Spec 25 §7.7 — recordAttribution field shape', () => {
    it('creates a new CombatAttributionRow with all required fields', () => {
        const ledger = recordAttribution({}, 'slippery-slope', 'Slippery Slope', null, 10);
        const row: CombatAttributionRow = ledger['slippery-slope'];
        expect(row.cardId).toBe('slippery-slope');
        expect(row.name).toBe('Slippery Slope');
        expect(row.dotDamage).toBe(0);
        expect(row.damageDealt).toBe(10);
        expect(row.phases).toBe(1);
    });

    it('accumulates damageDealt and phases across multiple calls for the same card', () => {
        let ledger = recordAttribution({}, 'slippery-slope', 'Slippery Slope', null, 5);
        ledger = recordAttribution(ledger, 'slippery-slope', 'Slippery Slope', null, 8);
        const row = ledger['slippery-slope'];
        expect(row.damageDealt).toBe(13);
        expect(row.phases).toBe(2);
    });

    it('tracks separate rows for different cards in the same ledger', () => {
        let ledger = recordAttribution({}, 'slippery-slope', 'Slippery Slope', null, 5);
        ledger = recordAttribution(ledger, 'achilles-gambit', 'Achilles Gambit', null, 12);
        expect(Object.keys(ledger)).toHaveLength(2);
        expect(ledger['slippery-slope'].damageDealt).toBe(5);
        expect(ledger['achilles-gambit'].damageDealt).toBe(12);
    });
});

// ── Attribution honesty — direct-damage clamp + WI-9 DoT provenance ──────────
// Attribution records no projected damage — a card records only its DoT
// PROVENANCE and its actual DIRECT damage (overkill-clamped); DoT is summed
// from emitted ticks at summary time, so the ledger never claims damage the
// fight could not contain.

describe('recordAttribution — direct-damage clamp + DoT provenance (WI-9)', () => {
    /** A real landed poison at a given intensity/duration. */
    const poisonLanded = (intensity: number, remainingDuration: number): LandedEffect => {
        const def = lookupEffect('debuff_poison')!;
        const applied = applyEffect([], def, 1, { intensityDelta: intensity });
        const active = { ...applied.activeEffects[0]!, intensity, remainingDuration };
        return { effectId: def.id, effect: def, active, target: 'enemy' };
    };

    it('clamps direct damage at the HP the target had left', () => {
        const ledger = recordAttribution({}, 'qa-card', 'QA Card', null, 100, 40);
        expect(ledger['qa-card'].damageDealt).toBe(40);
    });

    it('records DoT PROVENANCE (effectIds), never a projection — dotDamage stays 0 at apply time', () => {
        // The old ledger projected 2×5×74 = 740 here; that fiction is gone.
        const ledger = recordAttribution({}, 'qa-card', 'QA Card', poisonLanded(5, 74), 0, 40);
        expect(ledger['qa-card'].dotDamage).toBe(0);
        expect(ledger['qa-card'].effectIds).toContain('debuff_poison');
    });

    it('the strike still claims HP (direct clamp); the DoT is no longer projected', () => {
        const ledger = recordAttribution({}, 'qa-card', 'QA Card', poisonLanded(5, 74), 30, 40);
        expect(ledger['qa-card'].damageDealt).toBe(30);
        expect(ledger['qa-card'].dotDamage).toBe(0);
        expect(ledger['qa-card'].effectIds).toContain('debuff_poison');
    });

    it('attributes no direct damage against an already-dead target (cap 0), still logs the phase', () => {
        const ledger = recordAttribution({}, 'qa-card', 'QA Card', poisonLanded(3, 3), 12, 0);
        expect(ledger['qa-card'].damageDealt).toBe(0);
        expect(ledger['qa-card'].dotDamage).toBe(0);
        expect(ledger['qa-card'].phases).toBe(1);
    });
});

// WI-9 — buildCombatSummary sums the enemy's ACTUAL emitted dot-tick events,
// attributed to the card that applied each effect; it never projects. This is
// the fix for "Straw Man's Jab — 27 dmg" printed while the bar read 90/90.
describe('buildCombatSummary — DoT is summed from emitted ticks, not projected (WI-9)', () => {
    const dotTick = (effectId: string, amount: number): CombatEvent =>
        ({ kind: 'dot-tick', effectId, label: effectId, amount, target: 'enemy' });

    function completeWith(attribution: Record<string, CombatAttributionRow>, log: CombatEvent[], enemyHp = 100) {
        const base = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(enemyHp), undefined, SEED);
        const emittedDot = log.reduce((sum, event) =>
            sum + (event.kind === 'dot-tick' && event.target === 'enemy' ? event.amount : 0), 0);
        return {
            ...base,
            enemy: { ...base.enemy, health: Math.max(0, base.enemy.health - emittedDot) },
            phase: 'complete' as const,
            finalOutcome: 'victory' as const,
            attribution,
            log,
        };
    }

    it('attributes real ticks to the applying card (via effect provenance)', () => {
        // The card applied poison (provenance) and the log shows 3 real ticks (4+4+6).
        const ledger = recordAttribution({}, DOT_BODY, 'Slippery Slope', {
            effectId: 'debuff_poison', effect: lookupEffect('debuff_poison')!,
            active: { effectId: 'debuff_poison', intensity: 1, remainingDuration: 4, appliedAt: 1, tier: 2 },
            target: 'enemy',
        }, 0);
        const log = [dotTick('debuff_poison', 4), dotTick('debuff_poison', 4), dotTick('debuff_poison', 6)];
        const summary = buildCombatSummary(completeWith(ledger, log));
        expect(summary.totalDotDamage).toBe(14);
        expect(summary.rows.find(r => r.cardId === DOT_BODY)?.dotDamage).toBe(14);
    });

    it('the old fiction is dead: a card that applied a DoT that NEVER ticked scores 0 DoT', () => {
        const ledger = recordAttribution({}, DOT_BODY, 'Slippery Slope', {
            effectId: 'debuff_poison', effect: lookupEffect('debuff_poison')!,
            active: { effectId: 'debuff_poison', intensity: 5, remainingDuration: 74, appliedAt: 1, tier: 2 },
            target: 'enemy',
        }, 0);
        const summary = buildCombatSummary(completeWith(ledger, [])); // no ticks emitted
        expect(summary.totalDotDamage).toBe(0);
        expect(summary.rows.find(r => r.cardId === DOT_BODY)?.dotDamage).toBe(0);
    });

    it('ticks with no card provenance (engine drips) fall into a Lingering afflictions row', () => {
        const log = [dotTick('suppurating-curse', 8), dotTick('vulnerable-surcharge', 2)];
        const summary = buildCombatSummary(completeWith({}, log));
        expect(summary.totalDotDamage).toBe(10);
        expect(summary.rows.find(r => r.name === 'Lingering afflictions')?.dotDamage).toBe(10);
    });
});

// ── FE1d — a defeat names its cause from the final state ────────────────────

describe('buildCombatSummary — defeat cause (FE1d)', () => {
    const lost = (playerHealth: number) => {
        const base = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(100), undefined, SEED);
        return {
            ...base,
            phase: 'complete' as const,
            finalOutcome: 'defeat' as const,
            player: { ...base.player, health: playerHealth },
        };
    };

    it('VITAE at 0 reads as the vitae cause', () => {
        expect(buildCombatSummary(lost(0)).defeatCause).toBe('vitae');
    });

    it('a fight lost with the player standing reads as the turn limit', () => {
        expect(buildCombatSummary(lost(12)).defeatCause).toBe('turn-limit');
    });

    it('a win or a spare carries no cause', () => {
        const won = { ...lost(12), finalOutcome: 'victory' as const };
        expect(buildCombatSummary(won).defeatCause).toBeUndefined();
        expect(buildCombatSummary({ ...won, mercyCheck: 'spared' as const }).defeatCause).toBeUndefined();
    });
});

// ── Post-combat summary (§7.7) — `buildCombatSummary` ───────────────────────

describe('Spec 25 §7.7 — buildCombatSummary field shape', () => {
    it('returns a CombatSummary with correct outcome, headline, and directDamage', () => {
        const state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(100), undefined, SEED);
        const complete = {
            ...state,
            phase: 'complete' as const,
            finalOutcome: 'victory' as const,
            enemy: { ...state.enemy, health: 70 },
            directDamageDealt: 30,
            attribution: recordAttribution({}, DOT_BODY, 'Slippery Slope', null, 20),
        };
        const summary = buildCombatSummary(complete);
        expect(summary.outcome).toBe('victory');
        expect(summary.headline).toMatch(/Victory/);
        expect(summary.directDamage).toBe(30);
    });

    it('rows carry all CombatAttributionRow fields (cardId, name, dotDamage, damageDealt, phases)', () => {
        const ledger = recordAttribution({}, DOT_BODY, 'Slippery Slope', null, 15);
        const state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(100), undefined, SEED);
        const complete = {
            ...state,
            phase: 'complete' as const,
            finalOutcome: 'victory' as const,
            directDamageDealt: 0,
            attribution: ledger,
        };
        const summary = buildCombatSummary(complete);
        expect(summary.rows).toHaveLength(1);
        const row = summary.rows[0];
        expect(row.cardId).toBe(DOT_BODY);
        expect(row.name).toBe('Slippery Slope');
        expect(typeof row.dotDamage).toBe('number');
        expect(row.damageDealt).toBe(15);
        expect(row.phases).toBe(1);
    });

    it('rows are sorted descending by damageDealt and bestCard names the top contributor', () => {
        let ledger = recordAttribution({}, DOT_BODY, 'Slippery Slope', null, 5);
        ledger = recordAttribution(ledger, DAMAGE_BODY, 'Achilles Gambit', null, 20);
        const state = initializeCombatEncounter(makePlayer([DOT_BODY, DAMAGE_BODY]), makeEnemy(100), undefined, SEED);
        const complete = {
            ...state,
            phase: 'complete' as const,
            finalOutcome: 'victory' as const,
            directDamageDealt: 0,
            attribution: ledger,
        };
        const summary = buildCombatSummary(complete);
        expect(summary.rows[0].cardId).toBe(DAMAGE_BODY);
        expect(summary.rows[1].cardId).toBe(DOT_BODY);
        expect(summary.bestCard).toBe('Achilles Gambit');
    });

    it('returns an empty rows array and empty bestCard when attribution ledger is empty', () => {
        const state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(100), undefined, SEED);
        const complete = {
            ...state,
            phase: 'complete' as const,
            finalOutcome: 'defeat' as const,
            directDamageDealt: 0,
            attribution: {},
        };
        const summary = buildCombatSummary(complete);
        expect(summary.rows).toEqual([]);
        expect(summary.bestCard).toBe('');
        expect(summary.outcome).toBe('defeat');
    });
});
