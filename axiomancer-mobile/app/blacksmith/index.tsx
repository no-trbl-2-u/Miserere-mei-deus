/**
 * /blacksmith — the Blacksmith encounter screen ("The Anvil").
 *
 * The die-gear upgrade surface: HONE (add a mana face),
 * TEMPER (mana face → special face), gear SWAP, and one card UPGRADE a
 * visit on the shared upgrade screen (Phase UP1e). All rules live in
 * `axiomancer-mechanics` (World/Blacksmith); this screen renders the
 * presenter VM and dispatches store actions only.
 *
 * Owner-UI doctrine: a cap-violating OR unaffordable offer is greyed AND
 * names its reason out loud (never a silent no-op) — the greyed-offer
 * copy is the SAME cap authority the engine's refusal card uses, so they
 * always agree.
 */

import React, { useEffect, useMemo } from 'react';
import { useRouter } from '@/lib/platform/router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Haptics, ImpactFeedbackStyle } from '@/lib/platform/haptics';

import { LeaveRow } from '@/components/LeaveRow';
import { CardUpgradePicker } from '@/components/upgrade/CardUpgradePicker';
import { ScreenBg } from '@/components/ScreenBg';
import { mapBackdropFor } from '@/state/exploration-maps';
import { AxmIcon } from '@/components/icons';
import { useGameActions, useGameState } from '@/state/GameStoreProvider';
import {
    selectBlacksmithVM,
    type BlacksmithDieVM,
    type BlacksmithOfferVM,
    type BlacksmithSwapVM,
} from '@/state/presenters/blacksmith.engine';
import {
    BLACKSMITH_CARD_SECTION_LABEL,
    BLACKSMITH_CARD_UPGRADE_BACK,
    blacksmithUpgradedChip,
} from '@/state/presenters/blacksmith.copy';
import { FONTS, TYPE } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

/**
 * Widest the forge column is allowed to get.
 *
 * Purpose: keep the smith's prose at a readable line length on a desktop
 * viewport. Input: none (a constant). Output: the cap applied to the scroll
 * content column; below it the column is simply full-width, so phone layout
 * is unaffected.
 */
const SCENE_MAX_WIDTH = 560;

function hapticImpact(style: ImpactFeedbackStyle): void {
    try {
        Haptics.impactAsync(style).catch(() => undefined);
    } catch {
        // Haptics are pure polish — never let them break the screen.
    }
}

/**
 * A single service offer as a button: its label over its price in SHILLINGS, the trade
 * it makes (`MISS face → MANA`), and, when the offer is
 * greyed, the LOUD reason. Reads one `BlacksmithOfferVM` off the presenter;
 * mounted by `DieRow` (HONE + TEMPER) and `SwapRow` (SWAP) below.
 */
function OfferButton({ offer, onPress }: { offer: BlacksmithOfferVM; onPress: () => void }) {
    const styles = useStyles();
    const AXM = usePalette();
    return (
        <View style={styles.offerCol}>
            <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                    offer.enabled
                        // The forge prices in SHILLINGS, not the combat board's
                        // CONVICTION diamonds.
                        ? `${offer.label} ${offer.color === null ? '' : `the ${offer.color} die `}for ${offer.price} shillings`
                            + (offer.effect ? `: ${offer.effect}` : '')
                        : `${offer.label} unavailable: ${offer.reason}`
                }
                accessibilityState={{ disabled: !offer.enabled }}
                disabled={!offer.enabled}
                onPress={() => {
                    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
                    onPress();
                }}
                style={[styles.offerButton, !offer.enabled && styles.offerDisabled]}
                testID={`blacksmith-offer-${offer.id}`}
            >
                <Text style={[styles.offerLabel, !offer.enabled && { color: AXM.bone }]}>
                    {offer.label}
                </Text>
                {/* Shillings, not ◆ — that glyph is combat's CONVICTION. The
                    unit is spelled out on its own line under the verb, so
                    HONE and TEMPER side by side still fit a phone. */}
                <Text
                    style={[styles.offerPrice, !offer.enabled && { color: AXM.bone }]}
                    testID={`blacksmith-offer-${offer.id}-price`}
                >
                    {offer.price} SHILLINGS
                </Text>
            </TouchableOpacity>
            {/* HONE and TEMPER are the smith's words, not the
                game's — each offer states the trade it makes in the same face
                vocabulary the die read above it uses. */}
            {offer.effect.length > 0 && (
                <Text style={styles.offerEffect} testID={`blacksmith-offer-${offer.id}-effect`}>
                    {offer.effect}
                </Text>
            )}
            {!offer.enabled && (
                <Text style={styles.offerReason} testID={`blacksmith-offer-${offer.id}-reason`}>
                    {offer.reason}
                </Text>
            )}
        </View>
    );
}

