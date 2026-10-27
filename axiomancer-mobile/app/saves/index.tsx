/**
 * The SAVE SLOTS screen — `/saves?mode=new|load` (three save slots).
 *
 * One screen, two modes:
 *   - `new`  — NEW GAME. An empty row BEGINs at once; an occupied row asks
 *              before it is OVERWRITTEN.
 *   - `load` — LOAD GAME. An occupied row offers JOURNEY ON…; empty rows
 *              have no verb.
 * In both modes any non-empty row (including a torn one) offers DELETE
 * SAVE behind a confirmation.
 *
 * The rows come from `selectSaveSlotRows` over the live slot summaries;
 * the verbs are the `useSaveSlots()` actions. After a BEGIN / RESUME the
 * screen replaces itself with the run's active tab (combat if a fight was
 * saved mid-encounter, the map otherwise). Once the character roster holds a
 * character, a new game's slot pick opens `/character-select` instead, and
 * its CONFIRM starts the run.
 */

import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ConfirmSheet } from '@/components/menu/ConfirmSheet';
import { SaveSlotRow } from '@/components/menu/SaveSlotRow';
import { ScreenBg } from '@/components/ScreenBg';
import { SectionLabel } from '@/components/SectionLabel';
import { useLocalSearchParams, useRouter } from '@/lib/platform/router';
import { useGameStore } from '@/state/GameStoreProvider';
import { useSaveSlots, useSaveSlotSummaries } from '@/state/SaveSlotsProvider';
import type { SaveSlotId } from '@/state/persistence/saveSlots';
import {
    SAVE_SLOTS_COPY,
    selectSaveSlotRows,
    type SaveSlotRowVM,
    type SaveSlotsMode,
} from '@/state/presenters/main-menu.engine';
import { selectRoster } from '@/state/presenters/character-select.engine';
import { selectActiveTab } from '@/state/presenters/navigation.engine';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

/** A pending destructive choice awaiting the sheet's answer. */
type Pending = { kind: 'overwrite' | 'clear'; slot: SaveSlotId } | null;

function readMode(raw: unknown): SaveSlotsMode {
    return raw === 'load' ? 'load' : 'new';
}

export default function SaveSlotsScreen() {
    const AXM = usePalette();
    const styles = useStyles();
    const router = useRouter();
    const store = useGameStore();
    const params = useLocalSearchParams<{ mode?: string }>();
    const mode = readMode(params.mode);
    const summaries = useSaveSlotSummaries();
    const { startNewGame, loadGame, clearSlot } = useSaveSlots();
    const [pending, setPending] = useState<Pending>(null);

    const rows = selectSaveSlotRows(summaries, mode, Date.now());

    /** Enter the run the store now holds. */
    const enterRun = useCallback(() => {
        router.replace(`/${selectActiveTab(store.getState())}`);
    }, [router, store]);

    /**
     * Begin a new game in `slot`: straight into the run while the roster is
     * empty, otherwise through the character select (which starts the run on
     * CONFIRM, so an abandoned select writes nothing to the slot).
     */
    const beginRun = useCallback((slot: SaveSlotId) => {
        if (selectRoster().length > 0) {
            router.push(`/character-select?slot=${slot}`);
            return;
        }
        startNewGame(slot);
        enterRun();
    }, [enterRun, router, startNewGame]);

    const onAction = useCallback((row: SaveSlotRowVM) => {
        if (row.action === 'start') {
            beginRun(row.id);
        } else if (row.action === 'overwrite') {
            setPending({ kind: 'overwrite', slot: row.id });
        } else if (row.action === 'load') {
            if (loadGame(row.id)) enterRun();
        }
    }, [beginRun, enterRun, loadGame]);

    const onClear = useCallback((row: SaveSlotRowVM) => {
        setPending({ kind: 'clear', slot: row.id });
    }, []);

    const onConfirm = useCallback(() => {
        if (pending === null) return;
        const { kind, slot } = pending;
        setPending(null);
        if (kind === 'overwrite') {
            beginRun(slot);
        } else {
            void clearSlot(slot);
        }
    }, [beginRun, clearSlot, pending]);

    return (
        <ScreenBg>
            <View style={styles.headerRow}>
                <View style={styles.headerText}>
                    <SectionLabel size={10} color={AXM.bone}>{SAVE_SLOTS_COPY.eyebrow}</SectionLabel>
                    <Text style={styles.title}>
                        {mode === 'new' ? SAVE_SLOTS_COPY.titleNew : SAVE_SLOTS_COPY.titleLoad}
                    </Text>
                    <Text style={styles.subtitle}>
                        {mode === 'new' ? SAVE_SLOTS_COPY.subtitleNew : SAVE_SLOTS_COPY.subtitleLoad}
                    </Text>
                </View>
                <Pressable
                    style={styles.backBtn}
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel={SAVE_SLOTS_COPY.back}
                    testID="saves-back"
                >
                    <Text style={styles.backLabel}>✕</Text>
                </Pressable>
            </View>

            <View style={styles.list} testID={`saves-${mode}`}>
                {rows.map((row) => (
                    <SaveSlotRow key={row.id} row={row} onAction={onAction} onClear={onClear} />
                ))}
            </View>

            <ConfirmSheet
                visible={pending !== null}
                title={pending?.kind === 'clear' ? SAVE_SLOTS_COPY.clearTitle : SAVE_SLOTS_COPY.overwriteTitle}
                body={pending?.kind === 'clear' ? SAVE_SLOTS_COPY.clearBody : SAVE_SLOTS_COPY.overwriteBody}
                confirmLabel={pending?.kind === 'clear' ? SAVE_SLOTS_COPY.clearConfirm : SAVE_SLOTS_COPY.overwriteConfirm}
                cancelLabel={SAVE_SLOTS_COPY.cancel}
                onConfirm={onConfirm}
                onCancel={() => setPending(null)}
                testID="saves-confirm"
            />
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 6,
    },
    headerText: { flex: 1 },
    title: { fontFamily: FONTS.gothic, fontSize: 22, color: AXM.sulfur, letterSpacing: 1, marginTop: 1 },
    subtitle: { fontFamily: FONTS.serifItalic, fontSize: 12, color: AXM.bone, marginTop: 2 },
    backBtn: {
        width: 40,
        height: 40,
        borderWidth: 1,
        borderColor: AXM.ash,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: AXM.panelBg,
    },
    backLabel: { fontFamily: FONTS.mono, fontSize: 16, color: AXM.bone },
    list: { paddingHorizontal: 12, paddingTop: 10, gap: 10 },
}));
