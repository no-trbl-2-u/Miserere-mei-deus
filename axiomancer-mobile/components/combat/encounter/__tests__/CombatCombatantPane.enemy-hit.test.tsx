/**
 * Phase AN6b - A LANDED ENEMY HIT SHOWS IT LANDED.
 *
 * Every event stream here comes out of the real engine (`enemyTurnStreams`), so
 * nothing below can stay green on a `damage-dealt` the engine never sends.
 *
 * Reanimated runs for real under Jest, on the fake clock, so each effect is read
 * off the style it drives (`getAnimatedStyle`): the lunge's translate, the board
 * shake's translate, the wound flash's opacity, the medallion's recoil, flash
 * and contact slash. Nothing stands in for them. The one stand-in is the OS
 * reduced-motion switch, mocked where `lib/juice` asks it (`useReducedMotion`)
 * and where the pane asks it (`AccessibilityInfo`).
 */
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { getAnimatedStyle } from 'react-native-reanimated';
import { Haptics } from '@/lib/platform/haptics';
import { act, render, screen, within, type RenderResult } from '@testing-library/react-native';

import { CombatCombatantPane, PlayerMedallion } from '@/components/combat/encounter/CombatCombatantPane';
import { ENEMY_ATTACK_IMPACT_MS, clipDurationMs } from '@/components/combat/frames';
import { ENEMY_FRAME_SETS } from '@/assets/images/enemies/frames';
import { selectCombatLogHistory, selectCombatLogLines } from '@/state/presenters/combat-encounter.engine';
import { CRANE_HOOK, FRAMED, PLAYER, afterPlaying, cardIdNamed, enemyTurn, enemyVM, fight, stunned } from '@/test-utils/enemyTurnStreams';
import { numberPopTimeline } from '@/lib/juice';
import { withAllProviders } from '@/test-utils/withAllProviders';
import type { CombatEncounterState, CombatEvent, Enemy } from '@mechanics';

let mockOsReduced = false;
jest.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => mockOsReduced }));

const TURNS = 24;
const FLOAT_EYE = FRAMED.find((e) => e.portraitAsset === 'float-eye') as Enemy;
/** Past the last of a hit's beats: the impact, then the longest tween off it. */
const SETTLED_MS = ENEMY_ATTACK_IMPACT_MS + 600;

/** The Defender's Riposte card (P-09 b): its free line is GUARD and REFLECT. */
const RIPOSTE_CARD = cardIdNamed('Riposte');

/** A next move that would hit hard, for the readers that used to look at the intent. */
const BIG_NEXT_MOVE = 99;

const hitsOf = (events: readonly CombatEvent[]) =>
    events.filter((e): e is Extract<CombatEvent, { kind: 'damage-dealt' }> => e.kind === 'damage-dealt' && e.target === 'self');
const firedOf = (events: readonly CombatEvent[]) =>
    events.find((e): e is Extract<CombatEvent, { kind: 'threat-fired' }> => e.kind === 'threat-fired');
const moveHits = (events: readonly CombatEvent[]) =>
    (firedOf(events)?.effects ?? []).filter((eff) => (eff.damage ?? 0) > 0).length;

/** The fight walked on to the first of the enemy's 24 turns its moves match, or null. */
function atFirstTurn(enemy: Enemy, matches: (events: CombatEvent[]) => boolean, from = fight(enemy)): CombatEncounterState | null {
    let state = from;
    for (let turn = 0; turn < TURNS; turn += 1) {
        const t = enemyTurn(state);
        if (matches(t.events)) return state;
        state = t.state;
    }
    return null;
}

function boardTree(enemy: Enemy, events: CombatEvent[], seq = 1, nextDamage = 0) {
    return withAllProviders(
        <>
            <CombatCombatantPane enemy={enemyVM(enemy, nextDamage)} player={PLAYER} fx={{ seq, events }} region="the Breakwater" />
            <PlayerMedallion player={PLAYER} fx={{ seq, events }} />
        </>,
    ).tree;
}

type Animated = Parameters<typeof getAnimatedStyle>[0];
const styleOf = (testID: string) => getAnimatedStyle(screen.getByTestId(testID) as unknown as Animated) as {
    opacity?: number;
    transform?: Record<string, number>[];
};
const translateX = (testID: string) => styleOf(testID).transform?.find((t) => 'translateX' in t)?.translateX ?? 0;
const opacity = (testID: string) => styleOf(testID).opacity ?? 0;

