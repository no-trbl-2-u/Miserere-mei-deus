/**
 * Hazard minigame overlays: the dice-cast interstitial, the per-round
 * O/X resolve stamp, the Perfect/Complete/Failure outcome screen, and
 * the tap-to-read card detail with keyword call-outs.
 *
 * (The rewards/consequences ledger lives in `RewardsOverlay.tsx`.)
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CardKeywordLedger } from '@/components/card/CardKeywordLedger';
import { Haptics } from '@/lib/platform/haptics';
import Animated, {
    Easing,
    FadeIn,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

import type {
    HazardCardVM,
    HazardDieVM,
    HazardResolveFlashVM,
    HazardOutcomeVM,
} from '@/state/presenters/hazard.engine';
import { DICE_ROLL_TIMING, type DiceSpring } from '@/state/combat/dice-roll-ritual.timing';
import { FONTS, HUE } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

import { HazardCard } from './HazardCard';
import { HazardDie } from './HazardDie';
import { HazardStatKey } from './HazardStatKey';
import { LedgerMark, ProgGlyph } from './glyphs';
import { HZ, routeAccent, TYPE_ACCENT } from './palette';

// ---------------------------------------------------------------------------
// Dice-cast interstitial — dice tumble in, settle, then the board opens.
// ---------------------------------------------------------------------------

/**
 * The live dice-cast tumble: its child falls in rotated, seats and
 * micro-bounces. The cast interstitial plays it on every die; the puzzle
 * board replays it in the tray on a die a reroll turns.
 */
export function DieTumble({ index, testID, children }: { index: number; testID?: string; children: React.ReactNode }) {
    const fall = useSharedValue(0);
    useEffect(() => {
        fall.value = withDelay(
            index * 130,
            withSequence(
                withTiming(1, { duration: 480, easing: Easing.in(Easing.quad) }),
                withSpring(1.18, DICE_ROLL_TIMING.landSpring),
                withSpring(1.3, DICE_ROLL_TIMING.settleSpring),
            ),
        );
    }, [fall, index]);
    const style = useAnimatedStyle(() => {
        const t = fall.value;
        // 0 → above the screen rotated hard; 1 → seated; >1 → micro-bounce
        const translateY = t <= 1 ? -160 * (1 - t) : (t - 1) * -18;
        const rotate = t <= 1 ? `${-40 * (1 - t)}deg` : `${(t - 1) * 14 - 4}deg`;
        return { opacity: Math.min(1, t * 3), transform: [{ translateY }, { rotate }] };
    });
    return (
        <Animated.View style={style} testID={testID}>
            {children}
        </Animated.View>
    );
}

function TumblingDie({ die, index }: { die: HazardDieVM; index: number }) {
    return (
        <DieTumble index={index}>
            <HazardDie kind={die.kind} size={56} glow={!die.isHex} />
        </DieTumble>
    );
}

/** How long the dice-cast interstitial plays before it calls `onDone`. */
export const DICE_ROLL_OVERLAY_MS = 1700;

export function DiceRollOverlay({
    dice,
    routeLabel,
    routeKey,
    onDone,
}: {
    dice: HazardDieVM[];
    routeLabel: string;
    routeKey: 'safe' | 'risk';
    onDone: () => void;
}) {
    const AXM = usePalette();
    const styles = useStyles();
    useEffect(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
        const t = setTimeout(onDone, DICE_ROLL_OVERLAY_MS);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
        <Animated.View entering={FadeIn.duration(160)} style={styles.rollRoot} testID="hazard-dice-roll">
            <View style={{ alignItems: 'center', paddingTop: 70 }}>
                <Text style={[styles.rollBadge, { backgroundColor: routeAccent(AXM)[routeKey] }]}>{routeLabel}</Text>
                <Text style={styles.rollTitle}>CASTING THE DICE</Text>
                <Text style={styles.rollSub}>— fate clatters on cold stone. this cast must last.</Text>
            </View>
            <View style={styles.rollDice}>
                {dice.map((d, i) => (
                    <TumblingDie key={d.id} die={d} index={i} />
                ))}
            </View>
            <Text style={styles.rollFooter}>⬡ ⬡ ⬡ ⬡ &nbsp; SETTLING…</Text>
        </Animated.View>
    );
}

// ---------------------------------------------------------------------------
// Per-round resolve stamp
// ---------------------------------------------------------------------------

/** The stamp's slam. Mass and threshold are named: Reanimated 4 fills them
 * with 4 and 6e-9, which keeps the stamp wobbling for about 9 seconds. */
export const STAMP_SPRING: DiceSpring = { damping: 8, stiffness: 240, mass: 1, energyThreshold: 0.01 };

