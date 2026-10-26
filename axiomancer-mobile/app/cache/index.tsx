/**
 * /cache — the loot-cache-choice screen ("The Reliquary").
 *
 * One irreversible choice of two: TAKE A CARD (a rolled reward card) or
 * TAKE THE GOODS (a tier-scaled consumable haul + the node's currency).
 * `resolveMapEvent` consumes the node on entry,
 * before any choice — there is no back-out: no header back, no
 * swipe-dismiss (`gestureEnabled: false` in the root layout), no Android
 * hardware-back (`<HardwareBackHandler>`). All rules live in
 * `axiomancer-mechanics` (World/LootCacheChoice); this screen renders the
 * presenter VM and dispatches store actions only.
 */

import React, { useEffect, useMemo } from 'react';
import { useRouter } from '@/lib/platform/router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { ScreenBg } from '@/components/ScreenBg';
import { CombatCardFace } from '@/components/combat/encounter/CombatBoard';
import { mapBackdropFor } from '@/state/exploration-maps';
import { useGameActions, useGameState } from '@/state/GameStoreProvider';
import {
    selectCacheVM,
    type CacheChoiceOfferVM,
} from '@/state/presenters/cache.engine';
import {
    CACHE_CHOICE_EYEBROW,
    CACHE_CHOICE_INTRO,
    CACHE_CHOICE_TITLE,
    CACHE_OUTCOME_CLAIM_LABEL,
    CACHE_OUTCOME_EYEBROW,
    cacheOutcomeCardChip,
    cacheOutcomeCurrencyChip,
    cacheOutcomeItemChip,
} from '@/state/presenters/cache.copy';
import { FONTS, TYPE } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

/** The card offer's face, the combat reward tile's size. */
export const CACHE_OFFER_CARD_W = 100;
export const CACHE_OFFER_CARD_H = 147;

function OfferCard({ offer, onPress }: { offer: CacheChoiceOfferVM; onPress: () => void }) {
    const styles = useStyles();
    const label = offer.card
        ? `${offer.label}: ${offer.card.name}. ${offer.card.detail.outcomeLine}. ${offer.desc}`
        : `${offer.label}. ${offer.desc}`;
    return (
        <View style={styles.offerCol}>
            <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={onPress}
                style={[styles.offerButton, offer.card ? styles.offerButtonWithCard : null]}
                testID={`cache-choice-offer-${offer.id}`}
            >
                {offer.card ? (
                    <View testID={`cache-choice-card-face-${offer.card.cardId}`}>
                        <CombatCardFace card={offer.card} width={CACHE_OFFER_CARD_W} height={CACHE_OFFER_CARD_H} />
                    </View>
                ) : null}
                <View style={styles.offerText}>
                    <Text style={styles.offerLabel}>{offer.label}</Text>
                    <Text style={styles.offerDesc}>{offer.desc}</Text>
                </View>
            </TouchableOpacity>
        </View>
    );
}

