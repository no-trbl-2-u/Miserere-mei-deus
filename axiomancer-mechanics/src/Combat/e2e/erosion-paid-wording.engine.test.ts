/**
 * Wording guard — the complete live starter paid-line surface.
 *
 * Every fresh run opens on the grey deck (A Plain Blow / Ward / Word). Its
 * paid lines are the
 * first player-facing wording surface of every run, so they carry the audit.
 * This test pins the production projection, not merely the authored fragments.
 */

import { describe, expect, it } from 'vitest';

import { getCardById } from '../../Cards/cards.library';
import { lookupEffect } from '../../Effects';
import { toCombatCard } from '../combat.cards';
import { STARTING_CARD_IDS } from '../combat.rewards';

// The grey office's lines. The production projection is the wording the
// player reads, and it must not drift silently.
const EXPECTED_PAID_LINES: Readonly<Record<string, string>> = {
    'grey-strike': 'PAID — DEAL 5. Costs 1 die.',
    'grey-ward': 'PAID — GUARD 5. Costs 1 die.',
    'grey-word': 'PAID — VULNERABLE 25% for 2 turns. Costs 1 die.',
};

describe('Starter (grey deck) paid-effect wording', () => {
    it('covers every unique card of the grey deck', () => {
        const scope = new Set(STARTING_CARD_IDS);

        expect([...scope].sort()).toEqual(Object.keys(EXPECTED_PAID_LINES).sort());
    });

    it('projects the approved paid lines through the production card face', () => {
        const projected = Object.fromEntries(
            Object.keys(EXPECTED_PAID_LINES).map((id) => [
                id,
                toCombatCard(id, getCardById, lookupEffect)?.bottomActionText,
            ]),
        );

        expect(projected).toEqual(EXPECTED_PAID_LINES);
    });
});
