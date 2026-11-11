/**
 * /village/shop — the Shop's own screen, opened from the hub's SHOP button.
 *
 * One ware at a time: a carousel shows the chosen card large with its
 * neighbours peeking, a swipe (or a tap on a neighbour) moves between them, a
 * counter reads the position, and BUY sits under it on the brass plate with
 * the price. A separate CARDS / GEAR button switches the carousel between the
 * village's cards and its weapons and armor, each side with its own position;
 * a village with no gear shows no toggle. The shopkeeper stands small at the
 * foot beside REMOVE A CARD; LEAVE THE SHOP returns to the hub. Every price and
 * refusal is the engine's (`World/Village`); a refused ware dims and names its
 * reason. The village sells cards, weapons and armor, and buys nothing back.
 */

import React, { useState } from 'react';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';

import { CombatCardFace } from '@/components/combat/encounter/CombatBoard';
import { BrassButton } from '@/components/experience/BrassButton';
import { ItemGlyph } from '@/components/inventory/ItemCard';
import { ScreenBg } from '@/components/ScreenBg';
import { ShopCarousel } from '@/components/village/ShopCarousel';
import { VillageCounterFrame } from '@/components/village/VillageCounterFrame';
import { useVillageCounter } from '@/components/village/useVillageCounter';
import { useGameActions } from '@/state/GameStoreProvider';
import {
    VILLAGE_CARD_BUY_LABEL,
    VILLAGE_CARD_SHOP_LABEL,
    VILLAGE_CARD_SOLD_LABEL,
    VILLAGE_EQUIPMENT_LABEL,
    VILLAGE_REMOVE_CANCEL_LABEL,
    VILLAGE_REMOVE_LABEL,
    VILLAGE_REMOVE_PICK_HINT,
    VILLAGE_SHOP_CARDS_LABEL,
    VILLAGE_SHOP_GEAR_LABEL,
    VILLAGE_SHOP_LEAVE_LABEL,
    VILLAGE_SHOP_TITLE,
    VILLAGE_SHOPKEEPER_EYEBROW,
    VILLAGE_SHOPKEEPER_LINE,
    villageCounterNote,
    villagePurseLine,
    villageRefusalNote,
    villageRemovePriceLine,
    villageShopPosition,
} from '@/state/presenters/village.copy';
import type { VillageCounterResult } from '@/state/village/store-actions';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

/** Size for a ware's description line on this screen (the inn's uppercase mono). */
const DESC_FONT_SIZE = 12;

/** The gear side's glyph, large on the chosen piece and small on a neighbour. */
const GEAR_GLYPH_MAIN = 64;
const GEAR_GLYPH_PEEK = 36;

type ShopSide = 'cards' | 'gear';

/**
 * The Shop screen.
 *
 * Purpose: render the village's card shop and gear counter, one ware at a
 * time, from the settlement view-model. Inputs: none (reads the store via
 * `useVillageCounter`; dispatches through `useGameActions`). Output: the
 * screen's element tree.
 */
