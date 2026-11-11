/**
 * /cache — the loot-cache-choice screen ("The Reliquary"), picture first.
 *
 * One irreversible choice of two: TAKE A CARD (one rolled reward card) or
 * TAKE THE GOODS (a tier-scaled consumable haul + the node's currency).
 * Three moments on one screen (plan 174, the settled shot S-04):
 *
 *   choice  the top bar, a picture band wearing the closed chest, the cache's
 *           flavour line, and two rows: label, the cache's action line, and a
 *           brass TAKE. Nothing here names a card, an item or a sum.
 *   goods   the gold band, TAKE THE GOODS, one row per good (icon, name, what
 *           it does), the shillings, and MOVE ON on the brass plate.
 *   card    the card picture band, TAKE A CARD, the one card taken in the one
 *           card face, just above MOVE ON.
 *
 * The screen says what you DO, never what you get, until the take: the offer
 * VM carries no reward. `resolveMapEvent` consumes the node on entry, so there
 * is no back-out: no header back, no swipe-dismiss (`gestureEnabled: false` in
 * the root layout), no Android hardware-back (`<HardwareBackHandler>`). All
 * rules live in `axiomancer-mechanics` (World/LootCacheChoice); this screen
 * renders the presenter VM and dispatches store actions only. Pictures come
 * from one table (`assets/images/treasure/cache-pictures.ts`).
 */

import React, { useEffect, useMemo } from 'react';
import { useRouter } from '@/lib/platform/router';
import { ScrollView, Text, View } from 'react-native';

import { cachePicture } from '@/assets/images/treasure/cache-pictures';
import { TREASURE_FALLING_COINS } from '@/assets/images/treasure';
import { CombatCardFace } from '@/components/combat/encounter/CombatBoard';
import { BrassButton } from '@/components/experience/BrassButton';
import { ItemGlyph } from '@/components/inventory/ItemCard';
import { ScreenBg } from '@/components/ScreenBg';
import { Image } from '@/lib/platform/image';
import { mapBackdropFor } from '@/state/exploration-maps';
import { useGameActions, useGameState } from '@/state/GameStoreProvider';
import {
    selectCacheVM,
    type CacheChoiceOfferVM,
    type CacheGoodVM,
} from '@/state/presenters/cache.engine';
import {
    CACHE_CHOICE_TAKE_LABEL,
    CACHE_CHOICE_TITLE,
    CACHE_OUTCOME_CLAIM_LABEL,
    CACHE_OUTCOME_EYEBROW,
    cacheOutcomeCurrencyChip,
    cacheOutcomeItemChip,
    cachePurseLine,
} from '@/state/presenters/cache.copy';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

/** The cache column's widest extent, in points (the rest column's width). */
export const CACHE_COLUMN_MAX_WIDTH = 520;

/** The picture band's height, in points. */
const BAND_HEIGHT = 200;
/** The card taken, in the one card face (the Shop's 100:147 ratio). */
const CARD_W = 170;
const CARD_H = Math.round(CARD_W * 1.47);
/** A good's icon, in points. */
const GOOD_ICON = 40;

/** One choice: its label, the action line the node authored, and a brass TAKE. */
function OfferRow({ offer, first, onPress }: { offer: CacheChoiceOfferVM; first: boolean; onPress: () => void }) {
    const styles = useStyles();
    return (
        <View style={[styles.offerRow, !first && styles.offerRule]}>
            <View style={styles.offerText}>
                <Text style={styles.offerLabel}>{offer.label}</Text>
                <Text style={styles.offerAction} testID={`cache-choice-action-${offer.id}`}>
                    {offer.action}
                </Text>
            </View>
            <BrassButton
                label={CACHE_CHOICE_TAKE_LABEL}
                place="K-01"
                align="center"
                onPress={onPress}
                accessibilityLabel={`${offer.label}. ${offer.action}`}
                style={styles.takeButton}
                testID={`cache-choice-offer-${offer.id}`}
            />
        </View>
    );
}

/** One good taken: its icon, `+ NAME`, and one line saying what it does. */
function GoodRow({ good }: { good: CacheGoodVM }) {
    const styles = useStyles();
    return (
        <View style={styles.goodRow} testID={`cache-good-${good.itemId}`}>
            <View style={styles.goodIcon}>
                <ItemGlyph category={good.category} sub={good.sub} itemId={good.itemId} size={GOOD_ICON} />
            </View>
            <View style={styles.goodText}>
                <Text style={styles.goodName}>{cacheOutcomeItemChip(good.name)}</Text>
                {good.line !== null && <Text style={styles.goodLine}>{good.line}</Text>}
            </View>
        </View>
    );
}

