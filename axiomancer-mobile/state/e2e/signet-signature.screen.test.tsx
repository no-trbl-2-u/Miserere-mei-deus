/**
 * The Signet defect, pinned through the real dev button (phase SG1 A4).
 *
 * T's report: the Bleeding Signet's Crimson Covenant never showed in combat.
 * The dev menu's only relic path is the ADD ITEM chip, which only pushed the
 * relic into the satchel, unworn, and a fight reads its signatures from the
 * worn loadout, so the board drew no rune. Now the chip wears the relic while
 * a position is free. This test presses the real chip on the real bw-2
 * fight's store (stripped of relics), mounts the panel the way the route
 * does, and finds the rune; with Conviction at the cost a press casts it.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import {
    initializeCombatEncounter, playSignatureSkill, rollEncounterDice, SIGNATURE_COST,
    type Item,
} from '@mechanics';

import { DebugItemPicker } from '@/components/DebugItemPicker';
import { CombatBoard, type DragController } from '@/components/combat/encounter/CombatBoard';
import { CombatEncounterPanel } from '@/components/combat/encounter/CombatEncounterPanel';
import { buildCombatViewModel } from '@/state/presenters/combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, arriveAtRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

const SIGNET = 'relic-bleeding-signet';
const COVENANT = 'sig-crimson-covenant';
const CARDS = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike'];

const noopDrag = (): DragController =>
    ({ begin: () => undefined, end: () => undefined, active: null, x: { value: 0 }, y: { value: 0 } } as unknown as DragController);

/** The bw-2 arrival, every relic stripped, the Signet chip pressed for real. */
function pressSignetChip() {
    const arrival = arriveAtRealFight(REAL_FIGHT_FIXTURE, { player: { knownCards: CARDS } });
    const { store } = arrival;
    const player = store.getState().player;
    store.setState({
        player: {
            ...player,
            inventory: player.inventory.filter((i: Item) => !i.id.startsWith('relic-')),
            equipment: { weapon: null, armor: null, relics: [] },
        },
    });
    const { tree } = withAllProviders(<DebugItemPicker />, { store });
    const picker = render(tree);
    fireEvent.press(picker.getByTestId(`debug-item-${SIGNET}`));
    picker.unmount();
    return arrival;
}

describe('the Bleeding Signet from the dev chip reaches the board (SG1 A4)', () => {
    it('the chip wears the Signet, and the panel draws Crimson Covenant', () => {
        const { store, actions } = pressSignetChip();
        expect(store.getState().player.equipment.relics.map((a) => a.id)).toEqual([SIGNET]);

        const enemy = actions.beginHazardEncounter()!;
        const bootstrapPlayer = store.getState().player;
        const { tree } = withAllProviders(
            <CombatEncounterPanel enemy={enemy} bootstrapPlayer={bootstrapPlayer} deck={CARDS} seed={7} onExit={jest.fn()} />,
            { store },
        );
        render(tree);
        act(() => { fireEvent.press(screen.getByTestId('combat-enter')); });
        expect(screen.getByTestId(`combat-signature-${COVENANT}`)).toBeTruthy();
    });

    it('with Conviction at the cost, a press casts it and spends the cost', () => {
        const { store, actions } = pressSignetChip();
        const enemy = actions.beginHazardEncounter()!;
        const flags = (store.getState() as unknown as { flags?: string[] }).flags;
        const opening = initializeCombatEncounter(store.getState().player, enemy, CARDS, 7, flags);
        expect(opening.signatures).toEqual([COVENANT]);
        const combat = { ...rollEncounterDice(opening).state, conviction: SIGNATURE_COST };

        const cast = jest.fn((id: string) => playSignatureSkill(combat, id));
        const { tree } = withAllProviders(
            <CombatBoard
                vm={buildCombatViewModel(combat)} drag={noopDrag()} stagedUids={[]}
                onApply={jest.fn()} onStage={jest.fn()} onUnstage={jest.fn()} onDiscard={jest.fn()}
                onSignature={cast} onEndPhase={jest.fn()} onInspect={jest.fn()}
            />,
            { store },
        );
        render(tree);
        fireEvent.press(screen.getByTestId(`combat-signature-${COVENANT}`));

        expect(cast).toHaveBeenCalledWith(COVENANT);
        const result = cast.mock.results[0]!.value as ReturnType<typeof playSignatureSkill>;
        expect(result.events.some((e) => e.kind === 'signature-cast')).toBe(true);
        expect(result.state.conviction).toBe(combat.conviction - SIGNATURE_COST);
    });
});
