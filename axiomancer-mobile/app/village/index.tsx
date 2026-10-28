/**
 * /village — the dedicated settlement screen.
 *
 * A village event opens as a hub: the settlement's name, its
 * merchants (their stall-calls), and a transactional shop when the
 * authored payload carries one. Buying goes through the action
 * layer's `buyVillageWare` (engine `buyItem` owns the rules).
 *
 * A SELL tab sits alongside BUY: the shop head carries a tab
 * toggle, and SELL lists the player's inventory (quest items
 * excluded) priced via the presenter's `sellables` — dispatching
 * `sellVillageItem` (engine `sellItem` owns the rules).
 *
 * Every BUY row states what the coin buys before it states the
 * flavour, off the presenter's `effect` line.
 *
 * The screen owns ONE scroller — the house shape (`/rest`, `/blacksmith`,
 * the inventory page) — and TAKE THE ROAD is pinned below it, so the exit
 * is whole at any stall count and at either width.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from '@/lib/platform/router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { SCREEN_FRAME_INSET, ScreenBg } from '@/components/ScreenBg';
import { AxmIcon } from '@/components/icons';
import { useGameActions, useGameState } from '@/state/GameStoreProvider';
import { selectVillageVM } from '@/state/presenters/village.engine';
import { FONTS, TYPE } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

/**
 * Size for an option's description line on this screen.
 *
 * Purpose: the stalls print a ware's description in the same uppercase
 * mono the inn (`/rest` `offerDesc`) uses, at the same size. Input: none
 * (a constant). Output: the point size both surfaces share.
 */
const DESC_FONT_SIZE = 12;

/**
 * The settlement screen.
 *
 * Purpose: render the village view-model — name, body, merchant voices,
 * and the BUY/SELL stalls — with the exit pinned beneath the scrolling
 * stall list instead of trailing it. Inputs: none (reads the store via
 * `useGameState`; dispatches through `useGameActions`). Output: the
 * screen's element tree. Resolves: 14-village — the stalls scroll, the
 * way out does not.
 */
