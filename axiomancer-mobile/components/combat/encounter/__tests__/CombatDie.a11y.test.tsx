/**
 * CombatDie — the spoken die (its a11y copy).
 *
 * A die is never drafted; it is dragged onto a staged card, and its label
 * never speaks draft vocabulary. A `special` face powers the card AND pays
 * Conviction, a MANA face powers one paid line of its colour, gold powers
 * any colour, MISS is dead. The label is a pure function so the
 * e2e harness (`scripts/combat-round-e2e.mjs` readDice) and the screen
 * reader hear the same words.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { CombatDie, combatDieA11yLabel } from '@/components/combat/encounter/CombatDie';
import type { CombatDieVM } from '@/state/presenters/combat-encounter.engine';

const HEART: CombatDieVM = {
    id: 'd-heart', color: 'heart', colorHex: '#c23b3b', glyph: '♥', stanceLabel: 'HEART',
    spent: false, isX: false, draggable: true,
} as CombatDieVM;

const GOLD: CombatDieVM = { ...HEART, id: 'd-wild', color: 'wild', glyph: '★', stanceLabel: 'WILD' } as CombatDieVM;

describe('combatDieA11yLabel — spec 33 faces', () => {
    it('never speaks the pre-spec-33 draft vocabulary', () => {
        const dice: CombatDieVM[] = [
            { ...HEART, face: 'special' }, { ...HEART, face: 'mana' }, { ...HEART, face: 'miss' },
            { ...GOLD, face: 'special' }, { ...HEART, face: 'mana', spent: true },
        ];
        for (const die of dice) {
            expect(combatDieA11yLabel(die)).not.toMatch(/available to draft|draft it/i);
        }
    });

    it('BOON: drag onto a staged card of its colour and power it', () => {
        const label = combatDieA11yLabel({ ...HEART, face: 'special' });
        expect(label).toBe(`HEART die, BOON face: drag onto a staged HEART card to power it`);
    });

    it('BOON says what the worn weapon special does', () => {
        const label = combatDieA11yLabel({ ...HEART, face: 'special' }, { specialText: "Your weapon's special: HEAL 4 when it powers a card." });
        expect(label).toContain("to power it. Your weapon's special: HEAL 4");
    });

    it('MANA: drag onto a staged card of its colour to power its paid line', () => {
        expect(combatDieA11yLabel({ ...HEART, face: 'mana' }))
            .toBe('HEART die, MANA face: drag onto a staged HEART card to power its paid line');
    });

    it('gold is named gold and powers a card of any colour', () => {
        const label = combatDieA11yLabel({ ...GOLD, face: 'mana' });
        expect(label).toContain('(gold) die');
        expect(label).toContain('a staged card of any colour');
    });

    it('MISS and CRACKED faces read dead and power nothing', () => {
        expect(combatDieA11yLabel({ ...HEART, face: 'miss' })).toBe('HEART die, MISS face: dead, powers nothing');
        const cracked = combatDieA11yLabel({ ...HEART, face: 'special', cracked: true });
        expect(cracked).toContain('CRACKED');
        expect(cracked).toContain('powers nothing');
        expect(cracked).not.toContain('drag onto');
    });

    it('a spent die says so and no longer invites a drag', () => {
        const label = combatDieA11yLabel({ ...HEART, face: 'mana', spent: true, draggable: false });
        expect(label).toContain('spent');
        expect(label).not.toContain('drag onto');
    });

    it('an assigned die (socketed on a staged card) says APPLY will power it', () => {
        const label = combatDieA11yLabel({ ...HEART, face: 'special' }, { assigned: true });
        expect(label).toContain('assigned to a staged card');
        expect(label).toContain('APPLY');
        expect(label).not.toContain('drag onto');
    });

    it('Reserve and ghost dice keep the drag verb with their provenance', () => {
        expect(combatDieA11yLabel({ ...HEART, face: 'mana', reserve: true })).toContain('banked in the Reserve');
        expect(combatDieA11yLabel({ ...HEART, face: 'mana', floating: true })).toContain('a ghost');
        expect(combatDieA11yLabel({ ...HEART, face: 'mana', reserve: true })).toContain('drag onto');
    });

    it('an X (blocked) die powers nothing', () => {
        const label = combatDieA11yLabel({ ...HEART, id: 'd-x', color: 'x', isX: true, stanceLabel: 'X' } as CombatDieVM);
        expect(label).toContain('blocked');
        expect(label).toContain('powers nothing');
    });
});

describe('CombatDie — the rendered label is the pure label', () => {
    it('speaks the BOON line, honouring the weapon special', () => {
        const die: CombatDieVM = { ...HEART, face: 'special' };
        render(<CombatDie die={die} specialText="Special: GUARD 6." />);
        expect(screen.getByTestId(`combat-die-${die.id}`).props.accessibilityLabel)
            .toBe(combatDieA11yLabel(die, { specialText: "Special: GUARD 6." }));
    });

    it('the socket copy on a staged card is not its own button', () => {
        // The staged card is the button and speaks for the die; a second
        // role="button" inside it renders a nested <button> on web.
        const die: CombatDieVM = { ...HEART, face: 'mana' };
        render(<CombatDie die={die} assigned nested testID="combat-staged-die-face" />);
        const face = screen.getByTestId('combat-staged-die-face');
        expect(face.props.accessible).toBe(false);
        expect(face.props.accessibilityRole).toBeUndefined();
        expect(face.props.accessibilityLabel).toBeUndefined();
    });
});
