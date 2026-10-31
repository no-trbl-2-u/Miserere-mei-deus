/**
 * The CHARACTER SELECT screen: `/character-select?slot=<n>`.
 *
 * A fighting-game select. Top to bottom: the portrait and the starting relic
 * (the two focal elements), the stats, the one-line playstyle, CONFIRM, and a
 * two-row carousel of squares at the very bottom (a character square shows a
 * small portrait, a locked square a question mark). No lane, lane colour or
 * card appears anywhere: the pool a character opens is learned by playing.
 *
 * Flow: `/saves?mode=new` opens this screen after the slot pick once the
 * roster holds a character. CONFIRM starts the run as the shown character in
 * the slot and enters it; BACK returns to the slot list and writes nothing.
 * A run end (`?runEnd=1`, `state/run-end.ts`) opens it for the same slot and
 * CONFIRM carries that slot's codex into the next run.
 * `?locked=1` (the `/dev` row) shows the all-locked state and cannot confirm.
 */

import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { getPlayerPortrait } from '@/assets/images/portraits';
import { ScreenBg } from '@/components/ScreenBg';
import { SectionLabel } from '@/components/SectionLabel';
import { ItemGlyph } from '@/components/inventory/ItemCard';
import { Image } from '@/lib/platform/image';
import { useLocalSearchParams, useRouter } from '@/lib/platform/router';
import { useGameStore } from '@/state/GameStoreProvider';
import { useSaveSlots } from '@/state/SaveSlotsProvider';
import type { SaveSlotId } from '@/state/persistence/saveSlots';
import {
    CHARACTER_SELECT_COPY as COPY,
    buildCharacterSelectVM,
    selectRoster,
    type CharacterSquareVM,
} from '@/state/presenters/character-select.engine';
import { RUN_END_PARAM } from '@/state/run-end';
import { selectActiveTab } from '@/state/presenters/navigation.engine';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

/** The starting relic's mark, in points. */
const RELIC_MARK_SIZE = 44;

function readSlot(raw: unknown): SaveSlotId | null {
    const n = Number(raw);
    return n === 1 || n === 2 || n === 3 ? n : null;
}

