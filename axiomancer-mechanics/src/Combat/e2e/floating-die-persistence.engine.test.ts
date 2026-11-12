/**
 * Hermetic E2E — CROSS-COMBAT floating-die persistence.
 *
 * Pins the save-back seam through real encounters:
 *
 *   a persisted float (Character.floatingDice) → fight 2: the float
 *   materializes in the opening tray → spend it (named as the powering die)
 *   → getFloatingDiceColors (the save-back) is empty → fight 3 opens with an
 *   empty pool.
 *
 * The loop starts from a saved float (no live card forges one).
 *
 * Plus the seam under the real auto-runner (`runHazardCombatAutoEncounter` ×2
 * — the map-run shape): the pool never grows without a forge card in the deck
 * and survives the write-back round-trip between runs.
 *
 * Seeded RNG only; no disk / network / TTY.
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import type { Enemy } from '../../Enemy/types';
import { FloatEye } from '../../Enemy/enemy.library';
import { deepClone } from '../../Utils';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard,
    getFloatingDiceColors,
} from '../combat.engine';
import { FLOATING_DICE_CAP } from '../combat.dice';
import { runHazardCombatAutoEncounter } from '../../test-utils/combat-autoplay';
import type { CombatEncounterState } from '../combat.encounter.types';

// Blow (colourless) — any die,
// a wild float included, powers it.
const DOT = 'grey-strike';

function makePlayer(cards: string[], floatingDice: ('heart' | 'body' | 'mind' | 'wild')[] = []): Character {
    const p = deepClone(Player);
    p.knownCards = cards.slice();
    p.baseStats = { heart: 8, body: 8, mind: 8 };
    p.health = 200; p.maxHealth = 200; p.effects = [];
    p.floatingDice = floatingDice.slice();
    return p;
}

function makeEnemy(hp: number): Enemy {
    const e = deepClone(FloatEye);
    e.id = 'enemy-float-persistence-dummy';
    e.health = hp; e.maxHealth = hp; e.effects = [];
    return e;
}

function playFromHand(state: CombatEncounterState, cardId: string, useBottom = true, dieId?: string) {
    const entry = state.hand.find(h => h.cardId === cardId);
    expect(entry, `${cardId} should be in hand`).toBeDefined();
    return playCombatCard(state, { uid: entry!.uid }, useBottom, dieId);
}

describe('GHOST DICE — cross-combat persistence (the save-back seam, full loop)', () => {
    it('saved float → fight 2 opening tray → spend → save-back empty → fight 3 empty', () => {
        // The persisted pool, exactly what the panel wrote to the character.
        const saved: ('heart' | 'body' | 'mind' | 'wild')[] = ['wild'];

        // ── FIGHT 2: the float arrives in the OPENING tray ──────────────────
        const player2 = makePlayer([DOT, DOT, DOT, DOT], saved);
        let s2 = initializeCombatEncounter(player2, makeEnemy(80), [DOT, DOT, DOT, DOT], 11);
        s2 = rollEncounterDice(s2).state;
        expect(s2.floatingDice?.map(d => d.color)).toEqual(['wild']);
        const tray = s2.dice.find(d => d.floating);
        expect(tray, 'the persisted float must sit in the opening tray').toBeDefined();
        expect(tray!.state).toBe('available');
        expect(tray!.color).toBe('wild');

        // Spend it by naming it as the powering die; a wild float is
        // color-legal on the colourless blow.
        const spent = playFromHand(s2, DOT, true, tray!.id);
        expect(spent.events.some(e => e.kind === 'effect-fizzled')).toBe(false);
        expect(spent.events.some(e => e.kind === 'floating-die-spent')).toBe(true);
        s2 = spent.state;
        expect(s2.floatingDice).toEqual([]);

        // ── FIGHT 3: consumed forever — nothing to materialize ──────────────
        const player3 = makePlayer([DOT, DOT, DOT, DOT], getFloatingDiceColors(s2));
        let s3 = initializeCombatEncounter(player3, makeEnemy(80), [DOT, DOT, DOT, DOT], 13);
        s3 = rollEncounterDice(s3).state;
        expect(s3.floatingDice ?? []).toEqual([]);
        expect(s3.dice.some(d => d.floating)).toBe(false);
    });

    it('a stale over-cap save materializes at most FLOATING_DICE_CAP floats', () => {
        const player = makePlayer([DOT, DOT, DOT, DOT], ['wild', 'heart', 'body', 'mind']);
        let s = initializeCombatEncounter(player, makeEnemy(80), [DOT, DOT, DOT, DOT], 17);
        s = rollEncounterDice(s).state;
        expect(s.floatingDice?.length).toBe(FLOATING_DICE_CAP);
        expect(s.dice.filter(d => d.floating).length).toBe(FLOATING_DICE_CAP);
    });

    it('auto-runner ×2 (the map-run shape): the pool survives the round-trip and never grows without a forge', () => {
        const VALID = new Set(['heart', 'body', 'mind', 'wild']);
        // Run 1 — a forge-free deck carrying one persisted wild float.
        const p1 = makePlayer([DOT, DOT, DOT, DOT, DOT], ['wild']);
        const r1 = runHazardCombatAutoEncounter(p1, makeEnemy(60), { seed: 5, policy: 'status' });
        expect(r1.phaseCount).toBeGreaterThan(0);
        const pool1 = getFloatingDiceColors(r1.state);
        expect(pool1.length).toBeLessThanOrEqual(1);      // spent or kept — never invented
        pool1.forEach(c => expect(VALID.has(c)).toBe(true));

        // The seam between fights: write back, run again on the survivor pool.
        const p2 = makePlayer([DOT, DOT, DOT, DOT, DOT], pool1);
        const r2 = runHazardCombatAutoEncounter(p2, makeEnemy(60), { seed: 9, policy: 'status' });
        expect(r2.phaseCount).toBeGreaterThan(0);
        const pool2 = getFloatingDiceColors(r2.state);
        expect(pool2.length).toBeLessThanOrEqual(pool1.length);
        pool2.forEach(c => expect(VALID.has(c)).toBe(true));
    });
});
