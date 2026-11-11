/**
 * The shared card-upgrade screen: the string of beads (the
 * look T settled in `plan/card-ledger/upgrade/U-02-settled.webp`). The rest
 * site, the blacksmith and the elite reward host it.
 *
 * Top to bottom: a figure in a gold glow (a slot the host fills; a stand-in
 * statue by default), the pair (the card as it is, smaller, tilted and
 * greyed, beside the card as it will be, upright in gold with its changed
 * numbers gold), the change alone under it ('LEECH 4 → 5'), the wheel's top
 * rim with one bead per upgradable card, and HOLD.
 *
 * Only the card on the centre bead is offered. Dragging along the rim turns
 * the wheel and snaps a bead to the centre; tapping a side bead turns the
 * wheel to it. The wheel wraps round, so the last card sits next to the first.
 * Holding HOLD for HOLD_MS fills a ring round the centre bead, and a closed
 * ring commits through the host's `onConfirm`; letting go early empties it.
 * A screen reader turns the wheel with the centre bead's adjust actions and
 * upgrades through its `upgrade` action instead of the hold. Every number on
 * the pair and the change line is the presenter's (`cardUpgradePreviewVM`);
 * every rule is the engine's.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type AccessibilityActionEvent, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    cancelAnimation,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { cardArtFor } from '@/assets/images/cards';
import { UPGRADE_FIGURE_STANDIN } from '@/assets/images/keepers';
import { CombatCardFace } from '@/components/combat/encounter/CombatBoard';
import { KitBackdrop } from '@/components/experience/KitBackdrop';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Image } from '@/lib/platform/image';
import {
    CARD_UPGRADE_HOLD_A11Y_HINT,
    CARD_UPGRADE_HOLD_LABEL,
    CARD_UPGRADE_SIDE_BEAD_HINT,
    cardUpgradeA11yActionLabel,
    cardUpgradeBeadA11yLabel,
    cardUpgradeCountMark,
    cardUpgradeHoldA11yLabel,
    cardUpgradePairA11yLabel,
} from '@/state/presenters/card-upgrade.copy';
import { cardUpgradePreviewVM, type CardUpgradeRowVM } from '@/state/presenters/card-upgrade.engine';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

export interface CardUpgradePickerProps {
    rows: readonly CardUpgradeRowVM[];
    /** Commits the upgrade of `cardId`: one copy, its next upgrade. Called
     *  only by a closed hold ring or the centre bead's `upgrade` action. */
    onConfirm: (cardId: string) => void;
    /** A price or a note the host shows above the figure, e.g. the anvil's cost. */
    priceLine?: string | null;
    /** The figure at the top (an image source); null leaves the slot out.
     *  Defaults to the stand-in statue until T supplies the art. */
    figure?: number | null;
}

/** How long HOLD must be held to commit [T to confirm #1]. */
export const HOLD_MS = 1000;
/** The centre bead's accessibility action that upgrades without the hold. */
export const UPGRADE_A11Y_ACTION = 'upgrade';

// ── The wheel's geometry, in points ─────────────────────────────────────────
/** The centre bead's edge; side beads are drawn at it and scaled down. */
const CENTRE_BEAD = 76;
const SIDE_BEAD = 54;
/** Distance between two beads along the rim. */
const BEAD_STEP = 76;
/** The wheel's radius: large, so only a shallow arc of its rim shows. */
const RIM_R = 560;
/** Room above the centre bead for the notch, and the wheel's drawn height. */
const NOTCH_ROOM = 16;
const WHEEL_H = 132;
/** The hold ring round the centre bead. */
const RING_R = CENTRE_BEAD / 2 + 10;
const RING_W = 5;
const RING_BOX = (RING_R + RING_W) * 2;
const RING_LEN = 2 * Math.PI * RING_R;
/** Beads further than this many steps from the centre are not drawn. */
const MAX_SHOWN = 2.75;
/** The figure's slot and the pair's sizes. */
const FIGURE_H = 220;
/** The air between the figure and the pair (T, 2026-11-10: bring everything but the figure down). */
const FIGURE_GAP = 36;
const NEW_W = 120;
const NEW_H = 176;
const OLD_W = 92;
const OLD_H = 135;
const TURN_MS = 220;

