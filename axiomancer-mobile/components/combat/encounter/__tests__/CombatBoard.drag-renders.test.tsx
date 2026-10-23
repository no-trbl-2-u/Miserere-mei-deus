/**
 * CombatBoard — a drag pickup re-renders only what it changes.
 *
 * Picking a card up flips the panel's `drag.active`, which re-renders the
 * board. Every GestureDetector that re-renders pushes its handlers' configs
 * back to the native gesture module, and the drag ghost only shows once that
 * pickup commit lands — so a whole-fan, whole-tray re-render on every pickup
 * and drop was drag lag. This pins the memo boundaries: lifting a card
 * re-renders NO fanned card's detector — the lifted card's dim is a UI-thread
 * shared value the pan worklet writes, not a prop.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { rollEncounterDice } from '@mechanics';
import { CombatBoard, FAN_CARD_LAYOUT, fanCardLayoutFor, type DragController } from '@/components/combat/encounter/CombatBoard';
import { buildCombatViewModel } from '@/state/presenters/combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

// Records which fan card each GestureDetector render belongs to, passing
// everything through to the real detector. Tray dice re-render on their own
// tumble state, so only fan detectors are counted.
const detectorRenders: string[] = [];
jest.mock('react-native-gesture-handler', () => {
    const actual = jest.requireActual<typeof import('react-native-gesture-handler')>('react-native-gesture-handler');
    const R = jest.requireActual<typeof import('react')>('react');
    function CountingDetector(props: React.ComponentProps<typeof actual.GestureDetector>) {
        const testID = (props.children as React.ReactElement<{ testID?: string }> | undefined)?.props?.testID;
        if (testID?.startsWith('combat-hand-')) detectorRenders.push(testID);
        return R.createElement(actual.GestureDetector, props);
    }
    return { ...actual, GestureDetector: CountingDetector };
});

const CARDS = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike'];

const dragWith = (active: DragController['active']): DragController =>
    ({ begin: () => undefined, end: () => undefined, active } as unknown as DragController);

const callbacks = {
    onApply: jest.fn(), onStage: jest.fn(), onUnstage: jest.fn(), onDiscard: jest.fn(),
    onSignature: jest.fn(), onEndPhase: jest.fn(), onInspect: jest.fn(),
};

describe('CombatBoard — drag pickup re-render scope', () => {
    it('lifting a hand card re-renders no fanned card\'s gesture detector', () => {
        const { store, combat } = startRealFight(REAL_FIGHT_FIXTURE, { player: { knownCards: CARDS, baseStats: { heart: 8, body: 8, mind: 8 }, health: 200, maxHealth: 200 }, seed: 16 });
        let s = combat;
        s = rollEncounterDice(s).state;
        const vm = buildCombatViewModel(s);
        expect(vm.hand.length).toBeGreaterThanOrEqual(3);
        expect(vm.dice.length).toBeGreaterThan(0);

        const board = (drag: DragController) => withAllProviders(
            <CombatBoard vm={vm} drag={drag} stagedUids={[]} {...callbacks} />,
            { store },
        ).tree;
        const view = render(board(dragWith(null)));
        // Every fan card mounted a detector.
        expect(detectorRenders).toHaveLength(vm.hand.length);

        detectorRenders.length = 0;
        const card = vm.hand[0];
        view.rerender(board(dragWith({ type: 'card', from: 'hand', uid: card.uid, card })));
        expect(detectorRenders).toEqual([]);

        // The drop re-renders none either.
        detectorRenders.length = 0;
        view.rerender(board(dragWith(null)));
        expect(detectorRenders).toEqual([]);
    });

    // Reanimated re-configures a layout animation whenever the `layout` prop
    // changes IDENTITY (`_configureLayoutAnimation`): an inline
    // `LinearTransition.duration(160)` re-built and re-serialised the worklet
    // on every fanned-card re-render — on pickup, and once per card on every
    // stage commit. The builder is hoisted; this pins that every fanned card
    // carries the one shared instance, before and after the fan re-lays out.
    it('every fanned card keeps the one hoisted layout builder across a pickup and a re-layout', () => {
        const { store, combat } = startRealFight(REAL_FIGHT_FIXTURE, { player: { knownCards: CARDS, baseStats: { heart: 8, body: 8, mind: 8 }, health: 200, maxHealth: 200 }, seed: 16 });
        let s = combat;
        s = rollEncounterDice(s).state;
        const vm = buildCombatViewModel(s);
        const board = (drag: DragController, staged: string[]) => withAllProviders(
            <CombatBoard vm={vm} drag={drag} stagedUids={staged} {...callbacks} />,
            { store },
        ).tree;
        const layoutsOf = (view: ReturnType<typeof render>, uids: string[]) =>
            uids.map((uid) => view.getByTestId(`combat-hand-${uid}`).props.layout);

        const view = render(board(dragWith(null), []));
        const uids = vm.hand.map((c) => c.uid);
        expect(layoutsOf(view, uids).every((l) => l === FAN_CARD_LAYOUT)).toBe(true);

        const card = vm.hand[0];
        view.rerender(board(dragWith({ type: 'card', from: 'hand', uid: card.uid, card }), []));
        expect(layoutsOf(view, uids).every((l) => l === FAN_CARD_LAYOUT)).toBe(true);

        // Staging the first card re-lays out (and re-renders) every other one.
        view.rerender(board(dragWith(null), [card.uid]));
        expect(layoutsOf(view, uids.slice(1)).every((l) => l === FAN_CARD_LAYOUT)).toBe(true);
    });

    // Web's layout transition forces a synchronous layout per fanned card on
    // every stage/unstage commit (measured: the 200-370ms post-release frame),
    // so web runs the fan without it; native keeps the shared builder.
    it('the fan slides together on native and snaps on web', () => {
        expect(fanCardLayoutFor('android')).toBe(FAN_CARD_LAYOUT);
        expect(fanCardLayoutFor('ios')).toBe(FAN_CARD_LAYOUT);
        expect(fanCardLayoutFor('web')).toBeUndefined();
    });
});