function DieRow({
    die,
    onHone,
    onTemper,
}: {
    die: BlacksmithDieVM;
    onHone: () => void;
    onTemper: () => void;
}) {
    const styles = useStyles();
    return (
        <View style={styles.die} testID={`blacksmith-die-${die.color}`}>
            <View style={styles.dieHead}>
                <Text style={styles.dieName}>{die.label}</Text>
                <Text style={styles.dieFaces} testID={`blacksmith-die-${die.color}-faces`}>
                    {die.faceSummary}
                </Text>
            </View>
            <View style={styles.offerRow}>
                <OfferButton offer={die.hone} onPress={onHone} />
                <OfferButton offer={die.temper} onPress={onTemper} />
            </View>
        </View>
    );
}

function SwapRow({ swap, onSwap }: { swap: BlacksmithSwapVM; onSwap: () => void }) {
    const styles = useStyles();
    return (
        <View style={styles.die} testID={`blacksmith-swap-${swap.offer.id}`}>
            <View style={styles.dieHead}>
                <Text style={styles.dieName}>{swap.name}</Text>
                <Text style={styles.dieFaces}>{swap.faceSummary}</Text>
            </View>
            <View style={styles.offerRow}>
                <OfferButton offer={swap.offer} onPress={onSwap} />
            </View>
        </View>
    );
}

