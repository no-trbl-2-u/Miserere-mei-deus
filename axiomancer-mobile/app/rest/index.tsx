/**
 * /rest — the rest-choice screen.
 *
 * One irreversible choice of two: REST (free, flat 25% heal) or UPGRADE A
 * CARD (free, one card upgraded on the shared upgrade screen, no heal).
 * Card removal is the village's (`/village`). `resolveMapEvent` consumes the node on entry,
 * before any choice — there is no back-out: no header back, no
 * swipe-dismiss (`gestureEnabled: false` in the root layout), no Android
 * hardware-back (`<HardwareBackHandler>`). After the pick the screen runs
 * dusk to night to dawn with the node's dream line (ET1c) and shows the
 * outcome at dawn; reduced motion lands on the dawn at once. All rules live in
 * `axiomancer-mechanics` (World/RestChoice); this screen renders the
 * presenter VM and dispatches store actions only.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '@/lib/platform/router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { StatBar } from '@/components/StatBar';
import { CampfireFrames } from '@/components/rest/CampfireFrames';
import { NightPassing } from '@/components/rest/NightPassing';
import { CardUpgradePicker } from '@/components/upgrade/CardUpgradePicker';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { resolveJuiceMode } from '@/lib/juice/instant';
import { useGameActions, useGameState } from '@/state/GameStoreProvider';
import {
    selectRestVM,
    type RestChoiceOfferVM,
} from '@/state/presenters/rest.engine';
import {
    REST_CHOICE_FREE_LABEL,
    REST_CHOICE_PURSE_LABEL,
    REST_CHOICE_TITLE,
    REST_OUTCOME_CLAIM_LABEL,
    REST_OUTCOME_EYEBROW,
    restOutcomeHealChip,
    restDawnUpgradedChip,
} from '@/state/presenters/rest.copy';
import { HUE, TYPE_ROLES } from '@/theme/axm';
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

export default function RestScreen() {
    const styles = useStyles();
    const AXM = usePalette();
    const slice = useGameState((s) => s.rest);
    const world = useGameState((s) => s.world);
    const vm = useMemo(() => selectRestVM({ rest: slice, world }), [slice, world]);
    const actions = useGameActions();
    const router = useRouter();

    // The night plays only when the pick happens on this mount; a screen that
    // mounts already settled (a resume) opens on the dawn.
    const instant = resolveJuiceMode({ reducedMotion: useReducedMotion() }) === 'instant';
    const [dawned, setDawned] = useState(false);
    const choosing = useRef(false);
    useEffect(() => {
        if (vm.phase === 'offer' || vm.phase === 'upgrade-pick') choosing.current = true;
    }, [vm.phase]);
    const nightPassing = vm.phase === 'outcome' && choosing.current && !dawned && !instant;

    useEffect(() => {
        if (!vm.active && router.canGoBack()) router.back();
    }, [vm.active, router]);

    // Inactive shell — visible for a frame while the router unwinds; never a
    // blank screen.
    if (!vm.active) {
        return (
            <SafeAreaView style={styles.safe} edges={['top']}>
                <View style={styles.inactiveWrap} testID="rest-inactive">
                    <Text style={styles.inactiveText}>No fire here. The night moved on.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <ScrollView style={styles.scrollOuter} contentContainerStyle={styles.scroll}>
                <View style={styles.column} testID="rest-column">
                    <Text style={styles.title}>{REST_CHOICE_TITLE}</Text>

                    <View style={styles.purseRow} testID="rest-purse">
                        <Text style={styles.purseLabel}>{REST_CHOICE_PURSE_LABEL}</Text>
                        <Text style={styles.purseValue}>{vm.currency}</Text>
                        <View style={styles.vitae}>
                            <StatBar
                                value={vm.health}
                                max={Math.max(1, vm.maxHealth)}
                                color={AXM.blood}
                                label="VITAE"
                                height={8}
                                alarmAt={0.25}
                            />
                        </View>
                    </View>

                    {vm.phase === 'offer' && (
                        <View style={styles.offerPhase}>
                            {/* Everything but the two choices sits high; the fire
                              * fills the middle and the choices rest below it. */}
                            {vm.description ? (
                                <Text style={styles.body} testID="rest-choice-intro">
                                    {vm.description}
                                </Text>
                            ) : null}
                            <View style={styles.fireWrap}>
                                <CampfireFrames />
                            </View>
                            <View testID="rest-choice-offers">
                                {vm.offers.map((offer) => (
                                    <OfferCard
                                        key={offer.id}
                                        offer={offer}
                                        onPress={() => actions.chooseRestChoiceOffer(offer.id)}
                                    />
                                ))}
                            </View>
                        </View>
                    )}

                    {vm.phase === 'upgrade-pick' && vm.upgrade !== null && (
                        <CardUpgradePicker
                            rows={vm.upgrade}
                            onConfirm={(cardId) => actions.pickRestChoiceUpgrade(cardId)}
                        />
                    )}

                    {nightPassing && (
                        <NightPassing dream={vm.dream} onDone={() => setDawned(true)} />
                    )}

                    {vm.phase === 'outcome' && vm.outcome !== null && !nightPassing && (
                        <View style={styles.card} testID="rest-outcome">
                            <Text style={styles.eyebrow}>{REST_OUTCOME_EYEBROW}</Text>
                            <Text style={[styles.cardTitle, { color: AXM.sulfur }]}>{vm.outcome.label}</Text>
                            <View style={styles.chipRow}>
                                {vm.outcome.healed > 0 && (
                                    <Text style={styles.chip}>{restOutcomeHealChip(vm.outcome.healed)}</Text>
                                )}
                                {vm.outcome.upgraded !== null && (
                                    <Text style={styles.chip} testID="rest-outcome-upgraded">
                                        {restDawnUpgradedChip(vm.outcome.upgraded.fromName)}
                                    </Text>
                                )}
                            </View>
                            {vm.outcome.eliteReturns.map((line, i) => (
                                <Text key={`elite-return-${i}`} style={styles.eliteReturn} testID="rest-elite-respawn">
                                    {line}
                                </Text>
                            ))}
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
        </SafeAreaView>
    );
}

