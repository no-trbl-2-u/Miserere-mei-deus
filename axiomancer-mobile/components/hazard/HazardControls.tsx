/**
 * The Hazard board's three small controls: a draggable mana die in the tray
 * (`TrayDie`), the APPLY button under a staged card (`ApplyButton`) and the
 * pulsing PLAY button (`PlayButton`). Extracted from `HazardBoard` with no
 * change; drag types come from the board as type-only imports.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Haptics } from '@/lib/platform/haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    FadeIn,
    LinearTransition,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

import type { HazardCardVM, HazardDieRoll, HazardDieVM } from '@/state/presenters/hazard.engine';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

import type { DragController } from './HazardBoard';
import { HazardDie } from './HazardDie';
import { DieTumble } from './HazardOverlays';
import { HZ } from './palette';


export function TrayDie({
    die,
    drag,
    ghosted,
    roll,
}: {
    die: HazardDieVM;
    drag: DragController;
    ghosted: boolean;
    roll?: HazardDieRoll;
}) {
    const styles = useStyles();
    const pan = Gesture.Pan()
        .enabled(die.usable)
        .minDistance(6)
        .onStart((e) => {
            runOnJS(drag.begin)({ type: 'die', dieId: die.id, die }, e.absoluteX, e.absoluteY);
        })
        .onUpdate((e) => {
            runOnJS(drag.move)(e.absoluteX, e.absoluteY);
        })
        .onEnd((e) => {
            runOnJS(drag.end)(e.absoluteX, e.absoluteY);
        })
        .onFinalize((e, success) => {
            if (!success) runOnJS(drag.end)(-1, -1);
        });
    return (
        <GestureDetector gesture={pan}>
            <Animated.View
                layout={LinearTransition.duration(180)}
                entering={FadeIn.duration(220)}
                style={{ opacity: ghosted ? 0.25 : 1 }}
                testID={`hazard-die-${die.id}`}
                accessible
                accessibilityLabel={die.accessibilityLabel}
            >
                {roll ? (
                    <DieTumble key={roll.count} index={roll.order} testID={`hazard-die-roll-${die.id}-${roll.count}`}>
                        <HazardDie kind={die.kind} size={42} state={die.state} glow={die.usable} temporary={die.temporary} />
                    </DieTumble>
                ) : (
                    <HazardDie kind={die.kind} size={42} state={die.state} glow={die.usable} temporary={die.temporary} />
                )}
                {die.temporary && <Text style={styles.dieTag}>CONJURED</Text>}
            </Animated.View>
        </GestureDetector>
    );
}

// ---------------------------------------------------------------------------
// APPLY button — under each staged card. Commits the card (fires its
// utility, locks it). Once applied it reads LOCKED and can't be undone.
// ---------------------------------------------------------------------------

export function ApplyButton({ card, onApply }: { card: HazardCardVM; onApply: (uid: string) => void }) {
    const AXM = usePalette();
    const styles = useStyles();
    if (card.applied) {
        return (
            <View style={[styles.applyBtn, styles.applyLocked]} testID={`hazard-applied-${card.uid}`}>
                <Text style={styles.applyLockedText}>✓ LOCKED</Text>
            </View>
        );
    }
    const armed = card.dieAvailable || card.poweredByDieId !== null;
    return (
        <Pressable
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => undefined);
                onApply(card.uid);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Apply ${card.name} — locks it in${card.poweredByDieId ? ', powered' : ''}`}
            testID={`hazard-apply-${card.uid}`}
            style={[styles.applyBtn, { borderColor: armed ? HZ.acid : AXM.bone }]}
        >
            <Text style={[styles.applyText, { color: armed ? HZ.acid : AXM.parchment }]}>APPLY</Text>
        </Pressable>
    );
}

// ---------------------------------------------------------------------------
// PLAY button — translucent sulfur glow, pulsing when armed.
// ---------------------------------------------------------------------------

/** "PLAY" → "Play": the resolve label as the screen reader speaks it. */
function spokenLabel(label: string): string {
    return label.charAt(0) + label.slice(1).toLowerCase();
}

export function PlayButton({
    enabled,
    label,
    subLabel,
    onPress,
}: {
    enabled: boolean;
    label: string;
    subLabel: string;
    onPress: () => void;
}) {
    const AXM = usePalette();
    const styles = useStyles();
    const pulse = useSharedValue(0);
    React.useEffect(() => {
        pulse.value = enabled
            ? withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })), -1)
            : withTiming(0, { duration: 200 });
    }, [enabled, pulse]);
    const glow = useAnimatedStyle(() => ({
        shadowOpacity: enabled ? 0.35 + pulse.value * 0.45 : 0,
    }));
    return (
        <Animated.View style={[styles.playWrap, glow]}>
            <Pressable
                disabled={!enabled}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityState={{ disabled: !enabled }}
                accessibilityLabel={
                    enabled
                        ? `${spokenLabel(label)} — commit every staged card and resolve the round`
                        : `${spokenLabel(label)}, disabled. Stage at least one card first.`
                }
                testID="hazard-play-button"
                style={[
                    styles.playBtn,
                    {
                        borderColor: enabled ? AXM.sulfur : AXM.ash,
                        backgroundColor: enabled ? 'rgba(212,192,38,0.16)' : 'rgba(0,0,0,0.4)',
                    },
                ]}
            >
                <Text style={[styles.playText, { color: enabled ? AXM.sulfur : AXM.bone }]}>{label}</Text>
                <Text style={[styles.playSub, { color: enabled ? AXM.sulfur : AXM.bone }]}>{subLabel}</Text>
            </Pressable>
        </Animated.View>
    );
}


const useStyles = makeStyles((AXM) => ({
    dieTag: { fontFamily: TYPE_ROLES.chip.fontFamily, fontSize: 10, color: AXM.bone, textAlign: 'center', marginTop: 2 },
    applyBtn: {
        width: 70,
        borderWidth: 1.5,
        borderColor: AXM.bone,
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingVertical: 3,
        alignItems: 'center',
        justifyContent: 'center',
    },
    applyText: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 12, letterSpacing: TYPE_ROLES.button.letterSpacing, color: AXM.parchment },
    applyLocked: { borderColor: HZ.acidDim, backgroundColor: 'rgba(134,168,33,0.16)' },
    applyLockedText: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 11, letterSpacing: TYPE_ROLES.button.letterSpacing, color: HZ.acid },
    playWrap: {
        position: 'absolute',
        right: 10,
        bottom: 12,
        zIndex: 40,
        shadowColor: AXM.sulfur,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
    },
    playBtn: { width: 78, height: 78, borderRadius: 39, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
    playText: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 17, letterSpacing: TYPE_ROLES.button.letterSpacing, lineHeight: 18 },
    playSub: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 10, marginTop: 2 },
}));
