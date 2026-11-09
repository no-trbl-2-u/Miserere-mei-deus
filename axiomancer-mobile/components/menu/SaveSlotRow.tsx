/**
 * SaveSlotRow — one of the three chronicle rows on the slot screen.
 *
 * Draws the numeral, the detail line (`Level 3 · Northern Forest` / `an
 * empty page` / the torn line), the stamp, and up to two verbs: the primary
 * action for the mode (BEGIN / OVERWRITE / JOURNEY ON…) and DELETE SAVE for
 * any non-empty slot. Confirmation for the destructive verbs is the SCREEN's
 * job (it owns the sheet); this row only reports the tap.
 *
 * Inputs: `row` (a `SaveSlotRowVM`), `onAction`, `onClear`.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { VELLUM_INK, VELLUM_OXBLOOD } from '@/components/experience/KitBackdrop';
import { KitPressable, KitSurface } from '@/components/experience/KitSurface';
import { PLACE_PIECES, lookOf } from '@/components/experience/looks';
import type { SaveSlotRowVM } from '@/state/presenters/main-menu.engine';
import { SAVE_SLOTS_COPY } from '@/state/presenters/main-menu.engine';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

/** The vellum row (N-01) and the vellum button (N-02) the slot rows wear. */
const [ROW] = PLACE_PIECES['N-01'];
const [BUTTON] = PLACE_PIECES['N-02'];
const WEAR_ROW = lookOf('N-01') !== 'normal';
const WEAR_BUTTON = lookOf('N-02') !== 'normal';
/** The row piece is drawn smaller than its default, so its side corners leave room for text on a phone. */
const ROW_SCALE = 0.3;

export interface SaveSlotRowProps {
    row: SaveSlotRowVM;
    onAction: (row: SaveSlotRowVM) => void;
    onClear: (row: SaveSlotRowVM) => void;
}

export function SaveSlotRow({ row, onAction, onClear }: SaveSlotRowProps) {
    const styles = useStyles();
    const torn = row.status === 'unreadable';
    const hasAction = row.action !== 'none';
    return (
        <KitSurface
            wear={WEAR_ROW}
            piece={ROW}
            scale={ROW_SCALE}
            style={[
                styles.root,
                WEAR_ROW ? styles.rootKit : [styles.rootPlain, row.mostRecent && styles.recent, torn && styles.torn],
            ]}
            testID={`save-slot-${row.id}`}
            accessibilityLabel={`Chronicle ${row.numeral}: ${row.detail}${row.stamp ? `, ${row.stamp}` : ''}`}
        >
            <View testID={`save-slot-${row.id}-numeral`} style={[styles.numeralBox, WEAR_ROW && styles.numeralBoxKit, WEAR_ROW && row.mostRecent && styles.numeralBoxRecentKit, WEAR_ROW && torn && styles.numeralBoxTornKit]}>
                <Text style={[styles.numeral, WEAR_ROW && styles.inkAccent]}>{row.numeral}</Text>
            </View>
            <View style={styles.text}>
                <Text style={[styles.detail, WEAR_ROW && styles.inkBody, torn && styles.detailTorn, torn && WEAR_ROW && styles.inkAccent]} numberOfLines={2}>{row.detail}</Text>
                {row.stamp ? <Text style={[styles.stamp, WEAR_ROW && styles.inkBody]}>{row.stamp}</Text> : null}
            </View>
            <View style={styles.verbs}>
                {hasAction ? (
                    <KitPressable
                        wear={WEAR_BUTTON}
                        piece={BUTTON}
                        plainOpacity
                        style={WEAR_BUTTON ? styles.verbKit : [styles.verb, row.action === 'overwrite' && styles.verbDanger]}
                        onPress={() => onAction(row)}
                        accessibilityRole="button"
                        accessibilityLabel={`${row.actionLabel} chronicle ${row.numeral}`}
                        testID={`save-slot-${row.id}-action`}
                    >
                        <Text
                            style={[
                                styles.verbLabel,
                                row.action === 'overwrite' && styles.verbLabelDanger,
                                WEAR_BUTTON && (row.action === 'overwrite' ? styles.inkAccent : styles.inkBody),
                            ]}
                        >
                            {row.actionLabel}
                        </Text>
                    </KitPressable>
                ) : null}
                {row.clearable ? (
                    <Pressable
                        style={({ pressed }) => [styles.verb, styles.verbGhost, WEAR_ROW && styles.verbGhostInk, pressed && styles.verbPressed]}
                        onPress={() => onClear(row)}
                        accessibilityRole="button"
                        accessibilityLabel={`${SAVE_SLOTS_COPY.clearAction} chronicle ${row.numeral}`}
                        testID={`save-slot-${row.id}-clear`}
                    >
                        <Text style={[styles.verbLabelGhost, WEAR_ROW && styles.inkBody]}>{SAVE_SLOTS_COPY.clearAction}</Text>
                    </Pressable>
                ) : null}
            </View>
        </KitSurface>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    rootPlain: {
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.panelBg,
    },
    // Clears the vellum row's drawn corners at ROW_SCALE (about 10 high, 31 wide).
    rootKit: { paddingVertical: 16, paddingHorizontal: 34 },
    recent: { borderColor: AXM.sulfur },
    torn: { borderColor: AXM.blood, borderStyle: 'dashed' },
    numeralBox: {
        width: 44,
        height: 48,
        borderWidth: 1,
        borderColor: AXM.parchment,
        backgroundColor: AXM.deepBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    numeral: { fontFamily: TYPE_ROLES.bigNumber.fontFamily, fontSize: 22, color: AXM.sulfur },
    text: { flex: 1 },
    detail: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 14, color: AXM.parchment },
    detailTorn: { color: AXM.blood, fontFamily: TYPE_ROLES.narration.fontFamily },
    stamp: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 9, color: AXM.bone, marginTop: 3 },
    verbs: { gap: 6, alignItems: 'stretch' },
    verb: {
        paddingVertical: 7,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: AXM.sulfur,
        backgroundColor: AXM.selectFill,
        alignItems: 'center',
    },
    verbKit: { paddingVertical: 18, paddingHorizontal: 16, alignItems: 'center' },
    verbDanger: { borderColor: AXM.blood, backgroundColor: AXM.bg },
    verbGhost: { borderColor: AXM.ash, borderStyle: 'dashed', backgroundColor: 'transparent' },
    verbPressed: { opacity: 0.7 },
    verbLabel: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 12, letterSpacing: TYPE_ROLES.button.letterSpacing, color: AXM.sulfur },
    verbLabelDanger: { color: AXM.blood },
    verbGhostInk: { borderColor: VELLUM_INK },
    inkBody: { color: VELLUM_INK },
    inkAccent: { color: VELLUM_OXBLOOD },
    numeralBoxKit: { borderColor: VELLUM_INK, backgroundColor: 'transparent' },
    // On vellum the most-recent slot inks its numeral box in oxblood, and a torn save dashes it.
    numeralBoxRecentKit: { borderColor: VELLUM_OXBLOOD, borderWidth: 2 },
    numeralBoxTornKit: { borderColor: VELLUM_OXBLOOD, borderStyle: 'dashed' },
    verbLabelGhost: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 11, letterSpacing: TYPE_ROLES.button.letterSpacing, color: AXM.bone },
}));
