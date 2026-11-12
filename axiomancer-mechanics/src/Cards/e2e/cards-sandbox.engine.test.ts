/**
 * Hermetic E2E — Sandbox card registry (the deck-forge experimentation surface).
 *
 * Covers:
 *   - register / lookup / clear lifecycle, `hasSandboxContent`
 *   - collision safety (library ids and duplicate sandbox ids throw; atomic)
 *   - library-card overrides: shallow merge visible through `getCardById`
 *   - a registered sandbox card speaks the v3 vocabulary: its effect ids
 *     resolve in the Effects library and it projects through `toCombatCard`
 *
 * The sandbox is wiped after every test so no experimental card leaks into
 * other suites.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import { lookupEffect } from '../../Effects';
import type { Card } from '../types';
import { getCardById } from '../cards.library';
import {
    registerSandboxCards, registerSandboxOverride, clearSandboxCards,
    getSandboxCard, listSandboxCards, hasSandboxContent,
} from '../cards.sandbox';
import { toCombatCard } from '../../Combat/combat.cards';

afterEach(() => {
    clearSandboxCards();
    vi.restoreAllMocks();
});

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** Minimal well-formed v3 experimental DoT card (real effect id: debuff_bleed). */
function testDotCard(id = 'sandbox-test-rot'): Card {
    return {
        id,
        name: 'Test Rot',
        color: 'body',
        description: 'A test argument that decays on contact.',
        tier: 1,
        rank: 1,
        cardType: 'spell',
        targetType: 'enemy',
        free: { damage: 1 },
        combatEffects: [{ effectId: 'debuff_bleed', appliedTo: 'opponent', intensity: 2, duration: 3 }],
    };
}

// ── Registry lifecycle ───────────────────────────────────────────────────────

describe('sandbox registry — register / lookup / clear', () => {
    it('starts empty and stays invisible to getCardById', () => {
        expect(hasSandboxContent()).toBe(false);
        expect(listSandboxCards()).toEqual([]);
        expect(getSandboxCard('grey-word')).toBeUndefined();
        // Library lookups are untouched when the sandbox is empty.
        expect(getCardById('grey-word')?.name).toBe('Word');
        expect(getCardById('no-such-card')).toBeUndefined();
    });

    it('a registered new card resolves via getSandboxCard AND getCardById', () => {
        registerSandboxCards([testDotCard()]);
        expect(hasSandboxContent()).toBe(true);
        expect(getSandboxCard('sandbox-test-rot')?.name).toBe('Test Rot');
        expect(getCardById('sandbox-test-rot')?.rank).toBe(1);
        expect(listSandboxCards().map(c => c.id)).toEqual(['sandbox-test-rot']);
    });

    it('clearSandboxCards wipes both new cards and overrides', () => {
        registerSandboxCards([testDotCard()]);
        registerSandboxOverride('grey-word', { tier: 3 });
        expect(hasSandboxContent()).toBe(true);
        expect(listSandboxCards()).toHaveLength(2);

        clearSandboxCards();
        expect(hasSandboxContent()).toBe(false);
        expect(getCardById('sandbox-test-rot')).toBeUndefined();
        expect(getCardById('grey-word')?.tier).toBe(1); // library literal (the grey office)
    });
});

// ── Collision safety ─────────────────────────────────────────────────────────

describe('sandbox registry — collisions and validation', () => {
    it('registering an id that exists in the card library throws', () => {
        expect(() => registerSandboxCards([testDotCard('grey-strike')]))
            .toThrow(/collides with the card library/);
    });

    it('registering the same sandbox id twice throws', () => {
        registerSandboxCards([testDotCard()]);
        expect(() => registerSandboxCards([testDotCard()]))
            .toThrow(/already registered/);
    });

    it('registration is atomic — a colliding batch registers nothing', () => {
        expect(() => registerSandboxCards([testDotCard('sandbox-ok'), testDotCard('grey-ward')]))
            .toThrow();
        expect(getSandboxCard('sandbox-ok')).toBeUndefined();
        expect(hasSandboxContent()).toBe(false);
    });

    it('overriding a card that is not in the library throws', () => {
        expect(() => registerSandboxOverride('no-such-card', { tier: 3 }))
            .toThrow(/no such card in the library/);
    });
});

// ── Overrides ────────────────────────────────────────────────────────────────

describe('sandbox registry — library-card overrides', () => {
    // (Override target re-pinned at the card purge, P1 2026-09-27, to
    //  grey-word — the one surviving library card with a combatEffects payload.)
    it('a shallow patch is merged over the library card and visible via getCardById', () => {
        const base = getCardById('grey-word');
        expect(base?.combatEffects?.[0]?.intensity).toBe(25); // library literal (the grey office)

        registerSandboxOverride('grey-word', {
            combatEffects: [{ effectId: 'debuff_bleed', appliedTo: 'opponent', intensity: 3, duration: 2 }],
        });
        const merged = getCardById('grey-word');
        expect(merged?.combatEffects?.[0]?.intensity).toBe(3);
        // Untouched fields survive the merge; the id is immutable.
        expect(merged?.id).toBe('grey-word');
        expect(merged?.name).toBe(base?.name);
        expect(merged?.free).toEqual(base?.free);
        expect(merged?.rank).toBe(base?.rank);
    });

    it('repeated overrides of the same card accumulate (shallow-merge order)', () => {
        // grey-word's library literals are rank 1 / tier 1 — both patches
        // must move the merged value away from the base.
        registerSandboxOverride('grey-word', { rank: 3 });
        registerSandboxOverride('grey-word', { tier: 3 });
        const merged = getCardById('grey-word');
        expect(merged?.rank).toBe(3);
        expect(merged?.tier).toBe(3);
        expect(listSandboxCards().map(c => c.id)).toEqual(['grey-word']);
    });
});

// ── v3 vocabulary + projection ───────────────────────────────────────────────

describe('sandbox cards — v3 vocabulary and combat projection', () => {
    it('every effect id on a registered sandbox card resolves in the Effects library', () => {
        const card = testDotCard();
        registerSandboxCards([card]);
        for (const ce of card.combatEffects ?? []) {
            expect(lookupEffect(ce.effectId), `${card.id} -> ${ce.effectId}`).toBeDefined();
        }
    });

    it('a registered sandbox card projects through toCombatCard as a status card', () => {
        registerSandboxCards([testDotCard()]);
        const projected = toCombatCard('sandbox-test-rot', getCardById, lookupEffect);
        expect(projected).not.toBeNull();
        expect(projected!.id).toBe('sandbox-test-rot');
        expect(projected!.primaryEffectId).toBe('debuff_bleed');
        expect(projected!.effectKind).toBe('dot');
    });
});
