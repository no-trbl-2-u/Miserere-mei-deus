/**
 * Hermetic E2E — a won fight reaches the card offer and closes (phase FE1a,
 * spec 176 A1).
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
function winTheFight(difficulty: EnemyDifficulty) {
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
    if (difficulty === 'elite') jest.spyOn(Math, 'random').mockReturnValue(0.99);
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

        // The foe fell to the strike: the engine ended the fight as a win.
        expect(board().vm).toBeDefined();
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
        expect(screen.queryByTestId('combat-rewards')).toBeNull();
        expect(store.getState().combatReward?.claimed).toBe(true);
        expect(store.getState().player.combatRewardCards ?? []).toContain(taken);

        // And out of the fight.
        act(() => { fireEvent.press(screen.getByTestId('combat-summary-close')); });
        expect(onExit).toHaveBeenCalledWith('victory');
        expect(store.getState().currentEncounter).toBeUndefined();
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
