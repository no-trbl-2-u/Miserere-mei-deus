/**
 * Hermetic E2E — the deck-removal primitive + the escalating price.
 *
 * Driven entirely through the PUBLIC BARREL (`../../index`), the same module
 * path the mobile screen imports, so the barrel export is proven along
 * with the behaviour. No RNG, no clock, no disk: removal is deterministic by
 * construction — there is nothing to roll — so no stub is needed and none is
 * installed.
 *
 * What is pinned here:
 *   - `combatRewardCards` drains BEFORE `knownCards`, one copy at a time;
 *   - the `knownCards` fall-through, including the duplicate-entry case the
 *     mobile starter-bundle path produces;
 *   - refusals are first-class values (unknown card, deck at the floor) that
 *     leave the character byte-identical and never advance the counter;
 *   - the floor's DERIVATION from the shipped Profane Canon lineage;
 *   - the price curve at 0/1/2/3 removals and its linearity.
 */

import { describe, it, expect } from 'vitest';

import {
    removeCardFromCombatDeck,
    MIN_COMBAT_DECK_SIZE,
    cardRemovalPrice,
    cardRemovalPriceFor,
    cardRemovalsOf,
    canAffordCardRemoval,
    CARD_REMOVAL_PRICING,
} from '../card.removal';
import {
    buildCombatDeck,
    COMBAT_HAND_SIZE,
    STARTING_CARD_IDS,
} from '../../Combat';
import { createCharacter } from '../../index';
import type { Character } from '../../index';

// The Threadbare Office — opaque card ids. The removal primitive is a pure
// deck-list operation that never resolves a card, so these are opaque, DISTINCT ids: the tests need many
// different cards, and the grey office has only three.
const OFFICE = [
    'spoiled-poultice', 'chilblain-watch', 'petty-indictment', 'first-spadeful',
    'grandmothers-psalter', 'thumbprick-oath', 'thin-hymn', 'threadbare-cope',
] as const;
// Earned rewards — enough to sit the fixture deck comfortably above the floor.
const EARNED = [
    'unction-of-boils', 'the-sextons-bell', 'the-long-lent', 'promissory-cut',
    'the-vig', 'dead-pledge', 'shallow-grave', 'paupers-pyre',
] as const;

function fixture(known: readonly string[], rewards: readonly string[] = []): Character {
    const base = createCharacter({
        name: 'Removal Fixture',
        level: 1,
        baseStats: { heart: 5, body: 5, mind: 5 },
    });
    return { ...base, knownCards: [...known], combatRewardCards: [...rewards] };
}

/** A fixture whose deck sits at exactly `size` cards (all above the floor). */
function deckOf(size: number): Character {
    const known = [...OFFICE].slice(0, Math.min(size, OFFICE.length));
    const rewards: string[] = [];
    while (known.length + rewards.length < size) {
        rewards.push(EARNED[rewards.length % EARNED.length]);
    }
    return fixture(known, rewards);
}

describe('Phase 52a — removeCardFromCombatDeck: source ordering', () => {
    it('drains combatRewardCards BEFORE knownCards when both hold the id', () => {
        const player = fixture(OFFICE, [...EARNED, 'thin-hymn', 'thin-hymn']);
        const result = removeCardFromCombatDeck(player, 'thin-hymn');

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.removedFrom).toBe('rewards');
        // The unlock set is the base — it keeps the card.
        expect(result.player.knownCards).toContain('thin-hymn');
        // Exactly one reward copy left.
        expect(result.player.combatRewardCards!.filter(id => id === 'thin-hymn'))
            .toHaveLength(1);
        expect(result.deckSizeAfter).toBe(result.deckSizeBefore - 1);
    });

    it('removes exactly ONE copy of a duplicated reward card, never all of them', () => {
        const player = fixture(OFFICE, [...EARNED, 'the-vig', 'the-vig', 'the-vig']);
        const before = buildCombatDeck(player).filter(id => id === 'the-vig').length;
        expect(before).toBe(4); // one from EARNED + the three extras

        const result = removeCardFromCombatDeck(player, 'the-vig');
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(buildCombatDeck(result.player).filter(id => id === 'the-vig')).toHaveLength(3);
        expect(result.deckSizeAfter).toBe(result.deckSizeBefore - 1);
    });

    it('falls through to knownCards when no reward copy exists', () => {
        const player = fixture(OFFICE, EARNED);
        const result = removeCardFromCombatDeck(player, 'threadbare-cope');

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.removedFrom).toBe('known');
        expect(result.player.knownCards).not.toContain('threadbare-cope');
        expect(buildCombatDeck(result.player)).not.toContain('threadbare-cope');
        expect(result.deckSizeAfter).toBe(result.deckSizeBefore - 1);
    });

    it('a duplicated knownCards entry gives up ONE copy — a 3-of stays a 2-of', () => {
        // The mobile starter-bundle path writes the starter recipe verbatim,
        // duplicates and all, into `knownCards`, and `buildCombatDeck` KEEPS
        // those copies. Entries and deck copies are one-for-one, so one removal must take exactly one
        // entry — draining the list would delete a 3-of for a single price.
        const player = fixture(
            ['spoiled-poultice', 'spoiled-poultice', 'spoiled-poultice', ...OFFICE.slice(1)],
            EARNED,
        );
        const result = removeCardFromCombatDeck(player, 'spoiled-poultice');

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.player.knownCards.filter(id => id === 'spoiled-poultice')).toHaveLength(2);
        expect(buildCombatDeck(result.player).filter(id => id === 'spoiled-poultice')).toHaveLength(2);
        expect(result.deckSizeAfter).toBe(result.deckSizeBefore - 1);
    });

    it('never mutates the character or the lists it was handed', () => {
        const player = fixture(OFFICE, EARNED);
        const knownSnapshot = [...player.knownCards];
        const rewardSnapshot = [...player.combatRewardCards!];

        removeCardFromCombatDeck(player, 'thin-hymn');
        removeCardFromCombatDeck(player, 'the-vig');

        expect(player.knownCards).toEqual(knownSnapshot);
        expect(player.combatRewardCards).toEqual(rewardSnapshot);
        expect(player.cardRemovals).toBeUndefined();
    });
});

