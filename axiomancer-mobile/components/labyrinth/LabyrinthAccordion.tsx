/**
 * The Accordion (T's core UI idea, DESIGN.md section 7) — collapsible
 * panel at the bottom of the room scene.
 *
 * Collapsed: display number + room name strip. Expanded: the
 * Sophist's narration ("what you see"), the act riddle, the Pocket
 * (fragments as chips — reorderable only at gate/center socket UIs,
 * so here they are read-only), and Ask the Sophist (three hint tiers,
 * prices in real coin — real-units-or-no-number rule).
 *
 * All strings arrive on the VM (Hard Rule #8).
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { LABYRINTH_COPY } from '@/state/presenters/labyrinth.engine';
import type { LabyrinthRoomVM } from '@/state/presenters/labyrinth.engine';
import { FONTS } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

interface LabyrinthAccordionProps {
    room: LabyrinthRoomVM;
    onBuyHint: (tier: 1 | 2 | 3) => void;
    /** Latest hint line bought (shown under the tier buttons). */
    hintLine: string | null;
    onSettleDebt: (() => void) | null;
}

export function LabyrinthAccordion({
    room,
    onBuyHint,
    hintLine,
    onSettleDebt,
}: LabyrinthAccordionProps) {
    const styles = useStyles();
    const [expanded, setExpanded] = useState(false);

    return (
        <View style={styles.wrap} testID="labyrinth-accordion">
            <Pressable
                onPress={() => setExpanded((e) => !e)}
                style={styles.strip}
                testID="labyrinth-accordion-toggle"
            >
                <Text style={styles.stripNumber}>{room.display}</Text>
                <Text style={styles.stripName} numberOfLines={1}>{room.name}</Text>
                <Text style={styles.stripChevron}>{expanded ? '▾' : '▴'}</Text>
            </Pressable>

            {expanded && (
                <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
                    <Text style={styles.sectionLabel}>{LABYRINTH_COPY.narrationLabel}</Text>
                    <Text style={styles.narration}>{room.narration}</Text>

                    <Text style={styles.sectionLabel}>{LABYRINTH_COPY.riddleLabel}</Text>
                    <Text style={styles.riddle}>{room.riddle}</Text>

                    <Text style={styles.sectionLabel}>{LABYRINTH_COPY.pocketLabel}</Text>
                    {room.pocket.length === 0 ? (
                        <Text style={styles.pocketEmpty}>{LABYRINTH_COPY.pocketEmpty}</Text>
                    ) : (
                        <View style={styles.chipRow}>
                            {room.pocket.map((chip, i) => (
                                <View key={`${chip.word}-${i}`} style={styles.chip}>
                                    <Text style={styles.chipWord}>{chip.word}</Text>
                                    <Text style={styles.chipSource}>{chip.source}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    <Text style={styles.sectionLabel}>{LABYRINTH_COPY.hintsLabel}</Text>
                    <Text style={styles.debtLine}>{room.debtLine}</Text>
                    {room.hints.map((hint) => (
                        <Pressable
                            key={hint.tier}
                            onPress={() => hint.affordable && onBuyHint(hint.tier)}
                            style={[styles.hintRow, !hint.affordable && styles.hintRowDisabled]}
                            testID={`labyrinth-hint-${hint.tier}`}
                        >
                            <View style={styles.hintText}>
                                <Text style={styles.hintLabel}>{hint.label}</Text>
                                <Text style={styles.hintDesc}>{hint.desc}</Text>
                            </View>
                            <Text style={styles.hintPrice}>
                                {hint.price} {LABYRINTH_COPY.hintPriceSuffix}
                            </Text>
                        </Pressable>
                    ))}
                    {hintLine !== null && (
                        <Text style={styles.hintLine} testID="labyrinth-hint-line">{hintLine}</Text>
                    )}

                    {room.settle && (
                        <>
                            <Text style={styles.sectionLabel}>{LABYRINTH_COPY.settleLabel}</Text>
                            <Text style={styles.narration}>
                                {room.settle.outstanding === 0
                                    ? LABYRINTH_COPY.settleNothingOwed
                                    : LABYRINTH_COPY.settleLine(
                                        room.settle.outstanding,
                                        room.settle.pricePerPoint,
                                    )}
                            </Text>
                            {room.settle.canAfford && onSettleDebt && (
                                <Pressable
                                    onPress={onSettleDebt}
                                    style={styles.settleButton}
                                    testID="labyrinth-settle"
                                >
                                    <Text style={styles.settleButtonText}>
                                        {LABYRINTH_COPY.settleButton}
                                    </Text>
                                </Pressable>
                            )}
                        </>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    wrap: {
        borderTopWidth: 2,
        borderTopColor: AXM.ash,
        backgroundColor: AXM.panelBg,
    },
    strip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 10,
    },
    stripNumber: {
        fontFamily: FONTS.sans,
        fontSize: 22,
        color: AXM.sulfur,
    },
    stripName: {
        flex: 1,
        fontFamily: FONTS.serif,
        fontSize: 15,
        color: AXM.parchment,
    },
    stripChevron: {
        fontFamily: FONTS.sans,
        fontSize: 14,
        color: AXM.bone,
    },
    body: {
        // The accordion floats over the scene — it may cover most of it
        // when expanded (T's call: "the accordion can go over the screen").
        maxHeight: 460,
    },
    bodyContent: {
        paddingHorizontal: 14,
        paddingBottom: 16,
    },
    sectionLabel: {
        fontFamily: FONTS.sans,
        fontSize: 11,
        letterSpacing: 2,
        color: AXM.bone,
        marginTop: 12,
        marginBottom: 4,
    },
    narration: {
        fontFamily: FONTS.serif,
        fontSize: 14,
        lineHeight: 20,
        color: AXM.parchment,
    },
    riddle: {
        fontFamily: FONTS.serif,
        fontSize: 14,
        lineHeight: 20,
        fontStyle: 'italic',
        color: AXM.sulfur,
    },
    pocketEmpty: {
        fontFamily: FONTS.serif,
        fontSize: 13,
        color: AXM.bone,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    chip: {
        borderWidth: 1,
        borderColor: AXM.rust,
        paddingHorizontal: 8,
        paddingVertical: 4,
        alignItems: 'center',
    },
    chipWord: {
        fontFamily: FONTS.sans,
        fontSize: 13,
        letterSpacing: 1,
        color: AXM.parchment,
    },
    chipSource: {
        fontFamily: FONTS.serif,
        fontSize: 9,
        color: AXM.bone,
    },
    debtLine: {
        fontFamily: FONTS.mono,
        fontSize: 11,
        color: AXM.rust,
        marginBottom: 6,
    },
    hintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: AXM.ash,
        padding: 8,
        marginBottom: 6,
    },
    hintRowDisabled: {
        opacity: 0.45,
    },
    hintText: {
        flex: 1,
    },
    hintLabel: {
        fontFamily: FONTS.sans,
        fontSize: 13,
        letterSpacing: 1,
        color: AXM.parchment,
    },
    hintDesc: {
        fontFamily: FONTS.serif,
        fontSize: 11,
        color: AXM.bone,
    },
    hintPrice: {
        fontFamily: FONTS.mono,
        fontSize: 12,
        color: AXM.sulfur,
    },
    hintLine: {
        fontFamily: FONTS.serif,
        fontSize: 13,
        fontStyle: 'italic',
        color: AXM.parchment,
        marginTop: 4,
    },
    settleButton: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: AXM.sulfur,
        paddingVertical: 8,
        alignItems: 'center',
    },
    settleButtonText: {
        fontFamily: FONTS.sans,
        fontSize: 13,
        letterSpacing: 2,
        color: AXM.sulfur,
    },
}));
