/**
 * /cache — the loot-cache-choice screen ("The Reliquary").
 *
 * One irreversible choice of two: TAKE A CARD (a rolled reward card) or
 * TAKE THE GOODS (a tier-scaled consumable haul + the node's currency).
 *
 * The screen says what you DO, never what you get: the
 * cache's title, its flavour line, and the two choices, each under its own
 * action line from the node's data. No eyebrow, no "node is spent" line, no
 * card face, no goods list. The rewards are unchanged and still paid; the
 * outcome ledger after the pick still names them.
 *
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
import { mapBackdropFor } from '@/state/exploration-maps';
import { useGameActions, useGameState } from '@/state/GameStoreProvider';
import {
    selectCacheVM,
    type CacheChoiceOfferVM,
} from '@/state/presenters/cache.engine';
import {
    CACHE_CHOICE_TITLE,
    CACHE_OUTCOME_CLAIM_LABEL,
    CACHE_OUTCOME_EYEBROW,
    cacheOutcomeCardChip,
    cacheOutcomeCurrencyChip,
    cacheOutcomeItemChip,
} from '@/state/presenters/cache.copy';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

/** The cache column's widest extent, in points (the rest column's width). */
export const CACHE_COLUMN_MAX_WIDTH = 520;

/** One choice: its label, and under it the action line the node authored. */
function OfferCard({ offer, onPress }: { offer: CacheChoiceOfferVM; onPress: () => void }) {
    const styles = useStyles();
    return (
        <View style={styles.offerCol}>
            <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`${offer.label}. ${offer.action}`}
                onPress={onPress}
                style={styles.offerButton}
                testID={`cache-choice-offer-${offer.id}`}
            >
                <View style={styles.offerText}>
                    <Text style={styles.offerLabel}>{offer.label}</Text>
                    <Text style={styles.offerAction} testID={`cache-choice-action-${offer.id}`}>
                        {offer.action}
                    </Text>
                </View>
            </TouchableOpacity>
        </View>
    );
}

export default function CacheScreen() {
    const styles = useStyles();
    const AXM = usePalette();
    const slice = useGameState((s) => s.cache);
    const regionPlate = useGameState((s) => mapBackdropFor(s.world?.currentMap?.name));
    const vm = useMemo(() => selectCacheVM({ cache: slice }), [slice]);
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
                <View style={styles.column} testID="cache-column">
                    <Text style={styles.title}>{CACHE_CHOICE_TITLE}</Text>

                    {vm.phase === 'offer' && (
                        <View testID="cache-choice-offers">
                            {/* The cache's own flavour line, then the two choices.
                              * Nothing on this screen names a reward. */}
                            {vm.description ? (
                                <Text style={styles.body} testID="cache-choice-intro">
                                    {vm.description}
                                </Text>
                            ) : null}
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
                </View>
            </ScrollView>
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    scrollOuter: { flex: 1 },
    scroll: { padding: 14, paddingBottom: 24, flexGrow: 1, justifyContent: 'center' },
    // A phone fills the column edge to edge; a wide window keeps each
    // offer's face beside its label instead of across the screen.
    column: { width: '100%', maxWidth: CACHE_COLUMN_MAX_WIDTH, alignSelf: 'center' },
    eyebrow: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 12,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.bone,
        marginBottom: 4,
    },
    title: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 24,
        lineHeight: 28,
        color: AXM.parchment,
        marginBottom: 10,
    },
    body: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 13,
        lineHeight: 19,
        color: AXM.parchment,
        marginBottom: 8,
    },
    offerCol: { marginBottom: 8 },
    offerButton: {
        borderWidth: 2,
        borderColor: AXM.sulfur,
        padding: 10,
        backgroundColor: AXM.bg,
    },
    offerText: { flexShrink: 1 },
    offerLabel: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 17, letterSpacing: TYPE_ROLES.button.letterSpacing, color: AXM.sulfur },
    // What you do for this choice, in the scene's own voice — not a reward, so
    // not the uppercase ledger face.
    offerAction: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 13,
        lineHeight: 18,
        color: AXM.parchment,
        marginTop: 3,
    },
    card: {
        borderWidth: 2,
        borderColor: AXM.ash,
        backgroundColor: AXM.panelBg,
        padding: 12,
    },
    cardTitle: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 22,
        lineHeight: 26,
        color: AXM.parchment,
        marginBottom: 6,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
    chip: {
        fontFamily: TYPE_ROLES.chip.fontFamily,
        fontSize: 12,
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
    bigButtonText: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 18, letterSpacing: TYPE_ROLES.button.letterSpacing, color: AXM.sulfur },
    inactiveWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    inactiveText: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 16, lineHeight: 22, color: AXM.parchment, opacity: 0.55, textAlign: 'center' },
}));
