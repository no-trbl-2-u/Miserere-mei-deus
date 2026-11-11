/**
 * Hermetic E2E — a won fight reaches the card offer and closes (phase FE1a).
 *
 * A real fight (the Breakwater's bw-w2, staged as the app stages it) is
 * mounted on the board, and its foe, set to 1 VITAE, falls to a real strike
 * dealt through the board's own handlers: the engine resolves the blow and
 * ends the fight. The offer opens, a card is taken, and the fight is left
 * through the screen that follows. Once for a normal foe, once for an elite
 * (whose relic roll is pinned to miss, so its offer opens with UPGRADE
 * INSTEAD). Along the way the settle's record (what the fight paid) is read
 * back against the store: shillings, XP gained, levels.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { experienceForLevel, fightWage, type EnemyDifficulty } from '@mechanics';

import type { CombatBoardProps } from '@/components/combat/encounter/CombatBoard';
import { CombatEncounterPanel } from '@/components/combat/encounter/CombatEncounterPanel';
import { fightRecorder } from '@/lib/fightRecorder';
import { devSettingsStore } from '@/state/dev/dev-settings';
import { fightPaidFrom, selectFightEndVM } from '@/state/presenters/fight-end.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

const CARDS = ['grey-strike', 'grey-strike', 'grey-strike', 'grey-strike', 'grey-strike'];

beforeEach(() => {
    jest.useFakeTimers();
    devSettingsStore.set({ forceMercyCheck: false, playLogging: false });
});

afterEach(() => {
    devSettingsStore.set({ forceMercyCheck: false, playLogging: true });
    void fightRecorder.end('retreat');
    jest.useRealTimers();
    jest.restoreAllMocks();
});

/** The board's props, read fresh after each commit. */
function board(): CombatBoardProps {
    return screen.UNSAFE_root.findAll(
        (n: { props: unknown }) => !!(n.props as Partial<CombatBoardProps>).drag && !!(n.props as Partial<CombatBoardProps>).stagedUids,
    )[0].props as CombatBoardProps;
}

/** Mount a live fight against a 1-VITAE foe of `difficulty`, play a strike on the board and let it land. */
function winTheFight(difficulty: EnemyDifficulty, eliteDraw = 0.99) {
    const { store, enemy } = startRealFight(REAL_FIGHT_FIXTURE, {
        player: { knownCards: CARDS, baseStats: { heart: 8, body: 8, mind: 8 }, health: 160, maxHealth: 160 },
    });
    const foe = { ...enemy, health: 1, difficulty };
    const before = store.getState().player;
    const onExit = jest.fn();
    const { tree } = withAllProviders(
        <CombatEncounterPanel
            enemy={foe} bootstrapPlayer={before} deck={CARDS} seed={7}
            persistOutcome onExit={onExit}
        />,
        { store },
    );
    render(tree);
    act(() => { fireEvent.press(screen.getByTestId('combat-enter')); });
    act(() => { jest.advanceTimersByTime(5000); });
    // An elite's relic roll (and its lane piece) reads Math.random: pin it to miss,
    // so the card offer opens. The fight itself runs on the engine's seeded rng.
    if (difficulty === 'elite') jest.spyOn(Math, 'random').mockReturnValue(eliteDraw);
    const card = board().vm.hand[0];
    act(() => { board().onStage(card.uid); });
    act(() => { board().onApply(card.uid, null, false); });
    act(() => { jest.advanceTimersByTime(2000); });
    // A normal foe may ask the mercy check (an engine roll): finish it, a kill.
    if (screen.queryByTestId('combat-mercy')) {
        act(() => { fireEvent.press(screen.getByTestId('combat-mercy-finish')); });
    }
    return { store, enemy: foe, before, onExit };
}

