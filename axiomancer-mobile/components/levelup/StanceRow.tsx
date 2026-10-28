import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { SectionLabel } from '@/components/SectionLabel';
import { StanceGlyph } from '@/components/StanceGlyph';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

export type LevelStance = 'heart' | 'body' | 'mind';

export interface StanceRowProps {
    stance: LevelStance;
    current: number;
    spent: number;
    canInc: boolean;
    canDec: boolean;
    onInc: () => void;
    onDec: () => void;
}

export function StanceRow({ stance, current, spent, canInc, canDec, onInc, onDec }: StanceRowProps) {
    const styles = useStyles();
    const AXM = usePalette();
    const newValue = current + spent;
    const showDelta = spent > 0;
    return (
        <View style={styles.row} testID={`levelup-modal-row-${stance}`}>
            {/* Left — stance emblem */}
            <View style={styles.emblemCol}>
                <View style={styles.emblemFrame}>
                    <StanceGlyph kind={stance} size={32} color={AXM.parchment} />
                </View>
                <SectionLabel size={9}>{stance.toUpperCase()}</SectionLabel>
            </View>

            {/* Middle — counter */}
            <View style={styles.counterCol}>
                <View style={styles.numericRow}>
                    <Text style={styles.bigNumber}>{newValue}</Text>
                    <Text style={styles.fromText}>from {current}</Text>
                </View>
                {showDelta ? (
                    <Text style={styles.deltaLabel}>+{spent}</Text>
                ) : (
                    <View style={styles.deltaWaiting} />
                )}
            </View>

            {/* Right — ± controls */}
            <View style={styles.controlsCol}>
                <Pressable
                    onPress={canInc ? onInc : undefined}
                    accessibilityRole="button"
                    accessibilityLabel={`Increment ${stance}`}
                    accessibilityState={{ disabled: !canInc }}
                    testID={`levelup-modal-inc-${stance}`}
                    style={[
                        styles.btn,
                        styles.btnInc,
                        !canInc && styles.btnDisabled,
                    ]}
                >
                    <Text
                        style={[
                            styles.btnGlyph,
                            { color: canInc ? AXM.sulfur : AXM.ash },
                        ]}
                    >
                        +
                    </Text>
                </Pressable>
                <Pressable
                    onPress={canDec ? onDec : undefined}
                    accessibilityRole="button"
                    accessibilityLabel={`Decrement ${stance}`}
                    accessibilityState={{ disabled: !canDec }}
                    testID={`levelup-modal-dec-${stance}`}
                    style={[
                        styles.btn,
                        styles.btnDec,
                        !canDec && styles.btnDisabled,
                    ]}
                >
                    <Text
                        style={[
                            styles.btnGlyph,
                            { color: canDec ? AXM.bone : AXM.ash },
                        ]}
                    >
                        −
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: AXM.ash,
        borderStyle: 'dotted',
    },
    emblemCol: { alignItems: 'center', gap: 4, width: 60 },
    emblemFrame: {
        width: 50,
        height: 50,
        borderWidth: 1,
        borderColor: AXM.parchment,
        backgroundColor: AXM.panelBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    counterCol: { flex: 1, alignItems: 'flex-start' },
    numericRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    bigNumber: {
        fontFamily: FONTS.sans,
        fontSize: 36,
        color: AXM.sulfur,
        letterSpacing: 1,
    },
    fromText: {
        fontFamily: FONTS.mono,
        fontSize: 8,
        color: AXM.bone,
    },
    deltaLabel: {
        fontFamily: FONTS.mono,
        fontSize: 11,
        color: AXM.parchment,
        opacity: 0.5,
        marginTop: 2,
    },
    deltaWaiting: {
        width: 24,
        height: 1,
        backgroundColor: AXM.sulfur,
        opacity: 0.4,
        marginTop: 8,
    },
    controlsCol: { gap: 4 },
    btn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: AXM.panelBg,
    },
    btnInc: { borderWidth: 1, borderColor: AXM.parchment },
    btnDec: { borderWidth: 1, borderColor: AXM.ash, borderStyle: 'dashed' },
    btnDisabled: { borderColor: AXM.ash },
    btnGlyph: {
        fontFamily: FONTS.gothic,
        fontSize: 22,
        lineHeight: 22,
    },
}));