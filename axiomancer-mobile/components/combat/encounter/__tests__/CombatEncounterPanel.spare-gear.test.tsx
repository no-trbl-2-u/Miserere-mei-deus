/**
 * CombatEncounterPanel — a piece of gear won by sparing.
 *
 * A foe with 1 VITAE falls to a real FREE strike, the dev switch forces the
 * check, and the table roll is pinned to a weapon or armor, then a relic. Pins:
 * the end screen shows the piece with nothing queued; closing it opens the
 * item-reward screen's queue; the piece is carried and saved once at every
 * step, wearing it or keeping it leaves one copy, and a result that is not gear
 * queues nothing.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Item, SpareReward } from '@mechanics';

import type { CombatBoardProps } from '@/components/combat/encounter/CombatBoard';
import { CombatEncounterPanel } from '@/components/combat/encounter/CombatEncounterPanel';
import { fightRecorder } from '@/lib/fightRecorder';
import { devSettingsStore } from '@/state/dev/dev-settings';
import { confirmItemRewardAction, equipItemRewardAction } from '@/state/item-reward/store-actions';
import { spareGearSource } from '@/state/presenters/relic-source.copy';
import { mockFixedRng } from '@/test-utils/rng';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

jest.mock('@/lib/buildProfile', () => ({
    isDevToolsEnabled: jest.fn(() => true),
    getBuildProfile: jest.fn(() => 'preview'),
    getBuildCommit: jest.fn(() => 'abc1234'),
}));

const CARDS = ['grey-strike', 'grey-strike', 'grey-strike', 'grey-strike', 'grey-strike'];
/** Table draws: the gear band is 85-95 of 100, the relic band 95-100, a potion 30-60. */
const GEAR_DRAW = 0.9;
const RELIC_DRAW = 0.97;
const POTION_DRAW = 0.45;

beforeEach(() => {
    jest.useFakeTimers();
    devSettingsStore.set({ forceMercyCheck: true, playLogging: false });
});

afterEach(() => {
    devSettingsStore.set({ forceMercyCheck: false, playLogging: true });
    void fightRecorder.end('retreat');
    jest.useRealTimers();
    jest.restoreAllMocks();
});

function board(): CombatBoardProps {
    return screen.UNSAFE_root.findAll(
        (n: { props: unknown }) => !!(n.props as Partial<CombatBoardProps>).drag && !!(n.props as Partial<CombatBoardProps>).stagedUids,
    )[0].props as CombatBoardProps;
}

type Spared = ReturnType<typeof spareAt>;

/** Fells a 1-VITAE normal foe, spares it at `draw`, and returns the store, the exit spy and the roll. */
function spareAt(draw: number) {
    const { store, enemy } = startRealFight(REAL_FIGHT_FIXTURE, {
        player: { knownCards: CARDS, baseStats: { heart: 8, body: 8, mind: 8 }, health: 160, maxHealth: 160 },
    });
    const foe = { ...enemy, health: 1, difficulty: 'normal' as const };
    const onExit = jest.fn();
    const { tree } = withAllProviders(
        <CombatEncounterPanel
            enemy={foe} bootstrapPlayer={store.getState().player} deck={CARDS} seed={7}
            persistOutcome onExit={onExit}
        />,
        { store },
    );
    render(tree);
    act(() => { fireEvent.press(screen.getByTestId('combat-enter')); });
    act(() => { jest.advanceTimersByTime(5000); });
    const card = board().vm.hand[0];
    act(() => { board().onStage(card.uid); });
    act(() => { board().onApply(card.uid, null, false); });
    act(() => { jest.advanceTimersByTime(2000); });
    mockFixedRng(draw);
    act(() => { fireEvent.press(screen.getByTestId('combat-mercy-spare')); });
    const reward = store.getState().combatReward?.spare?.reward as SpareReward;
    return { store, foe, onExit, reward };
}

function carriedCount(inventory: readonly Item[], id: string): number {
    return inventory.filter(item => item.id === id).length;
}

function playerOf(run: Spared) {
    return (run.store.getState() as unknown as {
        player: { inventory: Item[]; equipment: { weapon: Item | null; armor: Item | null; relics: (Item | null)[] } };
    }).player;
}

function closeSummary(): void {
    act(() => { fireEvent.press(screen.getByTestId('combat-summary-close')); });
}

describe.each([['gear', GEAR_DRAW], ['relic', RELIC_DRAW]] as Array<['gear' | 'relic', number]>)('a %s result', (kind, draw) => {
    it('shows on the end screen with nothing queued, and the piece is already carried', () => {
        const run = spareAt(draw);
        expect(run.reward.kind).toBe(kind);
        const item = (run.reward as { item: Item }).item;
        expect(screen.getByTestId('combat-summary')).toBeTruthy();
        expect(run.store.getState().itemReward.queue).toHaveLength(0);
        expect(carriedCount(playerOf(run).inventory, item.id)).toBe(1);
    });

    it('opens the item-reward queue once the end screen is closed, naming the foe', () => {
        const run = spareAt(draw);
        const item = (run.reward as { item: Item }).item;
        closeSummary();
        expect(run.onExit).toHaveBeenCalledTimes(1);
        const queue = run.store.getState().itemReward.queue;
        expect(queue.map(entry => entry.item.id)).toEqual([item.id]);
        expect(queue[0]!.source).toBe(spareGearSource(run.foe.name));
        expect(carriedCount(playerOf(run).inventory, item.id)).toBe(1);
    });

    it('keeps one copy when kept', () => {
        const run = spareAt(draw);
        const item = (run.reward as { item: Item }).item;
        closeSummary();
        act(() => { confirmItemRewardAction(run.store); });
        expect(run.store.getState().itemReward.queue).toHaveLength(0);
        expect(carriedCount(playerOf(run).inventory, item.id)).toBe(1);
    });

    it('keeps one worn copy when worn', () => {
        const run = spareAt(draw);
        const item = (run.reward as { item: Item }).item;
        closeSummary();
        act(() => { equipItemRewardAction(run.store); });
        const player = playerOf(run);
        expect(carriedCount(player.inventory, item.id)).toBe(1);
        const wearing = [player.equipment.weapon, player.equipment.armor, ...player.equipment.relics];
        expect(wearing.some(piece => piece?.id === item.id)).toBe(true);
    });
});

describe('a result that is not gear', () => {
    it('queues nothing when the end screen closes', () => {
        const run = spareAt(POTION_DRAW);
        expect(run.reward.kind).toBe('consumable');
        closeSummary();
        expect(run.onExit).toHaveBeenCalledTimes(1);
        expect(run.store.getState().itemReward.queue).toHaveLength(0);
    });
});
