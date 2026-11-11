/**
 * CombatEncounterPanel — the mercy check on the screen.
 *
 * A foe with 1 VITAE falls to a real FREE strike through the board's own
 * handlers, with the dev switch forcing the check. Pins: the prompt shows only
 * its two lines and two buttons and pays nothing until it is answered; Spare goes
 * to the end screen with no card reward and reveals the roll there; Finish pays
 * as any win; an elite never asks, forced or not, and neither does a fight that
 * writes nothing back.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fightWage, spareWage, type EnemyDifficulty } from '@mechanics';
import { QuayCrab } from '@mechanics/Enemy/enemy.library';

import type { CombatBoardProps } from '@/components/combat/encounter/CombatBoard';
import { CombatEncounterPanel } from '@/components/combat/encounter/CombatEncounterPanel';
import { fightRecorder } from '@/lib/fightRecorder';
import { runLogPoster } from '@/lib/runLog';
import { mockFixedRng } from '@/test-utils/rng';
import { devSettingsStore } from '@/state/dev/dev-settings';
import { MERCY_CHECK_PROMPT, spareRewardLabel } from '@/state/presenters/mercy-check.copy';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

jest.mock('@/lib/buildProfile', () => ({
    isDevToolsEnabled: jest.fn(() => true),
    getBuildProfile: jest.fn(() => 'preview'),
    getBuildCommit: jest.fn(() => 'abc1234'),
}));

const CARDS = ['grey-strike', 'grey-strike', 'grey-strike', 'grey-strike', 'grey-strike'];

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

/** The board's props, read fresh after each commit. */
function board(): CombatBoardProps {
    return screen.UNSAFE_root.findAll(
        (n: { props: unknown }) => !!(n.props as Partial<CombatBoardProps>).drag && !!(n.props as Partial<CombatBoardProps>).stagedUids,
    )[0].props as CombatBoardProps;
}