describe('Phase 52a — refusals are first-class, loud, and inert', () => {
    it('refuses a card that is not in the deck at all', () => {
        const player = fixture(OFFICE, EARNED);
        const result = removeCardFromCombatDeck(player, 'no-such-card');

        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.refusal.code).toBe('not-in-deck');
        expect(result.refusal.reason).toMatch(/not in the combat deck/i);
        expect(result.refusal.reason).toContain('no-such-card');
        // The player reference itself comes straight back — provably untouched.
        expect(result.player).toBe(player);
        expect(result.removedFrom).toBeNull();
        expect(result.deckSizeAfter).toBe(result.deckSizeBefore);
    });

    it('refuses AT the floor — refused, never clamped', () => {
        const player = deckOf(MIN_COMBAT_DECK_SIZE);
        expect(buildCombatDeck(player)).toHaveLength(MIN_COMBAT_DECK_SIZE);

        const result = removeCardFromCombatDeck(player, buildCombatDeck(player)[0]);
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.refusal.code).toBe('deck-at-floor');
        expect(result.refusal.reason).toMatch(/floor of 10 cards/);
        expect(result.refusal.floor).toBe(MIN_COMBAT_DECK_SIZE);
        expect(result.refusal.deckSize).toBe(MIN_COMBAT_DECK_SIZE);
        expect(result.player).toBe(player);
        // Nothing was clamped down to the floor — the deck is exactly as it was.
        expect(buildCombatDeck(result.player)).toHaveLength(MIN_COMBAT_DECK_SIZE);
    });

    it('the LAST legal removal lands the deck exactly on the floor, and the next is refused', () => {
        const player = deckOf(MIN_COMBAT_DECK_SIZE + 1);
        const first = removeCardFromCombatDeck(player, buildCombatDeck(player)[0]);

        expect(first.ok).toBe(true);
        if (!first.ok) return;
        expect(first.deckSizeAfter).toBe(MIN_COMBAT_DECK_SIZE);

        const second = removeCardFromCombatDeck(first.player, buildCombatDeck(first.player)[0]);
        expect(second.ok).toBe(false);
        if (second.ok) return;
        expect(second.refusal.code).toBe('deck-at-floor');
    });

    it('a refusal never advances the removal counter (and so never raises the price)', () => {
        const atFloor = deckOf(MIN_COMBAT_DECK_SIZE);
        const refused = removeCardFromCombatDeck(atFloor, buildCombatDeck(atFloor)[0]);

        expect(refused.ok).toBe(false);
        expect(refused.removals).toBe(0);
        expect(cardRemovalsOf(refused.player)).toBe(0);
        expect(cardRemovalPriceFor(refused.player)).toBe(cardRemovalPrice(0));
    });

    it('refuses without throwing — the refusal is a returned value, not an exception', () => {
        const player = fixture(OFFICE, EARNED);
        expect(() => removeCardFromCombatDeck(player, 'no-such-card')).not.toThrow();
        expect(() => removeCardFromCombatDeck(deckOf(MIN_COMBAT_DECK_SIZE), 'thin-hymn'))
            .not.toThrow();
    });
});

