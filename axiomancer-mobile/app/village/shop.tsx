/**
 * /village/shop — the Shop's own screen, opened from the hub's
 * SHOP button.
 *
 * It holds today's card shop (the offered cards with BUY, and REMOVE A CARD
 * with its picker) and today's weapons-and-armor counter, moved over from the
 * old one-page village unchanged in look; 168.4 redraws it as one card at a
 * time. The shopkeeper stands at the foot with the line; LEAVE THE SHOP
 * returns to the hub. Every price and refusal is the engine's
 * (`World/Village`); a refused ware shows its reason. The village sells cards,
 * weapons and armor, and buys nothing back.
 */

import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { CombatCardFace } from '@/components/combat/encounter/CombatBoard';
import { ItemGlyph } from '@/components/inventory/ItemCard';
import { ScreenBg } from '@/components/ScreenBg';
import { VillageCounterFrame } from '@/components/village/VillageCounterFrame';
import { useVillageCounter } from '@/components/village/useVillageCounter';
import { useGameActions } from '@/state/GameStoreProvider';
import {
    VILLAGE_CARD_BUY_LABEL,
    VILLAGE_CARD_SHOP_LABEL,
    VILLAGE_CARD_SHOP_LINE,
    VILLAGE_CARD_SOLD_LABEL,
    VILLAGE_EQUIPMENT_LABEL,
    VILLAGE_EQUIPMENT_LINE,
    VILLAGE_REMOVE_CANCEL_LABEL,
    VILLAGE_REMOVE_LABEL,
    VILLAGE_REMOVE_LINE,
    VILLAGE_REMOVE_PICK_HINT,
    VILLAGE_SHOP_LEAVE_LABEL,
    VILLAGE_SHOP_TITLE,
    VILLAGE_SHOPKEEPER_EYEBROW,
    VILLAGE_SHOPKEEPER_LINE,
    villageCounterNote,
    villagePurseLine,
    villageRefusalNote,
    villageRemovePriceLine,
} from '@/state/presenters/village.copy';
import type { VillageCounterResult } from '@/state/village/store-actions';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

/**
 * Size for a ware's description line on this screen.
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
 * The Shop screen.
 *
 * Purpose: render the village's card shop and gear counter from the
 * settlement view-model. Inputs: none (reads the store via
 * `useVillageCounter`; dispatches through `useGameActions`). Output: the
 * screen's element tree.
 */
export default function VillageShopScreen() {
    const styles = useStyles();
    const { vm, back } = useVillageCounter();
    const actions = useGameActions();
    const [removing, setRemoving] = useState(false);
    const [note, setNote] = useState<string | null>(null);

    /** Words a counter's result: what it cost, or why it was refused. */
    const report = (what: string, result: VillageCounterResult) => {
        setNote(result.ok ? villageCounterNote(what, result.spent) : villageRefusalNote(result.refusal));
    };

    if (!vm.active) {
        return (
            <ScreenBg scrollable={false} art="village">
                <View style={styles.flexOne} testID="village-shop-inactive" />
            </ScreenBg>
        );
    }

    return (
        <VillageCounterFrame
            title={VILLAGE_SHOP_TITLE}
            purse={villagePurseLine(vm.currency, vm.health, vm.maxHealth)}
            role="shopkeeper"
            keeperEyebrow={VILLAGE_SHOPKEEPER_EYEBROW}
            keeperLine={VILLAGE_SHOPKEEPER_LINE}
            backLabel={VILLAGE_SHOP_LEAVE_LABEL}
            onBack={back}
            testIDPrefix="village-shop"
            testIDBack="village-shop-back"
        >
            {note !== null && (
                <Text style={styles.note} testID="village-note">{note}</Text>
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
        </VillageCounterFrame>
    );
}

const useStyles = makeStyles((AXM) => ({
    sectionLabel: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 10,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.bone,
        marginTop: 12,
        marginBottom: 6,
    },
    // A refused counter names its reason under it, in the inn's reason voice
    // (`/rest` `offerReason`): shown, never hidden.
    refusal: {
        fontFamily: TYPE_ROLES.narration.fontFamily,
        fontSize: 11,
        lineHeight: 15,
        color: AXM.bone,
        marginTop: -2,
        marginBottom: 6,
    },
    note: { fontFamily: TYPE_ROLES.narration.fontFamily, fontSize: 12, color: AXM.sulfur, marginTop: 4 },
    priceHint: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 11, color: AXM.sulfur, marginBottom: 4 },
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
    buyText: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 11, letterSpacing: TYPE_ROLES.button.letterSpacing, color: AXM.sulfur, textAlign: 'center' },
    equipmentList: { marginTop: 6 },
    removeRow: {
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.bg,
        padding: 8,
        marginBottom: 4,
    },
    removeName: { fontFamily: TYPE_ROLES.title.fontFamily, fontSize: 13, color: AXM.parchment },
    emptyNote: { fontFamily: TYPE_ROLES.narration.fontFamily, fontSize: 12, color: AXM.bone, marginBottom: 6 },
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
    wareName: { fontFamily: TYPE_ROLES.title.fontFamily, fontSize: 16, color: AXM.parchment, letterSpacing: TYPE_ROLES.title.letterSpacing},
    // The inn prints the identical uppercase-mono description at
    // DESC_FONT_SIZE. One size for a description wherever it appears.
    wareDesc: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: DESC_FONT_SIZE, color: AXM.bone, marginTop: 2, textTransform: 'uppercase' },
    // The effect line is the row's load-bearing text, so it takes
    // full parchment while the flavour line below keeps the quieter bone.
    wareEffect: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: DESC_FONT_SIZE,
        color: AXM.parchment,
        marginTop: 3,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    warePrice: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 18, color: AXM.sulfur },
    // Price tracks affordability, not just the row's opacity: value-gold
    // is loud enough to survive the unaffordable dim, so mute the colour
    // to bone when the player can't afford it.
    warePriceUnaffordable: { color: AXM.bone },
    wareCtaDimmed: { opacity: 0.6 },
    flexOne: { flex: 1 },
}));
