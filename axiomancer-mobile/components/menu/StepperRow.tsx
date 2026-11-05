/**
 * StepperRow — a labelled `−  value  +` control for the two volumes. No
 * slider dependency: a stepper is exact, a11y-friendly, and reads fine on
 * web and native alike.
 *
 * Inputs: `label`, `valueLabel` (`70%`), `onDecrement`, `onIncrement`,
 * `atMin` / `atMax` (dim the exhausted verb), `testID`.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { FONTS } from '@/theme/axm';
import { KitBackdrop, KitImage } from '@/components/experience/KitBackdrop';
import { makeStyles } from '@/theme/runtime';

export interface StepperRowProps {
    label: string;
    valueLabel: string;
    onDecrement: () => void;
    onIncrement: () => void;
    atMin?: boolean;
    atMax?: boolean;
    testID: string;
    /** The level as a share of its range, drawn on a kit slider between the verbs. */
    level?: number;
    track?: 'diamond' | 'quatrefoil';
}

export function StepperRow({ label, valueLabel, onDecrement, onIncrement, atMin, atMax, testID, level, track = 'diamond' }: StepperRowProps) {
    const styles = useStyles();
    return (
        <View style={styles.root} testID={testID}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.controls}>
                <Pressable
                    style={[styles.step, atMin && styles.stepOff]}
                    onPress={atMin ? undefined : onDecrement}
                    disabled={atMin}
                    accessibilityRole="button"
                    accessibilityLabel={`${label} down`}
                    testID={`${testID}-down`}
                >
                    <KitBackdrop piece="icon-button-square" />
                    <Text style={styles.stepLabel}>−</Text>
                </Pressable>
                {level !== undefined ? (
                    <View style={styles.slider} pointerEvents="none">
                        <KitImage piece={track === 'diamond' ? 'slider-track-diamond' : 'slider-track-quatrefoil'} style={styles.sliderTrack} />
                        <KitImage
                            piece={track === 'diamond' ? 'slider-knob-diamond' : 'slider-knob-round'}
                            style={[styles.sliderKnob, { left: `${Math.round(level * 100)}%` }]}
                        />
                    </View>
                ) : null}
                <Text style={styles.value} testID={`${testID}-value`}>{valueLabel}</Text>
                <Pressable
                    style={[styles.step, atMax && styles.stepOff]}
                    onPress={atMax ? undefined : onIncrement}
                    disabled={atMax}
                    accessibilityRole="button"
                    accessibilityLabel={`${label} up`}
                    testID={`${testID}-up`}
                >
                    <KitBackdrop piece="icon-button-square" />
                    <Text style={styles.stepLabel}>+</Text>
                </Pressable>
            </View>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: AXM.divider,
        backgroundColor: AXM.panelBg,
    },
    label: { fontFamily: FONTS.sans, fontSize: 12, letterSpacing: 2, color: AXM.parchment },
    controls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    step: {
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepOff: { opacity: 0.35 },
    stepLabel: { fontFamily: FONTS.mono, fontSize: 16, color: AXM.sulfur },
    slider: { width: 96, height: 22, justifyContent: 'center' },
    sliderTrack: { width: '100%', height: 8 },
    sliderKnob: { position: 'absolute', top: 2, width: 18, height: 18, marginLeft: -9 },
    value: { fontFamily: FONTS.mono, fontSize: 11, color: AXM.parchment, minWidth: 32, textAlign: 'center' },
}));