export default function VillageShopScreen() {
    const styles = useStyles();
    const { vm, back } = useVillageCounter();
    const actions = useGameActions();
    const [removing, setRemoving] = useState(false);
    const [note, setNote] = useState<string | null>(null);
    const [chosenSide, setChosenSide] = useState<ShopSide>('cards');
    const [cardIndex, setCardIndex] = useState(0);
    const [gearIndex, setGearIndex] = useState(0);

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

    const cards = vm.cardShop?.cards ?? [];
    const gear = vm.equipmentShop ?? [];
    const hasCards = cards.length > 0;
    const hasGear = gear.length > 0;
    // A village with one kind of ware shows that side and no toggle.
    const side: ShopSide = hasCards && hasGear ? chosenSide : hasGear ? 'gear' : 'cards';
    const cardAt = Math.min(cardIndex, Math.max(0, cards.length - 1));
    const gearAt = Math.min(gearIndex, Math.max(0, gear.length - 1));
    const card = cards[cardAt];
    const piece = gear[gearAt];
    const removal = vm.cardShop?.removal ?? null;

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
            keeperExtra={removal && (
                <>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                            removal.enabled
                                ? `Remove a card for ${removal.price} shillings`
                                : `Card removal unavailable: ${removal.refusal}`
                        }
                        accessibilityState={{ disabled: !removal.enabled, expanded: removing }}
                        disabled={!removal.enabled}
                        onPress={() => setRemoving(r => !r)}
                        style={[styles.removeButton, !removal.enabled && styles.removeButtonRefused]}
                        testID="village-remove"
                    >
                        <Text style={styles.removeLabel}>{VILLAGE_REMOVE_LABEL}</Text>
                        <Text
                            style={[styles.removePrice, !removal.enabled && styles.removePriceRefused]}
                            testID="village-remove-price"
                        >
                            {removal.price} SHILLINGS
                        </Text>
                    </Pressable>
                    {removal.refusal !== null && (
                        <Text style={styles.refusal} testID="village-remove-refusal">{removal.refusal}</Text>
                    )}
                </>
            )}
        >
            {note !== null && (
                <Text style={styles.note} testID="village-note">{note}</Text>
            )}

            <View style={styles.sideRow}>
                <Text style={styles.sectionLabel}>
                    {side === 'cards' ? VILLAGE_CARD_SHOP_LABEL : VILLAGE_EQUIPMENT_LABEL}
                </Text>
                {hasCards && hasGear && (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                            side === 'cards' ? `${VILLAGE_SHOP_GEAR_LABEL}: show the weapons and armor` : `${VILLAGE_SHOP_CARDS_LABEL}: show the cards`
                        }
                        onPress={() => setChosenSide(side === 'cards' ? 'gear' : 'cards')}
                        style={styles.toggle}
                        testID="village-shop-toggle"
                    >
                        <Text style={[styles.toggleHalf, side === 'cards' && styles.toggleOn]}>{VILLAGE_SHOP_CARDS_LABEL}</Text>
                        <Text style={styles.toggleSlash}> / </Text>
                        <Text style={[styles.toggleHalf, side === 'gear' && styles.toggleOn]}>{VILLAGE_SHOP_GEAR_LABEL}</Text>
                    </Pressable>
                )}
            </View>

            {side === 'cards' && card && (
                <View testID="village-card-shop">
                    <ShopCarousel
                        count={cards.length}
                        index={cardAt}
                        onIndex={setCardIndex}
                        renderMain={(w, h) => (
                            <View testID={`village-card-${card.cardId}`}>
                                <CombatCardFace card={card.face} width={w} height={h} />
                            </View>
                        )}
                        renderPeek={(i, w, h) => <CombatCardFace card={cards[i]!.face} width={w} height={h} />}
                        counterText={villageShopPosition(cardAt, cards.length)}
                        testIDStage="village-shop-stage"
                        testIDCounter="village-shop-counter"
                        testIDPrev="village-shop-peek-prev"
                        testIDNext="village-shop-peek-next"
                    />
                    <BrassButton
                        label={card.sold ? VILLAGE_CARD_SOLD_LABEL : VILLAGE_CARD_BUY_LABEL}
                        detail={card.sold ? undefined : `${card.price} SHILLINGS`}
                        disabled={!card.enabled}
                        onPress={() => report(`Bought ${card.name}`, actions.buyVillageCard(card.cardId))}
                        align="center"
                        accessibilityLabel={
                            card.enabled
                                ? `Buy ${card.name} for ${card.price} shillings`
                                : `${card.name} unavailable: ${card.refusal ?? VILLAGE_CARD_SOLD_LABEL}`
                        }
                        style={styles.buy}
                        testID={`village-card-${card.cardId}-buy`}
                        testIDDetail={`village-card-${card.cardId}-price`}
                    />
                    {card.refusal !== null && !card.sold && (
                        <Text style={styles.refusal} testID={`village-card-${card.cardId}-refusal`}>{card.refusal}</Text>
                    )}
                </View>
            )}

            {side === 'gear' && piece && (
                <View testID="village-equipment-shop">
                    <ShopCarousel
                        count={gear.length}
                        index={gearAt}
                        onIndex={setGearIndex}
                        renderMain={(w, h) => (
                            <View style={[styles.gearPanel, { width: w, height: h }]} testID={`village-equipment-${piece.pieceId}-panel`}>
                                <ItemGlyph category="equipment" sub={piece.sub} itemId={piece.pieceId} size={GEAR_GLYPH_MAIN} />
                                <Text style={styles.gearName}>{piece.name}</Text>
                                <Text style={styles.wareDesc}>{piece.sub}</Text>
                                {piece.effect !== null && (
                                    <Text style={styles.wareEffect} testID={`village-equipment-${piece.pieceId}-effect`}>{piece.effect}</Text>
                                )}
                            </View>
                        )}
                        renderPeek={(i, w, h) => (
                            <View style={[styles.gearPanel, { width: w, height: h }]}>
                                <ItemGlyph category="equipment" sub={gear[i]!.sub} itemId={gear[i]!.pieceId} size={GEAR_GLYPH_PEEK} />
                            </View>
                        )}
                        counterText={villageShopPosition(gearAt, gear.length)}
                        testIDStage="village-gear-stage"
                        testIDCounter="village-gear-counter"
                        testIDPrev="village-gear-peek-prev"
                        testIDNext="village-gear-peek-next"
                    />
                    <BrassButton
                        label={piece.sold ? VILLAGE_CARD_SOLD_LABEL : VILLAGE_CARD_BUY_LABEL}
                        detail={piece.sold ? undefined : `${piece.price} SHILLINGS`}
                        disabled={!piece.enabled}
                        onPress={() => report(`Bought ${piece.name}`, actions.buyVillageEquipment(piece.pieceId))}
                        align="center"
                        accessibilityLabel={
                            piece.enabled
                                ? `Buy ${piece.name} for ${piece.price} shillings`
                                : `${piece.name} unavailable: ${piece.refusal ?? VILLAGE_CARD_SOLD_LABEL}`
                        }
                        style={styles.buy}
                        testID={`village-equipment-${piece.pieceId}`}
                        testIDDetail={`village-equipment-${piece.pieceId}-price`}
                    />
                    {piece.refusal !== null && !piece.sold && (
                        <Text style={styles.refusal} testID={`village-equipment-${piece.pieceId}-refusal`}>{piece.refusal}</Text>
                    )}
                </View>
            )}

            {removing && removal && removal.enabled && (
                <View testID="village-remove-sheet">
                    <Text style={styles.priceHint} testID="village-remove-next">
                        {villageRemovePriceLine(removal.price, removal.nextPrice)}
                    </Text>
                    <Text style={styles.emptyNote}>{VILLAGE_REMOVE_PICK_HINT}</Text>
                    {removal.cards.map(c => (
                        <TouchableOpacity
                            key={c.cardId}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${c.name} from the deck`}
                            onPress={() => {
                                setRemoving(false);
                                report(`Removed ${c.name}`, actions.removeVillageCard(c.cardId));
                            }}
                            style={styles.removeRow}
                            testID={`village-remove-card-${c.cardId}`}
                        >
                            <Text style={styles.removeName}>
                                {c.name}{c.count > 1 ? ` ×${c.count}` : ''}
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
        </VillageCounterFrame>
    );
}

const useStyles = makeStyles((AXM) => ({
    sideRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 },
    sectionLabel: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 10,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.bone,
        flexShrink: 1,
    },
    toggle: {
        flexDirection: 'row',
        borderWidth: 2,
        borderColor: AXM.bone,
        backgroundColor: AXM.bg,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    toggleHalf: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 12, letterSpacing: TYPE_ROLES.button.letterSpacing, color: AXM.bone },
    toggleOn: { color: AXM.sulfur },
    toggleSlash: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 12, color: AXM.ash },
    buy: { marginTop: 4 },
    // A refused counter names its reason under it, in the inn's reason voice
    // (`/rest` `offerReason`): shown, never hidden.
    refusal: {
        fontFamily: TYPE_ROLES.narration.fontFamily,
        fontSize: 11,
        lineHeight: 15,
        color: AXM.bone,
        marginTop: 2,
        marginBottom: 6,
        textAlign: 'center',
    },
    note: { fontFamily: TYPE_ROLES.narration.fontFamily, fontSize: 12, color: AXM.sulfur, marginTop: 4 },
    priceHint: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 11, color: AXM.sulfur, marginTop: 10, marginBottom: 4 },
    gearPanel: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: 8,
        borderWidth: 2,
        borderColor: AXM.bone,
        backgroundColor: AXM.bg,
    },
    gearName: { fontFamily: TYPE_ROLES.title.fontFamily, fontSize: 16, color: AXM.parchment, letterSpacing: TYPE_ROLES.title.letterSpacing, textAlign: 'center' },
    removeButton: {
        borderWidth: 2,
        borderColor: AXM.bone,
        backgroundColor: AXM.bg,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    removeButtonRefused: { borderColor: AXM.ash },
    removeLabel: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 12, letterSpacing: TYPE_ROLES.button.letterSpacing, color: AXM.parchment },
    removePrice: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 12, color: AXM.sulfur, marginTop: 2 },
    removePriceRefused: { color: AXM.bone, opacity: 0.6 },
    removeRow: {
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.bg,
        padding: 8,
        marginBottom: 4,
    },
    removeName: { fontFamily: TYPE_ROLES.title.fontFamily, fontSize: 13, color: AXM.parchment },
    emptyNote: { fontFamily: TYPE_ROLES.narration.fontFamily, fontSize: 12, color: AXM.bone, marginBottom: 6 },
    wareDesc: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: DESC_FONT_SIZE, color: AXM.bone, textTransform: 'uppercase', textAlign: 'center' },
    // The effect line is the piece's load-bearing text, so it takes full parchment.
    wareEffect: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: DESC_FONT_SIZE,
        color: AXM.parchment,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        textAlign: 'center',
    },
    flexOne: { flex: 1 },
}));