const READS = {
    lunge: () => translateX('combat-enemy-lunge'),
    shake: () => translateX('combat-combatant-pane'),
    flash: () => opacity('combat-hit-flash'),
    recoil: () => translateX('combat-player-recoil'),
    medallionFlash: () => opacity('combat-player-flash'),
    slash: () => opacity('combat-player-slash'),
};
type Read = keyof typeof READS;

/** Runs the clock, recording the widest each effect swung, and when it first moved. */
function watchEffects(ms = SETTLED_MS) {
    const widest = {} as Record<Read, number>;
    const firstMoved = {} as Record<Read, number | null>;
    (Object.keys(READS) as Read[]).forEach((k) => { widest[k] = 0; firstMoved[k] = null; });
    for (let t = 10; t <= ms; t += 10) {
        act(() => { jest.advanceTimersByTime(10); });
        (Object.keys(READS) as Read[]).forEach((k) => {
            const v = Math.abs(READS[k]());
            if (v > widest[k]) widest[k] = v;
            if (v > 0 && firstMoved[k] === null) firstMoved[k] = t;
        });
    }
    return { widest, firstMoved };
}

const enemyFloats = () => within(screen.getByTestId('combat-enemy-float-layer')).queryAllByText(/./).map((n) => n.props.children as string);

/** The flinch's row against the action's, on the frame set's exact edges. */
function expectActionThenFlinch(view: RenderResult, enemy: Enemy) {
    const set = ENEMY_FRAME_SETS[enemy.portraitAsset as string];
    const { idle, attacking, struck } = set.manifest.clips;
    const row = () => {
        const root = view.getByTestId('combat-enemy-frames');
        const cell = root.children.findIndex((child: unknown) =>
            JSON.stringify((child as { props?: { style?: unknown } }).props?.style ?? '').includes('"opacity":1'));
        return Math.floor(cell / set.manifest.columns);
    };
    expect(row()).toBe(idle.row);
    act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS); });
    expect(row()).toBe(attacking.row);
    act(() => { jest.advanceTimersByTime(clipDurationMs(attacking) - 1); });
    expect(row()).toBe(attacking.row);
    act(() => { jest.advanceTimersByTime(1); });
    expect(row()).toBe(struck.row);
}

beforeEach(() => {
    jest.useFakeTimers();
    mockOsReduced = false;
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false as unknown as boolean);
});
afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
});

describe('a hit that gets through (A2)', () => {
    it('lunges the foe, shakes and flashes the board, and the medallion reacts, on the impact beat', () => {
        const haptic = jest.spyOn(Haptics, 'impactAsync').mockResolvedValue(undefined);
        const t = enemyTurn(atFirstTurn(CRANE_HOOK, (e) => hitsOf(e).length > 0)!);
        const dealt = hitsOf(t.events).reduce((sum, e) => sum + e.amount, 0);
        render(boardTree(CRANE_HOOK, t.events));
        expect(haptic).not.toHaveBeenCalled();

        const { widest, firstMoved } = watchEffects();

        // The lunge's anticipation starts on the trigger; its apex is at least the 8px floor.
        expect(widest.lunge).toBeGreaterThanOrEqual(8);
        for (const k of ['shake', 'flash', 'recoil', 'medallionFlash', 'slash'] as const) {
            expect(widest[k]).toBeGreaterThan(0);
            // None of these beats the swing to its impact.
            expect(firstMoved[k]!).toBeGreaterThan(ENEMY_ATTACK_IMPACT_MS);
        }
        expect(screen.getByText(`-${dealt}`)).toBeTruthy();
        expect(haptic).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
        expect(screen.queryByText('DENIED')).toBeNull();
    });

    it.each(FRAMED.map((e) => [e.portraitAsset as string, e] as const))('%s: its first landed hit reaches the board', (_key, enemy) => {
        const t = enemyTurn(atFirstTurn(enemy, (e) => hitsOf(e).length > 0)!);
        const dealt = hitsOf(t.events).reduce((sum, e) => sum + e.amount, 0);
        render(boardTree(enemy, t.events));
        const { widest } = watchEffects();
        expect(widest.lunge).toBeGreaterThan(0);
        expect(widest.shake).toBeGreaterThan(0);
        expect(widest.flash).toBeGreaterThan(0);
        expect(widest.recoil).toBeGreaterThan(0);
        expect(screen.getByText(`-${dealt}`)).toBeTruthy();
    });
});

