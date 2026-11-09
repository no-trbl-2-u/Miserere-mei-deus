/**
 * DECK — the fifth bottom tab.
 *
 * The player-facing view of the COMBAT deck, the one they build all run, as a
 * READER (DR1): one card open at the top (`DeckOpenCard`: its painting
 * as a banner, its lines under it), the deck below it. No header, no tallies.
 * Below it, the cards as square art thumbnails, four to a row; the ones not open are dimmed and a tap opens one above.
 *
 * Composition is engine truth (`buildCombatDeck`), the presenter maps it
 * (`selectDeckViewModel`), this screen renders the view-model. It reads no
 * rules and writes nothing: the deck is changed by playing the game, never
 * from here. Deck EDITING (thin / swap) is out of scope — see the hazard deck
 * screen's own blocked remove-grid for the precedent on not shipping a
 * mutation the engine has not opened.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';

import { DeckCardTile } from '@/components/deck/DeckCardTile';
import { DeckOpenCard } from '@/components/deck/DeckOpenCard';
import { DeckTypeTabs } from '@/components/deck/DeckTypeTabs';
import { ScreenBg } from '@/components/ScreenBg';
import { useGameState } from '@/state/GameStoreProvider';
import { selectDeckViewModel, type DeckCardVM } from '@/state/presenters/deck.engine';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

const GRID_COLUMNS = 4;
const GRID_GAP = 6;

export default function DeckScreen() {
    const styles = useStyles();

    // Slim slices + memo, the house pattern (see MemoirScreen):
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

    // The active type; opening a card never moves it. A type the deck no longer
    // holds falls back to the first group.
    const [tabKey, setTabKey] = useState<string | null>(null);
    const activeGroup = vm.groups.find((g) => g.key === tabKey) ?? vm.groups[0] ?? null;

    // Four square thumbnails to a row; the side is measured from the grid.
    const [gridW, setGridW] = useState(0);
    const onGridLayout = useCallback((e: LayoutChangeEvent) => setGridW(e.nativeEvent.layout.width), []);
    const tile = gridW > 0 ? (gridW - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS : undefined;

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

                        <DeckTypeTabs
                            groups={vm.groups}
                            activeKey={activeGroup?.key ?? ''}
                            onSelect={setTabKey}
                        />

                        {/* Only the active type's cards; this one grid sets the tile width. */}
                        {activeGroup !== null && (
                            <View
                                style={styles.grid}
                                onLayout={onGridLayout}
                                testID={`deck-group-${activeGroup.key}`}
                            >
                                {activeGroup.cards.map((card) => (
                                    <DeckCardTile
                                        key={card.cardId}
                                        card={card}
                                        onPress={pick}
                                        open={card.cardId === open?.cardId}
                                        size={tile}
                                    />
                                ))}
                            </View>
                        )}
                    </>
                )}
            </ScreenBg>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    fill: { flex: 1 },
    emptyPanel: { borderWidth: 1, borderColor: AXM.divider, padding: 18 },
    emptyText: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 14, lineHeight: 20, color: AXM.bone },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, marginTop: 12 },
}));