export default function CharacterSelectScreen() {
    const AXM = usePalette();
    const styles = useStyles();
    const router = useRouter();
    const store = useGameStore();
    const { startNewGame, slots } = useSaveSlots();
    const params = useLocalSearchParams<{ slot?: string; locked?: string; runEnd?: string }>();
    const slot = readSlot(params.slot);
    const locked = params.locked === '1';
    const runEnd = params[RUN_END_PARAM] === '1';

    const roster = selectRoster();
    const [pickedId, setPickedId] = useState<string | null>(null);
    const vm = buildCharacterSelectVM(roster, pickedId, locked);
    const selected = vm.selected;
    const canConfirm = selected !== null && slot !== null && !locked;

    const onConfirm = useCallback(() => {
        if (selected === null || slot === null || locked) return;
        // A run end carries the slot's codex into the next run; a plain new game opens a blank one.
        const finished = runEnd ? slots.readSlot(slot) : null;
        const codex = finished?.runOver === true ? finished.codex : undefined;
        startNewGame(slot, undefined, selected.id, roster, codex);
        router.replace(`/${selectActiveTab(store.getState())}`);
    }, [locked, roster, router, runEnd, selected, slot, slots, startNewGame, store]);

    const renderSquare = (sq: CharacterSquareVM) => {
        if (sq.kind === 'locked') {
            return (
                <View
                    key={sq.key}
                    style={[styles.square, styles.squareLocked]}
                    accessible
                    accessibilityRole="image"
                    accessibilityLabel={COPY.locked}
                    testID={`character-select-${sq.key}`}
                >
                    <Text style={styles.questionMark} testID={`character-select-${sq.key}-icon`}>?</Text>
                </View>
            );
        }
        return (
            <Pressable
                key={sq.key}
                style={[styles.square, sq.selected && styles.squareSelected]}
                onPress={() => setPickedId(sq.characterId ?? null)}
                accessibilityRole="button"
                accessibilityLabel={sq.label}
                accessibilityState={{ selected: sq.selected }}
                testID={`character-select-square-${sq.characterId}`}
            >
                <Image
                    source={getPlayerPortrait(sq.portraitKey).source}
                    style={styles.squareImage}
                    contentFit="cover"
                    contentPosition="top center"
                    transition={0}
                />
            </Pressable>
        );
    };

    return (
        <ScreenBg scrollable={false}>
            <View style={styles.root}>
                <View style={styles.headerRow}>
                    <View style={styles.headerText}>
                        <SectionLabel size={10} color={AXM.bone}>{COPY.eyebrow}</SectionLabel>
                        <Text style={styles.title}>{COPY.title}</Text>
                    </View>
                    <Pressable
                        style={styles.backBtn}
                        onPress={() => (runEnd ? router.replace('/saves?mode=load') : router.back())}
                        accessibilityRole="button"
                        accessibilityLabel={COPY.back}
                        testID="character-select-back"
                    >
                        <Text style={styles.backLabel}>✕</Text>
                    </Pressable>
                </View>

                <View style={styles.focal}>
                    <View style={styles.portraitFrame} testID="character-select-portrait">
                        {selected !== null ? (
                            <Image
                                source={getPlayerPortrait(selected.portraitKey).source}
                                style={styles.portraitImage}
                                contentFit="contain"
                                contentPosition="top center"
                                transition={0}
                                accessibilityLabel={selected.name}
                            />
                        ) : (
                            <Text style={styles.portraitLocked}>?</Text>
                        )}
                    </View>
                    <View style={styles.relicBox} testID="character-select-relic">
                        <Text style={styles.relicLabel}>{COPY.relicLabel}</Text>
                        {selected !== null ? (
                            <>
                                <ItemGlyph category="equipment" sub="Relic" itemId={selected.relicId} size={RELIC_MARK_SIZE} />
                                <Text style={styles.relicName} testID="character-select-relic-name">
                                    {selected.relicName}
                                </Text>
                            </>
                        ) : (
                            <Text style={styles.relicLocked}>?</Text>
                        )}
                    </View>
                </View>

                {selected !== null ? (
                    <>
                        <Text style={styles.name} testID="character-select-name">{selected.name}</Text>
                        <View style={styles.statsRow} testID="character-select-stats">
                            {selected.stats.map((stat) => (
                                <View key={stat.key} style={styles.stat} testID={`character-select-stat-${stat.key}`}>
                                    <Text style={styles.statLabel}>{stat.label}</Text>
                                    <Text style={styles.statValue}>{stat.value}</Text>
                                </View>
                            ))}
                        </View>
                        <Text style={styles.playstyle} testID="character-select-playstyle">{selected.playstyle}</Text>
                    </>
                ) : (
                    <View testID="character-select-empty">
                        <Text style={styles.name}>{COPY.lockedHeadline}</Text>
                        <Text style={styles.playstyle}>{COPY.lockedLine}</Text>
                    </View>
                )}

                <Pressable
                    style={[styles.confirm, !canConfirm && styles.confirmOff]}
                    onPress={onConfirm}
                    disabled={!canConfirm}
                    accessibilityRole="button"
                    accessibilityLabel={COPY.confirm}
                    accessibilityState={{ disabled: !canConfirm }}
                    testID="character-select-confirm"
                >
                    <Text style={styles.confirmLabel}>{COPY.confirm}</Text>
                </Pressable>

                <View style={styles.spacer} />

                <View style={styles.carousel} testID="character-select-carousel">
                    {vm.rows.map((row, r) => (
                        <View key={r} style={styles.carouselRow} testID={`character-select-row-${r}`}>
                            {row.map(renderSquare)}
                        </View>
                    ))}
                </View>
            </View>
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: { flex: 1, paddingHorizontal: 12, paddingBottom: 12 },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingTop: 12,
        paddingBottom: 6,
    },
    headerText: { flex: 1 },
    title: { fontFamily: FONTS.gothic, fontSize: 22, color: AXM.sulfur, letterSpacing: 1, marginTop: 1 },
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
    focal: { flexDirection: 'row', gap: 10, height: 220 },
    portraitFrame: {
        flex: 3,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.deepBg,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    portraitImage: { width: '100%', height: '100%' },
    portraitLocked: { fontFamily: FONTS.gothic, fontSize: 72, color: AXM.ash },
    relicBox: {
        flex: 2,
        borderWidth: 1,
        borderColor: AXM.sulfur,
        backgroundColor: AXM.panelBg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 8,
    },
    relicLabel: { fontFamily: FONTS.mono, fontSize: 10, color: AXM.bone, letterSpacing: 1 },
    relicName: { fontFamily: FONTS.gothic, fontSize: 16, color: AXM.parchment, textAlign: 'center' },
    relicLocked: { fontFamily: FONTS.gothic, fontSize: 44, color: AXM.ash },
    name: { fontFamily: FONTS.gothic, fontSize: 20, color: AXM.parchment, marginTop: 10 },
    statsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    stat: {
        flex: 1,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.panelBg,
        alignItems: 'center',
        paddingVertical: 6,
    },
    statLabel: { fontFamily: FONTS.mono, fontSize: 10, color: AXM.bone, letterSpacing: 1 },
    statValue: { fontFamily: FONTS.sans, fontSize: 22, color: AXM.parchment },
    playstyle: { fontFamily: FONTS.serifItalic, fontSize: 13, color: AXM.bone, marginTop: 8 },
    confirm: {
        marginTop: 12,
        height: 46,
        borderWidth: 1,
        borderColor: AXM.sulfur,
        backgroundColor: AXM.selectFill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmOff: { borderColor: AXM.ash, opacity: 0.5 },
    confirmLabel: { fontFamily: FONTS.gothic, fontSize: 18, color: AXM.sulfur, letterSpacing: 2 },
    spacer: { flex: 1, minHeight: 8 },
    carousel: { gap: 8 },
    carouselRow: { flexDirection: 'row', gap: 8 },
    square: {
        flex: 1,
        aspectRatio: 1,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.panelBg,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    squareSelected: { borderColor: AXM.sulfur, borderWidth: 2 },
    squareLocked: { backgroundColor: AXM.deepBg },
    squareImage: { width: '100%', height: '100%' },
    questionMark: { fontFamily: FONTS.gothic, fontSize: 28, color: AXM.ash },
}));
