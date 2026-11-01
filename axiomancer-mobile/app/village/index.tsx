/**
 * /village — the dedicated settlement screen.
 *
 * A village event opens as a hub of counters: the settlement's name, its
 * merchants (their stall-calls), and whichever counters the event carries —
 * a bed for the night (the paid rest), the card shop (three cards to buy, and
 * paid card removal) and the Anvil (opens `/blacksmith`; leaving it lands back
 * here, because the village stays the pending event). Every price and refusal
 * is the engine's (`World/Village`); a refused counter shows its reason. The
 * village sells cards, weapons and armor, and buys nothing back.
 *
 * The screen owns ONE scroller — the house shape (`/rest`, `/blacksmith`,
 * the inventory page) — and TAKE THE ROAD is pinned below it, so the exit
 * is whole at any counter count and at either width.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from '@/lib/platform/router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { CombatCardFace } from '@/components/combat/encounter/CombatBoard';
import { SCREEN_FRAME_INSET, ScreenBg } from '@/components/ScreenBg';
import { AxmIcon } from '@/components/icons';
import { ItemGlyph } from '@/components/inventory/ItemCard';
import { useGameActions, useGameState } from '@/state/GameStoreProvider';
import {
    VILLAGE_EQUIPMENT_LABEL,
    VILLAGE_EQUIPMENT_LINE,
    VILLAGE_CARD_BUY_LABEL,
    VILLAGE_CARD_SHOP_LABEL,
    VILLAGE_CARD_SHOP_LINE,
    VILLAGE_CARD_SOLD_LABEL,
    VILLAGE_REMOVE_CANCEL_LABEL,
    VILLAGE_REMOVE_LABEL,
    VILLAGE_REMOVE_LINE,
    VILLAGE_REMOVE_PICK_HINT,
    VILLAGE_REST_LABEL,
    VILLAGE_REST_LINE,
    villageCounterNote,
    villageRemovePriceLine,
} from '@/state/presenters/village.copy';
import { selectVillageVM } from '@/state/presenters/village.engine';
import type { VillageCounterResult } from '@/state/village/store-actions';
import { FONTS, TYPE } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

/**
 * Size for an option's description line on this screen.
 *
 * Purpose: the counters print their effect in the same uppercase mono the
 * inn (`/rest` `offerDesc`) uses, at the same size. Input: none (a constant).
 * Output: the point size both surfaces share.
 */
const DESC_FONT_SIZE = 12;

/** Card shop face size: three side by side fit a phone, the reward draft's size. */
const SHOP_FACE_W = 100;
const SHOP_FACE_H = 147;

/**
 * The settlement screen.
 *
 * Purpose: render the village view-model — name, body, merchant voices and
 * the counters — with the exit pinned beneath the scrolling list. Inputs:
 * none (reads the store via `useGameState`; dispatches through
 * `useGameActions`). Output: the screen's element tree.
 */