describe('a partly blocked hit floats what the wall truly took (A3)', () => {
    const armedTurn = (armed: Partial<CombatEncounterState>) => {
        const state = atFirstTurn(FLOAT_EYE, (e) => hitsOf(e).length > 0)!;
        return enemyTurn({ ...state, ...armed }).events;
    };

    it.each([[0], [1], [BIG_NEXT_MOVE]])('GUARD 2, with a next move of %i', (nextDamage) => {
        const events = armedTurn({ guard: 2 });
        expect(hitsOf(events)[0].amount).toBeGreaterThan(0);
        render(boardTree(FLOAT_EYE, events, 1, nextDamage));
        act(() => { jest.advanceTimersByTime(SETTLED_MS); });
        expect(screen.getByText('BLOCKED 2')).toBeTruthy();
    });

    it('sums the parry, GUARD and BARRIER', () => {
        const events = armedTurn({ guard: 1, barrier: 1, riposte: { damage: 0, reduce: 1 } });
        expect(hitsOf(events)[0].blocked).toBe(3);
        render(boardTree(FLOAT_EYE, events));
        act(() => { jest.advanceTimersByTime(SETTLED_MS); });
        expect(screen.getByText('BLOCKED 3')).toBeTruthy();
    });

    it('floats no BLOCKED on a hit nothing soaked', () => {
        render(boardTree(FLOAT_EYE, armedTurn({}), 1, BIG_NEXT_MOVE));
        act(() => { jest.advanceTimersByTime(SETTLED_MS); });
        expect(screen.queryByText(/^BLOCKED/)).toBeNull();
    });

    it('does not count a blow the wall stopped whole', () => {
        const twoHits = FRAMED.map((enemy) => ({ enemy, state: atFirstTurn(enemy, (e) => moveHits(e) >= 2) }))
            .find((c) => c.state !== null)!;
        const { enemy, state } = twoHits;
        const open = enemyTurn(state!).events;
        expect(hitsOf(open).length).toBeGreaterThanOrEqual(2);
        // GUARD for the whole first blow and one more off the second.
        const events = enemyTurn({ ...state!, guard: hitsOf(open)[0].amount + 1 }).events;
        expect(hitsOf(events)).toHaveLength(hitsOf(open).length - 1);
        render(boardTree(enemy, events));
        act(() => { jest.advanceTimersByTime(SETTLED_MS); });
        expect(screen.getByText('BLOCKED 1')).toBeTruthy();
    });
});

describe('DENIED means the move was really stopped (A4)', () => {
    const hitState = () => atFirstTurn(CRANE_HOOK, (e) => hitsOf(e).length > 0)!;

    it.each([[0], [BIG_NEXT_MOVE]])('floats on a hindered turn, next move %i', (nextDamage) => {
        const t = enemyTurn(stunned(hitState()));
        expect(firedOf(t.events)).toBeUndefined();
        render(boardTree(CRANE_HOOK, t.events, 1, nextDamage));
        expect(enemyFloats()).toContain('DENIED');
    });

    it.each([[0], [BIG_NEXT_MOVE]])('floats on a fully blocked attack, next move %i, with no hit effects', (nextDamage) => {
        const t = enemyTurn({ ...hitState(), guard: 100000 });
        expect(firedOf(t.events)).toBeDefined();
        expect(hitsOf(t.events)).toEqual([]);
        render(boardTree(CRANE_HOOK, t.events, 1, nextDamage));
        expect(enemyFloats()).toContain('DENIED');
        const { widest } = watchEffects();
        expect(widest).toEqual({ lunge: 0, shake: 0, flash: 0, recoil: 0, medallionFlash: 0, slash: 0 });
    });

    it.each([[0], [BIG_NEXT_MOVE]])('stays down on a hit that landed, next move %i', (nextDamage) => {
        const t = enemyTurn(hitState());
        render(boardTree(CRANE_HOOK, t.events, 1, nextDamage));
        expect(enemyFloats()).not.toContain('DENIED');
    });

    it.each([[0], [BIG_NEXT_MOVE]])('stays down on a move with no hit, next move %i', (nextDamage) => {
        const quiet = FRAMED.map((enemy) => ({
            enemy, state: atFirstTurn(enemy, (e) => firedOf(e) !== undefined && moveHits(e) === 0),
        })).find((c) => c.state !== null)!;
        const t = enemyTurn(quiet.state!);
        render(boardTree(quiet.enemy, t.events, 1, nextDamage));
        expect(enemyFloats()).not.toContain('DENIED');
        const { widest } = watchEffects();
        expect(widest).toEqual({ lunge: 0, shake: 0, flash: 0, recoil: 0, medallionFlash: 0, slash: 0 });
    });
});

