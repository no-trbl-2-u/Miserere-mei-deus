/**
 * Curated Combat Loadout: hermetic e2e test.
 *
 * Covers:
 *  1. Codec round-trip: addToLoadout / getCombatLoadout / removeFromLoadout.
 *  2. Max-capacity guard.
 *  3. buildCombatDeck — curated loadout when flags present.
 *  4. buildCombatDeck — fallback to knownCards when no loadout flags.
 */

import { describe, it, expect } from 'vitest';
import {
    COMBAT_LOADOUT_FLAG_PREFIX, COMBAT_LOADOUT_MAX,
    addToLoadout, removeFromLoadout, getCombatLoadout,
} from '../combat.loadout';
import { buildCombatDeck } from '../combat.deck';
import { initializeCombatEncounter } from '../combat.engine';
import { createCharacter } from '../../Character';
import { FloatEye } from '../../Enemy/enemy.library';

// The grey office is the whole library, so its three cards hold the fixture
// seats (Blow / Ward / Word).
const CARD_A = 'grey-strike';
const CARD_B = 'grey-ward';

describe('combat loadout codec', () => {
    it('addToLoadout encodes a card as a flag', () => {
        const flags = addToLoadout([], CARD_A);
        expect(flags).toHaveLength(1);
        expect(flags[0]).toMatch(new RegExp(`^${COMBAT_LOADOUT_FLAG_PREFIX}${CARD_A}:`));
    });

    it('getCombatLoadout decodes in insertion order', () => {
        let flags: string[] = [];
        flags = addToLoadout(flags, CARD_A);
        flags = addToLoadout(flags, CARD_B);
        expect(getCombatLoadout(flags)).toEqual([CARD_A, CARD_B]);
    });

    it('addToLoadout allows duplicate card copies', () => {
        let flags: string[] = [];
        flags = addToLoadout(flags, CARD_A);
        flags = addToLoadout(flags, CARD_A);
        const loadout = getCombatLoadout(flags);
        expect(loadout).toEqual([CARD_A, CARD_A]);
    });

    it('removeFromLoadout removes the first occurrence only', () => {
        let flags: string[] = [];
        flags = addToLoadout(flags, CARD_A);
        flags = addToLoadout(flags, CARD_A);
        flags = addToLoadout(flags, CARD_B);
        flags = removeFromLoadout(flags, CARD_A);
        expect(getCombatLoadout(flags)).toEqual([CARD_A, CARD_B]);
    });

    it('removeFromLoadout is a no-op when card not in loadout', () => {
        const flags = addToLoadout([], CARD_A);
        const after = removeFromLoadout(flags, CARD_B);
        expect(getCombatLoadout(after)).toEqual([CARD_A]);
    });

    it('getCombatLoadout returns [] when no loadout flags present', () => {
        expect(getCombatLoadout([])).toEqual([]);
        expect(getCombatLoadout(['other-flag:value', 'hazard-card:grip:1'])).toEqual([]);
    });

    it('addToLoadout is a no-op when at COMBAT_LOADOUT_MAX capacity', () => {
        let flags: string[] = [];
        for (let i = 0; i < COMBAT_LOADOUT_MAX; i++) flags = addToLoadout(flags, CARD_A);
        const before = getCombatLoadout(flags).length;
        const after = addToLoadout(flags, CARD_B);
        expect(getCombatLoadout(after).length).toBe(before);
    });
});

describe('buildCombatDeck with curated loadout', () => {
    const player = createCharacter({
        name: 'Tester',
        level: 1,
        baseStats: { heart: 5, body: 5, mind: 5 },
    });
    const EXTRA = 'grey-word'; // a third real card only knownCards carries
    const playerWithCards = { ...player, knownCards: [CARD_A, CARD_B, EXTRA] };

    it('uses the curated loadout when loadout flags are present', () => {
        let flags: string[] = [];
        flags = addToLoadout(flags, CARD_A);
        flags = addToLoadout(flags, CARD_B);
        const deck = buildCombatDeck(playerWithCards, flags);
        expect(deck).toContain(CARD_A);
        expect(deck).toContain(CARD_B);
        expect(deck).not.toContain(EXTRA);
        expect(deck).not.toContain('card-retreat');
    });

    it('falls back to knownCards when flags array is empty', () => {
        const deck = buildCombatDeck(playerWithCards, []);
        expect(deck).toContain(CARD_A);
        expect(deck).toContain(CARD_B);
        expect(deck).toContain(EXTRA);
        expect(deck).not.toContain('card-retreat');
    });

    it('falls back to knownCards when flags has no loadout prefix', () => {
        const deck = buildCombatDeck(playerWithCards, ['other-flag:1']);
        expect(deck).toContain(EXTRA);
    });

    it('falls back to knownCards when flags parameter is omitted', () => {
        const deck = buildCombatDeck(playerWithCards);
        expect(deck).toContain(EXTRA);
    });
});

describe('initializeCombatEncounter — loadout flags reachability (Phase 93)', () => {
    const player = createCharacter({
        name: 'Tester',
        level: 1,
        baseStats: { heart: 5, body: 5, mind: 5 },
    });
    const EXTRA = 'grey-word'; // a third real card only knownCards carries
    const playerWithCards = { ...player, knownCards: [CARD_A, CARD_B, EXTRA] };

    it('deals the curated loadout, not the full knownCards list, when flags are passed', () => {
        let flags: string[] = [];
        flags = addToLoadout(flags, CARD_A);
        flags = addToLoadout(flags, CARD_B);
        const state = initializeCombatEncounter(playerWithCards, FloatEye, undefined, 1, flags);
        expect(state.deck).toContain(CARD_A);
        expect(state.deck).toContain(CARD_B);
        expect(state.deck).not.toContain(EXTRA);
    });

    it('falls back to knownCards when flags is omitted (pre-Phase-93 behavior unchanged)', () => {
        const state = initializeCombatEncounter(playerWithCards, FloatEye, undefined, 1);
        expect(state.deck).toContain(EXTRA);
    });

    it('an explicit playerDeck still wins over loadout flags', () => {
        let flags: string[] = [];
        flags = addToLoadout(flags, CARD_A);
        const state = initializeCombatEncounter(playerWithCards, FloatEye, [EXTRA], 1, flags);
        expect(state.deck).toEqual([EXTRA]);
    });
});
