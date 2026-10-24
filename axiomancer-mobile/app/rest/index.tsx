/**
 * /rest — the rest-choice screen.
 *
 * One irreversible choice of three: REST (free, flat 25% heal), UPGRADE A
 * CARD (free, one card upgraded on the shared upgrade screen, no heal) or
 * THE CUT (paid deck removal). `resolveMapEvent` consumes the node on entry,
 * before any choice — there is no back-out: no header back, no
 * swipe-dismiss (`gestureEnabled: false` in the root layout), no Android
 * hardware-back (`<HardwareBackHandler>`). All rules live in
 * `axiomancer-mechanics` (World/RestChoice); this screen renders the
 * presenter VM and dispatches store actions only.
 */

import React, { useEffect, useMemo } from 'react';
import { useRouter } from '@/lib/platform/router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { ScreenBg } from '@/components/ScreenBg';
import { CardUpgradePicker } from '@/components/upgrade/CardUpgradePicker';
import { useGameActions, useGameState } from '@/state/GameStoreProvider';
import {
    selectRestVM,
    type RestChoiceCutCardVM,
    type RestChoiceOfferVM,
} from '@/state/presenters/rest.engine';
import {
    REST_CHOICE_EYEBROW,
    REST_CHOICE_FREE_LABEL,
    REST_CHOICE_INTRO,
    REST_CHOICE_PURSE_LABEL,
    REST_CHOICE_TITLE,
    REST_CUT_CONFIRM_LABEL,
    REST_CUT_NEXT_PRICE_PREFIX,
    REST_CUT_SHEET_INTRO,
    REST_CUT_SHEET_TITLE,
    REST_OUTCOME_CLAIM_LABEL,
    REST_OUTCOME_EYEBROW,
    restOutcomeHealChip,
    restOutcomeRemovedChip,
    restOutcomeSpendChip,
    restOutcomeUpgradedChip,
} from '@/state/presenters/rest.copy';
import { FONTS, TYPE } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

function OfferCard({ offer, onPress }: { offer: RestChoiceOfferVM; onPress: () => void }) {
    const styles = useStyles();
    const AXM = usePalette();
    return (
        <View style={styles.offerCol}>
            <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                    offer.enabled
                        ? `${offer.label}. ${offer.desc}`
                        : `${offer.label} unavailable: ${offer.disabledReason}`
                }
                accessibilityState={{ disabled: !offer.enabled }}
                disabled={!offer.enabled}
                onPress={onPress}
                style={[styles.offerButton, !offer.enabled && styles.offerDisabled]}
                testID={`rest-choice-offer-${offer.id}`}
            >
                <View style={styles.offerHead}>
                    <Text style={[styles.offerLabel, !offer.enabled && { color: AXM.bone }]}>{offer.label}</Text>
                    <Text style={[styles.offerPrice, !offer.enabled && { color: AXM.bone }]}>
                        {offer.price > 0 ? `${offer.price} SHILLINGS` : REST_CHOICE_FREE_LABEL}
                    </Text>
                </View>
                <Text style={styles.offerDesc}>{offer.desc}</Text>
            </TouchableOpacity>
            {!offer.enabled && (
                <Text style={styles.offerReason} testID={`rest-choice-offer-${offer.id}-reason`}>
                    {offer.disabledReason}
                </Text>
            )}
        </View>
    );
}