/** `i - pos`, folded into the wheel's nearest turn: [-n/2, n/2). */
function wrappedDistance(i: number, pos: number, n: number): number {
    'worklet';
    if (n <= 1) return i - pos;
    let d = (i - pos) % n;
    if (d < 0) d += n;
    if (d >= n / 2) d -= n;
    return d;
}

function wrapIndex(i: number, n: number): number {
    return ((i % n) + n) % n;
}

/** A bead's place on the rim, from its distance to the centre in steps. */
function beadPlace(d: number): { x: number; y: number; scale: number } {
    'worklet';
    const x = d * BEAD_STEP;
    const y = RIM_R - Math.sqrt(Math.max(0, RIM_R * RIM_R - x * x));
    const near = Math.min(1, Math.abs(d));
    const scale = (CENTRE_BEAD - (CENTRE_BEAD - SIDE_BEAD) * near) / CENTRE_BEAD;
    return { x, y, scale };
}

function Bead({ row, index, n, pos, centre, hidden, wheelW, onTurnTo, onTurnBy, onUpgrade }: {
    row: CardUpgradeRowVM;
    index: number;
    n: number;
    pos: SharedValue<number>;
    centre: boolean;
    /** Too far round the wheel to be drawn: neither touchable nor read aloud. */
    hidden: boolean;
    wheelW: number;
    onTurnTo: (index: number) => void;
    onTurnBy: (steps: number) => void;
    onUpgrade: (cardId: string) => void;
}) {
    const styles = useStyles();
    const AXM = usePalette();
    const place = useAnimatedStyle(() => {
        const d = wrappedDistance(index, pos.value, n); // worklet-safe: the callee is marked 'worklet'
        const p = beadPlace(d); // worklet-safe: the callee is marked 'worklet'
        return {
            opacity: Math.abs(d) > MAX_SHOWN ? 0 : 1,
            transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
        };
    });
    const count = cardUpgradeCountMark(row.count);
    const onAction = (e: AccessibilityActionEvent) => {
        const name = e.nativeEvent.actionName;
        if (name === UPGRADE_A11Y_ACTION) onUpgrade(row.cardId);
        else if (name === 'increment') onTurnBy(1);
        else if (name === 'decrement') onTurnBy(-1);
    };
    return (
        <Animated.View
            style={[styles.beadSlot, { left: wheelW / 2 - CENTRE_BEAD / 2, zIndex: centre ? 2 : 1 }, place]}
            pointerEvents={hidden ? 'none' : 'box-none'}
            accessibilityElementsHidden={hidden}
            importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
            testID={`card-upgrade-slot-${row.cardId}`}
        >
            <Pressable
                // #4: a side bead turns the wheel to itself; no bead upgrades on a tap.
                onPress={centre ? undefined : () => onTurnTo(index)}
                accessibilityRole={centre ? 'adjustable' : 'button'}
                accessibilityLabel={cardUpgradeBeadA11yLabel(row.name, row.count, row.stepLabel, centre)}
                accessibilityHint={centre ? undefined : CARD_UPGRADE_SIDE_BEAD_HINT}
                accessibilityState={{ selected: centre }}
                accessibilityActions={
                    centre
                        ? [
                            { name: UPGRADE_A11Y_ACTION, label: cardUpgradeA11yActionLabel(row.name) },
                            ...(n > 1 ? [{ name: 'increment' }, { name: 'decrement' }] : []),
                        ]
                        : undefined
                }
                onAccessibilityAction={centre ? onAction : undefined}
                style={[styles.bead, { borderColor: row.ringColor || AXM.ash }]}
                testID={centre ? 'card-upgrade-centre' : `card-upgrade-bead-${row.cardId}`}
            >
                <Image source={cardArtFor(row.cardId)} style={styles.beadArt} contentFit="cover" transition={0} />
            </Pressable>
            {count !== null ? (
                <View style={styles.countMark} pointerEvents="none">
                    <Text style={styles.countText} testID={`card-upgrade-count-${row.cardId}`}>{count}</Text>
                </View>
            ) : null}
        </Animated.View>
    );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** The gold ring that fills round the centre bead while HOLD is held. */
function HoldRing({ progress, gold }: { progress: SharedValue<number>; gold: string }) {
    const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: RING_LEN * (1 - progress.value) }));
    return (
        <Svg width={RING_BOX} height={RING_BOX}>
            <AnimatedCircle
                cx={RING_BOX / 2}
                cy={RING_BOX / 2}
                r={RING_R}
                stroke={gold}
                strokeWidth={RING_W}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${RING_LEN} ${RING_LEN}`}
                animatedProps={animatedProps}
                // The fill starts at twelve o'clock, under the notch.
                transform={`rotate(-90 ${RING_BOX / 2} ${RING_BOX / 2})`}
            />
        </Svg>
    );
}

export function CardUpgradePicker({ rows, onConfirm, priceLine, figure = UPGRADE_FIGURE_STANDIN }: CardUpgradePickerProps) {
    const styles = useStyles();
    const AXM = usePalette();
    const reduced = useReducedMotion();
    const n = rows.length;

    // The wheel: `pos` is where the rim stands, in beads (fractional while it
    // turns and unbounded; `wrappedDistance` folds it). `centre` is the bead
    // it settled on, the one offered.
    const [centre, setCentre] = useState(0);
    const pos = useSharedValue(0);
    const dragFrom = useRef(0);
    const [wheelW, setWheelW] = useState(360);
    const centreIndex = n === 0 ? 0 : Math.min(centre, n - 1);
    const row = n === 0 ? null : rows[centreIndex];
    const preview = useMemo(() => (row === null ? null : cardUpgradePreviewVM(row.cardId)), [row]);

    // ── The hold ──
    const [holding, setHolding] = useState(false);
    const progress = useSharedValue(0);
    const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cardIdRef = useRef<string | null>(null);
    cardIdRef.current = row?.cardId ?? null;

    const emptyRing = useCallback(() => {
        if (holdTimer.current !== null) clearTimeout(holdTimer.current);
        holdTimer.current = null;
        cancelAnimation(progress);
        progress.value = 0;
        setHolding(false);
    }, [progress]);

    useEffect(() => () => {
        if (holdTimer.current !== null) clearTimeout(holdTimer.current);
    }, []);

    const startHold = () => {
        if (cardIdRef.current === null || holdTimer.current !== null) return;
        setHolding(true);
        progress.value = 0;
        // The ring shows the time the hold takes, so it fills under reduced
        // motion too; reduced motion never shortens the hold.
        progress.value = withTiming(1, { duration: HOLD_MS, easing: Easing.linear });
        holdTimer.current = setTimeout(() => {
            holdTimer.current = null;
            const cardId = cardIdRef.current;
            setHolding(false);
            progress.value = 0;
            // A closed ring: exactly one upgrade of one copy.
            if (cardId !== null) onConfirm(cardId);
        }, HOLD_MS);
    };
    // #2: letting go before the ring closes empties it; nothing is upgraded.
    const endHold = () => {
        if (holdTimer.current !== null) emptyRing();
    };

    // ── Turning ──
    const settleOn = useCallback((target: number) => {
        if (n === 0) return;
        if (holdTimer.current !== null) emptyRing();
        pos.value = reduced ? target : withTiming(target, { duration: TURN_MS, easing: Easing.out(Easing.cubic) });
        setCentre(wrapIndex(target, n));
    }, [n, pos, reduced, emptyRing]);

    const turnTo = useCallback((index: number) => {
        const from = Math.round(pos.value);
        settleOn(from + wrappedDistance(index, from, n));
    }, [n, pos, settleOn]);

    const turnBy = useCallback((steps: number) => {
        if (n > 1) settleOn(Math.round(pos.value) + steps);
    }, [n, pos, settleOn]);

    // A host that swaps the rows keeps the same card on the centre bead if it
    // is still there, wherever it moved to, and else re-seats the first card.
    const prevRows = useRef(rows);
    useEffect(() => {
        const before = prevRows.current;
        prevRows.current = rows;
        if (before === rows || n === 0) return;
        const centredId = before.length > 0 ? before[Math.min(centre, before.length - 1)].cardId : null;
        if (centredId !== null && rows[centre]?.cardId === centredId) return;
        const found = centredId === null ? -1 : rows.findIndex((r) => r.cardId === centredId);
        const target = found >= 0 ? found : 0;
        if (holdTimer.current !== null) emptyRing();
        cancelAnimation(pos);
        pos.value = target;
        setCentre(target);
    }, [rows, n, centre, pos, emptyRing]);

    const pan = Gesture.Pan()
        .withTestId('card-upgrade-wheel-pan')
        .runOnJS(true)
        // A one-bead wheel (the elite reward) does not turn.
        .enabled(n > 1)
        .activeOffsetX([-8, 8])
        .failOffsetY([-14, 14])
        .onStart(() => {
            cancelAnimation(pos);
            dragFrom.current = pos.value;
            if (holdTimer.current !== null) emptyRing();
        })
        .onUpdate((e) => {
            pos.value = dragFrom.current - e.translationX / BEAD_STEP;
        })
        .onEnd((e) => {
            // A flick carries a little further than the finger did.
            const fling = (e.velocityX ?? 0) * 0.12;
            settleOn(Math.round(dragFrom.current - (e.translationX + fling) / BEAD_STEP));
        });

    const onWheelLayout = (e: LayoutChangeEvent) => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w > 0 && w !== wheelW) setWheelW(w);
    };

    const gold = AXM.sulfur;
    // The rim through every bead's centre: a quadratic through both ends and the top.
    const centreX = wheelW / 2;
    const centreY = NOTCH_ROOM + CENTRE_BEAD / 2;
    const half = wheelW / 2 + 20;
    const edgeY = centreY + RIM_R - Math.sqrt(Math.max(0, RIM_R * RIM_R - half * half));
    const rimPath = `M ${centreX - half} ${edgeY} Q ${centreX} ${2 * centreY - edgeY} ${centreX + half} ${edgeY}`;

    return (
        <View style={styles.root} testID="card-upgrade-sheet">
            {priceLine ? <Text style={styles.priceLine} testID="card-upgrade-price">{priceLine}</Text> : null}

            {figure !== null ? (
                <View style={styles.figureSlot} pointerEvents="none" testID="card-upgrade-figure">
                    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                        <Defs>
                            <RadialGradient id="cardUpgradeGlow" cx="50%" cy="50%" r="50%">
                                <Stop offset="0" stopColor={gold} stopOpacity={0.32} />
                                <Stop offset="0.6" stopColor={gold} stopOpacity={0.08} />
                                <Stop offset="1" stopColor={gold} stopOpacity={0} />
                            </RadialGradient>
                        </Defs>
                        {/* Fitted to the slot, so the glow fades out before its edges. */}
                        <Ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="url(#cardUpgradeGlow)" />
                    </Svg>
                    <Image source={figure} style={styles.figure} contentFit="contain" transition={0} />
                </View>
            ) : null}

            {preview !== null ? (
                <View style={styles.pair} testID="card-upgrade-preview">
                    <View
                        style={styles.oldCard}
                        accessible
                        accessibilityLabel={cardUpgradePairA11yLabel(preview.before.name, 'before')}
                        testID="card-upgrade-now"
                    >
                        <CombatCardFace card={preview.beforeCard} width={OLD_W} height={OLD_H} />
                        <View style={styles.greyWash} pointerEvents="none" />
                    </View>
                    <View
                        style={[styles.newCard, { borderColor: gold, shadowColor: gold }]}
                        accessible
                        accessibilityLabel={cardUpgradePairA11yLabel(preview.after.name, 'after')}
                        testID="card-upgrade-after"
                    >
                        <CombatCardFace
                            card={preview.afterCard}
                            width={NEW_W}
                            height={NEW_H}
                            changed={{ paid: preview.changed.paid, free: preview.changed.free, ink: gold }}
                        />
                    </View>
                </View>
            ) : null}
            {preview?.changeLine ? (
                <Text style={[styles.changeLine, { color: gold }]} testID="card-upgrade-change">{preview.changeLine}</Text>
            ) : null}

            <GestureDetector gesture={pan}>
                <View style={styles.wheel} onLayout={onWheelLayout} testID="card-upgrade-wheel">
                    <Svg style={StyleSheet.absoluteFill} width="100%" height={WHEEL_H} pointerEvents="none">
                        <Path d={rimPath} stroke={AXM.bone} strokeOpacity={0.45} strokeWidth={1} strokeDasharray="4 5" fill="none" />
                    </Svg>
                    {rows.map((r, i) => (
                        <Bead
                            key={r.cardId}
                            row={r}
                            index={i}
                            n={n}
                            pos={pos}
                            centre={i === centreIndex}
                            hidden={Math.abs(wrappedDistance(i, centreIndex, n)) > MAX_SHOWN}
                            wheelW={wheelW}
                            onTurnTo={turnTo}
                            onTurnBy={turnBy}
                            onUpgrade={onConfirm}
                        />
                    ))}
                    {/* The centre's special border: a brass double ring under a gold notch. */}
                    <View
                        pointerEvents="none"
                        style={[styles.centreRing, { left: centreX - CENTRE_BEAD / 2 - 6, top: centreY - CENTRE_BEAD / 2 - 6, borderColor: AXM.sulfur }]}
                    >
                        <View style={[styles.centreRingInner, { borderColor: AXM.sulfur }]} />
                    </View>
                    {holding ? (
                        <View
                            pointerEvents="none"
                            style={[styles.ringBox, { left: centreX - RING_BOX / 2, top: centreY - RING_BOX / 2 }]}
                            testID="card-upgrade-hold-ring"
                        >
                            <HoldRing progress={progress} gold={gold} />
                        </View>
                    ) : null}
                    <View pointerEvents="none" style={[styles.notch, { left: centreX - 7, borderTopColor: gold }]} testID="card-upgrade-notch" />
                </View>
            </GestureDetector>

            <Pressable
                onPressIn={startHold}
                onPressOut={endHold}
                disabled={row === null}
                accessibilityRole="button"
                accessibilityLabel={row ? cardUpgradeHoldA11yLabel(row.name) : CARD_UPGRADE_HOLD_LABEL}
                accessibilityHint={CARD_UPGRADE_HOLD_A11Y_HINT}
                accessibilityState={{ busy: holding, disabled: row === null }}
                style={styles.hold}
                testID="card-upgrade-hold"
            >
                <KitBackdrop piece={holding ? 'action-button-selected' : 'action-button-idle'} />
                <Text style={styles.holdText}>{CARD_UPGRADE_HOLD_LABEL}</Text>
            </Pressable>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: { alignItems: 'stretch' },
    priceLine: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 12, color: AXM.sulfur, textAlign: 'center', marginBottom: 4 },
    figureSlot: { height: FIGURE_H, alignItems: 'center', justifyContent: 'center' },
    figure: { width: '70%', height: FIGURE_H - 12 },
    pair: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: FIGURE_GAP },
    oldCard: {
        width: OLD_W,
        height: OLD_H,
        marginRight: -10,
        marginTop: 18,
        opacity: 0.55,
        transform: [{ rotate: '-8deg' }],
        zIndex: 0,
    },
    greyWash: { ...StyleSheet.absoluteFillObject, backgroundColor: AXM.bg, opacity: 0.35 },
    newCard: {
        borderWidth: 2,
        borderRadius: 8,
        padding: 2,
        zIndex: 1,
        shadowOpacity: 0.6,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
    },
    changeLine: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 14,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        textAlign: 'center',
        marginTop: 8,
    },
    wheel: { height: WHEEL_H, marginTop: 10, overflow: 'hidden' },
    beadSlot: { position: 'absolute', top: NOTCH_ROOM, width: CENTRE_BEAD, height: CENTRE_BEAD },
    bead: {
        width: CENTRE_BEAD,
        height: CENTRE_BEAD,
        borderRadius: CENTRE_BEAD / 2,
        borderWidth: 4,
        overflow: 'hidden',
        backgroundColor: AXM.bg,
    },
    beadArt: { width: '100%', height: '100%' },
    countMark: {
        position: 'absolute',
        right: -2,
        bottom: -2,
        minWidth: 24,
        paddingHorizontal: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: AXM.sulfur,
        backgroundColor: AXM.bg,
        alignItems: 'center',
    },
    countText: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 13, lineHeight: 17, color: AXM.parchment },
    centreRing: {
        position: 'absolute',
        width: CENTRE_BEAD + 12,
        height: CENTRE_BEAD + 12,
        borderRadius: (CENTRE_BEAD + 12) / 2,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3,
    },
    centreRingInner: {
        width: CENTRE_BEAD + 4,
        height: CENTRE_BEAD + 4,
        borderRadius: (CENTRE_BEAD + 4) / 2,
        borderWidth: 1.5,
    },
    ringBox: { position: 'absolute', width: RING_BOX, height: RING_BOX, zIndex: 4 },
    notch: {
        position: 'absolute',
        top: 0,
        width: 0,
        height: 0,
        borderLeftWidth: 7,
        borderRightWidth: 7,
        borderTopWidth: 11,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        zIndex: 5,
    },
    hold: {
        alignSelf: 'center',
        width: 220,
        height: 64,
        marginTop: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    holdText: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 26,
        letterSpacing: 1,
        color: AXM.parchment,
    },
}));
