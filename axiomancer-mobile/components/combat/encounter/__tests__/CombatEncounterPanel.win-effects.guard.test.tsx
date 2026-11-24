/**
 * Guard for the footgun `win-effects-before-the-check` (identity/footguns.md).
 *
 * The mercy check opens at the lethal blow with `finalOutcome` still null and
 * the foe at 1 VITAE. Anything a won fight pays or shows (XP, shillings, the
 * card draft, an elite's relic or lane piece, the defeat ledger, the victory
 * screen) must wait for the answer: it is gated on `mercyCheckSettled`, never
 * on the foe's VITAE or the fight's last blow. Two halves, one per way the trap
 * was hit:
 *
 * - the panel: a normal and an elite foe struck down with the check forced pay
 *   and show nothing until FINISH is pressed, and then pay once;
 * - the walkers: every e2e script under `scripts/` that waits on the win screen
 *   names the check's prompt, so a fight that asks cannot hang it.
 *
 * guard-test: the panel half pins the `mercyCheckSettled` gates already in the panel, so it passes on the base by design; the walker half fails there on `audit-capture.mjs`, fixed here.
 */

import React from 'react';
import { readdirSync, readFileSync } from 'fs';
import * as path from 'path';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { enemySlugOf, fightWage, type EnemyDifficulty } from '@mechanics';

import { CombatEncounterPanel } from '@/components/combat/encounter/CombatEncounterPanel';
import { fightRecorder } from '@/lib/fightRecorder';
import * as combatActions from '@/state/combat/store-actions';
import { devSettingsStore } from '@/state/dev/dev-settings';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

jest.mock('@/lib/buildProfile', () => ({
    isDevToolsEnabled: jest.fn(() => true),
    getBuildProfile: jest.fn(() => 'preview'),
    getBuildCommit: jest.fn(() => 'abc1234'),
}));

const CARDS = ['grey-strike', 'grey-strike', 'grey-strike', 'grey-strike', 'grey-strike'];

/** The testIDs of the win screen: the victory headline and the card draft. */
const WIN_SCREEN = ['combat-victory', 'combat-victory-continue', 'combat-rewards', 'combat-reward-skip', 'combat-reward-confirm'];

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

/** Mount a fight against a 1-VITAE foe of `difficulty`, strike it down, and leave the check open. */
function fellTheFoe(difficulty: EnemyDifficulty) {
    const { store, enemy } = startRealFight(REAL_FIGHT_FIXTURE, {
        player: { knownCards: CARDS, baseStats: { heart: 8, body: 8, mind: 8 }, health: 160, maxHealth: 160 },
    });
    const foe = { ...enemy, health: 1, difficulty };
    const before = store.getState();
    const { tree } = withAllProviders(
        <CombatEncounterPanel enemy={foe} bootstrapPlayer={before.player} deck={CARDS} seed={7} persistOutcome onExit={() => undefined} />,
        { store },
    );
    render(tree);
    act(() => { fireEvent.press(screen.getByTestId('combat-enter')); });
    act(() => { jest.advanceTimersByTime(5000); });
    const board = () => screen.UNSAFE_root.findAll(
        (n: { props: Record<string, unknown> }) => !!n.props.drag && !!n.props.stagedUids,
    )[0].props as { vm: { hand: { uid: string }[] }; onStage: (u: string) => void; onApply: (u: string, t: null, b: boolean) => void };
    const card = board().vm.hand[0];
    act(() => { board().onStage(card.uid); });
    act(() => { board().onApply(card.uid, null, false); });
    act(() => { jest.advanceTimersByTime(2000); });
    return { store, foe, before };
}

describe.each(['normal', 'elite'] as const)('a %s foe struck down with the check open', (difficulty) => {
    it('pays and shows nothing a win pays until the answer, then pays once', () => {
        // Every elite roll lands, so a roll made too early would show.
        jest.spyOn(Math, 'random').mockReturnValue(0);
        const settles = [
            jest.spyOn(combatActions, 'rollCombatRewardAction'),
            jest.spyOn(combatActions, 'settleEliteRelicAction'),
            jest.spyOn(combatActions, 'settleEliteEquipmentAction'),
            jest.spyOn(combatActions, 'settleSpareAction'),
        ];
        const { store, foe, before } = fellTheFoe(difficulty);

        // The check is open: its prompt is the screen.
        expect(screen.getByTestId('combat-mercy')).toBeTruthy();
        for (const id of [...WIN_SCREEN, 'combat-summary']) expect(screen.queryByTestId(id)).toBeNull();
        for (const settle of settles) expect(settle).not.toHaveBeenCalled();

        const held = store.getState();
        expect(held.player.experience).toBe(before.player.experience);
        expect(held.player.currency).toBe(before.player.currency);
        expect(held.player.inventory).toEqual(before.player.inventory);
        expect(held.player.combatRewardCards ?? []).toEqual(before.player.combatRewardCards ?? []);
        expect(held.combatReward).toEqual(before.combatReward);
        expect(held.itemReward).toEqual(before.itemReward);
        expect(held.codex.defeatedEnemies).toEqual(before.codex.defeatedEnemies);
        expect(held.currentEncounter).toBeDefined();

        act(() => { fireEvent.press(screen.getByTestId('combat-mercy-finish')); });
        act(() => { jest.advanceTimersByTime(2000); });

        const paid = store.getState();
        expect(paid.currentEncounter).toBeUndefined();
        expect(paid.player.currency).toBe(before.player.currency + fightWage(foe.level));
        expect(paid.codex.defeatedEnemies).toContain(enemySlugOf(foe));
        expect(combatActions.settleEliteRelicAction).toHaveBeenCalledTimes(1);
        expect(combatActions.settleEliteEquipmentAction).toHaveBeenCalledTimes(1);
        expect(combatActions.settleSpareAction).not.toHaveBeenCalled();
        if (difficulty === 'elite') {
            // The relic dropped: it is the whole reward, and it waited for FINISH.
            expect(paid.combatReward?.relicDrop).toBeTruthy();
            expect(paid.player.experience).toBe(before.player.experience);
        } else {
            expect(paid.player.experience).toBeGreaterThan(before.player.experience);
            expect(screen.getByTestId('combat-victory')).toBeTruthy();
            expect(screen.getByTestId('combat-rewards')).toBeTruthy();
        }
    });
});

