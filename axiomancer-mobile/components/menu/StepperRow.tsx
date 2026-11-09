/**
 * StepperRow — a labelled `−  value  +` control for the two volumes. No
 * slider dependency: a stepper is exact, a11y-friendly, and reads fine on
 * web and native alike.
 *
 * Inputs: `label`, `valueLabel` (`70%`), `onDecrement`, `onIncrement`,
 * `atMin` / `atMax` (dim the exhausted verb), `testID`. With a `level` (0-1)
 * and a brass look the row also draws the kit's slider between the verbs;
 * the verbs stay the only controls.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { KitBackdrop, KitImage } from '@/components/experience/KitBackdrop';
import { LOOKS } from '@/components/experience/looks';
import { TYPE_ROLES } from '@/theme/axm';
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
    const kit = LOOKS['O-06'] === 'brass';
    return (
        <View style={styles.root} testID={testID}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.controls}>
                <Pressable
                    style={[styles.step, kit && styles.stepKit, atMin && styles.stepOff]}
                    onPress={atMin ? undefined : onDecrement}
                    disabled={atMin}
                    accessibilityRole="button"
                    accessibilityLabel={`${label} down`}
                    testID={`${testID}-down`}
                >
                    {kit ? <KitBackdrop piece="icon-button-square" /> : null}
                    <Text style={styles.stepLabel}>−</Text>
                </Pressable>
                {kit && level !== undefined ? (
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
                    style={[styles.step, kit && styles.stepKit, atMax && styles.stepOff]}
                    onPress={atMax ? undefined : onIncrement}
                    disabled={atMax}
                    accessibilityRole="button"
                    accessibilityLabel={`${label} up`}
                    testID={`${testID}-up`}
                >
                    {kit ? <KitBackdrop piece="icon-button-square" /> : null}
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
        flexWrap: 'wrap',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: AXM.divider,
        backgroundColor: AXM.panelBg,
    },
    label: { flexShrink: 1, fontFamily: TYPE_ROLES.eyebrow.fontFamily, fontSize: 12, letterSpacing: TYPE_ROLES.eyebrow.letterSpacing, color: AXM.parchment },
    controls: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: 8 },
    step: {
        width: 34,
        height: 30,
        borderWidth: 1,
        borderColor: AXM.sulfur,
        backgroundColor: AXM.selectFill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // The art is the frame: no border, no fill, and the border widths are
    // zeroed side by side so none survives.
    stepKit: {
        height: 34,
        borderWidth: 0,
        borderBottomWidth: 0,
        backgroundColor: 'transparent',
    },
    slider: { width: 64, flexShrink: 1, height: 22, justifyContent: 'center' },
    sliderTrack: { width: '100%', height: 8 },
    sliderKnob: { position: 'absolute', top: 2, width: 18, height: 18, marginLeft: -9 },
    stepOff: { opacity: 0.35 },
    stepLabel: { fontFamily: TYPE_ROLES.eyebrow.fontFamily, fontSize: 16, color: AXM.sulfur },
    value: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 12, color: AXM.parchment, minWidth: 40, textAlign: 'center' },
}));