export default function CacheScreen() {
    const styles = useStyles();
    const slice = useGameState((s) => s.cache);
    const player = useGameState((s) => s.player);
    const nodeId = useGameState((s) => s.world?.currentMap?.currentNode ?? null);
    const regionPlate = useGameState((s) => mapBackdropFor(s.world?.currentMap?.name));
    const vm = useMemo(() => selectCacheVM({ cache: slice, player }), [slice, player]);
    const actions = useGameActions();
    const router = useRouter();

    useEffect(() => {
        if (!vm.active && router.canGoBack()) router.back();
    }, [vm.active, router]);

    // Inactive shell — visible for a frame while the router unwinds; never a
    // blank screen.
    if (!vm.active) {
        return (
            <ScreenBg scrollable={false} art="cache" regionPlate={regionPlate}>
                <View style={styles.inactiveWrap} testID="cache-inactive">
                    <Text style={styles.inactiveText}>The hollow is empty. Whatever lay here is gone.</Text>
                </View>
            </ScreenBg>
        );
    }

    const picture = cachePicture(vm.moment, nodeId);
    const outcome = vm.outcome;
    // The card's own picture is a whole landscape; the chest and the hoard float over the region plate.
    const wholePicture = vm.moment === 'card' && picture !== null;

    return (
        <ScreenBg scrollable={false}>
            <View style={styles.column} testID="cache-column">
                <View style={styles.topBar}>
                    <Text style={styles.eyebrow} testID="cache-eyebrow">
                        {outcome ? CACHE_OUTCOME_EYEBROW : CACHE_CHOICE_TITLE}
                    </Text>
                    <Text style={styles.purse} testID="cache-purse">{cachePurseLine(vm.purse)}</Text>
                </View>

                <View style={styles.band} testID={`cache-band-${vm.moment}`}>
                    {!wholePicture && regionPlate != null && (
                        <Image source={regionPlate} style={styles.bandFill} contentFit="cover" transition={0} accessible={false} />
                    )}
                    {picture !== null && (
                        <Image
                            source={picture}
                            style={wholePicture ? styles.bandFill : styles.bandObject}
                            contentFit={wholePicture ? 'cover' : 'contain'}
                            transition={0}
                            accessible={false}
                            testID="cache-picture"
                        />
                    )}
                </View>

                <ScrollView style={styles.scrollOuter} contentContainerStyle={styles.scroll}>
                    {vm.phase === 'offer' && (
                        <View testID="cache-choice-offers">
                            {/* The cache's own flavour line, then the two choices.
                              * Nothing on this screen names a reward. */}
                            {vm.description ? (
                                <Text style={styles.flavour} testID="cache-choice-intro">
                                    {vm.description}
                                </Text>
                            ) : null}
                            {vm.offers.map((offer, i) => (
                                <OfferRow
                                    key={offer.id}
                                    offer={offer}
                                    first={i === 0}
                                    onPress={() => actions.chooseLootCacheChoiceOffer(offer.id)}
                                />
                            ))}
                        </View>
                    )}

                    {vm.phase === 'outcome' && outcome !== null && (
                        <View testID="cache-outcome">
                            <Text style={styles.outcomeLabel}>{outcome.label}</Text>
                            {outcome.goods.map((good, i) => (
                                <GoodRow key={`${good.itemId}:${i}`} good={good} />
                            ))}
                            {outcome.currency > 0 && (
                                <View style={styles.goodRow} testID="cache-currency">
                                    <View style={styles.goodIcon}>
                                        <Image
                                            source={TREASURE_FALLING_COINS}
                                            style={styles.coins}
                                            contentFit="contain"
                                            transition={0}
                                            accessible={false}
                                        />
                                    </View>
                                    <View style={styles.goodText}>
                                        <Text style={styles.goodName}>{cacheOutcomeCurrencyChip(outcome.currency)}</Text>
                                    </View>
                                </View>
                            )}
                            {outcome.card !== null && (
                                <View style={styles.cardWrap} testID="cache-outcome-card">
                                    <CombatCardFace card={outcome.card} width={CARD_W} height={CARD_H} />
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>

                {vm.phase === 'outcome' && outcome !== null && (
                    <View style={styles.footer}>
                        <BrassButton
                            label={CACHE_OUTCOME_CLAIM_LABEL}
                            place="K-01"
                            align="center"
                            onPress={actions.claimLootCacheChoiceOutcome}
                            accessibilityLabel="Move on"
                            testID="cache-claim"
                        />
                    </View>
                )}
            </View>
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    // A phone fills the column edge to edge; a wide window keeps the screen a column.
    column: { flex: 1, width: '100%', maxWidth: CACHE_COLUMN_MAX_WIDTH, alignSelf: 'center' },
    topBar: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    eyebrow: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 14,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.parchment,
        flexShrink: 1,
    },
    purse: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 14, color: AXM.sulfur },
    band: {
        height: BAND_HEIGHT,
        width: '100%',
        backgroundColor: AXM.bg,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: AXM.ash,
    },
    bandFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.55 },
    bandObject: { width: '60%', height: '80%' },
    scrollOuter: { flex: 1 },
    scroll: { padding: 14, paddingBottom: 16, flexGrow: 1 },
    flavour: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 15,
        lineHeight: 21,
        color: AXM.parchment,
        textAlign: 'center',
        marginVertical: 12,
    },
    offerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
    offerRule: { borderTopWidth: 1, borderTopColor: AXM.ash },
    offerText: { flex: 1, flexShrink: 1 },
    offerLabel: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 19,
        lineHeight: 24,
        color: AXM.sulfur,
    },
    // What you do for this choice, in the scene's own voice: not a reward.
    offerAction: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 14,
        lineHeight: 19,
        color: AXM.parchment,
        marginTop: 3,
    },
    takeButton: { width: 120 },
    outcomeLabel: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 26,
        lineHeight: 32,
        color: AXM.parchment,
        textAlign: 'center',
        marginVertical: 10,
    },
    goodRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8, paddingHorizontal: 10 },
    goodIcon: { width: 48, alignItems: 'center', justifyContent: 'center' },
    coins: { width: 44, height: 44 },
    goodText: { flex: 1 },
    goodName: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 17,
        lineHeight: 22,
        color: AXM.parchment,
    },
    goodLine: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 14,
        lineHeight: 19,
        color: AXM.bone,
        marginTop: 2,
    },
    cardWrap: { alignItems: 'center', marginTop: 4 },
    footer: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 18 },
    inactiveWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    inactiveText: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 16, lineHeight: 22, color: AXM.parchment, opacity: 0.55, textAlign: 'center' },
}));
