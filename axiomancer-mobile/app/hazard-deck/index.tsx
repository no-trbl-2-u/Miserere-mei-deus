/**
 * Persistent Hazard deck / library screen.
 *
 * Reachable outside an encounter (from the SELF tab) so the player can
 * study the durable deck they carry between hazards: the implicit
 * starter bag plus every reward / CRACK card acquired. Shows the full
 * card list (tap to inspect), colour / type / keyword distributions,
 * and a remove-card grid.
 *
 * Phase orchestration only: composition is mechanics truth, the
 * presenter maps it (`selectHazardDeckViewModel`), this screen renders
 * the VM. Remove-card is wired but BLOCKED — the engine exposes no
 * remove action yet, so the grid surfaces a graceful
 * blocked state rather than mutating the save.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from '@/lib/platform/router';

import { ScreenBg } from '@/components/ScreenBg';
import { SectionLabel } from '@/components/SectionLabel';
import { CardDetailOverlay } from '@/components/hazard/HazardOverlays';
import { HazardCard } from '@/components/hazard/HazardCard';
import { HazardRemoveGrid } from '@/components/hazard/HazardRemoveGrid';
import { HazardStatKey } from '@/components/hazard/HazardStatKey';
import { DIE, HZ } from '@/components/hazard/palette';
import { TooltipTarget } from '@/components/tooltip/TooltipTarget';
import { useGameState } from '@/state/GameStoreProvider';
import { selectHazardDeckViewModel } from '@/state/presenters/hazard-deck.engine';
import type { HazardCardVM } from '@/state/presenters/hazard.engine';
import { FONTS, HUE } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

export default function HazardDeckScreen() {
    const AXM = usePalette();
    const styles = useStyles();
    const router = useRouter();

    const player = useGameState((s) => s.player);
    const flags = useGameState((s) => s.flags);
    const vm = useMemo(
        () => selectHazardDeckViewModel({ player, flags } as never),
        [player, flags],
    );

    const [detailCard, setDetailCard] = useState<HazardCardVM | null>(null);
    const [removeOpen, setRemoveOpen] = useState(false);

    const removableEntries = useMemo(
        () => vm.entries.filter((e) => e.removable),
        [vm.entries],
    );

    const onConfirmRemove = useCallback((_cardId: string) => {
        // Wired endpoint for when the engine opens a remove-card action.
        // Until then `vm.removeBlocked` is true and the grid never calls
        // this with a live write (it shows the blocked banner instead).
    }, []);

    return (
        <ScreenBg>
            <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                    <SectionLabel size={10} color={AXM.bone}>HAZARD</SectionLabel>
                    <Text style={styles.title}>THE DECK YOU CARRY</Text>
                </View>
                <Pressable
                    style={styles.backBtn}
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    testID="hazard-deck-back"
                >
                    <Text style={styles.backLabel}>✕</Text>
                </Pressable>
            </View>

            {/* Headline tallies */}
            <View style={styles.statRow} accessible accessibilityLabel={`${vm.totalCards} cards, ${vm.distinctCards} distinct, ${vm.acquiredCards} acquired, ${vm.scarCards} scars`}>
                <Stat label="CARDS" value={vm.totalCards} />
                <Stat label="DISTINCT" value={vm.distinctCards} />
                <Stat label="ACQUIRED" value={vm.acquiredCards} tone={HZ.gold} />
                <Stat label="SCARS" value={vm.scarCards} tone={AXM.blood} />
            </View>

            {/* Colour distribution */}
            {vm.colorTally.length > 0 && (
                <View style={styles.section}>
                    <SectionLabel size={10}>✠ COLOUR</SectionLabel>
                    <View style={styles.tallyRow}>
                        {vm.colorTally.map((row) => (
                            <View key={row.color} style={styles.tallyChip} testID={`hazard-deck-color-${row.color}`}>
                                <View style={[styles.colorDot, { backgroundColor: DIE[row.color].c }]} />
                                <Text style={styles.tallyLabel}>{row.label}</Text>
                                <Text style={[styles.tallyValue, { color: DIE[row.color].c }]}>{row.count}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Type distribution */}
            {vm.typeTally.length > 0 && (
                <View style={styles.section}>
                    <SectionLabel size={10}>✠ TYPE</SectionLabel>
                    <View style={styles.tallyRow}>
                        {vm.typeTally.map((row) => (
                            <View key={row.key} style={styles.tallyChip} testID={`hazard-deck-type-${row.key}`}>
                                <Text style={styles.tallyLabel}>{row.label}</Text>
                                <Text style={styles.tallyValue}>{row.count}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Keyword distribution — tap a chip to read its glossary entry. */}
            {vm.keywordTally.length > 0 && (
                <View style={styles.section}>
                    <SectionLabel size={10}>✠ KEYWORDS</SectionLabel>
                    <View style={styles.kwWrap}>
                        {vm.keywordTally.map((row) => (
                            <TooltipTarget
                                key={row.id}
                                kind="hazard-keyword"
                                id={row.id}
                                style={styles.kwChip}
                                accessibilityLabel={`Explain keyword ${row.name}`}
                                accessibilityHint="tap to read description"
                                testID={`hazard-deck-kw-${row.id}`}
                            >
                                <Text style={styles.kwName}>{row.name}</Text>
                                <Text style={styles.kwCount}>{row.count}</Text>
                            </TooltipTarget>
                        ))}
                    </View>
                </View>
            )}

            {/* The full deck — tap any card to inspect */}
            <View style={styles.section}>
                <SectionLabel size={10}>✠ ALL CARDS</SectionLabel>
                {/* Key the two unnamed marks the cards print. */}
                <HazardStatKey />
                <View style={styles.cardGrid}>
                    {vm.entries.map((entry) => (
                        <Pressable
                            key={entry.cardId}
                            onPress={() => setDetailCard(entry.card)}
                            accessibilityRole="button"
                            accessibilityLabel={`Inspect ${entry.card.name}${entry.count > 1 ? `, ${entry.count} copies` : ''}`}
                            testID={`hazard-deck-card-${entry.cardId}`}
                            style={styles.cardTile}
                        >
                            <HazardCard card={entry.card} mode="offer" />
                            {entry.count > 1 && (
                                <View style={[styles.countPip, { backgroundColor: AXM.rust }]}>
                                    <Text style={styles.countPipText}>×{entry.count}</Text>
                                </View>
                            )}
                        </Pressable>
                    ))}
                </View>
            </View>

            {/* Thin-the-deck entry */}
            <View style={styles.section}>
                <Pressable
                    style={[styles.removeCta, { borderColor: vm.hasRemovable ? HZ.acid : AXM.ash }]}
                    onPress={() => setRemoveOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Open the remove-card grid to thin your hazard deck"
                    testID="hazard-deck-open-remove"
                >
                    <Text style={[styles.removeCtaLabel, { color: vm.hasRemovable ? HZ.acid : AXM.bone }]}>
                        THIN THE HAZARD DECK
                    </Text>
                    <Text style={styles.removeCtaSub}>
                        {vm.hasRemovable
                            ? `${vm.acquiredCards} acquired card${vm.acquiredCards === 1 ? '' : 's'} could be cut`
                            : 'no acquired cards to cut yet'}
                    </Text>
                </Pressable>
            </View>

            {detailCard !== null && (
                <CardDetailOverlay card={detailCard} onClose={() => setDetailCard(null)} />
            )}

            {removeOpen && (
                <HazardRemoveGrid
                    entries={removableEntries}
                    blocked={vm.removeBlocked}
                    blockedReason={vm.removeBlockedReason}
                    onClose={() => setRemoveOpen(false)}
                    onConfirm={onConfirmRemove}
                />
            )}
        </ScreenBg>
    );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
    const styles = useStyles();
    return (
        <View style={styles.stat}>
            <Text style={[styles.statValue, tone ? { color: tone } : null]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 4, paddingBottom: 8 },
    title: { fontFamily: FONTS.gothic, fontSize: 24, letterSpacing: 0.5, color: AXM.parchment, marginTop: 2 },
    backBtn: { width: 34, height: 34, borderWidth: 1, borderColor: AXM.ash, alignItems: 'center', justifyContent: 'center' },
    backLabel: { fontFamily: FONTS.mono, fontSize: 16, color: AXM.bone },
    statRow: { flexDirection: 'row', borderWidth: 1, borderColor: AXM.divider, marginBottom: 16 },
    stat: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: AXM.divider },
    statValue: { fontFamily: FONTS.sans, fontSize: 22, color: AXM.parchment },
    statLabel: { fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 1.5, color: AXM.bone, marginTop: 2 },
    section: { marginBottom: 18 },
    tallyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    tallyChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: AXM.divider, paddingHorizontal: 10, paddingVertical: 6 },
    colorDot: { width: 12, height: 12, borderRadius: 6 },
    tallyLabel: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1, color: AXM.bone },
    tallyValue: { fontFamily: FONTS.sans, fontSize: 16, color: AXM.parchment },
    kwWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    kwChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: StyleSheet.hairlineWidth, borderColor: AXM.divider, paddingHorizontal: 8, paddingVertical: 4 },
    kwName: { fontFamily: FONTS.sans, fontSize: 11, letterSpacing: 0.5, color: AXM.parchmentDim },
    kwCount: { fontFamily: FONTS.mono, fontSize: 11, color: AXM.bone },
    cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8, justifyContent: 'center' },
    cardTile: { padding: 1 },
    countPip: { position: 'absolute', top: -4, left: -4, minWidth: 22, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    countPipText: { fontFamily: FONTS.mono, fontSize: 10, color: HUE.inkBg },
    removeCta: { borderWidth: 1.5, paddingVertical: 14, alignItems: 'center' },
    removeCtaLabel: { fontFamily: FONTS.gothic, fontSize: 16, letterSpacing: 2 },
    removeCtaSub: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 0.5, color: AXM.bone, marginTop: 4 },
}));
