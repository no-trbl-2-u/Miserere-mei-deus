/**
 * The `region` prop threads from `CombatBoard` down to
 * `CombatCombatantPane`'s arena backdrop. Fixture pattern as in
 * `CombatBoard.S1-board.test.tsx`: a real engine-initialized `CombatViewModel`
 * mounted through `withAllProviders`.
 *
 * Combat shows a plain black scene while `ARENA_PLATES_SHOWN` is off: the
 * first block pins that every region gets the same black backdrop; the
 * region-threading block runs instead when the switch is on. The plates themselves stay pinned at the unit level in
 * `assets/images/combat/__tests__/index.test.ts`.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { rollEncounterDice } from '@mechanics';
import { ARENA_PLATES_SHOWN, BLACK_ARENA_ALT } from '@/assets/images/combat';
import { CombatBoard, type DragController } from '@/components/combat/encounter/CombatBoard';
import { buildCombatViewModel, type CombatViewModel } from '@/state/presenters/combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

const CARDS = ['spoiled-poultice', 'unction-of-boils', 'frostbitten-palisade', 'thin-hymn'];
const INSETS = { top: 47, bottom: 34, left: 0, right: 0 };

const noopDrag = (): DragController =>
    ({ begin: () => undefined, end: () => undefined, active: null, x: { value: 0 }, y: { value: 0 } } as unknown as DragController);

const boardCallbacks = () => ({
    onApply: jest.fn(), onStage: jest.fn(), onUnstage: jest.fn(), onDiscard: jest.fn(),
    onSignature: jest.fn(), onEndPhase: jest.fn(), onInspect: jest.fn(),
});

function freshVM(): { store: ReturnType<typeof withAllProviders>['store']; vm: CombatViewModel } {
    const { store, combat } = startRealFight(REAL_FIGHT_FIXTURE, { player: { knownCards: CARDS, baseStats: { heart: 8, body: 8, mind: 8 }, health: 129, maxHealth: 200 }, seed: 16 });
    let s = combat;
    s = rollEncounterDice(s).state;
    return { store, vm: buildCombatViewModel(s) };
}

function renderBoard(region: string | undefined) {
    const { store, vm } = freshVM();
    const { tree } = withAllProviders(
        <SafeAreaInsetsContext.Provider value={INSETS}>
            <CombatBoard vm={vm} drag={noopDrag()} stagedUids={[]} region={region} {...boardCallbacks()} />
        </SafeAreaInsetsContext.Provider>,
        { store },
    );
    return render(tree);
}

(ARENA_PLATES_SHOWN ? describe.skip : describe)('CombatBoard: plain black arena while plates are off (D32)', () => {
    it('draws the same black scene, and no plate, for a plated region, an unplated one and none', () => {
        for (const region of ['the Drowned Parish', 'The Breakwater', undefined]) {
            const backdrop = renderBoard(region).getByTestId('combat-arena-backdrop');
            expect(backdrop.props.source).toBeUndefined();
            expect(backdrop.props.accessibilityLabel).toBe(BLACK_ARENA_ALT);
        }
    });
});

(ARENA_PLATES_SHOWN ? describe : describe.skip)('CombatBoard: region-keyed arena backdrop (phase 83)', () => {
    it('the Drowned Parish resolves to the coastal-village plate, not the fallback', () => {
        const withRegion = renderBoard('the Drowned Parish');
        const withoutRegion = renderBoard(undefined);
        const backdropWith = withRegion.getByTestId('combat-arena-backdrop');
        const backdropWithout = withoutRegion.getByTestId('combat-arena-backdrop');
        expect(backdropWith.props.source).not.toEqual(backdropWithout.props.source);
        expect(backdropWith.props.accessibilityLabel).not.toEqual(backdropWithout.props.accessibilityLabel);
    });

    /**
     * Feeds an invented region, so the case does not depend on which live
     * regions have a plate. Which live regions fall back is a unit-level
     * property, asserted over the map registry in
     * `assets/images/combat/__tests__/index.test.ts`; this file pins only that
     * the `region` prop threads down to the pane.
     */
    it('an unmapped region keeps the exact fallback plate and label the dev sandbox gets', () => {
        const withUnmapped = renderBoard('The Kingdom of Nowhere');
        const withNone = renderBoard(undefined);
        const backdropUnmapped = withUnmapped.getByTestId('combat-arena-backdrop');
        const backdropNone = withNone.getByTestId('combat-arena-backdrop');
        expect(backdropUnmapped.props.source).toEqual(backdropNone.props.source);
        expect(backdropUnmapped.props.accessibilityLabel).toEqual(backdropNone.props.accessibilityLabel);
    });
});