function Stamp({ cleared }: { cleared: boolean }) {
    const t = useSharedValue(0);
    useEffect(() => {
        t.value = withSequence(
            withTiming(0.55, { duration: 240, easing: Easing.in(Easing.quad) }),
            withSpring(1, STAMP_SPRING),
        );
        Haptics.impactAsync(
            cleared ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Heavy,
        ).catch(() => undefined);
    }, [t, cleared]);
    const style = useAnimatedStyle(() => {
        const v = t.value;
        const scale = 2.4 - 1.4 * v;
        const rotate = `${-12 + 12 * v}deg`;
        return { opacity: Math.min(1, v * 2.2), transform: [{ scale }, { rotate }] };
    });
    return (
        <Animated.View style={style}>
            <LedgerMark kind={cleared ? 'O' : 'X'} size={150} />
        </Animated.View>
    );
}

export function ResolveFlashOverlay({
    flash,
    onDone,
}: {
    flash: HazardResolveFlashVM;
    onDone: () => void;
}) {
    const AXM = usePalette();
    const styles = useStyles();
    return (
        <Pressable style={styles.flashRoot} onPress={onDone} testID="hazard-resolve-flash">
            <Text style={styles.flashEyebrow}>
                ROUND {flash.roundRoman} {flash.cleared ? '— CLEARED' : '— FAILED'}
            </Text>
            <View style={{ marginVertical: 14 }}>
                <Stamp cleared={flash.cleared} />
            </View>
            <Text style={[styles.flashVerdict, { color: flash.cleared ? AXM.parchment : AXM.blood }]}>
                {flash.verdict}
            </Text>
            <View style={styles.flashStats}>
                {flash.stats.map((stat) => {
                    const accent = TYPE_ACCENT[stat.key];
                    return (
                        <View key={stat.key} style={[styles.flashStat, { borderColor: stat.ok ? accent : AXM.blood }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <ProgGlyph kind={stat.key} size={13} color={accent} />
                                <Text style={[styles.flashStatLabel, { color: accent }]}>{stat.label}</Text>
                            </View>
                            <Text style={[styles.flashStatValue, { color: stat.ok ? AXM.parchment : AXM.blood }]}>
                                {stat.got}
                                <Text style={styles.flashStatNeed}> / {stat.need}</Text> {stat.ok ? '✓' : '✕'}
                            </Text>
                        </View>
                    );
                })}
            </View>
            {flash.carryNote !== null && (
                <Animated.Text entering={FadeIn.delay(500)} style={styles.flashCarry}>
                    ⟜ {flash.carryNote}
                </Animated.Text>
            )}
            <Text style={styles.tapToContinue}>TAP TO CONTINUE</Text>
        </Pressable>
    );
}

// ---------------------------------------------------------------------------
// Outcome screen — Perfect / Complete / Failure
// ---------------------------------------------------------------------------

export function OutcomeOverlay({
    outcome,
    onContinue,
}: {
    outcome: HazardOutcomeVM;
    onContinue: () => void;
}) {
    const AXM = usePalette();
    const styles = useStyles();
    const color =
        outcome.tier === 'perfect' ? HZ.gold : outcome.tier === 'complete' ? AXM.parchment : AXM.blood;
    useEffect(() => {
        Haptics.notificationAsync(
            outcome.tier === 'failure'
                ? Haptics.NotificationFeedbackType.Error
                : Haptics.NotificationFeedbackType.Success,
        ).catch(() => undefined);
    }, [outcome.tier]);
    return (
        <Animated.View entering={FadeIn.duration(260)} style={styles.outcomeRoot} testID="hazard-outcome">
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 20 }}>
                {outcome.marks.map((m, i) => (
                    <Animated.View key={i} entering={FadeIn.delay(150 + i * 180).duration(220)}>
                        <LedgerMark kind={m} size={42} />
                    </Animated.View>
                ))}
            </View>
            <Animated.Text
                entering={FadeIn.delay(600).duration(280)}
                style={[styles.outcomeWord, { color }]}
            >
                {outcome.word}
            </Animated.Text>
            <Animated.Text entering={FadeIn.delay(800)} style={styles.outcomeSub}>
                {outcome.sub}
            </Animated.Text>
            <Animated.Text entering={FadeIn.delay(950)} style={styles.outcomeLine}>
                “{outcome.line}”
            </Animated.Text>
            <Animated.View entering={FadeIn.delay(1100)}>
                <Pressable
                    onPress={onContinue}
                    accessibilityRole="button"
                    testID="hazard-outcome-continue"
                    style={[styles.outcomeCta, { borderColor: color }]}
                >
                    <Text style={[styles.outcomeCtaText, { color }]}>{outcome.ctaLabel}</Text>
                </Pressable>
            </Animated.View>
        </Animated.View>
    );
}

