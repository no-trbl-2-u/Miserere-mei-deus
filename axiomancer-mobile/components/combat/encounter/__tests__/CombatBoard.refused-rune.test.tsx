/**
 * CombatBoard — the refused rune says why (EQ1 A6).
 *
 * A rune that cannot fire shows its reason on the column, not only in its
 * a11y label. Short of Conviction it reads "◆n" as before; refused by
 * `signatureCastBlock` for any other reason (Float-Eye will not be befriended,
 * not yet low enough to spare, already counts twice) it carries a distinct
 * refused mark, and a tap opens the info popup, whose lines
 * (`signatureInfoLines`) put the reason first.
 *
 * The fight is the real one: the default fixture is bw-2's Float-Eye, a foe
 * with no friendship reward, so The Open Hand is refused there however much
 * Conviction the player holds.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { rollEncounterDice, SIGNATURE_COST, type CombatEncounterState } from '@mechanics';
import { CombatBoard, type DragController } from '@/components/combat/encounter/CombatBoard';
import {
    buildCombatViewModel, signatureInfoLines, type CombatSignatureVM,
} from '@/state/presenters/combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

const CARDS = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike'];
const noopDrag = (): DragController =>
    ({ begin: () => undefined, end: () => undefined, active: null, x: { value: 0 }, y: { value: 0 } } as unknown as DragController);
const WORN: CombatEncounterState['signatures'] = ['sig-disarming-plea', 'sig-crimson-covenant'];

function fight(conviction: number) {
    const real = startRealFight(REAL_FIGHT_FIXTURE, { player: { knownCards: CARDS }, seed: 16 });
    const combat = { ...rollEncounterDice(real.combat).state, signatures: WORN, conviction };
    return { ...real, combat };
}

const sig = (combat: CombatEncounterState, id: string): CombatSignatureVM =>
    buildCombatViewModel(combat).signatures.find(s => s.id === id)!;

describe('A6 — the signature VM splits short-of-Conviction from refused', () => {
    it('with Conviction to spare, Crimson Covenant is castable and The Open Hand is refused', () => {
        const { combat } = fight(9);
        expect(combat.enemy.name).toMatch(/float-eye/i);
        expect(sig(combat, 'sig-crimson-covenant')).toMatchObject({ affordable: true, refused: false, reason: null });
        expect(sig(combat, 'sig-disarming-plea')).toMatchObject({
            affordable: false, refused: true, reason: `${combat.enemy.name} will not be befriended`,
        });
    });

    it('short of Conviction, Covenant reads short while The Open Hand still reads refused', () => {
        const { combat } = fight(0);
        expect(sig(combat, 'sig-crimson-covenant')).toMatchObject({ affordable: false, refused: false });
        expect(sig(combat, 'sig-crimson-covenant').reason).toMatch(/Conviction/);
        // More Conviction would not lift the refusal, so the refusal is the reason.
        expect(sig(combat, 'sig-disarming-plea')).toMatchObject({
            affordable: false, refused: true, reason: `${combat.enemy.name} will not be befriended`,
        });
    });

    it('a Covenant whose next SACRIFICE already counts twice is refused, not short', () => {
        const { combat } = fight(9);
        const twice = { ...combat, program: { ...(combat.program ?? {}), nextTwice: true } } as CombatEncounterState;
        expect(sig(twice, 'sig-crimson-covenant')).toMatchObject({
            affordable: false, refused: true, reason: 'Your next SACRIFICE already counts twice',
        });
    });
});

describe('A6 — the column shows the three states', () => {
    function renderBoard(conviction: number) {
        const { store, combat } = fight(conviction);
        const onSignature = jest.fn();
        const onSignatureInfo = jest.fn();
        const { tree } = withAllProviders(
            <CombatBoard
                vm={buildCombatViewModel(combat)} drag={noopDrag()} stagedUids={[]}
                onApply={jest.fn()} onStage={jest.fn()} onUnstage={jest.fn()} onDiscard={jest.fn()}
                onSignature={onSignature} onEndPhase={jest.fn()} onInspect={jest.fn()}
                onSignatureInfo={onSignatureInfo}
            />,
            { store },
        );
        render(tree);
        return { combat, onSignature, onSignatureInfo };
    }
    const label = (id: string) => screen.getByTestId(`combat-signature-${id}`).props.accessibilityLabel as string;
    const ring = (id: string) => StyleSheet.flatten(screen.getByTestId(`combat-signature-${id}`).props.style) as Record<string, unknown>;

    it('castable: a solid ring, no refused mark, and a tap casts', () => {
        const { onSignature } = renderBoard(9);
        expect(screen.queryByTestId('combat-signature-refused-sig-crimson-covenant')).toBeNull();
        expect(ring('sig-crimson-covenant').borderStyle).toBe('solid');
        fireEvent.press(screen.getByTestId('combat-signature-sig-crimson-covenant'));
        expect(onSignature).toHaveBeenCalledWith('sig-crimson-covenant');
    });

    it('short of Conviction: "◆n" on a solid ring, no refused mark', () => {
        renderBoard(0);
        expect(screen.queryByTestId('combat-signature-refused-sig-crimson-covenant')).toBeNull();
        expect(ring('sig-crimson-covenant').borderStyle).toBe('solid');
        expect(screen.getAllByText(`◆${SIGNATURE_COST}`).length).toBe(2);
        expect(label('sig-crimson-covenant')).toMatch(/Conviction/);
        expect(label('sig-crimson-covenant')).not.toMatch(/refused/);
    });

    it('refused: a dashed ring and the refused mark, even short of Conviction, and a tap opens the info', () => {
        const { combat, onSignature, onSignatureInfo } = renderBoard(0);
        expect(screen.getByTestId('combat-signature-refused-sig-disarming-plea')).toBeTruthy();
        expect(ring('sig-disarming-plea').borderStyle).toBe('dashed');
        expect(label('sig-disarming-plea')).toMatch(/refused: .*will not be befriended/);
        fireEvent.press(screen.getByTestId('combat-signature-sig-disarming-plea'));
        expect(onSignature).not.toHaveBeenCalled();
        expect(onSignatureInfo).toHaveBeenCalledWith(expect.objectContaining({
            id: 'sig-disarming-plea', refused: true, reason: `${combat.enemy.name} will not be befriended`,
        }));
    });
});

describe('A6 — the info popup leads with the refusal', () => {
    it('a refused rune: the reason first, the cost line plain', () => {
        const { combat } = fight(9);
        expect(signatureInfoLines(sig(combat, 'sig-disarming-plea'))).toEqual({
            lead: `${combat.enemy.name} will not be befriended`,
            meta: `consumes ◆ ${SIGNATURE_COST} conviction`,
        });
    });

    it('a short rune: no lead, the shortfall on the cost line', () => {
        const { combat } = fight(0);
        const lines = signatureInfoLines(sig(combat, 'sig-crimson-covenant'));
        expect(lines.lead).toBeNull();
        expect(lines.meta).toMatch(new RegExp(`^consumes ◆ ${SIGNATURE_COST} conviction — .*Conviction`));
    });

    it('a castable rune: no lead, no reason', () => {
        const { combat } = fight(9);
        expect(signatureInfoLines(sig(combat, 'sig-crimson-covenant'))).toEqual({
            lead: null, meta: `consumes ◆ ${SIGNATURE_COST} conviction`,
        });
    });
});