export default function VillageScreen() {
    const styles = useStyles();
    const event = useGameState((s) => s.event);
    const player = useGameState((s) => s.player);
    const flags = useGameState((s) => s.flags);
    const vm = useMemo(
        () => selectVillageVM({ event, player, flags }),
        [event, player, flags],
    );
    const actions = useGameActions();
    const router = useRouter();
    const [removing, setRemoving] = useState(false);
    const [note, setNote] = useState<string | null>(null);

    useEffect(() => {
        if (!vm.active && router.canGoBack()) router.back();
    }, [vm.active, router]);

    /** Words a counter's result: what it cost, or why it was refused. */
    const report = (what: string, result: VillageCounterResult) => {
        setNote(result.ok ? villageCounterNote(what, result.spent) : `Refused: ${result.refusal}.`);
    };

    // Inactive shell — visible for a frame while the router unwinds; never a
    // blank screen.
    if (!vm.active) {
        return (
            <ScreenBg scrollable={false} art="village">
                <View style={styles.inactiveWrap} testID="village-inactive">
                    <Text style={styles.inactiveText}>No settlement here. Only the road.</Text>
                </View>
            </ScreenBg>
        );
    }

    return (
        <ScreenBg scrollable={false} art="village">
            <ScrollView
                style={styles.scrollOuter}
                contentContainerStyle={styles.scroll}
                testID="village-scroll"
            >
                <View style={styles.column} testID="village-column">
                    <View style={styles.eyebrowRow}>
                        <AxmIcon name="action-village" size={18} />
                        <Text style={styles.eyebrow}>SETTLEMENT</Text>
                    </View>
                    <Text style={styles.title}>{vm.villageName.toUpperCase()}</Text>
                    <Text style={styles.body}>{vm.body}</Text>
                    <Text style={styles.purse} testID="village-purse">
                        {vm.currency} SHILLINGS · VITAE {vm.health}/{vm.maxHealth}
                    </Text>
                    {note !== null && (
                        <Text style={styles.note} testID="village-note">{note}</Text>
                    )}

                    {vm.merchants.length > 0 && (
                        <>
                            <Text style={styles.sectionLabel}>VOICES OF THE PLACE</Text>
                            {vm.merchants.map(merchant => (
                                <View key={merchant.name} style={styles.merchantCard} testID={`village-merchant-${merchant.name}`}>
                                    <Text style={styles.merchantName}>{merchant.name}</Text>
                                    {merchant.line.length > 0 && (
                                        <Text style={styles.merchantLine}>“{merchant.line}”</Text>
                                    )}
                                </View>
                            ))}
                        </>
                    )}

                    {vm.rest && (
                        <>
                            <Text style={styles.sectionLabel}>{VILLAGE_REST_LABEL}</Text>
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel={
                                    vm.rest.enabled
                                        ? `Rest for ${vm.rest.price} shillings. ${vm.rest.effect}`
                                        : `Rest unavailable: ${vm.rest.refusal}`
                                }
                                accessibilityState={{ disabled: !vm.rest.enabled }}
                                disabled={!vm.rest.enabled}
                                onPress={() => report('Rested', actions.restAtVillage())}
                                style={[styles.wareRow, !vm.rest.enabled && styles.wareRowUnaffordable]}
                                testID="village-rest"
                            >
                                <View style={styles.flexOne}>
                                    <Text style={styles.wareName}>REST</Text>
                                    <Text style={styles.wareEffect} testID="village-rest-effect">{vm.rest.effect}</Text>
                                    <Text style={styles.wareDesc} testID="village-rest-desc">{VILLAGE_REST_LINE}</Text>
                                </View>
                                <Text
                                    style={[styles.warePrice, !vm.rest.enabled && [styles.warePriceUnaffordable, styles.wareCtaDimmed]]}
                                    testID="village-rest-price"
                                >
                                    {vm.rest.price} SHILLINGS
                                </Text>
                            </TouchableOpacity>
                            {vm.rest.refusal !== null && (
                                <Text style={styles.refusal} testID="village-rest-refusal">{vm.rest.refusal}</Text>
                            )}
                        </>
                    )}

                    {vm.cardShop && (
                        <>
                            <Text style={styles.sectionLabel}>{VILLAGE_CARD_SHOP_LABEL}</Text>
                            <Text style={styles.wareDesc}>{VILLAGE_CARD_SHOP_LINE}</Text>
                            <View style={styles.shopRow} testID="village-card-shop">
                                {vm.cardShop.cards.map(card => (
                                    <View key={card.cardId} style={styles.shopCard} testID={`village-card-${card.cardId}`}>
                                        <CombatCardFace card={card.face} width={SHOP_FACE_W} height={SHOP_FACE_H} />
                                        <TouchableOpacity
                                            accessibilityRole="button"
                                            accessibilityLabel={
                                                card.enabled
                                                    ? `Buy ${card.name} for ${card.price} shillings`
                                                    : `${card.name} unavailable: ${card.refusal}`
                                            }
                                            accessibilityState={{ disabled: !card.enabled }}
                                            disabled={!card.enabled}
                                            onPress={() => report(`Bought ${card.name}`, actions.buyVillageCard(card.cardId))}
                                            style={[styles.buyButton, !card.enabled && styles.wareRowUnaffordable]}
                                            testID={`village-card-${card.cardId}-buy`}
                                        >
                                            <Text
                                                style={[styles.buyText, !card.enabled && [styles.warePriceUnaffordable, styles.wareCtaDimmed]]}
                                                testID={`village-card-${card.cardId}-price`}
                                            >
                                                {card.sold ? VILLAGE_CARD_SOLD_LABEL : `${VILLAGE_CARD_BUY_LABEL} · ${card.price} SHILLINGS`}
                                            </Text>
                                        </TouchableOpacity>
                                        {card.refusal !== null && !card.sold && (
                                            <Text style={styles.refusal} testID={`village-card-${card.cardId}-refusal`}>{card.refusal}</Text>
                                        )}
                                    </View>
                                ))}
                            </View>

                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel={
                                    vm.cardShop.removal.enabled
                                        ? `Remove a card for ${vm.cardShop.removal.price} shillings`
                                        : `Card removal unavailable: ${vm.cardShop.removal.refusal}`
                                }
                                accessibilityState={{ disabled: !vm.cardShop.removal.enabled, expanded: removing }}
                                disabled={!vm.cardShop.removal.enabled}
                                onPress={() => setRemoving(r => !r)}
                                style={[styles.wareRow, !vm.cardShop.removal.enabled && styles.wareRowUnaffordable]}
                                testID="village-remove"
                            >
                                <View style={styles.flexOne}>
                                    <Text style={styles.wareName}>{VILLAGE_REMOVE_LABEL}</Text>
                                    <Text style={styles.wareDesc}>{VILLAGE_REMOVE_LINE}</Text>
                                </View>
                                <Text
                                    style={[styles.warePrice, !vm.cardShop.removal.enabled && [styles.warePriceUnaffordable, styles.wareCtaDimmed]]}
                                    testID="village-remove-price"
                                >
                                    {vm.cardShop.removal.price} SHILLINGS
                                </Text>
                            </TouchableOpacity>
                            {vm.cardShop.removal.refusal !== null && (
                                <Text style={styles.refusal} testID="village-remove-refusal">{vm.cardShop.removal.refusal}</Text>
                            )}
                            {removing && vm.cardShop.removal.enabled && (
                                <View testID="village-remove-sheet">
                                    <Text style={styles.priceHint} testID="village-remove-next">
                                        {villageRemovePriceLine(vm.cardShop.removal.price, vm.cardShop.removal.nextPrice)}
                                    </Text>
                                    <Text style={styles.emptyNote}>{VILLAGE_REMOVE_PICK_HINT}</Text>
                                    {vm.cardShop.removal.cards.map(card => (
                                        <TouchableOpacity
                                            key={card.cardId}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Remove ${card.name} from the deck`}
                                            onPress={() => {
                                                setRemoving(false);
                                                report(`Removed ${card.name}`, actions.removeVillageCard(card.cardId));
                                            }}
                                            style={styles.removeRow}
                                            testID={`village-remove-card-${card.cardId}`}
                                        >
                                            <Text style={styles.removeName}>
                                                {card.name}{card.count > 1 ? ` ×${card.count}` : ''}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                    <TouchableOpacity
                                        accessibilityRole="button"
                                        accessibilityLabel="Keep every card"
                                        onPress={() => setRemoving(false)}
                                        style={styles.removeRow}
                                        testID="village-remove-cancel"
                                    >
                                        <Text style={styles.removeName}>{VILLAGE_REMOVE_CANCEL_LABEL}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </>
                    )}

                    {vm.equipmentShop && (
                        <>
                            <Text style={styles.sectionLabel}>{VILLAGE_EQUIPMENT_LABEL}</Text>
                            <Text style={styles.wareDesc}>{VILLAGE_EQUIPMENT_LINE}</Text>
                            <View style={styles.equipmentList} testID="village-equipment-shop">
                                {vm.equipmentShop.map(piece => (
                                    <View key={piece.pieceId}>
                                        <TouchableOpacity
                                            accessibilityRole="button"
                                            accessibilityLabel={
                                                piece.enabled
                                                    ? `Buy ${piece.name} for ${piece.price} shillings`
                                                    : `${piece.name} unavailable: ${piece.refusal}`
                                            }
                                            accessibilityState={{ disabled: !piece.enabled }}
                                            disabled={!piece.enabled}
                                            onPress={() => report(`Bought ${piece.name}`, actions.buyVillageEquipment(piece.pieceId))}
                                            style={[styles.wareRow, !piece.enabled && styles.wareRowUnaffordable]}
                                            testID={`village-equipment-${piece.pieceId}`}
                                        >
                                            <ItemGlyph category="equipment" sub={piece.sub} itemId={piece.pieceId} size={36} />
                                            <View style={styles.flexOne}>
                                                <Text style={styles.wareName}>{piece.name}</Text>
                                                <Text style={styles.wareDesc}>{piece.sub}</Text>
                                                {piece.effect !== null && (
                                                    <Text style={styles.wareEffect} testID={`village-equipment-${piece.pieceId}-effect`}>{piece.effect}</Text>
                                                )}
                                            </View>
                                            <Text
                                                style={[styles.warePrice, !piece.enabled && [styles.warePriceUnaffordable, styles.wareCtaDimmed]]}
                                                testID={`village-equipment-${piece.pieceId}-price`}
                                            >
                                                {piece.sold ? VILLAGE_CARD_SOLD_LABEL : `${piece.price} SHILLINGS`}
                                            </Text>
                                        </TouchableOpacity>
                                        {piece.refusal !== null && !piece.sold && (
                                            <Text style={styles.refusal} testID={`village-equipment-${piece.pieceId}-refusal`}>{piece.refusal}</Text>
                                        )}
                                    </View>
                                ))}
                            </View>
                        </>
                    )}

                    {vm.anvil && (
                        <>
                            <Text style={styles.sectionLabel}>THE ANVIL</Text>
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel={`Open the Anvil. The smith's cheapest work is ${vm.anvil.cheapestWork} shillings`}
                                onPress={() => actions.beginBlacksmith({ variants: vm.anvil?.variants })}
                                style={styles.wareRow}
                                testID="village-anvil"
                            >
                                <View style={styles.flexOne}>
                                    <Text style={styles.wareName}>THE ANVIL</Text>
                                    <Text style={styles.wareEffect} testID="village-anvil-effect">
                                        hone, temper, swap a die, upgrade a card
                                    </Text>
                                </View>
                                <Text style={styles.warePrice} testID="village-anvil-price">
                                    FROM {vm.anvil.cheapestWork} SHILLINGS
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </ScrollView>

            {/* 14-village: the exit sits OUTSIDE the scroller, so it is whole
                however long the counters run, at 375 and at 1280 alike. */}
            <View style={styles.exitBar} testID="village-exit-bar">
                <View style={styles.column} testID="village-exit-column">
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Leave the village"
                        onPress={actions.dismissEvent}
                        style={styles.bigButton}
                        testID="village-leave"
                    >
                        <Text style={styles.bigButtonText}>TAKE THE ROAD</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScreenBg>
    );
}

/** The settlement column's widest extent, in points (the main menu's width). */
export const VILLAGE_COLUMN_MAX_WIDTH = 520;

const useStyles = makeStyles((AXM) => ({
    // One scroller, sized to the space the pinned exit leaves it
    // (14-village) — the shape `/rest` and `/blacksmith` already use.
    scrollOuter: { flex: 1 },
    // The top clears the backdrop's vignette, so the kicker and title sit
    // inside the plate rather than on its dark frame.
    scroll: { padding: 14, paddingTop: SCREEN_FRAME_INSET, paddingBottom: 24 },
    // A phone fills the column edge to edge; a wide window keeps each
    // ware's name beside its price, and the pinned exit under the stalls,
    // instead of stretching both across the screen.
    column: { width: '100%', maxWidth: VILLAGE_COLUMN_MAX_WIDTH, alignSelf: 'center' },
    eyebrowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    eyebrow: {
        fontFamily: FONTS.sans,
        fontSize: 10,
        letterSpacing: 2.2,
        color: AXM.parchment,
        marginBottom: 4,
    },
    title: {
        fontFamily: FONTS.gothic,
        fontSize: 30,
        lineHeight: 34,
        color: AXM.parchment,
        marginBottom: 8,
    },
    body: {
        fontFamily: FONTS.serif,
        fontSize: 13,
        lineHeight: 19,
        color: AXM.parchment,
        marginBottom: 8,
    },
    sectionLabel: {
        fontFamily: FONTS.sans,
        fontSize: 10,
        letterSpacing: 2.2,
        color: AXM.bone,
        marginTop: 12,
        marginBottom: 6,
    },
    // Not an ash-bordered panel: that is this app's DISABLED grammar
    // (`offerDisabled` on /rest and /blacksmith), and a named merchant would
    // read as a locked button. It is an inert View by design: a sulfur left
    // rule is the screen's flavour grammar (the event shell's `loreBox`),
    // which reads as quoted voice and plainly not a control.
    merchantCard: {
        borderLeftWidth: 2,
        borderLeftColor: AXM.sulfur,
        paddingLeft: 10,
        paddingVertical: 2,
        marginBottom: 8,
    },
    merchantName: { fontFamily: FONTS.gothic, fontSize: 16, color: AXM.sulfur, letterSpacing: 1.2 },
    merchantLine: { fontFamily: FONTS.serifItalic, fontSize: 12, color: AXM.parchment, marginTop: 4 },
    purse: { fontFamily: FONTS.mono, fontSize: 10, color: AXM.sulfur, letterSpacing: 1 },
    // A refused counter names its reason under it, in the inn's reason voice
    // (`/rest` `offerReason`): shown, never hidden.
    refusal: {
        fontFamily: FONTS.serifItalic,
        fontSize: 11,
        lineHeight: 15,
        color: AXM.bone,
        marginTop: -2,
        marginBottom: 6,
    },
    note: { fontFamily: FONTS.serifItalic, fontSize: 12, color: AXM.sulfur, marginTop: 4 },
    priceHint: { fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 0.5, color: AXM.sulfur, marginBottom: 4 },
    // Three faces side by side at the reward draft's size fit a 375pt phone.
    shopRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: 18, marginBottom: 8 },
    shopCard: { alignItems: 'center', width: 104 },
    buyButton: {
        alignSelf: 'stretch',
        borderWidth: 2,
        borderColor: AXM.bone,
        backgroundColor: AXM.bg,
        paddingVertical: 4,
        marginTop: 6,
        alignItems: 'center',
    },
    buyText: { fontFamily: FONTS.sans, fontSize: 11, letterSpacing: 0.5, color: AXM.sulfur, textAlign: 'center' },
    equipmentList: { marginTop: 6 },
    removeRow: {
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.bg,
        padding: 8,
        marginBottom: 4,
    },
    removeName: { fontFamily: FONTS.mono, fontSize: 13, color: AXM.parchment },
    emptyNote: { fontFamily: FONTS.serifItalic, fontSize: 12, color: AXM.bone, marginBottom: 6 },
    wareRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 2,
        borderColor: AXM.bone,
        backgroundColor: AXM.bg,
        padding: 10,
        marginBottom: 6,
    },
    // A refused row dims only the price/CTA (below) — the border alone
    // signals disabled so the name/description stay bone/parchment-bright
    // and legible, matching combat's disabled-item treatment.
    wareRowUnaffordable: { borderColor: AXM.ash },
    wareName: { fontFamily: FONTS.gothic, fontSize: 16, color: AXM.parchment, letterSpacing: 1 },
    // The inn prints the identical uppercase-mono description at
    // DESC_FONT_SIZE. One size for a description wherever it appears.
    wareDesc: { fontFamily: FONTS.mono, fontSize: DESC_FONT_SIZE, color: AXM.bone, marginTop: 2, textTransform: 'uppercase' },
    // The effect line is the row's load-bearing text, so it takes
    // full parchment while the flavour line below keeps the quieter bone.
    wareEffect: {
        fontFamily: FONTS.mono,
        fontSize: DESC_FONT_SIZE,
        color: AXM.parchment,
        marginTop: 3,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    warePrice: { fontFamily: FONTS.sans, fontSize: 18, color: AXM.sulfur },
    // Price tracks affordability, not just the row's opacity: value-gold
    // is loud enough to survive the unaffordable dim, so mute the colour
    // to bone when the player can't afford it.
    warePriceUnaffordable: { color: AXM.bone },
    wareCtaDimmed: { opacity: 0.6 },
    bigButton: {
        borderWidth: 2,
        borderColor: AXM.parchment,
        marginTop: 14,
        paddingVertical: 10,
        alignItems: 'center',
        backgroundColor: AXM.bg,
    },
    bigButtonText: { fontFamily: FONTS.gothic, fontSize: 18, letterSpacing: 2, color: AXM.parchment },
    // The pinned exit keeps the page's 14pt gutter and clears the
    // vignette below it; the button's own marginTop is the gap above it,
    // as it was inside the list.
    exitBar: { paddingHorizontal: 14, paddingBottom: SCREEN_FRAME_INSET },
    flexOne: { flex: 1 },
    inactiveWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    inactiveText: { ...TYPE.body, color: AXM.parchment, opacity: 0.55, textAlign: 'center' },
}));
