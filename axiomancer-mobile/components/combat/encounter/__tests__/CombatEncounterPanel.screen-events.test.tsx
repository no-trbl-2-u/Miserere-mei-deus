/**
 * CombatEncounterPanel — the play log's screen events (phase BE2d, A7).
 *
 * Staging a card, unstaging it before it is played, and opening its detail
 * popup each add one `ui-` event to the open fight's stream, in order, with
 * the card id and the same `ms` / `vitae` stamp the engine events carry. A
 * card leaving staging because it was played is not an unstage, and a panel
 * that does not persist its outcome (a dev sandbox) records nothing.
 *
 * The board's handlers are driven through its props, the same calls the
 * gesture worklets make.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PLAY_LOG_UI_EVENT_KINDS, validateFightPost, type FightPost, type PlayLogEvent } from '@mechanics';

import { CombatEncounterPanel } from '@/components/combat/encounter/CombatEncounterPanel';
import type { CombatBoardProps } from '@/components/combat/encounter/CombatBoard';
import { fightRecorder } from '@/lib/fightRecorder';
import type { PuzzleFetch } from '@/lib/puzzleAttempts';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

jest.mock('@/lib/buildProfile', () => ({
    isDevToolsEnabled: jest.fn(() => true),
    getBuildProfile: jest.fn(() => 'preview'),
    getBuildCommit: jest.fn(() => 'abc1234'),
}));

const CARDS = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike', 'grey-ward'];
const UI_KINDS: readonly string[] = PLAY_LOG_UI_EVENT_KINDS;

let fetchSpy: jest.Mock<PuzzleFetch>;

beforeEach(() => {
    jest.useFakeTimers();
    process.env.EXPO_PUBLIC_PUZZLE_API_URL = 'https://miserere-api.example.workers.dev';
    process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN = 'dev-token';
    fetchSpy = jest.fn<PuzzleFetch>(async () => ({ ok: true, status: 201 }));
    (globalThis as { fetch: unknown }).fetch = fetchSpy;
});

afterEach(() => {
    void fightRecorder.end('retreat');
    delete process.env.EXPO_PUBLIC_PUZZLE_API_URL;
    delete process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN;
    jest.useRealTimers();
});

/** Open a recording, mount the panel, enter the fight and let the roll settle. */
function mountLiveBoard(persistOutcome: boolean) {
    const { store, enemy } = startRealFight(REAL_FIGHT_FIXTURE, {
        player: { knownCards: CARDS, baseStats: { heart: 8, body: 8, mind: 8 }, health: 160, maxHealth: 160 },
    });
    const bootstrapPlayer = store.getState().player;
    fightRecorder.start({ enemyId: enemy.id, playerLevel: bootstrapPlayer.level, enemyHpMultiplier: 1, vitaeStart: bootstrapPlayer.health });
    const { tree } = withAllProviders(
        <CombatEncounterPanel
            enemy={enemy} bootstrapPlayer={bootstrapPlayer} deck={CARDS} seed={7}
            persistOutcome={persistOutcome} onExit={() => undefined}
        />,
        { store },
    );
    render(tree);
    act(() => { fireEvent.press(screen.getByTestId('combat-enter')); });
    act(() => { jest.advanceTimersByTime(5000); });
    return { board, health: bootstrapPlayer.health };
}

/** The board's props, read fresh after each commit. */
function board(): CombatBoardProps {
    return screen.UNSAFE_root.findAll(
        (n: { props: unknown }) => !!(n.props as Partial<CombatBoardProps>).drag && !!(n.props as Partial<CombatBoardProps>).stagedUids,
    )[0].props as CombatBoardProps;
}

/** End the recording and read the ui- events from the post it sends. */
async function postedScreenEvents(): Promise<PlayLogEvent[]> {
    await act(async () => { await fightRecorder.end('retreat'); });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const post = JSON.parse(fetchSpy.mock.calls[0][1].body) as FightPost;
    expect(validateFightPost(post)).toMatchObject({ ok: true });
    return post.events.filter((e) => UI_KINDS.includes(e.kind));
}

describe('CombatEncounterPanel — screen events in the play log', () => {
    it('stage, unstage and the detail popup land in the stream, in order, stamped', async () => {
        const { health } = mountLiveBoard(true);
        const card = board().vm.hand[0];

        act(() => { board().onStage(card.uid); });
        act(() => { board().onStage(card.uid); }); // already staged: not a second event
        act(() => { board().onUnstage(card.uid); });
        act(() => { board().onUnstage(card.uid); }); // not staged: not an unstage
        act(() => { board().onInspect(card); });

        const events = await postedScreenEvents();
        expect(events.map((e) => e.kind)).toEqual(['ui-staged', 'ui-unstaged', 'ui-detail-opened']);
        for (const e of events) {
            expect(e).toMatchObject({ cardId: card.cardId, vitae: health });
            expect(e.ms).toBeGreaterThanOrEqual(0);
        }
        const ms = events.map((e) => e.ms);
        expect([...ms].sort((a, b) => a - b)).toEqual(ms);
    });

    it('A21: a tap on a refused signature logs ui-signature-refused with the reason; a long-press does not', async () => {
        const { health } = mountLiveBoard(true);
        const rune = {
            id: 'sig-bleeding-signet', name: 'Open Vein', description: '', cost: 4, affordable: false,
            icon: 'x', reason: 'Need 4 ◆ Conviction',
        };

        act(() => { board().onSignatureInfo?.(rune); }); // long-press: info only
        act(() => { board().onSignatureInfo?.(rune, true); });

        const events = await postedScreenEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({
            kind: 'ui-signature-refused', signatureId: rune.id, reason: rune.reason, vitae: health,
        });
        expect(events[0].ms).toBeGreaterThanOrEqual(0);
    });

    it('a refused signature tap on a panel that does not persist its outcome records nothing', async () => {
        mountLiveBoard(false);
        act(() => {
            board().onSignatureInfo?.({
                id: 'sig-bleeding-signet', name: 'Open Vein', description: '', cost: 4, affordable: false,
                icon: 'x', reason: 'Need 4 ◆ Conviction',
            }, true);
        });
        expect(await postedScreenEvents()).toEqual([]);
    });

    it('a card played from staging is not an unstage', async () => {
        mountLiveBoard(true);
        const card = board().vm.hand[0];
        act(() => { board().onStage(card.uid); });
        act(() => { board().onApply(card.uid, null, false); });

        const events = await postedScreenEvents();
        expect(events.map((e) => e.kind)).toEqual(['ui-staged']);
    });

    it('a panel that does not persist its outcome records no screen event', async () => {
        mountLiveBoard(false);
        const card = board().vm.hand[0];
        act(() => { board().onStage(card.uid); });
        act(() => { board().onUnstage(card.uid); });
        act(() => { board().onInspect(card); });

        expect(await postedScreenEvents()).toEqual([]);
    });
});