describe('a riposte answers the blow (A5)', () => {
    /** Riposte state armed by hand: no live card sets it (see the next describe). */
    const riposted = () => enemyTurn({
        ...atFirstTurn(CRANE_HOOK, (e) => hitsOf(e).length > 0)!,
        guard: 100000,
        riposte: { damage: 8, reduce: 0 },
    });
    const counterOf = (events: readonly CombatEvent[]) =>
        events.find((e): e is Extract<CombatEvent, { kind: 'riposte-fired' }> => e.kind === 'riposte-fired')!.amount;

    it('floats RIPOSTE -N beside DENIED', () => {
        const t = riposted();
        render(boardTree(CRANE_HOOK, t.events));
        expect(enemyFloats()).toEqual(expect.arrayContaining(['DENIED', `RIPOSTE −${counterOf(t.events)}`]));
    });

    it('adds its log line to the log the player reads', () => {
        const t = riposted();
        const text = `RIPOSTE deals ${counterOf(t.events)} back to the foe.`;
        expect(selectCombatLogLines(t.events).map((l) => l.text)).toContain(text);
        expect(selectCombatLogHistory(t.state).map((l) => l.text)).toContain(text);
    });

    it('flinches the foe after the action clip', () => {
        expectActionThenFlinch(render(boardTree(CRANE_HOOK, riposted().events)), CRANE_HOOK);
    });
});

describe("what the Defender's Riposte card does today", () => {
    // A5 names this card, but its line is GUARD and REFLECT and it arms no
    // `state.riposte`: no live card does. Pinned so the day one does, A5's case
    // above becomes the card's own.
    const played = () => enemyTurn(afterPlaying(CRANE_HOOK, [RIPOSTE_CARD]).state);

    it('arms no riposte, so it fires none', () => {
        expect(afterPlaying(CRANE_HOOK, [RIPOSTE_CARD]).state.riposte).toBeUndefined();
        expect(played().events.some((e) => e.kind === 'riposte-fired')).toBe(false);
    });

    it('answers with REFLECT instead, its float and its flinch after the action clip', () => {
        const t = played();
        const reflected = t.events.find((e): e is Extract<CombatEvent, { kind: 'spike-struck' }> => e.kind === 'spike-struck')!;
        expect(reflected.spike).toBe('reflect');
        const view = render(boardTree(CRANE_HOOK, t.events));
        expect(enemyFloats()).toContain(`REFLECT −${reflected.amount}`);
        expectActionThenFlinch(view, CRANE_HOOK);
    });
});

describe('the log reads each hit once (A6)', () => {
    it.each(FRAMED.map((e) => [e.portraitAsset as string, e] as const))('%s over 24 turns', (_key, enemy) => {
        let state = fight(enemy);
        const dealt: number[] = [];
        for (let turn = 0; turn < TURNS; turn += 1) {
            const t = enemyTurn(state);
            state = t.state;
            dealt.push(...hitsOf(t.events).map((e) => e.amount));
        }
        expect(dealt.length).toBeGreaterThan(0);
        const lines = selectCombatLogHistory(state).filter((l) => /^It deals /.test(l.text)).map((l) => l.text);
        expect(lines).toEqual(dealt.map((n) => `It deals ${n} to you.`));
    });
});

describe('reduced motion (A7)', () => {
    /** Both the pane's ref and the juice hook on, before the hit arrives. */
    async function reducedBoard(events: CombatEvent[]) {
        mockOsReduced = true;
        (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true as unknown as never);
        const view = render(boardTree(FLOAT_EYE, [], 0));
        await act(async () => { await Promise.resolve(); });
        view.rerender(boardTree(FLOAT_EYE, events, 1));
    }

    it('selects no lunge, shake or flash, and the floats and log line still show', async () => {
        const state = atFirstTurn(FLOAT_EYE, (e) => hitsOf(e).length > 0)!;
        const t = enemyTurn({ ...state, guard: 1 });
        const dealt = hitsOf(t.events).reduce((sum, e) => sum + e.amount, 0);
        await reducedBoard(t.events);

        const { widest } = watchEffects();
        expect(widest).toEqual({ lunge: 0, shake: 0, flash: 0, recoil: 0, medallionFlash: 0, slash: 0 });
        expect(screen.getByText(`-${dealt}`)).toBeTruthy();
        expect(screen.getByText('BLOCKED 1')).toBeTruthy();
        expect(selectCombatLogHistory(t.state).map((l) => l.text)).toContain(`It deals ${hitsOf(t.events)[0].amount} to you.`);
        // Still, not stuck: it leaves when the rise would have ended.
        act(() => { jest.advanceTimersByTime(numberPopTimeline().riseDurationMs); });
        expect(screen.queryByText(`-${dealt}`)).toBeNull();
    });

    it('still floats DENIED', async () => {
        await reducedBoard(enemyTurn(stunned(fight(FLOAT_EYE))).events);
        expect(enemyFloats()).toContain('DENIED');
    });
});
