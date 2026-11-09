/**
 * The rarity affordance, all three legs in one mark: a NAMED label, a
 * PIP ROW, and the band's frame colour — never colour alone.
 *
 * The pip COUNT is the load-bearing half (it survives greyscale and every
 * form of colour blindness); the hue is decoration on top of it, and the word
 * is the fallback for anyone who reads neither. All three values arrive
 * pre-resolved from `state/presenters/card-rarity.engine.ts` via the deck
 * view-model — this component derives nothing and must never band a rank.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

export interface RarityMarkProps {
    /** 'Common' | 'Uncommon' | 'Rare'. */
    label: string;
    /** How many pips to draw — 1, 2, or 3. */
    pips: number;
    /** The band's hue. */
    color: string;
    /** Tile-sized rather than detail-sized. */
    compact?: boolean;
    testID?: string;
}

export function RarityMark({ label, pips, color, compact = false, testID }: RarityMarkProps) {
    const styles = useStyles();
    const count = Math.max(0, Math.floor(pips));
    const dot = compact ? styles.pipSmall : styles.pip;

    return (
        <View
            style={styles.row}
            testID={testID}
            accessible
            // The screen reader gets the WORD. It cannot see pips and it
            // certainly cannot see a hex.
            accessibilityLabel={`${label} card`}
        >
            <View style={styles.pips} importantForAccessibility="no-hide-descendants">
                {Array.from({ length: count }, (_, i) => (
                    <View key={i} style={[dot, { backgroundColor: color, borderColor: color }]} />
                ))}
            </View>
            <Text
                style={[compact ? styles.labelSmall : styles.label, { color }]}
                importantForAccessibility="no-hide-descendants"
            >
                {label.toUpperCase()}
            </Text>
        </View>
    );
}

const useStyles = makeStyles(() => ({
    row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    pips: { flexDirection: 'row', gap: 3, alignItems: 'center' },
    pip: { width: 7, height: 7, borderRadius: 1, borderWidth: StyleSheet.hairlineWidth },
    pipSmall: { width: 5, height: 5, borderRadius: 1, borderWidth: StyleSheet.hairlineWidth },
    label: { fontFamily: TYPE_ROLES.eyebrow.fontFamily, fontSize: 11, letterSpacing: TYPE_ROLES.eyebrow.letterSpacing},
    labelSmall: { fontFamily: TYPE_ROLES.eyebrow.fontFamily, fontSize: 9, letterSpacing: TYPE_ROLES.eyebrow.letterSpacing},
}));