/** Mount a fight against a 1-VITAE foe of `difficulty` and strike it down. */
function fellTheFoe(difficulty: EnemyDifficulty, persistOutcome = true) {
    const { store, enemy } = startRealFight(REAL_FIGHT_FIXTURE, {
        player: { knownCards: CARDS, baseStats: { heart: 8, body: 8, mind: 8 }, health: 160, maxHealth: 160 },
    });
    const foe = { ...enemy, health: 1, difficulty };
    const before = store.getState().player;
    const { tree } = withAllProviders(
        <CombatEncounterPanel
            enemy={foe} bootstrapPlayer={before} deck={CARDS} seed={7}
            persistOutcome={persistOutcome} onExit={() => undefined}
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
    return { store, enemy: foe, before };
}

/** Every string rendered under a node. */
function textsUnder(testID: string): string[] {
    const find = (node: unknown): unknown => {
        if (Array.isArray(node)) {
            for (const n of node) { const hit = find(n); if (hit) return hit; }
            return null;
        }
        const n = node as { props?: { testID?: string }; children?: unknown } | null;
        if (!n || typeof n !== 'object') return null;
        return n.props?.testID === testID ? n : find(n.children ?? null);
    };
    const texts: string[] = [];
    const walk = (node: unknown): void => {
        if (typeof node === 'string') texts.push(node);
        else if (Array.isArray(node)) node.forEach(walk);
        else if (node && typeof node === 'object') walk((node as { children?: unknown }).children ?? null);
    };
    walk(find(screen.toJSON()));
    return texts;
}

describe('the prompt, before the choice', () => {
    it('shows its two lines and two buttons, and nothing else', () => {
        fellTheFoe('normal');
        expect(screen.getByTestId('combat-mercy')).toBeTruthy();
        expect(textsUnder('combat-mercy')).toEqual([
            MERCY_CHECK_PROMPT.title, MERCY_CHECK_PROMPT.sub, MERCY_CHECK_PROMPT.spare, MERCY_CHECK_PROMPT.finish,
        ]);
    });

    it('shows no reward anywhere on the screen', () => {
        fellTheFoe('normal');
        expect(screen.queryByTestId('combat-rewards')).toBeNull();
        expect(screen.queryByTestId('combat-summary')).toBeNull();
        expect(screen.queryByTestId('combat-summary-shillings')).toBeNull();
        expect(screen.queryByTestId('combat-summary-spare-reward')).toBeNull();
        expect(screen.queryByTestId('combat-summary-mercy-line')).toBeNull();
        expect(screen.queryByText(QuayCrab.mercyLines!.spare)).toBeNull();
        expect(screen.queryByText(QuayCrab.mercyLines!.finish)).toBeNull();
        expect(screen.queryByText(/shilling/i)).toBeNull();
        expect(screen.queryByText(new RegExp(spareRewardLabel))).toBeNull();
    });

    it('has paid nothing yet', () => {
        const { store, before } = fellTheFoe('normal');
        const player = store.getState().player;
        expect(player.experience).toBe(before.experience);
        expect(player.currency).toBe(before.currency);
        expect(store.getState().currentEncounter).toBeDefined();
    });
});

describe('Spare', () => {
    it('goes to the end screen with no card reward, and reveals the roll there', () => {
        const { store, enemy, before } = fellTheFoe('normal');
        // The only prompt left in the game is the check's.
        expect(textsUnder('combat-mercy')[0]).toBe(MERCY_CHECK_PROMPT.title);
        expect(screen.getByTestId('combat-mercy-finish')).toBeTruthy();
        act(() => { fireEvent.press(screen.getByTestId('combat-mercy-spare')); });

        expect(screen.queryByTestId('combat-mercy')).toBeNull();
        expect(screen.queryByTestId('combat-rewards')).toBeNull();
        expect(screen.getByTestId('combat-summary')).toBeTruthy();
        expect(textsUnder('combat-summary').join(' ')).toMatch(/spared/);
        expect(screen.getByTestId('combat-summary-shillings')).toBeTruthy();
        expect(textsUnder('combat-summary-shillings').join('')).toContain(`+${spareWage(enemy.level)}`);
        expect(textsUnder('combat-summary-spare-reward').join('')).toContain(spareRewardLabel);
        expect(textsUnder('combat-summary-mercy-line')).toEqual([QuayCrab.mercyLines!.spare]);

        const after = store.getState();
        expect(after.currentEncounter).toBeUndefined();
        expect(after.player.experience).toBe(before.experience);
        expect(after.player.currency).toBeGreaterThanOrEqual(before.currency + spareWage(enemy.level));
        expect(after.combatReward?.spare?.reward).toBeDefined();
        expect(after.codex.defeatedEnemies).toContain('quay-crab');
    });

    it('the rolled item reaches the run log, tagged spare', () => {
        const posted = jest.spyOn(runLogPoster, 'event').mockImplementation(() => undefined);
        const { store } = fellTheFoe('normal');
        // Past the table's shillings, into its consumable.
        mockFixedRng(0.45);
        act(() => { fireEvent.press(screen.getByTestId('combat-mercy-spare')); });
        const reward = store.getState().combatReward?.spare?.reward;
        expect(reward?.kind).toBe('consumable');
        const gained = posted.mock.calls.filter(([, kind]) => kind === 'item-gained').map(([, , payload]) => payload);
        expect(gained).toEqual([expect.objectContaining({ itemId: (reward as { item: { id: string } }).item.id, from: 'spare' })]);
    });
});

describe('Finish', () => {
    it('pays as any win: XP, the wage and the card reward, and no roll', () => {
        const { store, enemy, before } = fellTheFoe('normal');
        act(() => { fireEvent.press(screen.getByTestId('combat-mercy-finish')); });

        expect(screen.getByTestId('combat-rewards')).toBeTruthy();
        const after = store.getState();
        expect(after.player.currency).toBe(before.currency + fightWage(enemy.level));
        expect(after.player.experience).toBeGreaterThan(before.experience);
        expect(after.combatReward?.spare ?? null).toBeNull();

        // The foe fell: the victory screen, its headline over the offer.
        expect(screen.getByTestId('combat-victory')).toBeTruthy();
        expect(textsUnder('combat-victory-headline').join(' ')).toMatch(/falls/);
        expect(screen.queryByTestId('combat-summary')).toBeNull();

        // Refusing the card closes the fight; the summary never opens after a win.
        act(() => { fireEvent.press(screen.getByTestId('combat-reward-skip')); });
        expect(screen.queryByTestId('combat-summary')).toBeNull();
        expect(screen.queryByTestId('combat-summary-spare-reward')).toBeNull();
        expect(screen.queryByTestId('combat-victory')).toBeNull();
    });
});

describe('who never asks', () => {
    it.each(['elite', 'boss', 'simple', 'unique'] as const)('a %s foe, even forced', (difficulty) => {
        fellTheFoe(difficulty);
        expect(screen.queryByTestId('combat-mercy')).toBeNull();
    });

    it('a fight that writes nothing back, even forced', () => {
        fellTheFoe('normal', false);
        expect(screen.queryByTestId('combat-mercy')).toBeNull();
        expect(screen.getByTestId('combat-rewards')).toBeTruthy();
        act(() => { fireEvent.press(screen.getByTestId('combat-reward-skip')); });
        expect(screen.queryByTestId('combat-summary')).toBeNull();
        expect(screen.queryByTestId('combat-summary-mercy-line')).toBeNull();
    });
});
