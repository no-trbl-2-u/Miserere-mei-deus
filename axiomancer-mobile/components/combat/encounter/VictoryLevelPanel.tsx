/**
 * The victory screen's level panel (phase FE1b): one bordered panel holding
 * the XP bar and one line, nothing else.
 *
 * The bar plays FE1a's fill steps (`selectFightEndVM(...).bar`): each step
 * fills from its `from` to its `to`; a step that ends full holds "LEVEL n"
 * (its `levelBeat`) for `timing.levelHoldMs`, then the next step starts on a
 * fresh, empty bar. Once the last step lands the bar stands at
 * `settledFraction` and the line reads `levelLine` ("LEVEL n" or "k XP to
 * level n+1"). A tap on the panel jumps to that settled end (T, 2026-11-11,
 * call #5); reduced motion, or the `settled` prop (the dev preview), draws it
 * at once.
 *
 * The phases are a small state machine stepped by `setTimeout`, so a test
 * steps it with fake timers; the bar's width eases between them with
 * `Animated`. Every number of time comes from the view model's `timing` and
 * each step's `fillMs`: the component holds none of its own.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { FIGHT_END_PANEL_A11Y_HINT } from '@/state/presenters/fight-end.copy';
import type { FightEndVM } from '@/state/presenters/fight-end.engine';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

/** Where the bar's animation stands: a step filling, a step's "LEVEL n" hold, or the settled end. */
export type LevelPanelPhase =
    | { readonly kind: 'fill'; readonly step: number }
    | { readonly kind: 'hold'; readonly step: number }
    | { readonly kind: 'settled' };

const SETTLED: LevelPanelPhase = { kind: 'settled' };

/** The bar moves at all: some step fills. A bar that stands still (no XP paid) starts settled. */
function barMoves(vm: FightEndVM): boolean {
    return vm.bar.some((s) => s.fillMs > 0 || s.endsFull);
}

/** The phase after `phase` once its time runs out. */
export function nextLevelPanelPhase(vm: FightEndVM, phase: LevelPanelPhase): LevelPanelPhase {
    if (phase.kind === 'settled') return SETTLED;
    const step = vm.bar[phase.step];
    const last = vm.bar.length - 1;
    if (!step) return SETTLED;
    if (phase.kind === 'fill' && step.endsFull) return { kind: 'hold', step: phase.step };
    if (phase.step < last) return { kind: 'fill', step: phase.step + 1 };
    return SETTLED;
}

/** The bar's place (0..1) a phase ends on, and the line it shows. */
export function levelPanelView(vm: FightEndVM, phase: LevelPanelPhase): { fraction: number; line: string } {
    if (phase.kind === 'settled') return { fraction: vm.settledFraction, line: vm.levelLine };
    const step = vm.bar[phase.step]!;
    if (phase.kind === 'hold') return { fraction: 1, line: step.levelBeat ?? '' };
    return { fraction: step.to, line: '' };
}

/** The view model's easing word, as an `Animated` easing. */
function easingOf(word: string): (t: number) => number {
    if (word === 'ease-out') return Easing.out(Easing.cubic);
    if (word === 'ease-in') return Easing.in(Easing.cubic);
    if (word === 'ease-in-out') return Easing.inOut(Easing.cubic);
    return Easing.linear;
}

export function VictoryLevelPanel({ vm, settled = false }: { vm: FightEndVM; settled?: boolean }) {
    const styles = useStyles();
    const reduced = useReducedMotion();
    const still = settled || reduced || !barMoves(vm);
    const [phase, setPhase] = useState<LevelPanelPhase>(() => (still ? SETTLED : { kind: 'fill', step: 0 }));
    const shown: LevelPanelPhase = still ? SETTLED : phase;
    const phaseKey = shown.kind === 'settled' ? 'settled' : `${shown.kind}:${shown.step}`;
    const width = useRef(new Animated.Value(still ? vm.settledFraction : (vm.bar[0]?.from ?? 0))).current;

    // Each phase runs its time, then hands over to the next.
    useEffect(() => {
        if (shown.kind === 'settled') {
            width.stopAnimation();
            width.setValue(vm.settledFraction);
            return undefined;
        }
        const step = vm.bar[shown.step]!;
        let ms: number;
        if (shown.kind === 'fill') {
            width.setValue(step.from);
            ms = step.fillMs;
            if (ms > 0) {
                Animated.timing(width, {
                    toValue: step.to,
                    duration: ms,
                    easing: easingOf(vm.timing.easing),
                    useNativeDriver: false,
                }).start();
            } else {
                width.setValue(step.to);
            }
        } else {
            width.setValue(1);
            ms = vm.timing.levelHoldMs;
        }
        const timer = setTimeout(() => setPhase(nextLevelPanelPhase(vm, shown)), ms);
        return () => clearTimeout(timer);
        // `shown` is rebuilt each render; its key (kind and step) is what moves it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phaseKey, vm, width]);

    const skip = useCallback(() => setPhase(SETTLED), []);
    const view = levelPanelView(vm, shown);
    const pct = Math.round(view.fraction * 100);
    const fillWidth = width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' });

    return (
        <Pressable
            style={styles.panel}
            onPress={skip}
            testID="victory-level-panel"
            accessibilityRole="button"
            accessibilityLabel={vm.levelLine}
            accessibilityHint={shown.kind === 'settled' ? undefined : FIGHT_END_PANEL_A11Y_HINT}
        >
            <View
                style={styles.track}
                testID="victory-xp-bar"
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: pct }}
            >
                <Animated.View style={[styles.fill, { width: fillWidth }]} />
            </View>
            <Text
                style={[styles.line, (shown.kind === 'hold' || (shown.kind === 'settled' && vm.leveled)) && styles.lineLevel]}
                testID="victory-level-line"
                numberOfLines={1}
            >
                {view.line}
            </Text>
        </Pressable>
    );
}

const useStyles = makeStyles((AXM) => ({
    panel: {
        alignSelf: 'stretch',
        borderWidth: 1.5,
        borderColor: AXM.sulfur,
        backgroundColor: AXM.deepBg,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 10,
        alignItems: 'center',
        gap: 8,
    },
    track: {
        alignSelf: 'stretch',
        height: 8,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.bg,
        overflow: 'hidden',
    },
    fill: { height: '100%', backgroundColor: AXM.sulfur },
    // One line, a fixed height so the panel does not jump as the words change.
    line: {
        fontFamily: TYPE_ROLES.count.fontFamily,
        fontSize: 16,
        lineHeight: 30,
        minHeight: 30,
        color: AXM.parchment,
        textAlign: 'center',
    },
    lineLevel: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 26,
        letterSpacing: TYPE_ROLES.title.letterSpacing,
        color: AXM.sulfur,
    },
}));
