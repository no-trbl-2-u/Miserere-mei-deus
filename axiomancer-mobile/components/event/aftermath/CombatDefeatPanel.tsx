/**
 * CombatDefeatPanel — the "the page closes" panel rendered inside
 * the encounter modal seal once `lastOutcome === 'defeat'`.
 *
 * Sibling of `<CombatVictoryPanel>` but tuned darker — no splatter, no
 * pixel emblem, no celebration. A spent-wick hairline above the
 * title, gothic character name, italic fell-to line, mono damage
 * ledger, chronicle paragraph with drop-cap, run-summary ledger
 * (rounds endured · encounters faced · deepest node), and a bottom
 * blood seep clipped to a torn edge.
 *
 * Two action buttons:
 *   1. `BEGIN AGAIN` — primary parchment-bordered gothic. Wired
 *      via `onBeginAgain`; the call site resets the run (keeping the
 *      character) and dismisses.
 *   2. `let the page close` — ghost bone-italic lowercase. Wired
 *      via `onLetClose`; the panel dismisses without resetting
 *      anything, leaving the player on the map at 0 HP (the
 *      "abandon run" path).
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { FiligreeRule } from '@/components/art/Filigree';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import type { AftermathDefeatViewModel } from '@/state/presenters/aftermath.engine';
import { toRomanLower } from '@/state/presenters/roman';

export interface CombatDefeatPanelProps {
    vm: AftermathDefeatViewModel;
    onBeginAgain: () => void;
    onLetClose: () => void;
}

// Lowercase Roman numerals come from `@/state/presenters/roman`; the
// call sites pass `·` as the helper's `fallback` for n <= 0.

export function CombatDefeatPanel({ vm, onBeginAgain, onLetClose }: CombatDefeatPanelProps) {
    const AXM = usePalette();
    const styles = useStyles();
    const deepest = vm.runSummary.deepestNodeId ?? '·';
    return (
        <View style={styles.root} testID="combat-defeat-panel">
            {/* Spent wick — a single hairline drop from the very top
                with an extinguished ember at its tip. */}
            <View style={styles.wickStem} />
            <View style={styles.wickEmber} />

            <View style={styles.body}>
                <Text style={styles.eyebrow}>✠ THE PAGE CLOSES</Text>

                <Text
                    style={styles.characterName}
                    testID="combat-defeat-panel-character-name"
                >
                    {vm.characterName}
                </Text>

                {vm.killer !== null && (
                    <Text
                        style={styles.fellTo}
                        testID="combat-defeat-panel-killer"
                    >
                        fell to <Text style={styles.fellToName}>{vm.killer.name}</Text>
                        {vm.killer.epithet !== null && (
                            <>
                                {', '}
                                <Text style={styles.fellToEpithet}>{vm.killer.epithet}</Text>
                            </>
                        )}
                    </Text>
                )}

                {vm.killer !== null && (
                    <Text style={styles.damageLedger}>
                        {vm.killer.finalCard} · {vm.killer.damage}
                    </Text>
                )}

                <Text
                    style={styles.causePhrase}
                    testID="combat-defeat-panel-cause-phrase"
                >
                    {vm.causePhrase}
                </Text>

                <View style={styles.ledgerSpacer}>
                    <FiligreeRule width="40%" color={AXM.ash} />
                </View>

                <View style={styles.ledger} testID="combat-defeat-panel-ledger">
                    <Text style={styles.ledgerHeader}>· LEDGER ·</Text>
                    <LedgerRow
                        label="rounds endured"
                        value={toRomanLower(vm.runSummary.rounds, '·')}
                    />
                    <LedgerRow
                        label="encounters survived"
                        value={toRomanLower(vm.runSummary.encountersFaced, '·')}
                    />
                    <LedgerRow
                        label="deepest node"
                        value={deepest}
                    />
                </View>

                <View style={styles.actions}>
                    <Pressable
                        onPress={onBeginAgain}
                        accessibilityRole="button"
                        accessibilityLabel="Begin again"
                        testID="combat-defeat-panel-begin-again"
                        style={({ pressed }) => [
                            styles.beginAgain,
                            pressed && styles.beginAgainPressed,
                        ]}
                    >
                        <Text style={styles.beginAgainLabel}>✠ BEGIN AGAIN</Text>
                    </Pressable>
                    <Pressable
                        onPress={onLetClose}
                        accessibilityRole="button"
                        accessibilityLabel="Let the page close"
                        testID="combat-defeat-panel-let-close"
                        style={styles.letClose}
                    >
                        <Text style={styles.letCloseLabel}>let the page close</Text>
                    </Pressable>
                </View>
            </View>

            {/*
             * Bottom blood seep — a vertical gradient clipped by a
             * torn edge. react-native doesn't ship gradient
             * primitives, but a stacked solid + half-opacity wash
             * gives a similar feel. The torn edge is approximated
             * with a thicker top border of mixed blood + ash dots.
             */}
            <View style={styles.bloodSeep} pointerEvents="none">
                <View style={styles.bloodSeepInner} />
            </View>
        </View>
    );
}