// ---------------------------------------------------------------------------
// Card detail — keyword call-outs + readable card. Tap anywhere closes.
// ---------------------------------------------------------------------------

/**
 * CardDetailOverlay — the tap-to-read card: its keyword call-outs, the
 * card at detail size, and the FORCE / ESCAPE
 * key for the two unnamed marks the card prints.
 *
 * Inputs: `card` — the VM to read; `onClose` — fired on any tap.
 * Outputs: the full-screen overlay; reads no store state of its own.
 */
export function CardDetailOverlay({ card, onClose }: { card: HazardCardVM; onClose: () => void }) {
    const styles = useStyles();
    return (
        <Pressable style={styles.detailRoot} onPress={onClose} testID="hazard-card-detail">
            <View style={{ paddingTop: 14, paddingHorizontal: 14 }}>
                <CardKeywordLedger
                    keywords={card.keywords.map((kw) => ({ name: kw.name, def: kw.desc }))}
                    testID="hazard-card-detail-keywords"
                />
            </View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} testID="hazard-card-detail-card">
                <Animated.View entering={FadeIn.duration(180)}>
                    <HazardCard card={card} mode="detail" />
                </Animated.View>
                {/* Key the card's two unnamed marks. */}
                <HazardStatKey />
            </View>
            <Text style={[styles.tapToContinue, { paddingBottom: 12 }]}>TAP ANYWHERE TO CLOSE</Text>
        </Pressable>
    );
}

const useStyles = makeStyles((AXM) => ({
    rollRoot: { ...StyleSheet.absoluteFillObject, zIndex: 55, backgroundColor: HUE.rollBg, alignItems: 'center' },
    rollBadge: { fontFamily: FONTS.sans, fontSize: 14, letterSpacing: 2, color: AXM.bg, paddingHorizontal: 12, paddingVertical: 3, overflow: 'hidden' },
    rollTitle: { fontFamily: FONTS.gothic, fontSize: 26, color: AXM.parchment, letterSpacing: 1, marginTop: 14 },
    rollSub: { fontFamily: FONTS.serifItalic, fontStyle: 'italic', fontSize: 14, color: AXM.bone, marginTop: 3 },
    rollDice: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, width: '100%' },
    rollFooter: { paddingBottom: 50, fontFamily: FONTS.mono, fontSize: 12, color: AXM.bone, letterSpacing: 2 },

    flashRoot: { ...StyleSheet.absoluteFillObject, zIndex: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(4,3,3,0.93)' },
    flashEyebrow: { fontFamily: FONTS.sans, fontSize: 13, letterSpacing: 2, color: AXM.bone },
    flashVerdict: { fontFamily: FONTS.gothic, fontSize: 34, letterSpacing: 3, textShadowColor: HUE.black, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 },
    flashStats: { flexDirection: 'row', gap: 14, marginTop: 10 },
    flashStat: { alignItems: 'center', gap: 3, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    flashStatLabel: { fontFamily: FONTS.sans, fontSize: 12, letterSpacing: 1 },
    flashStatValue: { fontFamily: FONTS.sans, fontSize: 20, lineHeight: 21 },
    flashStatNeed: { fontFamily: FONTS.mono, fontSize: 13, color: AXM.bone },
    flashCarry: { fontFamily: FONTS.mono, fontSize: 12, letterSpacing: 1, color: HZ.gold, marginTop: 14 },
    tapToContinue: { marginTop: 22, fontFamily: FONTS.mono, fontSize: 12, color: AXM.bone, letterSpacing: 1.5, textAlign: 'center' },

    outcomeRoot: { ...StyleSheet.absoluteFillObject, zIndex: 60, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: 'rgba(5,4,3,0.97)' },
    outcomeWord: { fontFamily: FONTS.gothic, fontSize: 56, letterSpacing: 3, lineHeight: 58, textShadowColor: HUE.black, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 },
    outcomeSub: { fontFamily: FONTS.sans, fontSize: 13, letterSpacing: 2, color: AXM.bone, marginTop: 10 },
    outcomeLine: { fontFamily: FONTS.serifItalic, fontStyle: 'italic', fontSize: 13, color: AXM.parchment, marginTop: 16, textAlign: 'center', lineHeight: 18, maxWidth: 280 },
    outcomeCta: { marginTop: 30, paddingHorizontal: 28, paddingVertical: 11, borderWidth: 2, backgroundColor: AXM.bg },
    outcomeCtaText: { fontFamily: FONTS.gothic, fontSize: 17, letterSpacing: 2.5 },

    detailRoot: { ...StyleSheet.absoluteFillObject, zIndex: 62, backgroundColor: 'rgba(5,4,3,0.96)' },

}));