describe('Phase 52a — the per-run counter', () => {
    it('every accepted removal advances cardRemovals by one', () => {
        let player = fixture(OFFICE, [...EARNED, ...EARNED]);
        expect(cardRemovalsOf(player)).toBe(0);

        for (let expected = 1; expected <= 3; expected++) {
            const result = removeCardFromCombatDeck(player, buildCombatDeck(player)[0]);
            expect(result.ok, `removal ${expected}`).toBe(true);
            if (!result.ok) return;
            expect(result.removals).toBe(expected);
            expect(result.player.cardRemovals).toBe(expected);
            player = result.player;
        }
    });

    it('the primitive spends NO currency — pricing is the caller\'s transaction', () => {
        const player = { ...fixture(OFFICE, EARNED), currency: 100 };
        const result = removeCardFromCombatDeck(player, 'thin-hymn');
        expect(result.ok).toBe(true);
        expect(result.player.currency).toBe(100);
    });

    it('an absent counter reads as 0', () => {
        const player = fixture(OFFICE, EARNED);
        expect(player.cardRemovals).toBeUndefined();
        expect(cardRemovalsOf(player)).toBe(0);
        expect(cardRemovalsOf({ cardRemovals: 4 })).toBe(4);
        expect(cardRemovalsOf({ cardRemovals: -3 })).toBe(0);
    });
});

describe('Phase 52a — the escalating price (RATIFIED Phase 52f, measured income)', () => {
    it('is exactly 5 / 10 / 15 / 20 at 0 / 1 / 2 / 3 removals', () => {
        expect(cardRemovalPrice(0)).toBe(5);
        expect(cardRemovalPrice(1)).toBe(10);
        expect(cardRemovalPrice(2)).toBe(15);
        expect(cardRemovalPrice(3)).toBe(20);
    });

    it('is LINEAR, not exponential — the step never grows', () => {
        const steps: number[] = [];
        for (let n = 0; n < 10; n++) steps.push(cardRemovalPrice(n + 1) - cardRemovalPrice(n));
        expect(new Set(steps)).toEqual(new Set([CARD_REMOVAL_PRICING.step]));
        // The tenth removal is still payable, which is the whole point of linear.
        expect(cardRemovalPrice(9)).toBe(50);
    });

    it('is driven by the named ratified constants, not by literals', () => {
        const { base, step } = CARD_REMOVAL_PRICING;
        expect(base).toBe(5);
        expect(step).toBe(5);
        for (let n = 0; n < 6; n++) expect(cardRemovalPrice(n)).toBe(base + step * n);
    });

    it('cardRemovalPriceFor tracks a character across real removals', () => {
        let player = fixture(OFFICE, [...EARNED, ...EARNED]);
        expect(cardRemovalPriceFor(player)).toBe(5);

        const first = removeCardFromCombatDeck(player, buildCombatDeck(player)[0]);
        expect(first.ok).toBe(true);
        if (!first.ok) return;
        player = first.player;
        expect(cardRemovalPriceFor(player)).toBe(10);

        const second = removeCardFromCombatDeck(player, buildCombatDeck(player)[0]);
        expect(second.ok).toBe(true);
        if (!second.ok) return;
        expect(cardRemovalPriceFor(second.player)).toBe(15);
    });

    it('canAffordCardRemoval reads the purse against the next price only', () => {
        const player = { ...fixture(OFFICE, EARNED), currency: 5 };
        expect(canAffordCardRemoval(player)).toBe(true);
        expect(canAffordCardRemoval({ ...player, currency: 4 })).toBe(false);
        expect(canAffordCardRemoval({ ...player, currency: 5, cardRemovals: 1 })).toBe(false);
        expect(canAffordCardRemoval({ ...player, currency: 10, cardRemovals: 1 })).toBe(true);
    });
});

describe('Phase 104 — MIN_COMBAT_DECK_SIZE is DERIVED from the grey office', () => {
    it('is exactly 2x COMBAT_HAND_SIZE — the reshuffle-inside-one-round bound', () => {
        // Below ~2 hands the draw pile reshuffles inside a single round and
        // every fight deals the same hand.
        expect(MIN_COMBAT_DECK_SIZE).toBe(COMBAT_HAND_SIZE * 2);
    });

    it('matches the grey office — the smallest shipped starting deck', () => {
        expect(MIN_COMBAT_DECK_SIZE).toBe(10);
    });

    it('the grey deck is not born below the floor', () => {
        expect(STARTING_CARD_IDS.length).toBeGreaterThanOrEqual(MIN_COMBAT_DECK_SIZE);
    });
});
