/**
 * HazardStatKey — the legend for the glyph-and-number pair every hazard
 * card prints: the fist is FORCE, the runner is ESCAPE, and the card
 * bears them in that order.
 *
 * Renders two glyph+name chips over the caption from `HAZARD_STAT_KEY`.
 * Reads no store state — the key is static presenter copy.
 *
 * Mounted under the card
 * in `CardDetailOverlay` — the two places a card is studied away from
 * the board's already-labelled FORCE / ESCAPE meters.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HAZARD_STAT_KEY } from '@/state/presenters/hazard.engine';
import { FONTS } from '@/theme/axm';
import { usePalette } from '@/theme/runtime';

import { ProgGlyph } from './glyphs';
import { TYPE_ACCENT } from './palette';

export const HazardStatKey = React.memo(function HazardStatKey() {
    const AXM = usePalette();
    return (
        <View style={styles.root} testID="hazard-stat-key">
            <View style={styles.chips}>
                {HAZARD_STAT_KEY.rows.map((row) => (
                    <View key={row.key} style={[styles.chip, { borderColor: AXM.divider }]}>
                        <ProgGlyph kind={row.key} size={14} color={TYPE_ACCENT[row.key]} />
                        <Text style={[styles.label, { color: TYPE_ACCENT[row.key] }]}>{row.label}</Text>
                    </View>
                ))}
            </View>
            <Text style={[styles.caption, { color: AXM.bone }]}>{HAZARD_STAT_KEY.caption}</Text>
        </View>
    );
});

const styles = StyleSheet.create({
    root: { alignItems: 'center', marginTop: 8 },
    chips: { flexDirection: 'row', gap: 10 },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    label: { fontFamily: FONTS.sans, fontSize: 11, letterSpacing: 1.5 },
    caption: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 0.4, marginTop: 5, textAlign: 'center' },
});
