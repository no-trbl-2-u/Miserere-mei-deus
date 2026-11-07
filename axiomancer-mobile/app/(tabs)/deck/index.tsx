/**
 * DECK — the fifth bottom tab.
 *
 * The player-facing view of the COMBAT deck, the one they build all run, as a
 * READER: one card open at the top (`DeckOpenCard`: its painting
 * as a banner, its lines under it), the deck below it. No header, no tallies.
 * Tapping a row opens that card above; 155.2 turns the rows into thumbnails.
 *
 * Composition is engine truth (`buildCombatDeck`), the presenter maps it
 * (`selectDeckViewModel`), this screen renders the view-model. It reads no
 * rules and writes nothing: the deck is changed by playing the game, never
 * from here. Deck EDITING (thin / swap) is out of scope — see the hazard deck
 * screen's own blocked remove-grid for the precedent on not shipping a
 * mutation the engine has not opened.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { DeckCardTile } from '@/components/deck/DeckCardTile';
import { DeckOpenCard } from '@/components/deck/DeckOpenCard';
import { ScreenBg } from '@/components/ScreenBg';
import { SectionLabel } from '@/components/SectionLabel';
import { useGameState } from '@/state/GameStoreProvider';
import { selectDeckViewModel, type DeckCardVM } from '@/state/presenters/deck.engine';
import { FONTS } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

export default function DeckScreen() {
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

    // The open card is held by id; the first card of the first group is open
    // on mount, and an id the deck no longer holds falls back to it.
    const [openId, setOpenId] = useState<string | null>(null);
    const pick = useCallback((card: DeckCardVM) => setOpenId(card.cardId), []);
    const allCards = useMemo(() => vm.groups.flatMap((g) => g.cards), [vm]);
    const open = allCards.find((c) => c.cardId === openId) ?? allCards[0] ?? null;

    return (
        <View style={styles.fill}>
            <ScreenBg>
                {vm.empty ? (
                    <View style={styles.emptyPanel} testID="deck-empty">
                        <Text style={styles.emptyText}>{vm.emptyReason}</Text>
                    </View>
                ) : (
                    <>
                        {open !== null && <DeckOpenCard card={open} />}

                        {/* The deck itself, grouped by card type. */}
                        {vm.groups.map((group) => (
                            <View key={group.key} style={styles.section} testID={`deck-group-${group.key}`}>
                                <View style={styles.groupHead}>
                                    <SectionLabel size={10}>{`✠ ${group.label}`}</SectionLabel>
                                    <Text style={styles.groupCount}>{group.count}</Text>
                                </View>
                                <View style={styles.groupList}>
                                    {group.cards.map((card) => (
                                        <DeckCardTile key={card.cardId} card={card} onPress={pick} />
                                    ))}
                                </View>
                            </View>
                        ))}
                    </>
                )}
            </ScreenBg>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    fill: { flex: 1 },
    emptyPanel: { borderWidth: 1, borderColor: AXM.divider, padding: 18 },
    emptyText: { fontFamily: FONTS.serif, fontSize: 14, lineHeight: 20, color: AXM.bone },
    section: { marginBottom: 18 },
    groupHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    groupCount: { fontFamily: FONTS.mono, fontSize: 11, color: AXM.bone },
    groupList: { marginTop: 8 },
}));