function LedgerRow({ label, value }: { label: string; value: string }) {
    const styles = useStyles();
    return (
        <View style={styles.ledgerRow}>
            <Text style={styles.ledgerLabel}>{label}</Text>
            <Text style={styles.ledgerValue}>{value}</Text>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: {
        flex: 1,
        backgroundColor: AXM.deepBg,
        position: 'relative',
    },
    wickStem: {
        position: 'absolute',
        top: 28,
        left: '50%',
        width: 1,
        height: 80,
        backgroundColor: AXM.ash,
    },
    wickEmber: {
        position: 'absolute',
        top: 26,
        left: '50%',
        marginLeft: -2,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: AXM.ash,
    },
    body: {
        flex: 1,
        paddingTop: 120,
        paddingHorizontal: 24,
        paddingBottom: 14,
    },
    eyebrow: {
        fontFamily: FONTS.sans,
        fontSize: 11,
        color: AXM.blood,
        letterSpacing: 2.2,
        textAlign: 'center',
    },
    characterName: {
        fontFamily: FONTS.gothic,
        fontSize: 28,
        lineHeight: 30,
        letterSpacing: 1,
        color: AXM.parchment,
        textAlign: 'center',
        marginTop: 14,
    },
    fellTo: {
        fontFamily: FONTS.serifItalic,
        fontSize: 13,
        color: AXM.bone,
        marginTop: 8,
        textAlign: 'center',
    },
    fellToName: {
        color: AXM.parchment,
    },
    fellToEpithet: {
        fontStyle: 'italic',
    },
    damageLedger: {
        fontFamily: FONTS.mono,
        // Was AXM.ash (~2.1:1) at 9px — the killing-blow readout ("STRIKE
        // · 6"), the single most important fact on a death screen, was the
        // dimmest text on the panel. Lift to AXM.bone (~6.5:1) at 11px so a
        // low-vision player can read what felled them.
        fontSize: 11,
        letterSpacing: 1.4,
        color: AXM.bone,
        marginTop: 6,
        textAlign: 'center',
    },
    causePhrase: {
        fontFamily: FONTS.serif,
        fontSize: 14,
        lineHeight: 22,
        color: AXM.parchment,
        marginTop: 22,
        textAlign: 'left',
    },
    ledgerSpacer: { flex: 1, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
    ledger: {
        marginBottom: 16,
        paddingVertical: 6,
    },
    ledgerHeader: {
        fontFamily: FONTS.sans,
        fontSize: 9,
        color: AXM.bone,
        letterSpacing: 2,
        opacity: 0.7,
        textAlign: 'center',
        marginBottom: 6,
    },
    ledgerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingVertical: 8,
        paddingHorizontal: 2,
        borderTopWidth: 1,
        borderTopColor: AXM.ash,
        borderStyle: 'dotted',
    },
    ledgerLabel: {
        fontFamily: FONTS.serifItalic,
        fontSize: 12,
        color: AXM.bone,
    },
    ledgerValue: {
        fontFamily: FONTS.mono,
        fontSize: 14,
        color: AXM.parchment,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    beginAgain: {
        flex: 1.4,
        paddingVertical: 12,
        backgroundColor: AXM.silhouette,
        borderWidth: 2,
        borderColor: AXM.parchment,
        alignItems: 'center',
        justifyContent: 'center',
    },
    beginAgainPressed: { opacity: 0.85 },
    beginAgainLabel: {
        fontFamily: FONTS.gothic,
        fontSize: 16,
        color: AXM.parchment,
        letterSpacing: 2,
    },
    letClose: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    letCloseLabel: {
        fontFamily: FONTS.serifItalic,
        fontSize: 13,
        color: AXM.bone,
    },
    bloodSeep: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 80,
        opacity: 0.55,
    },
    bloodSeepInner: {
        flex: 1,
        backgroundColor: AXM.blood,
        borderTopWidth: 4,
        borderTopColor: AXM.blood,
        borderStyle: 'dashed',
        opacity: 0.6,
    },
}));
