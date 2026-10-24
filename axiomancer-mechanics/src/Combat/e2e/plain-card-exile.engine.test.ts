/**
 * GUARD — a plain card's PAID play EXILEs when it says so (Phase SP1, brief
 * `plan/phases/phase_SP1_spell_law.md` A2).
 *
 * A program card's line carries `exile`; a plain card carries `paidExile`.
 * The plain path sends the card to the program ledger's EXILE pile (opened
 * when the deck holds no program card), never to discard, and its face
 * prints EXILE. FREE plays still discard. The card under test is the grey
 * Word with a sandbox override, so no library number is pinned here.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockSequentialRng } from '../../test-utils/rng';
import { buildFixtureState } from '../../test-utils/card-fixture';
import { handCards, playCombatCard } from '../combat.engine';
import { clearSandboxCards, registerSandboxOverride } from '../../Cards/cards.sandbox';
import type { CombatEncounterState, CombatManaDie } from '../combat.encounter.types';

const DIE = 'fx-exile-die';
const CARD = 'grey-word';

function stateWith(cardId: string): CombatEncounterState {
    const s = buildFixtureState({ clean: true });
    const die: CombatManaDie = { id: DIE, color: 'wild', state: 'available', temporary: false, face: 'mana' };
    return { ...s, enemy: { ...s.enemy, keywords: [], effects: [] }, hand: [{ uid: 'under-test', cardId }], dice: [die], discard: [], guard: 0 };
}

afterEach(() => { clearSandboxCards(); vi.restoreAllMocks(); });

describe('a plain card with paidExile', () => {
    it('PAID: leaves combat to the EXILE pile, not the discard, and says so', () => {
        registerSandboxOverride(CARD, { paidExile: true, paidSummary: 'VULNERABLE +25% for 2 turns. EXILE.' });
        const before = stateWith(CARD);
        expect(before.program).toBeUndefined();
        mockSequentialRng(0.5);
        const res = playCombatCard(before, { uid: 'under-test' }, true, DIE);
        expect(res.state.hand).toHaveLength(0);
        expect(res.state.discard).not.toContain(CARD);
        expect(res.state.program?.exiled).toEqual([CARD]);
        expect(res.events.some(e => e.kind === 'card-exiled' && e.cardId === CARD)).toBe(true);
        // The play still lands: the status is on the foe.
        expect(res.state.enemy.effects.some(e => e.effectId === 'debuff_vulnerable')).toBe(true);
    });

    it('FREE: still discards', () => {
        registerSandboxOverride(CARD, { paidExile: true });
        mockSequentialRng(0.5);
        const res = playCombatCard(stateWith(CARD), { uid: 'under-test' }, false);
        expect(res.state.discard).toContain(CARD);
        expect(res.state.program?.exiled ?? []).toEqual([]);
    });

    it('the generated PAID face prints EXILE when no summary is authored', () => {
        registerSandboxOverride(CARD, { paidExile: true, paidSummary: undefined });
        const face = handCards(stateWith(CARD))[0]!.card.bottomActionText;
        expect(face).toMatch(/EXILE\. Costs 1 die\.$/);
    });

    it('without the flag the card discards as before', () => {
        mockSequentialRng(0.5);
        const res = playCombatCard(stateWith(CARD), { uid: 'under-test' }, true, DIE);
        expect(res.state.discard).toContain(CARD);
        expect(res.state.program).toBeUndefined();
    });
});
