/**
 * DECK — the fifth bottom tab.
 *
 * The player-facing view of the COMBAT deck, the one they build all run. It
 * deliberately mirrors the hazard deck screen's (`app/hazard-deck/index.tsx`)
 * structure — headline tallies, distribution rows, the full list,
 * tap a card to inspect — so the two decks read as one system rather than two
 * separate inventions.
 *
 * Composition is engine truth (`buildCombatDeck`), the presenter maps it
 * (`selectDeckViewModel`), this screen renders the view-model. It reads no
 * rules and writes nothing: the deck is changed by playing the game, never
 * from here. Deck EDITING (thin / swap) is out of scope — see the hazard deck
 * screen's own blocked remove-grid for the precedent on not shipping a
 * mutation the engine has not opened.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DeckCardDetailOverlay } from '@/components/deck/DeckCardDetailOverlay';
import { DeckCardTile } from '@/components/deck/DeckCardTile';
import { RarityMark } from '@/components/deck/RarityMark';
import { ScreenBg } from '@/components/ScreenBg';
import { SectionLabel } from '@/components/SectionLabel';
import { KitBackdrop, KitDivider, KitHeader } from '@/components/experience/KitBackdrop';
import { useGameState } from '@/state/GameStoreProvider';
import { selectDeckViewModel, type DeckCardVM } from '@/state/presenters/deck.engine';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

export default function DeckScreen() {
    const AXM = usePalette();
    const styles = useStyles();

    // Slim slices + memo, the house pattern (see MemoirScreen / HazardDeckScreen):
    // `useGameState(selectDeckViewModel)` would churn `useSyncExternalStore`
    // because the VM is a freshly frozen object on every call.
    //
    // The memo is keyed on the whole `player`, not just the two card arrays
    // the deck is built from, so it recomputes on any character change while
    // this tab is mounted. Measured at 1.7ms for a 45-card / 22-distinct deck
    // (dev, deep-freeze included) — well inside a frame, and narrowing the key
    // would cost an exhaustive-deps suppression. If a profiler ever disagrees,
    // that is the knob, and this is the number it has to beat.
    const player = useGameState((s) => s.player);
    const flags = useGameState((s) => s.flags);
    const vm = useMemo(
        () => selectDeckViewModel({ player, flags } as never),
        [player, flags],
    );

    const [detailCard, setDetailCard] = useState<DeckCardVM | null>(null);
    const openCard = useCallback((card: DeckCardVM) => setDetailCard(card), []);
    const closeCard = useCallback(() => setDetailCard(null), []);

    return (
        <View style={styles.fill}>
            <ScreenBg>
                <View style={styles.header}>
                    <SectionLabel size={10} color={AXM.bone}>STRIFE</SectionLabel>
                    <Text style={styles.title}>THE DECK YOU CARRY</Text>
                    <Text style={styles.sourceNote}>{vm.sourceNote}</Text>
                </View>

                {vm.empty ? (
                    <View style={styles.emptyPanel} testID="deck-empty">
                        <Text style={styles.emptyText}>{vm.emptyReason}</Text>
                    </View>
                ) : (
                    <>
                        {/* Headline tallies */}
                        <View
                            style={styles.statRow}
                            accessible
                            accessibilityLabel={`${vm.totalCards} cards, ${vm.distinctCards} distinct, ${vm.rareCards} rare`}
                            testID="deck-stats"
                        >
                            <Stat label="CARDS" value={vm.totalCards} />
                            <Stat label="DISTINCT" value={vm.distinctCards} />
                            <Stat label="RARE" value={vm.rareCards} tone={AXM.bg} />
                        </View>

                        {/* Rarity distribution, at deck scale. */}
                        {vm.rarityTally.length > 0 && (
                            <View style={styles.section}>
                                <KitHeader>✠ RARITY</KitHeader>
                                <View style={styles.tallyRow}>
                                    {vm.rarityTally.map((row) => (
                                        <View
                                            key={row.band}
                                            style={styles.tallyChip}
                                            testID={`deck-rarity-${row.band}`}
                                        >
                                            <KitBackdrop piece="nav-count-plate-dark" />
                                            <RarityMark
                                                label={row.label}
                                                pips={row.pips}
                                                color={row.color}
                                                compact
                                            />
                                            <Text style={styles.tallyValue}>{row.count}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Colour distribution. */}
                        {vm.stanceTally.length > 0 && (
                            <View style={styles.section}>
                                <KitHeader variant="quatrefoil">✠ COLOUR</KitHeader>
                                <View style={styles.tallyRow}>
                                    {vm.stanceTally.map((row) => (
                                        <View
                                            key={row.stance}
                                            style={styles.tallyChip}
                                            testID={`deck-stance-${row.stance}`}
                                        >
                                            <KitBackdrop piece="nav-count-plate-dark" />
                                            <View style={[styles.colorDot, { backgroundColor: row.color }]} />
                                            <Text style={styles.tallyLabel}>{row.label}</Text>
                                            <Text style={[styles.tallyValue, { color: row.color }]}>{row.count}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* The deck itself, grouped by card type. */}
                        {vm.groups.map((group) => (
                            <View key={group.key} style={styles.section} testID={`deck-group-${group.key}`}>
                                <KitDivider piece="divider-short-brass" />
                                <KitHeader
                                    right={(
                                        <View style={styles.groupCountWell}>
                                            <KitBackdrop piece="nav-count-round-gold" />
                                            <Text style={styles.groupCount}>{group.count}</Text>
                                        </View>
                                    )}
                                >
                                    {`✠ ${group.label}`}
                                </KitHeader>
                                <View style={styles.groupList}>
                                    {group.cards.map((card) => (
                                        <DeckCardTile key={card.cardId} card={card} onPress={openCard} />
                                    ))}
                                </View>
                            </View>
                        ))}
                    </>
                )}
            </ScreenBg>

            {detailCard !== null && (
                <DeckCardDetailOverlay card={detailCard} onClose={closeCard} />
            )}
        </View>
    );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
    const styles = useStyles();
    return (
        <View style={styles.stat}>
            <KitBackdrop piece={tone ? 'rivet-tab-dark-selected' : 'rivet-tab-dark-idle'} />
            <Text style={[styles.statValue, tone ? { color: tone } : null]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    fill: { flex: 1 },
    header: { paddingHorizontal: 4, paddingBottom: 10 },
    title: { fontFamily: FONTS.gothic, fontSize: 24, letterSpacing: 0.5, color: AXM.parchment, marginTop: 2 },
    sourceNote: { fontFamily: FONTS.serif, fontSize: 13, lineHeight: 17, color: AXM.bone, marginTop: 4 },
    emptyPanel: { borderWidth: 1, borderColor: AXM.divider, padding: 18 },
    emptyText: { fontFamily: FONTS.serif, fontSize: 14, lineHeight: 20, color: AXM.bone },
    statRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
    stat: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
    },
    statValue: { fontFamily: FONTS.sans, fontSize: 22, color: AXM.parchment },
    statLabel: { fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 1.5, color: AXM.bone, marginTop: 2 },
    section: { marginBottom: 18 },
    tallyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    tallyChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
    },
    colorDot: { width: 12, height: 12, borderRadius: 6 },
    tallyLabel: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1, color: AXM.bone },
    tallyValue: { fontFamily: FONTS.sans, fontSize: 16, color: AXM.parchment },
        groupCountWell: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
    groupCount: { fontFamily: FONTS.mono, fontSize: 10, color: AXM.bg },
    groupList: { marginTop: 8 },
}));