export default function BlacksmithScreen() {
    const styles = useStyles();
    const AXM = usePalette();
    const slice = useGameState((s) => s.blacksmith);
    const regionPlate = useGameState((s) => mapBackdropFor(s.world?.currentMap?.name));
    const vm = useMemo(() => selectBlacksmithVM({ blacksmith: slice }), [slice]);
    const actions = useGameActions();
    const router = useRouter();

    useEffect(() => {
        if (!vm.active && router.canGoBack()) router.back();
    }, [vm.active, router]);

    // Inactive shell — visible for a frame while the router unwinds; never a
    // blank screen.
    if (!vm.active) {
        return (
            <ScreenBg scrollable={false} art="blacksmith" regionPlate={regionPlate}>
                <View style={styles.inactiveWrap} testID="blacksmith-inactive">
                    <Text style={styles.inactiveText}>The forge is cold. Nothing keeps you here.</Text>
                </View>
            </ScreenBg>
        );
    }

    return (
        <ScreenBg scrollable={false} art="blacksmith" regionPlate={regionPlate}>
            <ScrollView
                style={styles.scrollOuter}
                contentContainerStyle={styles.scroll}
                testID="blacksmith-scroll"
            >
                <View style={styles.eyebrowRow}>
                    <AxmIcon name="action-anvil" size={18} />
                    <Text style={styles.eyebrow}>THE ANVIL</Text>
                </View>
                <Text style={styles.title}>A SMITH FOR YOUR DICE</Text>

                {vm.phase === 'intro' && (
                    <View testID="blacksmith-intro">
                        <Text style={styles.body} testID="blacksmith-intro-body">
                            {vm.introBody}
                        </Text>
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Set your dice on the anvil"
                            onPress={actions.startBlacksmithForging}
                            style={styles.bigButton}
                            testID="blacksmith-begin"
                        >
                            <Text style={styles.bigButtonText}>SET THEM ON THE ANVIL</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {vm.phase === 'forging' && (
                    <View testID="blacksmith-forging">
                        <View style={styles.budgetRow}>
                            <Text style={styles.budgetLabel}>PURSE</Text>
                            {/* Spelled out once, the way the village
                                stall head spells its own purse, so the `12s` on
                                every offer below has something to decode against. */}
                            <Text style={styles.budgetValue} testID="blacksmith-budget">
                                {vm.budget} SHILLINGS
                            </Text>
                        </View>

                        <Text style={styles.sectionLabel}>YOUR DICE</Text>
                        {/* Every die prints `1 BOON · 2 MANA · 3 MISS`; this key
                            says what those three words are worth. */}
                        <Text style={styles.faceKey} testID="blacksmith-face-key">
                            {vm.faceKey}
                        </Text>
                        {vm.dice.map((die) => (
                            <DieRow
                                key={die.color}
                                die={die}
                                onHone={() => actions.honeBlacksmith(die.color)}
                                onTemper={() => actions.temperBlacksmith(die.color)}
                            />
                        ))}

                        {vm.cardUpgrade !== null && (
                            <>
                                <Text style={styles.sectionLabel}>{BLACKSMITH_CARD_SECTION_LABEL}</Text>
                                <View style={styles.die} testID="blacksmith-card-upgrade">
                                    <View style={styles.offerRow}>
                                        <OfferButton
                                            offer={vm.cardUpgrade}
                                            onPress={actions.chooseBlacksmithCardUpgrade}
                                        />
                                    </View>
                                </View>
                            </>
                        )}

                        {vm.swaps.length > 0 && (
                            <>
                                <Text style={styles.sectionLabel}>ON OFFER</Text>
                                {vm.swaps.map((swap) => (
                                    <SwapRow
                                        key={swap.offer.id}
                                        swap={swap}
                                        onSwap={() => actions.swapBlacksmith(swap.offer.id.replace(/^swap:/, ''))}
                                    />
                                ))}
                            </>
                        )}

                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Take your dice and leave the anvil"
                            onPress={actions.leaveBlacksmith}
                            style={styles.bigButton}
                            testID="blacksmith-leave"
                        >
                            <Text style={styles.bigButtonText}>TAKE THEM AND GO</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {vm.phase === 'upgrade-pick' && vm.upgradeRows !== null && (
                    <View testID="blacksmith-upgrade-pick">
                        <CardUpgradePicker
                            rows={vm.upgradeRows}
                            priceLine={vm.upgradePriceLine}
                            onConfirm={(cardId) => actions.pickBlacksmithCardUpgrade(cardId)}
                        />
                        <LeaveRow
                            label={BLACKSMITH_CARD_UPGRADE_BACK}
                            accessibilityLabel="Back to the anvil without upgrading a card"
                            onPress={actions.cancelBlacksmithCardUpgrade}
                            testID="blacksmith-upgrade-back"
                        />
                    </View>
                )}

                {vm.phase === 'card' && vm.card !== null && (
                    <View
                        style={[styles.card, vm.card.refused && { borderColor: AXM.blood }]}
                        testID="blacksmith-card"
                    >
                        <Text style={[styles.cardTitle, vm.card.refused && { color: AXM.blood }]}>
                            {vm.card.title}
                        </Text>
                        <Text style={styles.body}>{vm.card.body}</Text>
                        {!vm.card.refused && vm.card.cost > 0 && (
                            <View style={styles.chipRow}>
                                <Text style={styles.chip} testID="blacksmith-card-cost">−{vm.card.cost} SHILLINGS</Text>
                                {vm.card.upgraded !== null ? (
                                    <Text style={styles.chip} testID="blacksmith-card-upgraded">
                                        {blacksmithUpgradedChip(vm.card.upgraded.fromName, vm.card.upgraded.toName)}
                                    </Text>
                                ) : vm.card.color !== null && (
                                    <Text style={styles.chip}>{vm.card.verb.toUpperCase()} · {vm.card.color.toUpperCase()}</Text>
                                )}
                            </View>
                        )}
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Continue"
                            onPress={actions.continueBlacksmithCard}
                            style={styles.bigButton}
                            testID="blacksmith-continue"
                        >
                            <Text style={styles.bigButtonText}>
                                {vm.card.refused ? 'HEAR HIM OUT' : 'GOOD'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {vm.phase === 'outcome' && vm.outcome !== null && (
                    <View style={styles.card} testID="blacksmith-outcome">
                        <Text style={styles.eyebrow}>THE RECKONING</Text>
                        <Text style={[styles.cardTitle, { color: AXM.sulfur }]}>WORK DONE</Text>
                        <View style={styles.chipRow}>
                            {vm.outcome.chips.map((chip, i) => (
                                <Text key={i} style={styles.chip}>{chip}</Text>
                            ))}
                        </View>
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Pay the smith and pocket your dice"
                            onPress={actions.claimBlacksmithOutcome}
                            style={styles.bigButton}
                            testID="blacksmith-claim"
                        >
                            <Text style={styles.bigButtonText}>PAY AND POCKET THEM</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Shared bordered control — see LeaveRow. */}
                {vm.phase !== 'outcome' && vm.phase !== 'card' && vm.phase !== 'upgrade-pick' && (
                    <LeaveRow
                        label="LET THE COALS DIE"
                        accessibilityLabel="Leave the forge untouched"
                        onPress={actions.abandonBlacksmith}
                        testID="blacksmith-abandon"
                    />
                )}
            </ScrollView>
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    scrollOuter: { flex: 1 },
    // Cap the column so the smith's prose keeps a readable
    // measure on a wide window instead of running edge to edge.
    scroll: {
        padding: 14,
        paddingBottom: 24,
        flexGrow: 1,
        justifyContent: 'center',
        width: '100%',
        maxWidth: SCENE_MAX_WIDTH,
        alignSelf: 'center',
    },
    eyebrowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    eyebrow: {
        fontFamily: FONTS.sans,
        fontSize: 12,
        letterSpacing: 2.2,
        color: AXM.bone,
        marginBottom: 4,
    },
    title: {
        fontFamily: FONTS.gothic,
        fontSize: 26,
        lineHeight: 30,
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
    budgetRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        borderBottomWidth: 1,
        borderBottomColor: AXM.ash,
        paddingBottom: 6,
        marginBottom: 10,
    },
    budgetLabel: { fontFamily: FONTS.sans, fontSize: 12, letterSpacing: 2, color: AXM.bone },
    budgetValue: { fontFamily: FONTS.sans, fontSize: 20, letterSpacing: 1, color: AXM.sulfur },
    sectionLabel: {
        fontFamily: FONTS.sans,
        fontSize: 11,
        letterSpacing: 2,
        color: AXM.bone,
        marginTop: 6,
        marginBottom: 6,
    },
    // The legend for the per-die face read; chronicle voice, one
    // step quieter than the die rows it explains.
    faceKey: {
        fontFamily: FONTS.serifItalic,
        fontSize: 12,
        lineHeight: 17,
        color: AXM.bone,
        marginBottom: 8,
    },
    die: {
        borderWidth: 2,
        borderColor: AXM.ash,
        backgroundColor: AXM.panelBg,
        padding: 10,
        marginBottom: 8,
    },
    dieHead: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    dieName: { fontFamily: FONTS.gothic, fontSize: 16, color: AXM.parchment, letterSpacing: 1.2 },
    dieFaces: { fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 0.5, color: AXM.bone },
    offerRow: { flexDirection: 'row', gap: 8 },
    offerCol: { flex: 1 },
    offerButton: {
        borderWidth: 1,
        borderColor: AXM.sulfur,
        paddingVertical: 8,
        paddingHorizontal: 8,
        gap: 2,
        backgroundColor: AXM.bg,
    },
    offerDisabled: { borderColor: AXM.ash, opacity: 0.5 },
    offerLabel: { fontFamily: FONTS.gothic, fontSize: 14, letterSpacing: 1.5, color: AXM.sulfur },
    offerPrice: { fontFamily: FONTS.mono, fontSize: 12, color: AXM.sulfur },
    // The trade a verb makes, in the die read's own mono face.
    offerEffect: {
        fontFamily: FONTS.mono,
        fontSize: 11,
        lineHeight: 15,
        letterSpacing: 0.5,
        color: AXM.bone,
        marginTop: 4,
    },
    offerReason: {
        fontFamily: FONTS.serifItalic,
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
        marginTop: 10,
        paddingVertical: 10,
        alignItems: 'center',
        backgroundColor: AXM.bg,
    },
    bigButtonText: { fontFamily: FONTS.gothic, fontSize: 18, letterSpacing: 2, color: AXM.sulfur },
    inactiveWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    inactiveText: { ...TYPE.body, color: AXM.parchment, opacity: 0.55, textAlign: 'center' },
}));