function CutRow({ card, onPress }: { card: RestChoiceCutCardVM; onPress: () => void }) {
    const styles = useStyles();
    return (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Remove ${card.name} from the deck`}
            onPress={onPress}
            style={styles.cutRow}
            testID={`rest-cut-card-${card.key}`}
        >
            <Text style={styles.cutCardName}>{card.name}</Text>
        </TouchableOpacity>
    );
}

export default function RestScreen() {
    const styles = useStyles();
    const AXM = usePalette();
    const slice = useGameState((s) => s.rest);
    const vm = useMemo(() => selectRestVM({ rest: slice }), [slice]);
    const actions = useGameActions();
    const router = useRouter();

    useEffect(() => {
        if (!vm.active && router.canGoBack()) router.back();
    }, [vm.active, router]);

    // Inactive shell — visible for a frame while the router unwinds; never a
    // blank screen.
    if (!vm.active) {
        return (
            <ScreenBg scrollable={false} art="rest">
                <View style={styles.inactiveWrap} testID="rest-inactive">
                    <Text style={styles.inactiveText}>No fire here. The night moved on.</Text>
                </View>
            </ScreenBg>
        );
    }

    return (
        <ScreenBg scrollable={false} art="rest">
            <ScrollView style={styles.scrollOuter} contentContainerStyle={styles.scroll}>
                <View style={styles.column} testID="rest-column">
                    <Text style={styles.eyebrow}>{REST_CHOICE_EYEBROW}</Text>
                    <Text style={styles.title}>{REST_CHOICE_TITLE}</Text>

                    <View style={styles.purseRow} testID="rest-purse">
                        <Text style={styles.purseLabel}>{REST_CHOICE_PURSE_LABEL}</Text>
                        <Text style={styles.purseValue}>{vm.currency}</Text>
                        <Text style={styles.purseLabel}>VITAE {vm.health}/{vm.maxHealth}</Text>
                    </View>

                    {vm.phase === 'offer' && (
                        <View testID="rest-choice-offers">
                            {/* The authored node line sits ABOVE the one-way warning;
                              * the warning always shows, so the player is always told
                              * the node is spent and there is no leaving without
                              * choosing. */}
                            {vm.description ? (
                                <Text style={styles.body} testID="rest-choice-intro">
                                    {vm.description}
                                </Text>
                            ) : null}
                            <Text style={styles.oneWayNote} testID="rest-choice-intro-one-way">
                                {REST_CHOICE_INTRO}
                            </Text>
                            {vm.offers.map((offer) => (
                                <OfferCard
                                    key={offer.id}
                                    offer={offer}
                                    onPress={() => actions.chooseRestChoiceOffer(offer.id)}
                                />
                            ))}
                        </View>
                    )}

                    {vm.phase === 'cut-pick' && vm.cut !== null && (
                        <View testID="rest-cut-sheet">
                            <Text style={styles.eyebrow}>{REST_CUT_SHEET_TITLE}</Text>
                            <Text style={styles.body}>{REST_CUT_SHEET_INTRO}</Text>
                            <Text style={styles.priceHint} testID="rest-cut-price">
                                THIS ONE: {vm.cut.price} SHILLINGS — {REST_CUT_NEXT_PRICE_PREFIX} {vm.cut.nextPrice}
                            </Text>
                            <View style={styles.cutList}>
                                {vm.cut.cards.map((card) => (
                                    <CutRow
                                        key={card.key}
                                        card={card}
                                        onPress={() => actions.pickRestChoiceCut(card.cardId)}
                                    />
                                ))}
                            </View>
                            <Text style={styles.cutHint}>{REST_CUT_CONFIRM_LABEL}: tap a card above.</Text>
                        </View>
                    )}

                    {vm.phase === 'upgrade-pick' && vm.upgrade !== null && (
                        <CardUpgradePicker
                            rows={vm.upgrade}
                            onConfirm={(cardId) => actions.pickRestChoiceUpgrade(cardId)}
                        />
                    )}

                    {vm.phase === 'outcome' && vm.outcome !== null && (
                        <View style={styles.card} testID="rest-outcome">
                            <Text style={styles.eyebrow}>{REST_OUTCOME_EYEBROW}</Text>
                            <Text style={[styles.cardTitle, { color: AXM.sulfur }]}>{vm.outcome.label}</Text>
                            <View style={styles.chipRow}>
                                {vm.outcome.healed > 0 && (
                                    <Text style={styles.chip}>{restOutcomeHealChip(vm.outcome.healed)}</Text>
                                )}
                                {vm.outcome.spent > 0 && (
                                    <Text style={styles.chip}>{restOutcomeSpendChip(vm.outcome.spent)}</Text>
                                )}
                                {vm.outcome.removedCardName !== null && (
                                    <Text style={styles.chip}>{restOutcomeRemovedChip(vm.outcome.removedCardName)}</Text>
                                )}
                                {vm.outcome.upgraded !== null && (
                                    <Text style={styles.chip} testID="rest-outcome-upgraded">
                                        {restOutcomeUpgradedChip(vm.outcome.upgraded.fromName, vm.outcome.upgraded.toName)}
                                    </Text>
                                )}
                            </View>
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel="Move on"
                                onPress={actions.claimRestOutcome}
                                style={styles.bigButton}
                                testID="rest-claim"
                            >
                                <Text style={styles.bigButtonText}>{REST_OUTCOME_CLAIM_LABEL}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>
        </ScreenBg>
    );
}

/** The rest column's widest extent, in points (the main menu's width). */
export const REST_COLUMN_MAX_WIDTH = 520;

const useStyles = makeStyles((AXM) => ({
    scrollOuter: { flex: 1 },
    scroll: { padding: 14, paddingBottom: 24, flexGrow: 1, justifyContent: 'center' },
    // A phone fills the column edge to edge; a wide window keeps each
    // offer's name beside its price instead of across the screen.
    column: { width: '100%', maxWidth: REST_COLUMN_MAX_WIDTH, alignSelf: 'center' },
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
    purseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.panelBg,
        padding: 8,
        marginBottom: 10,
    },
    purseLabel: { fontFamily: FONTS.sans, fontSize: 12, letterSpacing: 1.5, color: AXM.bone },
    purseValue: { fontFamily: FONTS.gothic, fontSize: 16, letterSpacing: 1, color: AXM.sulfur },
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
    offerDisabled: { borderColor: AXM.ash, opacity: 0.5 },
    offerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    offerLabel: { fontFamily: FONTS.gothic, fontSize: 17, letterSpacing: 1.2, color: AXM.sulfur },
    offerPrice: { fontFamily: FONTS.mono, fontSize: 12, color: AXM.sulfur },
    offerDesc: {
        fontFamily: FONTS.mono,
        fontSize: 12,
        color: AXM.bone,
        marginTop: 2,
        textTransform: 'uppercase',
    },
    offerReason: {
        fontFamily: FONTS.serifItalic,
        fontSize: 11,
        lineHeight: 15,
        color: AXM.bone,
        marginTop: 4,
    },
    priceHint: {
        fontFamily: FONTS.mono,
        fontSize: 11,
        letterSpacing: 0.5,
        color: AXM.sulfur,
        marginBottom: 8,
    },
    cutList: { marginBottom: 8 },
    cutRow: {
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.bg,
        padding: 8,
        marginBottom: 4,
    },
    cutCardName: { fontFamily: FONTS.mono, fontSize: 13, color: AXM.parchment },
    cutHint: { fontFamily: FONTS.serifItalic, fontSize: 12, color: AXM.bone },
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
