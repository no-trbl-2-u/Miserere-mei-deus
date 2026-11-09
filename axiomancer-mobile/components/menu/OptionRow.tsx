/**
 * OptionRow — a labelled segmented choice (SMALL / DEFAULT / LARGE …,
 * SYSTEM / ON / OFF, ON / OFF). One row, one setting.
 *
 * Inputs: `label`, `hint`, `options` (value + label), `value`, `onChange`,
 * `testID`, `radio`. Generic over the option value; the row never inspects it
 * beyond equality. Three brass looks, each its own place in the look table:
 * segmented buttons (O-03), radio rings (`radio`, O-04) and, for a plain
 * ON / OFF pair of booleans, the kit's toggle (O-05).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { OptionVM } from '@/state/presenters/settings.engine';
import { KitBackdrop, KitImage } from '@/components/experience/KitBackdrop';
import { LOOKS } from '@/components/experience/looks';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

export interface OptionRowProps<V> {
    label: string;
    hint?: string;
    options: readonly OptionVM<V>[];
    value: V;
    onChange: (value: V) => void;
    testID: string;
    /** Draw the choices as radio rings rather than segments. */
    radio?: boolean;
    /** Opt out of the brass looks (a picker outside Settings keeps the plain segments). */
    plain?: boolean;
}

const TOGGLE_W = 72;
const TOGGLE_H = 34;
const KNOB = 25;

export function OptionRow<V extends string | number | boolean>({
    label, hint, options, value, onChange, testID, radio = false, plain = false,
}: OptionRowProps<V>) {
    const styles = useStyles();
    const isToggle = options.length === 2 && options.every((o) => typeof o.value === 'boolean');
    const toggle = isToggle && !plain && LOOKS['O-05'] === 'brass';
    const rings = !isToggle && radio && !plain && LOOKS['O-04'] === 'brass';
    const segmentKit = !isToggle && !rings && !plain && LOOKS['O-03'] === 'brass';
    return (
        <View style={styles.root} testID={testID}>
            <View style={styles.text}>
                <Text style={styles.label}>{label}</Text>
                {hint ? <Text style={styles.hint}>{hint}</Text> : null}
            </View>
            <View style={[styles.segments, toggle && styles.toggle]} accessibilityRole="radiogroup">
                {toggle ? (
                    <>
                        <KitImage
                            piece={value === true ? 'toggle-shell-active' : 'toggle-shell-inactive'}
                            style={[StyleSheet.absoluteFill, value !== true && styles.flipped]}
                        />
                        <KitImage piece="slider-knob-round" style={[styles.knob, value === true ? styles.knobOn : styles.knobOff]} />
                    </>
                ) : null}
                {options.map((opt) => {
                    const selected = opt.value === value;
                    if (toggle || rings) {
                        return (
                            <Pressable
                                key={String(opt.value)}
                                style={toggle ? [styles.toggleHalf, opt.value === true ? styles.toggleHalfOn : styles.toggleHalfOff] : styles.radio}
                                onPress={() => onChange(opt.value)}
                                accessibilityRole="radio"
                                accessibilityState={{ selected, checked: selected }}
                                accessibilityLabel={`${label}: ${opt.label}`}
                                testID={`${testID}-${String(opt.value)}`}
                            >
                                {toggle ? null : (
                                    <>
                                        <View style={styles.ring}>
                                            <KitImage piece="radio-ring" style={StyleSheet.absoluteFill} />
                                            {selected ? <View style={styles.ringDot} /> : null}
                                        </View>
                                        <Text style={[styles.segmentLabel, selected && styles.radioLabelOn]}>{opt.label}</Text>
                                    </>
                                )}
                            </Pressable>
                        );
                    }
                    return (
                        <Pressable
                            key={String(opt.value)}
                            style={[styles.segment, segmentKit && styles.segmentKit, !segmentKit && selected && styles.segmentOn]}
                            onPress={() => onChange(opt.value)}
                            accessibilityRole="radio"
                            accessibilityState={{ selected, checked: selected }}
                            accessibilityLabel={`${label}: ${opt.label}`}
                            testID={`${testID}-${String(opt.value)}`}
                        >
                            {({ pressed }) => (
                                <>
                                    {segmentKit ? (
                                        <KitBackdrop piece={selected ? 'segment-button-selected' : pressed ? 'segment-button-pressed' : 'segment-button-idle'} />
                                    ) : null}
                                    <Text style={[styles.segmentLabel, selected && (segmentKit ? styles.segmentLabelKitOn : styles.segmentLabelOn)]}>{opt.label}</Text>
                                </>
                            )}
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: AXM.divider,
        backgroundColor: AXM.panelBg,
        gap: 8,
    },
    text: {},
    label: { fontFamily: TYPE_ROLES.eyebrow.fontFamily, fontSize: 12, letterSpacing: TYPE_ROLES.eyebrow.letterSpacing, color: AXM.parchment },
    hint: { fontFamily: TYPE_ROLES.narration.fontFamily, fontSize: 11, color: AXM.bone, marginTop: 2 },
    segments: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    segment: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: 'transparent',
        minWidth: 64,
        alignItems: 'center',
    },
    // The segment art is the frame; its corners need clear padding.
    segmentKit: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        minWidth: 72,
        borderWidth: 0,
        borderBottomWidth: 0,
        backgroundColor: 'transparent',
    },
    toggle: { width: TOGGLE_W, height: TOGGLE_H, flexWrap: 'nowrap', gap: 0 },
    flipped: { transform: [{ scaleX: -1 }] },
    knob: { position: 'absolute', top: (TOGGLE_H - KNOB) / 2, width: KNOB, height: KNOB },
    knobOn: { right: 3 },
    knobOff: { left: 3 },
    toggleHalf: { position: 'absolute', top: 0, bottom: 0, width: '50%' },
    toggleHalfOn: { right: 0 },
    toggleHalfOff: { left: 0 },
    radio: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 12 },
    ring: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
    ringDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: AXM.sulfur },
    radioLabelOn: { color: AXM.sulfur },
    segmentLabelKitOn: { color: AXM.bg },
    segmentOn: { borderColor: AXM.sulfur, backgroundColor: AXM.selectFill },
    segmentLabel: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 12, letterSpacing: TYPE_ROLES.button.letterSpacing, color: AXM.bone },
    segmentLabelOn: { color: AXM.sulfur },
}));