export default function CacheScreen() {
    const styles = useStyles();
    const AXM = usePalette();
    const slice = useGameState((s) => s.cache);
    const stats = useGameState((s) => s.player?.baseStats);
    const regionPlate = useGameState((s) => mapBackdropFor(s.world?.currentMap?.name));
    const vm = useMemo(() => selectCacheVM({ cache: slice }, stats), [slice, stats]);
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

    return (
        <ScreenBg scrollable={false} art="cache" regionPlate={regionPlate}>
            <ScrollView style={styles.scrollOuter} contentContainerStyle={styles.scroll}>
                <Text style={styles.eyebrow}>{CACHE_CHOICE_EYEBROW}</Text>
                <Text style={styles.title}>{CACHE_CHOICE_TITLE}</Text>

                {vm.phase === 'offer' && (
                    <View testID="cache-choice-offers">
                        {/* The authored node line sits ABOVE the one-way warning;
                          * the warning always shows, so the player is always told
                          * the node is spent and there is no leaving without
                          * choosing. */}
                        {vm.description ? (
                            <Text style={styles.body} testID="cache-choice-intro">
                                {vm.description}
                            </Text>
                        ) : null}
                        <Text style={styles.oneWayNote} testID="cache-choice-intro-one-way">
                            {CACHE_CHOICE_INTRO}
                        </Text>
                        {vm.offers.map((offer) => (
                            <OfferCard
                                key={offer.id}
                                offer={offer}
                                onPress={() => actions.chooseLootCacheChoiceOffer(offer.id)}
                            />
                        ))}
                    </View>
                )}

                {vm.phase === 'outcome' && vm.outcome !== null && (
                    <View style={styles.card} testID="cache-outcome">
                        <Text style={styles.eyebrow}>{CACHE_OUTCOME_EYEBROW}</Text>
                        <Text style={[styles.cardTitle, { color: AXM.sulfur }]}>{vm.outcome.label}</Text>
                        <View style={styles.chipRow}>
                            {vm.outcome.cardName !== null && (
                                <Text style={styles.chip}>{cacheOutcomeCardChip(vm.outcome.cardName)}</Text>
                            )}
                            {vm.outcome.itemNames.map((name, i) => (
                                <Text key={`${name}:${i}`} style={styles.chip}>{cacheOutcomeItemChip(name)}</Text>
                            ))}
                            {vm.outcome.currency > 0 && (
                                <Text style={styles.chip}>{cacheOutcomeCurrencyChip(vm.outcome.currency)}</Text>
                            )}
                        </View>
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Move on"
                            onPress={actions.claimLootCacheChoiceOutcome}
                            style={styles.bigButton}
                            testID="cache-claim"
                        >
                            <Text style={styles.bigButtonText}>{CACHE_OUTCOME_CLAIM_LABEL}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    scrollOuter: { flex: 1 },
    scroll: { padding: 14, paddingBottom: 24, flexGrow: 1, justifyContent: 'center' },
    eyebrow: {
        fontFamily: FONTS.sans,
        fontSize: 12,
        letterSpacing: 2.2,
        color: AXM.bone,
        marginBottom: 4,
    },
    title: {
        fontFamily: FONTS.gothic,
        fontSize: 24,
        lineHeight: 28,
        color: AXM.parchment,
        marginBottom: 10,
    },
    body: {
        fontFamily: FONTS.serif,
        fontSize: 13,
        lineHeight: 19,
        color: AXM.parchment,
        marginBottom: 8,
    },
    // The irreversibility line, quieter than the scene but always there.
    oneWayNote: { fontFamily: FONTS.serifItalic, fontSize: 12, color: AXM.bone, lineHeight: 16, marginTop: 6, marginBottom: 2 },
    offerCol: { marginBottom: 8 },
    offerButton: {
        borderWidth: 2,
        borderColor: AXM.sulfur,
        padding: 10,
        backgroundColor: AXM.bg,
    },
    // The card offer prints its face beside the label, so the pick is seen before it is made.
    // The top pad keeps the face's free corner pill inside the frame.
    offerButtonWithCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 16 },
    offerText: { flexShrink: 1 },
    offerLabel: { fontFamily: FONTS.gothic, fontSize: 17, letterSpacing: 1.2, color: AXM.sulfur },
    offerDesc: {
        fontFamily: FONTS.mono,
        fontSize: 12,
        color: AXM.bone,
        marginTop: 2,
        textTransform: 'uppercase',
    },
    card: {
        borderWidth: 2,
        borderColor: AXM.ash,
        backgroundColor: AXM.panelBg,
        padding: 12,
    },
    cardTitle: {
        fontFamily: FONTS.gothic,
        fontSize: 22,
        lineHeight: 26,
        color: AXM.parchment,
        marginBottom: 6,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
    chip: {
        fontFamily: FONTS.mono,
        fontSize: 12,
        letterSpacing: 1,
        color: AXM.parchment,
        borderWidth: 1,
        borderColor: AXM.ash,
        paddingHorizontal: 5,
        paddingVertical: 2,
    },
    bigButton: {
        borderWidth: 2,
        borderColor: AXM.sulfur,
        marginTop: 12,
        paddingVertical: 10,
        alignItems: 'center',
        backgroundColor: AXM.bg,
    },
    bigButtonText: { fontFamily: FONTS.gothic, fontSize: 18, letterSpacing: 2, color: AXM.sulfur },
    inactiveWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    inactiveText: { ...TYPE.body, color: AXM.parchment, opacity: 0.55, textAlign: 'center' },
}));