describe.each(['normal', 'elite'] as const)('a won fight, the foe %s', (difficulty) => {
    it('falls, opens the offer, takes a card and leaves the fight', () => {
        const { store, enemy, before, onExit } = winTheFight(difficulty);

        // The foe fell to the strike: the engine ended the fight as a win, on
        // the victory screen with the offer under it (FE1b).
        expect(board().vm).toBeDefined();
        expect(screen.getByTestId('combat-victory')).toBeTruthy();
        expect(screen.getByTestId('combat-rewards')).toBeTruthy();
        expect(screen.queryByTestId('combat-summary')).toBeNull();
        if (difficulty === 'elite') expect(screen.getByTestId('combat-reward-upgrade-open')).toBeTruthy();
        else expect(screen.queryByTestId('combat-reward-upgrade-open')).toBeNull();

        // The settle has paid: shillings and XP are on the player.
        const paidPlayer = store.getState().player;
        expect(paidPlayer.currency).toBe(before.currency + fightWage(enemy.level));
        expect(paidPlayer.experience).toBeGreaterThan(before.experience);

        // Take the first card on offer.
        const offers = store.getState().combatReward?.offers ?? [];
        expect(offers.length).toBeGreaterThan(0);
        const taken = offers[0]!;
        act(() => { fireEvent.press(screen.getByTestId(`combat-reward-${taken}`)); });
        act(() => { fireEvent.press(screen.getByTestId('combat-reward-confirm')); });
        expect(store.getState().player.combatRewardCards ?? []).toContain(taken);

        // Taking the card closes the fight (T's call #3): no summary after a win.
        expect(onExit).toHaveBeenCalledTimes(1);
        expect(onExit).toHaveBeenCalledWith('victory');
        expect(screen.queryByTestId('combat-rewards')).toBeNull();
        expect(screen.queryByTestId('combat-victory')).toBeNull();
        expect(screen.queryByTestId('combat-summary')).toBeNull();
        expect(store.getState().currentEncounter).toBeUndefined();
    });

    it('refusing the card closes the fight too', () => {
        const { store, before, onExit } = winTheFight(difficulty);
        act(() => { fireEvent.press(screen.getByTestId('combat-reward-skip')); });
        expect(onExit).toHaveBeenCalledTimes(1);
        expect(onExit).toHaveBeenCalledWith('victory');
        expect(store.getState().player.combatRewardCards ?? []).toEqual(before.combatRewardCards ?? []);
        expect(screen.queryByTestId('combat-summary')).toBeNull();
        expect(screen.queryByTestId('combat-victory')).toBeNull();
    });

    it('the victory screen shows the band, the headline, the paid line and the level panel', () => {
        const { store, enemy, before } = winTheFight(difficulty);
        const after = store.getState().player;
        const vm = selectFightEndVM(fightPaidFrom(before, after, fightWage(enemy.level)));
        expect(screen.getByTestId('combat-victory-foe')).toBeTruthy();
        expect(screen.getByTestId('combat-victory-purse').props.children).toBe(`Shillings ${after.currency}`);
        expect(screen.getByTestId('combat-victory-headline').props.children).toBe('Victory — the enemy falls');
        expect(screen.getByTestId('combat-victory-paid').props.children).toBe(vm.paidLine);
        // The panel plays to its settled end.
        act(() => { jest.advanceTimersByTime(30_000); });
        expect(screen.getByTestId('victory-level-line').props.children).toBe(vm.levelLine);
    });

    it('the settle record reads as the victory screen shows it', () => {
        const { store, enemy, before } = winTheFight(difficulty);
        const after = store.getState().player;
        const vm = selectFightEndVM(fightPaidFrom(before, after, fightWage(enemy.level)));

        expect(vm.xpGained).toBe(after.experience - before.experience);
        expect(vm.paidLine).toBe(`Shillings +${fightWage(enemy.level)} · XP +${vm.xpGained}`);
        if (after.level > before.level) {
            expect(vm.levelLine).toBe(`LEVEL ${after.level}`);
        } else {
            expect(vm.levelLine).toBe(`${experienceForLevel(after.level + 1) - after.experience} XP to level ${after.level + 1}`);
        }
    });
});

describe('a won elite whose relic drops (FE1b)', () => {
    it('shows the victory screen with CONTINUE in the offer\'s place, which leaves the fight and keeps the relic queued', () => {
        // The relic roll reads Math.random: pin it to hit.
        const { store, onExit } = winTheFight('elite', 0);
        expect(store.getState().combatReward?.relicDrop).toBeTruthy();
        expect(screen.getByTestId('combat-victory')).toBeTruthy();
        expect(screen.queryByTestId('combat-rewards')).toBeNull();
        expect(screen.queryByTestId('combat-summary')).toBeNull();
        // The relic took the XP's place: the paid line has no XP half.
        expect(String(screen.getByTestId('combat-victory-paid').props.children)).not.toMatch(/XP/);

        act(() => { fireEvent.press(screen.getByTestId('combat-victory-continue')); });
        expect(onExit).toHaveBeenCalledTimes(1);
        expect(onExit).toHaveBeenCalledWith('victory');
        expect(screen.queryByTestId('combat-summary')).toBeNull();
        expect(store.getState().itemReward.queue.length).toBeGreaterThan(0);
    });
});
