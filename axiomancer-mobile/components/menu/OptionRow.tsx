/**
 * OptionRow — a labelled segmented choice (SMALL / DEFAULT / LARGE …,
 * SYSTEM / ON / OFF, ON / OFF). One row, one setting.
 *
 * Inputs: `label`, `hint`, `options` (value + label), `value`, `onChange`,
 * `testID`. Generic over the option value; the row never inspects it
 * beyond equality.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { OptionVM } from '@/state/presenters/settings.engine';
import { FONTS } from '@/theme/axm';
import { KitBackdrop, KitImage } from '@/components/experience/KitBackdrop';
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
}

const TOGGLE_W = 72;
const TOGGLE_H = 34;
const KNOB = 25;

export function OptionRow<V extends string | number | boolean>({
    label, hint, options, value, onChange, testID, radio = false,
}: OptionRowProps<V>) {
    const styles = useStyles();
    // A plain on/off draws as the kit's toggle; its two halves stay the two choices.
    const toggle = options.length === 2 && options.every((o) => typeof o.value === 'boolean');
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
                    if (toggle || radio) {
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
                            style={[styles.segment, selected && styles.segmentOn]}
                            onPress={() => onChange(opt.value)}
                            accessibilityRole="radio"
                            accessibilityState={{ selected, checked: selected }}
                            accessibilityLabel={`${label}: ${opt.label}`}
                            testID={`${testID}-${String(opt.value)}`}
                        >
                            {({ pressed }) => (
                                <>
                                    <KitBackdrop piece={selected ? 'segment-button-selected' : pressed ? 'segment-button-pressed' : 'segment-button-idle'} />
                                    <Text style={[styles.segmentLabel, selected && styles.segmentLabelOn]}>{opt.label}</Text>
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
    label: { fontFamily: FONTS.sans, fontSize: 12, letterSpacing: 2, color: AXM.parchment },
    hint: { fontFamily: FONTS.serifItalic, fontSize: 11, color: AXM.bone, marginTop: 2 },
    segments: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    segment: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        minWidth: 72,
        alignItems: 'center',
    },
    segmentOn: {},
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
    segmentLabel: { fontFamily: FONTS.gothic, fontSize: 12, letterSpacing: 1.5, color: AXM.bone },
    segmentLabelOn: { color: AXM.bg },
}));