/** The rest column's widest extent, in points (the main menu's width). */
export const REST_COLUMN_MAX_WIDTH = 520;

const useStyles = makeStyles((AXM) => ({
    safe: { flex: 1, backgroundColor: HUE.black },
    scrollOuter: { flex: 1, backgroundColor: HUE.black },
    scroll: { padding: 14, paddingBottom: 24, flexGrow: 1 },
    offerPhase: { flexGrow: 1 },
    fireWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
    vitae: { flex: 1 },
    // A phone fills the column edge to edge; a wide window keeps each
    // offer's name beside its price instead of across the screen.
    column: { width: '100%', maxWidth: REST_COLUMN_MAX_WIDTH, alignSelf: 'center', flexGrow: 1 },
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
    purseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: HUE.black,
        padding: 8,
        marginBottom: 10,
    },
    purseLabel: { fontFamily: TYPE_ROLES.eyebrow.fontFamily, fontSize: 12, letterSpacing: TYPE_ROLES.eyebrow.letterSpacing, color: AXM.bone },
    purseValue: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 16, color: AXM.sulfur },
    body: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 13,
        lineHeight: 19,
        color: AXM.parchment,
        marginBottom: 8,
    },
    // The night brings a fought elite back: one quiet line per foe.
    eliteReturn: { fontFamily: TYPE_ROLES.narration.fontFamily, fontSize: 13, color: AXM.parchment, lineHeight: 18, marginTop: 8 },
    offerCol: { marginBottom: 8 },
    offerButton: {
        borderWidth: 2,
        borderColor: AXM.sulfur,
        padding: 10,
        backgroundColor: AXM.bg,
    },
    offerDisabled: { borderColor: AXM.ash, opacity: 0.5 },
    offerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    offerLabel: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 17, letterSpacing: TYPE_ROLES.button.letterSpacing, color: AXM.sulfur },
    offerPrice: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 12, color: AXM.sulfur },
    offerDesc: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 12,
        color: AXM.bone,
        marginTop: 2,
        textTransform: 'uppercase',
    },
    offerReason: {
        fontFamily: TYPE_ROLES.narration.fontFamily,
        fontSize: 11,
        lineHeight: 15,
        color: AXM.bone,
        marginTop: 4,
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
