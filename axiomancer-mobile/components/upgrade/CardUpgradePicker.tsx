/**
 * The shared card-upgrade screen (Phase UP1d): the cards that can still take
 * an upgrade, and for the one the player taps, the card as it is beside the
 * card after this upgrade and a locked "???" slot. The rest site hosts it
 * now; the blacksmith and the elite reward reuse it.
 *
 * Picking a row only previews. The upgrade commits on the confirm button,
 * which hands the picked id to the host's `onConfirm`; every rule (what may
 * be upgraded, what it becomes) is the engine's, read through the presenter.
 */

import React, { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import {
    CARD_UPGRADE_AFTER_LABEL,
    CARD_UPGRADE_CONFIRM_LABEL,
    CARD_UPGRADE_FREE_TAG,
    CARD_UPGRADE_LOCKED_LABEL,
    CARD_UPGRADE_LOCKED_NOTE,
    CARD_UPGRADE_NOW_LABEL,
    CARD_UPGRADE_PAID_TAG,
    CARD_UPGRADE_PICK_HINT,
    CARD_UPGRADE_SHEET_INTRO,
    CARD_UPGRADE_SHEET_TITLE,
} from '@/state/presenters/card-upgrade.copy';
import {
    cardUpgradePreviewVM,
    type CardUpgradeFaceVM,
    type CardUpgradeRowVM,
} from '@/state/presenters/card-upgrade.engine';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

export interface CardUpgradePickerProps {
    rows: readonly CardUpgradeRowVM[];
    /** Commits the upgrade of `cardId`. Called only from the confirm button. */
    onConfirm: (cardId: string) => void;
    /** A price or a note the host shows above the list, e.g. the anvil's cost. */
    priceLine?: string | null;
}

function Face({ face, label, testID }: { face: CardUpgradeFaceVM; label: string; testID: string }) {
    const styles = useStyles();
    return (
        <View style={styles.face} testID={testID}>
            <Text style={styles.faceLabel}>{label}</Text>
            <Text style={styles.faceName} testID={`${testID}-name`}>{face.name}</Text>
            <Text style={styles.faceLine}>{face.outcomeLine}</Text>
            <Text style={styles.faceTag}>{CARD_UPGRADE_FREE_TAG}</Text>
            <Text style={styles.faceLine} testID={`${testID}-free`}>{face.freeText}</Text>
            {face.paidText !== null && (
                <>
                    <Text style={styles.faceTag}>{CARD_UPGRADE_PAID_TAG}</Text>
                    <Text style={styles.faceLine} testID={`${testID}-paid`}>{face.paidText}</Text>
                </>
            )}
        </View>
    );
}

export function CardUpgradePicker({ rows, onConfirm, priceLine }: CardUpgradePickerProps) {
    const styles = useStyles();
    const AXM = usePalette();
    const [picked, setPicked] = useState<string | null>(null);
    const preview = useMemo(() => (picked === null ? null : cardUpgradePreviewVM(picked)), [picked]);

    return (
        <View testID="card-upgrade-sheet">
            <Text style={styles.eyebrow}>{CARD_UPGRADE_SHEET_TITLE}</Text>
            <Text style={styles.body}>{CARD_UPGRADE_SHEET_INTRO}</Text>
            {priceLine ? <Text style={styles.priceHint} testID="card-upgrade-price">{priceLine}</Text> : null}
            <View style={styles.list}>
                {rows.map((row) => {
                    const selected = row.cardId === picked;
                    return (
                        <TouchableOpacity
                            key={row.cardId}
                            accessibilityRole="button"
                            accessibilityLabel={`Preview the upgrade of ${row.name}`}
                            accessibilityState={{ selected }}
                            onPress={() => setPicked(row.cardId)}
                            style={[styles.row, selected && { borderColor: AXM.sulfur }]}
                            testID={`card-upgrade-row-${row.cardId}`}
                        >
                            <Text style={styles.rowName}>
                                {row.name}{row.count > 1 ? ` ×${row.count}` : ''}
                            </Text>
                            <Text style={styles.rowStep}>{row.stepLabel}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {preview === null ? (
                <Text style={styles.hint}>{CARD_UPGRADE_PICK_HINT}</Text>
            ) : (
                <View testID="card-upgrade-preview">
                    <Text style={styles.priceHint}>{preview.stepLabel}</Text>
                    <View style={styles.faces}>
                        <Face face={preview.before} label={CARD_UPGRADE_NOW_LABEL} testID="card-upgrade-now" />
                        <Face face={preview.after} label={CARD_UPGRADE_AFTER_LABEL} testID="card-upgrade-after" />
                        <View
                            style={[styles.face, styles.locked]}
                            accessibilityLabel={`Locked. ${CARD_UPGRADE_LOCKED_NOTE}`}
                            testID="card-upgrade-locked"
                        >
                            <Text style={styles.lockedMark}>{CARD_UPGRADE_LOCKED_LABEL}</Text>
                            <Text style={styles.faceLine}>{CARD_UPGRADE_LOCKED_NOTE}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Upgrade ${preview.before.name}`}
                        onPress={() => onConfirm(preview.before.cardId)}
                        style={styles.confirm}
                        testID="card-upgrade-confirm"
                    >
                        <Text style={styles.confirmText}>{CARD_UPGRADE_CONFIRM_LABEL}</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    eyebrow: { fontFamily: FONTS.sans, fontSize: 12, letterSpacing: 2.2, color: AXM.bone, marginBottom: 4 },
    body: { fontFamily: FONTS.serif, fontSize: 13, lineHeight: 19, color: AXM.parchment, marginBottom: 8 },
    priceHint: { fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 0.5, color: AXM.sulfur, marginBottom: 8 },
    hint: { fontFamily: FONTS.serifItalic, fontSize: 12, color: AXM.bone },
    list: { marginBottom: 8 },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.bg,
        padding: 8,
        marginBottom: 4,
    },
    rowName: { flexShrink: 1, fontFamily: FONTS.mono, fontSize: 13, color: AXM.parchment },
    rowStep: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 0.5, color: AXM.bone },
    faces: { flexDirection: 'row', gap: 6, alignItems: 'stretch' },
    face: {
        flex: 1,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.panelBg,
        padding: 6,
        gap: 2,
    },
    faceLabel: { fontFamily: FONTS.sans, fontSize: 10, letterSpacing: 1.5, color: AXM.bone },
    faceName: { fontFamily: FONTS.gothic, fontSize: 14, color: AXM.parchment },
    faceTag: { fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 0.5, color: AXM.sulfur, marginTop: 2 },
    faceLine: { fontFamily: FONTS.serif, fontSize: 11, lineHeight: 15, color: AXM.parchmentDim },
    locked: { opacity: 0.55, alignItems: 'center', justifyContent: 'center' },
    lockedMark: { fontFamily: FONTS.gothic, fontSize: 22, color: AXM.bone },
    confirm: {
        borderWidth: 2,
        borderColor: AXM.sulfur,
        marginTop: 10,
        paddingVertical: 10,
        alignItems: 'center',
        backgroundColor: AXM.bg,
    },
    confirmText: { fontFamily: FONTS.gothic, fontSize: 18, letterSpacing: 2, color: AXM.sulfur },
}));