export default function VillageScreen() {
    const styles = useStyles();
    const event = useGameState((s) => s.event);
    const player = useGameState((s) => s.player);
    const vm = useMemo(
        () => selectVillageVM({ event, player }),
        [event, player],
    );
    const actions = useGameActions();
    const router = useRouter();
    const [shopTab, setShopTab] = useState<'buy' | 'sell'>('buy');

    useEffect(() => {
        if (!vm.active && router.canGoBack()) router.back();
    }, [vm.active, router]);

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

                    {vm.hasShop && (
                        <>
                            <View style={styles.shopHead}>
                                <Text style={styles.sectionLabel}>THE STALLS</Text>
                                <Text style={styles.purse} testID="village-purse">
                                    {vm.currency} SHILLINGS
                                </Text>
                            </View>
                            <View style={styles.tabRow}>
                                <TouchableOpacity
                                    accessibilityRole="button"
                                    accessibilityLabel="Buy from the stalls"
                                    accessibilityState={{ selected: shopTab === 'buy' }}
                                    onPress={() => setShopTab('buy')}
                                    style={[styles.tabButton, shopTab === 'buy' && styles.tabButtonActive]}
                                    testID="village-tab-buy"
                                >
                                    <Text style={[styles.tabButtonText, shopTab === 'buy' && styles.tabButtonTextActive]}>BUY</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    accessibilityRole="button"
                                    accessibilityLabel="Sell to the stalls"
                                    accessibilityState={{ selected: shopTab === 'sell' }}
                                    onPress={() => setShopTab('sell')}
                                    style={[styles.tabButton, shopTab === 'sell' && styles.tabButtonActive]}
                                    testID="village-tab-sell"
                                >
                                    <Text style={[styles.tabButtonText, shopTab === 'sell' && styles.tabButtonTextActive]}>SELL</Text>
                                </TouchableOpacity>
                            </View>

                            {shopTab === 'buy' && (
                                vm.wares.length > 0 ? vm.wares.map(ware => (
                                    <TouchableOpacity
                                        key={ware.itemId}
                                        accessibilityRole="button"
                                        accessibilityLabel={
                                            ware.effect.length > 0
                                                ? `Buy ${ware.name} for ${ware.price} shillings. ${ware.effect}`
                                                : `Buy ${ware.name} for ${ware.price} shillings`
                                        }
                                        accessibilityState={{ disabled: !ware.affordable }}
                                        disabled={!ware.affordable}
                                        onPress={() => actions.buyVillageWare(ware.itemId)}
                                        style={[styles.wareRow, !ware.affordable && styles.wareRowUnaffordable]}
                                        testID={`village-ware-${ware.itemId}`}
                                    >
                                        <View style={styles.flexOne}>
                                            <Text style={styles.wareName}>{ware.name}</Text>
                                            {/* The mechanical read comes before the
                                                flavour line — a stall that prices a thing has to
                                                say what the thing does. */}
                                            {ware.effect.length > 0 && (
                                                <Text style={styles.wareEffect} testID={`village-ware-${ware.itemId}-effect`}>{ware.effect}</Text>
                                            )}
                                            {ware.description.length > 0 && (
                                                <Text style={styles.wareDesc} testID={`village-ware-${ware.itemId}-desc`}>{ware.description}</Text>
                                            )}
                                        </View>
                                        <Text style={[styles.warePrice, !ware.affordable && [styles.warePriceUnaffordable, styles.wareCtaDimmed]]} testID={`village-ware-${ware.itemId}-price`}>{ware.price} SHILLINGS</Text>
                                    </TouchableOpacity>
                                )) : (
                                    <Text style={styles.emptyNote} testID="village-buy-empty">Nothing for sale.</Text>
                                )
                            )}

                            {shopTab === 'sell' && (
                                vm.sellables.length > 0 ? vm.sellables.map(sellable => (
                                    <TouchableOpacity
                                        key={`${sellable.itemId}-${sellable.index}`}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Sell ${sellable.name} for ${sellable.sellPrice} shillings`}
                                        onPress={() => actions.sellVillageItem(sellable.index)}
                                        style={styles.wareRow}
                                        testID={`village-sell-${sellable.index}`}
                                    >
                                        <View style={styles.flexOne}>
                                            <Text style={styles.wareName}>{sellable.name}</Text>
                                            {sellable.description.length > 0 && (
                                                <Text style={styles.wareDesc}>{sellable.description}</Text>
                                            )}
                                        </View>
                                        <Text style={styles.warePrice} testID={`village-sell-${sellable.index}-price`}>{sellable.sellPrice} SHILLINGS</Text>
                                    </TouchableOpacity>
                                )) : (
                                    <Text style={styles.emptyNote} testID="village-sell-empty">Nothing to sell.</Text>
                                )
                            )}
                        </>
                    )}
                </View>
            </ScrollView>

            {/* 14-village: the exit sits OUTSIDE the scroller. Four wares
                that each state their effect are taller than 812pt, and
                inside the list the button was bisected by the bottom of
                the screen. Pinned here it is whole however long the
                stalls run, at 375 and at 1280 alike. */}
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
    shopHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    purse: { fontFamily: FONTS.mono, fontSize: 10, color: AXM.sulfur, letterSpacing: 1 },
    tabRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 8 },
    // The unselected tab does not use AXM.ash for its border: that is this
    // app's DISABLED treatment (`offerDisabled` on both /rest and /blacksmith
    // is `borderColor: AXM.ash`, and the combat rail greys an unaffordable
    // rune to ash too), and SELL would read as "this merchant does not buy"
    // rather than "tap to switch". parchmentMed is a
    // mid-tone: clearly quieter than the selected tab's full parchment, and
    // clearly not the dead ash.
    tabButton: {
        flex: 1,
        borderWidth: 2,
        borderColor: AXM.parchmentMed,
        backgroundColor: AXM.panelBg,
        paddingVertical: 6,
        alignItems: 'center',
    },
    tabButtonActive: { borderColor: AXM.parchment, backgroundColor: AXM.bg },
    tabButtonText: { fontFamily: FONTS.gothic, fontSize: 13, letterSpacing: 1.5, color: AXM.bone },
    tabButtonTextActive: { color: AXM.parchment },
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
    // Unaffordable rows dim only the price/CTA (below) — the border alone
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