// ---------------------------------------------------------------------------
// The walkers
// ---------------------------------------------------------------------------

const SCRIPTS = path.resolve(__dirname, '..', '..', '..', '..', 'scripts');

/** A quoted win-screen testID, or the old aftermath panel's. */
const WINS_A_FIGHT = /['"`](?:combat-victory(?:-continue|-panel)?|combat-rewards|combat-reward-(?:skip|confirm))['"`]/;
/** A tap on either of the check's buttons, quoted or built from a template. */
const ANSWERS_THE_CHECK = /combat-mercy-(?:finish|spare|\$\{)/;

/**
 * Scripts that name a win-screen testID without winning a fight. Each names
 * why, and the test checks the reason still holds.
 */
const NEVER_FIGHTS: Record<string, { why: string; holds: RegExp }> = {
    'smoke-screens.mjs': { why: 'reads the win screens off the dev route /devvictory', holds: /\/devvictory/ },
};

/**
 * Scripts that drive a fight but never answer the check, each for a reason
 * the test checks still holds.
 */
const STOPS_SHORT: Record<string, { why: string; holds: (code: string) => boolean }> = {
    // A frame-rate probe: the prompt is one of the end screens it stops on.
    'perf-web.mjs': {
        why: 'ends the fight at whichever end screen shows first, the prompt included',
        holds: (code) => /const terminal = async[\s\S]{0,200}getByTestId\('combat-mercy'\)/.test(code),
    },
};

function stripComments(text: string): string {
    return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** The e2e drivers: every script under `scripts/` but the node tests. */
function walkers(): string[] {
    return readdirSync(SCRIPTS).filter((f) => /\.(mjs|js|ts)$/.test(f) && !/\.test\./.test(f));
}

describe('the e2e walkers answer the check', () => {
    it('the pattern sees a walker that waits on the win screen', () => {
        expect(WINS_A_FIGHT.test("await tap(page, 'combat-reward-skip')")).toBe(true);
        expect(WINS_A_FIGHT.test("page.getByTestId('combat-victory').count()")).toBe(true);
        expect(WINS_A_FIGHT.test("page.getByTestId('combat-victory-headline')")).toBe(false);
        expect(ANSWERS_THE_CHECK.test('page.getByTestId(`combat-mercy-${MERCY_CHECK}`)')).toBe(true);
        expect(ANSWERS_THE_CHECK.test("await tap(page, 'combat-mercy-finish')")).toBe(true);
        expect(ANSWERS_THE_CHECK.test("page.getByTestId('combat-mercy')")).toBe(false);
    });

    it('every script that waits on the win screen names the mercy prompt', () => {
        const hanging = walkers().filter((file) => {
            if (NEVER_FIGHTS[file] || STOPS_SHORT[file]) return false;
            const code = stripComments(readFileSync(path.join(SCRIPTS, file), 'utf8'));
            return WINS_A_FIGHT.test(code) && !ANSWERS_THE_CHECK.test(code);
        });
        // A walker listed here can meet the check's prompt and never tap
        // `combat-mercy-finish` or `combat-mercy-spare`.
        expect(hanging).toEqual([]);
    });

    it('every script that stops short still has its reason', () => {
        for (const [file, { holds }] of Object.entries(STOPS_SHORT)) {
            expect([file, holds(readFileSync(path.join(SCRIPTS, file), 'utf8'))]).toEqual([file, true]);
        }
    });

    it('every script excused still never fights', () => {
        for (const [file, { holds }] of Object.entries(NEVER_FIGHTS)) {
            const code = readFileSync(path.join(SCRIPTS, file), 'utf8');
            expect(holds.test(code)).toBe(true);
            expect(ANSWERS_THE_CHECK.test(code) || !/['"`]combat-enter['"`]/.test(code)).toBe(true);
        }
    });
});
