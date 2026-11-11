/**
 * The victory screen's level panel (phase FE1b, A3): the XP bar plays FE1a's
 * fill steps, stepped here with fake timers. One fill with no level settles
 * on "k XP to level n+1"; a fill to full holds "LEVEL n" for the hold time,
 * then a fresh bar fills with the rest and settles on "LEVEL n"; a tap jumps
 * to the settled end; reduced motion draws the settled end at once. Every
 * time is read from the view model's timing, never restated here.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { experienceForLevel } from '@mechanics';

import { VictoryLevelPanel } from '@/components/combat/encounter/VictoryLevelPanel';
import { FIGHT_END_TIMING, fightPaidFrom, selectFightEndVM, type FightEndVM } from '@/state/presenters/fight-end.engine';
import { withAllProviders } from '@/test-utils/withAllProviders';

let mockReduced = false;
jest.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => mockReduced }));

const { fillMs, levelHoldMs } = FIGHT_END_TIMING;

/** No level: 20 XP into level 1, the fight pays 20 more. */
const PLAIN: FightEndVM = selectFightEndVM(fightPaidFrom({ experience: 20, level: 1 }, { experience: 40, level: 1 }, 15));
/** A level: from 10 XP to 10 past level 2's start. */
const LEVELLED: FightEndVM = selectFightEndVM(
    fightPaidFrom({ experience: 10, level: 1 }, { experience: experienceForLevel(2) + 10, level: 2 }, 15),
);

const line = () => screen.getByTestId('victory-level-line').props.children as string;
const barAt = () => (screen.getByTestId('victory-xp-bar').props.accessibilityValue as { now: number }).now;
const pct = (f: number) => Math.round(f * 100);

function mount(vm: FightEndVM, settled = false) {
    render(withAllProviders(<VictoryLevelPanel vm={vm} settled={settled} />).tree);
}

beforeEach(() => {
    jest.useFakeTimers();
    mockReduced = false;
});

afterEach(() => {
    jest.useRealTimers();
});

describe('the level panel', () => {
    it('one fill with no level settles on the XP still owed', () => {
        expect(PLAIN.bar).toHaveLength(1);
        mount(PLAIN);
        // Filling: the bar runs to the fight's end place, the line waits.
        expect(line()).toBe('');
        expect(barAt()).toBe(pct(PLAIN.bar[0]!.to));
        act(() => { jest.advanceTimersByTime(fillMs - 1); });
        expect(line()).toBe('');
        act(() => { jest.advanceTimersByTime(1); });
        expect(line()).toBe(PLAIN.levelLine);
        expect(line()).toBe(`${experienceForLevel(2) - 40} XP to level 2`);
        expect(barAt()).toBe(pct(PLAIN.settledFraction));
    });

    it('a fill to full, then "LEVEL n", then a fresh fill, settling on "LEVEL n"', () => {
        expect(LEVELLED.bar).toHaveLength(2);
        mount(LEVELLED);
        expect(line()).toBe('');
        expect(barAt()).toBe(100);

        act(() => { jest.advanceTimersByTime(fillMs); });
        // Full: the level just reached shows, the bar stands full.
        expect(line()).toBe('LEVEL 2');
        expect(barAt()).toBe(100);
        act(() => { jest.advanceTimersByTime(levelHoldMs - 1); });
        expect(line()).toBe('LEVEL 2');

        act(() => { jest.advanceTimersByTime(1); });
        // A fresh bar fills with the rest.
        expect(line()).toBe('');
        expect(barAt()).toBe(pct(LEVELLED.bar[1]!.to));
        expect(LEVELLED.bar[1]!.from).toBe(0);

        act(() => { jest.advanceTimersByTime(fillMs); });
        expect(line()).toBe('LEVEL 2');
        expect(line()).toBe(LEVELLED.levelLine);
        expect(barAt()).toBe(pct(LEVELLED.settledFraction));

        // Settled: nothing moves after.
        act(() => { jest.advanceTimersByTime(10 * (fillMs + levelHoldMs)); });
        expect(line()).toBe('LEVEL 2');
    });

    it('a tap on the panel jumps to the settled end', () => {
        mount(LEVELLED);
        expect(line()).toBe('');
        act(() => { fireEvent.press(screen.getByTestId('victory-level-panel')); });
        expect(line()).toBe(LEVELLED.levelLine);
        expect(barAt()).toBe(pct(LEVELLED.settledFraction));
        // And no queued phase walks it back.
        act(() => { jest.advanceTimersByTime(fillMs + levelHoldMs + fillMs); });
        expect(line()).toBe(LEVELLED.levelLine);
        expect(barAt()).toBe(pct(LEVELLED.settledFraction));
    });

    it('with reduced motion the settled end shows at once', () => {
        mockReduced = true;
        mount(LEVELLED);
        expect(line()).toBe(LEVELLED.levelLine);
        expect(barAt()).toBe(pct(LEVELLED.settledFraction));
    });

    it('the preview draws the settled end at once', () => {
        mount(PLAIN, true);
        expect(line()).toBe(PLAIN.levelLine);
    });

    it('a fight that paid no XP stands still on the XP owed', () => {
        const none = selectFightEndVM(fightPaidFrom({ experience: 20, level: 1 }, { experience: 20, level: 1 }, 15));
        mount(none);
        expect(line()).toBe(none.levelLine);
        expect(barAt()).toBe(pct(none.settledFraction));
    });
});
