/**
 * Hermetic E2E — Hazard-Pattern Combat: DEFENSE cards / GUARD.
 *
 * Defense cards (a `guard` specialMechanic) grant the player GUARD —
 * a transient shield that absorbs the enemy's NEXT telegraphed threat in
 * `resolveThreatPhase`, then resets each phase. This suite pins the contract:
 *
 *   - the card adapter classifies a `guard` card as the `defend` verb class
 *     (0 pressure — it's a tempo/survival tool, not a pressure source);
 *   - playing one (POWER) grants its printed GUARD onto the state;
 *   - GUARD absorbs the next threat — a defending player takes strictly LESS HP
 *     than the same player who played an offensive card instead;
 *   - the library's defense card is real + reachable via COMBAT_REWARD_POOL.
 *
 * Ward (grey-ward, GUARD 5, colourless) is the library's defense
 * card and Blow (grey-strike) the offensive control case.
 *
 * Doctrine: defense never out-damages STATUS. It deals no HP and spends the turn's
 * die, so DoT erosion stays the efficient path to the enemy's only bar (HP).
 *
 * Pure math + a fixed RNG only; no disk / network / TTY.
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
import {
    initializeCombatEncounter, resolveCombatPhase, rollEncounterDice,
    playCombatCard,
} from '../combat.engine';
import { classifyVerbClass, toCombatCard } from '../combat.cards';
import { COMBAT_REWARD_POOL } from '../combat.rewards';
import type { CombatDieColor, CombatEncounterState } from '../combat.encounter.types';

afterEach(() => {
    vi.restoreAllMocks();
});

const BRACE = 'grey-ward';             // colourless defense (PAID GUARD 5)
const STRIKE = 'grey-strike';          // colourless, PAID deal 5 — the offensive control case
const DEFENSE_IDS = [BRACE] as const;

function makePlayer(cards: string[]): Character {
    const p = deepClone(Player);
    p.knownCards = cards.slice();
    // Neutral stats (S3): printed numbers land as printed.
    p.baseStats = { heart: 5, body: 5, mind: 5 };
    p.health = 200;
    p.maxHealth = 200;
    return p;
}

function makeEnemy(hp: number, stance: 'heart' | 'body' | 'mind' = 'mind'): Enemy {
    const e = deepClone(FloatEye);
    e.id = 'enemy-test-dummy';
    e.health = hp;
    e.maxHealth = hp;
    e.effects = [];
    e.baseStats = { heart: stance === 'heart' ? 6 : 2, body: stance === 'body' ? 6 : 2, mind: stance === 'mind' ? 6 : 2 };
    return e;
}

/** Forces this turn's tray to known colors, every die showing a mana face
 *  (a PAID play names its powering die). */
function setDice(state: CombatEncounterState, colors: CombatDieColor[]): CombatEncounterState {
    const turn = state.turn || 1;
    const dice = colors.map((c, i) => ({
        id: `t${turn}-d${i}`, color: c,
        state: c === 'x' ? ('locked' as const) : ('available' as const), temporary: false,
        face: 'mana' as const,
    }));
    return { ...state, dice, turn };
}

/** Opens phase-play on a known BODY + MIND tray. */
function openPhase(state: CombatEncounterState): CombatEncounterState {
    return setDice(rollEncounterDice(state).state, ['body', 'mind']);
}

// ── Card adapter (§6) ────────────────────────────────────────────────────────

describe('Spec 26b — defense cards classify as `defend`', () => {
    it('a `guard` card is the defend verb class on the NO-pressure track', () => {
        for (const id of DEFENSE_IDS) {
            const card = getCardById(id);
            expect(card, `${id} must be a real card`).toBeDefined();
            const { verbClass, track } = classifyVerbClass(card!, lookupEffect);
            expect(verbClass, id).toBe('defend');
            expect(track, id).toBe('none');
        }
    });

    it('the projected card advertises GUARD in its action text + 0 pressure', () => {
        const card = toCombatCard(BRACE, getCardById, lookupEffect);
        expect(card).not.toBeNull();
        expect(card!.verbClass).toBe('defend');
        expect(card!.bottomDamagePreview).toBe(0);
        expect(card!.bottomActionText).toMatch(/Guard/i);
    });

    it('every defense card is reachable via COMBAT_REWARD_POOL', () => {
        for (const id of DEFENSE_IDS) {
            expect(COMBAT_REWARD_POOL, id).toContain(id);
        }
    });
});

// ── Granting GUARD (§4) ──────────────────────────────────────────────────────

describe('Spec 26b — playing a defense card grants GUARD', () => {
    it('a POWERED brace grants its printed GUARD', () => {
        mockSequentialRng(0.05);
        // Every play lands printed (1.0×): a Ward's printed GUARD 5
        // lands as 5 at 5/5/5 stats, whatever die powers it.
        const state = openPhase(initializeCombatEncounter(makePlayer([BRACE]), makeEnemy(80, 'mind'), [BRACE, BRACE, BRACE, BRACE, BRACE], 7));

        const entry = state.hand.find(h => h.cardId === BRACE);
        expect(entry, 'brace should be in hand').toBeDefined();
        const res = playCombatCard(state, { uid: entry!.uid }, true, state.dice[0].id);

        expect(res.state.guard).toBe(5);
        // Defense deals no HP to the enemy (status stays the win path).
        expect(res.state.enemy.health).toBe(80);
    });
});

// ── Absorbing the threat (§4.4) ──────────────────────────────────────────────

describe('Spec 26b — GUARD absorbs the next enemy threat', () => {
    it('a defending player takes strictly less HP than an attacking one', () => {
        // Same enemy + same seed → identical phase-0 threat for both runs.
        const enemyHp = 120;
        const seed = 11;

        // Both cards are colourless — each names the tray's first die.
        mockSequentialRng(0.05);
        const control = resolveCombatPhase(
            openPhase(initializeCombatEncounter(makePlayer([STRIKE]), makeEnemy(enemyHp, 'mind'), [STRIKE, STRIKE, STRIKE], seed)),
            [{ cardId: STRIKE, useBottom: true, dieId: 't1-d0' }],
        );
        const controlLoss = 200 - control.state.player.health;

        mockSequentialRng(0.05);
        const defended = resolveCombatPhase(
            openPhase(initializeCombatEncounter(makePlayer([BRACE]), makeEnemy(enemyHp, 'mind'), [BRACE, BRACE, BRACE], seed)),
            [{ cardId: BRACE, useBottom: true, dieId: 't1-d0' }],
        );
        const defendedLoss = 200 - defended.state.player.health;

        expect(controlLoss, 'the enemy must actually threaten HP').toBeGreaterThan(0);
        expect(defendedLoss, 'GUARD must absorb part of the hit').toBeLessThan(controlLoss);
        // GUARD is spent on the phase it covers — it resets, never banks across phases.
        expect(defended.state.guard ?? 0).toBe(0);
    });
});
