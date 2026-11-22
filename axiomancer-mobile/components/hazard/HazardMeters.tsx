/**
 * The Hazard board's live progress meters: one segmented bar per meter
 * (`SegBar`) and the panel that stacks them with the threshold ladder and the
 * momentum note (`LiveMeter`). Extracted from `HazardBoard` with no change.
 */

import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import type { HazardMeterVM, HazardViewModel } from '@/state/presenters/hazard.engine';
import { hazardMeterSpokenLabel } from '@/state/presenters/hazard.engine';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

import { ProgGlyph } from './glyphs';
import { DEBT_ACCENT, HZ, TYPE_ACCENT } from './palette';

export function SegBar({ meter }: { meter: HazardMeterVM }) {
    const AXM = usePalette();
    const styles = useStyles();
    const accent = TYPE_ACCENT[meter.key];
    const segs = Math.max(1, meter.need);
    return (
        <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={hazardMeterSpokenLabel(meter)}
            accessibilityValue={{ min: Math.min(0, meter.value), max: meter.need, now: meter.value }}
            testID={`hazard-meter-${meter.key}`}
        >
            <View style={styles.meterHead}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <ProgGlyph kind={meter.key} size={13} color={accent} />
                    <Text style={[styles.meterLabel, { color: accent }]}>{meter.label}</Text>
                    {meter.debt && (
                        <Text testID={`hazard-meter-${meter.key}-debt`} style={[styles.debtTag, { borderColor: DEBT_ACCENT, color: DEBT_ACCENT }]}>
                            DEBT
                        </Text>
                    )}
                </View>
                <Text style={[styles.meterValue, { color: meter.debt ? DEBT_ACCENT : meter.met ? accent : AXM.parchment }]}>
                    {meter.valueLabel}
                    <Text style={{ color: AXM.bone }}> / {meter.need}</Text>
                    {meter.met ? ' ✓' : ''}
                </Text>
            </View>
            <View style={styles.segRow}>
                {Array.from({ length: segs }, (_, i) => {
                    const filled = i < meter.value;
                    return (
                        <Animated.View
                            key={i}
                            layout={LinearTransition.duration(140)}
                            style={[
                                styles.seg,
                                {
                                    borderColor: filled ? accent : meter.debt ? DEBT_ACCENT : AXM.ash,
                                    backgroundColor: filled ? accent : 'rgba(0,0,0,0.45)',
                                },
                            ]}
                        />
                    );
                })}
            </View>
        </View>
    );
}

export function LiveMeter({ vm }: { vm: HazardViewModel }) {
    const styles = useStyles();
    // Memoized expensive calculation for threshold ladder text
    const ladderText = useMemo(() => {
        return vm.thresholdLadder
            .map((row) => `${row.label} ${row.values.map((v, i) => (i === 0 ? `${v}` : `·${v}`)).join('')}`)
            .join('   ');
    }, [vm.thresholdLadder]);
    return (
        <View style={styles.meterPanel} testID="hazard-meters">
            {vm.meters.map((meter, i) => (
                <React.Fragment key={meter.key}>
                    <SegBar meter={meter} />
                    {vm.bothRequired && i === 0 && (
                        <View style={styles.bothRow}>
                            <View style={styles.bothLine} />
                            <Text style={styles.bothText}>BOTH REQUIRED</Text>
                            <View style={styles.bothLine} />
                        </View>
                    )}
                </React.Fragment>
            ))}
            {vm.meterDetail !== null && <Text style={styles.meterDetail}>{vm.meterDetail}</Text>}
            {/* full ladder + momentum (REC#1 / REC#2) */}
            <View style={styles.metaRow}>
                <Text style={styles.ladderText}>
                    {ladderText}
                </Text>
                {vm.momentumNote !== null && <Text style={styles.momentum}>⟜ {vm.momentumNote}</Text>}
            </View>
        </View>
    );
}


const useStyles = makeStyles((AXM) => ({
    meterPanel: { paddingHorizontal: 12, paddingVertical: 7, backgroundColor: 'rgba(6,5,4,0.82)', borderBottomWidth: 1, borderBottomColor: AXM.ash },
    meterHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 },
    meterLabel: { fontFamily: TYPE_ROLES.eyebrow.fontFamily, fontSize: 12, letterSpacing: TYPE_ROLES.eyebrow.letterSpacing},
    meterValue: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 14 },
    debtTag: { fontFamily: TYPE_ROLES.chip.fontFamily, fontSize: 11, borderWidth: 1, paddingHorizontal: 4, lineHeight: 13 },
    segRow: { flexDirection: 'row', gap: 2, height: 13 },
    seg: { flex: 1, borderWidth: 1 },
    bothRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 5 },
    bothLine: { flex: 1, height: 1, backgroundColor: AXM.ash },
    bothText: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 11, color: AXM.sulfur },
    meterDetail: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 11, color: AXM.bone, marginTop: 3 },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    ladderText: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 10, color: AXM.bone},
    momentum: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 11, color: HZ.gold},
}));
