/**
 * /blacksmith — the Blacksmith encounter screen ("The Anvil").
 *
 * The smith fills the screen from the top; HEART, BODY, MIND (and WILD) tabs
 * choose one die, whose six faces unfold as a cross net at his shoulder, and
 * the verbs below work that one die (168.5, ballot shot B-02b). The forge
 * opens straight onto this screen: the engine's intro step is skipped in the
 * store (`beginBlacksmithAction`), and the smith's line stands in for it.
 * Buttons wear the brass action plate.
 *
 * The die-gear upgrade surface: HONE (add a mana face), TEMPER (mana face →
 * special face), gear SWAP, and one card UPGRADE a visit on the shared
 * upgrade screen (Phase UP1e). All rules live in `axiomancer-mechanics`
 * (World/Blacksmith); this screen renders the presenter VM and dispatches
 * store actions only.
 *
 * Owner-UI doctrine: a cap-violating OR unaffordable offer wears the disabled
 * plate AND names its reason out loud (never a silent no-op) — the reason is
 * the SAME cap authority the engine's refusal card uses, so they always agree.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from '@/lib/platform/router';
import { ScrollView, Text, View } from 'react-native';
import { Haptics, ImpactFeedbackStyle } from '@/lib/platform/haptics';

import { LeaveRow } from '@/components/LeaveRow';
import { BrassPlate } from '@/components/blacksmith/BrassPlate';
import { CardUpgradePicker } from '@/components/upgrade/CardUpgradePicker';
import { ScreenBg } from '@/components/ScreenBg';
import { Image } from '@/lib/platform/image';
import { keeperPortrait } from '@/assets/images/keepers';
import { mapBackdropFor } from '@/state/exploration-maps';
import { useGameActions, useGameState } from '@/state/GameStoreProvider';
import {
    selectBlacksmithVM,
    type BlacksmithDieVM,
    type BlacksmithFaceKind,
    type BlacksmithOfferVM,
    type BlacksmithSwapVM,
} from '@/state/presenters/blacksmith.engine';
import {
    BLACKSMITH_CARD_UPGRADE_BACK,
    blacksmithUpgradedChip,
} from '@/state/presenters/blacksmith.copy';
import { TYPE_ROLES } from '@/theme/axm';
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

/** One face tile's side, in points. Three across plus gaps stay left of the smith's face at 375. */
const FACE = 46;

function hapticImpact(style: ImpactFeedbackStyle): void {
    try {
        Haptics.impactAsync(style).catch(() => undefined);
    } catch {
        // Haptics are pure polish — never let them break the screen.
    }
}

/**
 * A single service offer as a brass plate: its label over its price in
 * SHILLINGS, the trade it makes (`MISS face → MANA`) under it, and, when the
 * offer is refused, the disabled plate and the LOUD reason. Reads one
 * `BlacksmithOfferVM` off the presenter; mounted for HONE, TEMPER, the card
 * upgrade and SWAP.
 */
function OfferButton({ offer, onPress }: { offer: BlacksmithOfferVM; onPress: () => void }) {
    const styles = useStyles();
    return (
        <View style={styles.offerCol}>
            <BrassPlate
                accessibilityLabel={
                    offer.enabled
                        // The forge prices in SHILLINGS, not the combat board's
                        // CONVICTION diamonds.
                        ? `${offer.label} ${offer.color === null ? '' : `the ${offer.color} die `}for ${offer.price} shillings`
                            + (offer.effect ? `: ${offer.effect}` : '')
                        : `${offer.label} unavailable: ${offer.reason}`
                }
                disabled={!offer.enabled}
                label={offer.label}
                onPress={() => {
                    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
                    onPress();
                }}
                sub={`${offer.price} SHILLINGS`}
                subTestID={`blacksmith-offer-${offer.id}-price`}
                testID={`blacksmith-offer-${offer.id}`}
            />
            {/* HONE and TEMPER are the smith's words, not the game's: each
                offer states the trade it makes in the face vocabulary the net
                above uses. */}
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

/** One face tile of the net. */
function FaceTile({ kind, testID }: { kind: BlacksmithFaceKind; testID: string }) {
    const styles = useStyles();
    return (
        <View
            style={[styles.face, kind === 'BOON' && styles.faceBoon, kind === 'MISS' && styles.faceMiss]}
            testID={testID}
        >
            <Text style={[styles.faceText, kind === 'BOON' && styles.faceTextBoon]}>{kind}</Text>
        </View>
    );
}

/**
 * The die's six faces as a cross net: one face up, three across, one below
 * the middle, then one more below (the ballot's B-02b). Faces arrive in net
 * order from the presenter.
 */
function FaceNet({ die }: { die: BlacksmithDieVM }) {
    const styles = useStyles();
    const at = (i: number) => (
        <FaceTile kind={die.faces[i]!} testID={`blacksmith-die-${die.color}-face-${i}`} />
    );
    return (
        <View
            style={styles.net}
            testID={`blacksmith-die-${die.color}`}
            accessible
            accessibilityLabel={`${die.label} die: ${die.faceSummary}`}
        >
            <View style={styles.netRow}><View style={styles.netGap} />{at(0)}<View style={styles.netGap} /></View>
            <View style={styles.netRow}>{at(1)}{at(2)}{at(3)}</View>
            <View style={styles.netRow}><View style={styles.netGap} />{at(4)}<View style={styles.netGap} /></View>
            <View style={styles.netRow}><View style={styles.netGap} />{at(5)}<View style={styles.netGap} /></View>
            <Text style={styles.dieFaces} testID={`blacksmith-die-${die.color}-faces`}>
                {die.faceSummary}
            </Text>
        </View>
    );
}

function SwapRow({ swap, onSwap }: { swap: BlacksmithSwapVM; onSwap: () => void }) {
    const styles = useStyles();
    return (
        <View style={styles.swap} testID={`blacksmith-swap-${swap.offer.id}`}>
            <View style={styles.swapHead}>
                <Text style={styles.dieName}>{swap.name}</Text>
                <Text style={styles.dieFaces}>{swap.faceSummary}</Text>
            </View>
            <OfferButton offer={swap.offer} onPress={onSwap} />
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
    const [chosen, setChosen] = useState<BlacksmithDieVM['color']>('heart');

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

    const die = vm.dice.find((d) => d.color === chosen) ?? vm.dice[0]!;

    return (
        <ScreenBg scrollable={false} art="blacksmith" regionPlate={regionPlate}>
            <ScrollView
                style={styles.scrollOuter}
                contentContainerStyle={styles.scroll}
                testID="blacksmith-scroll"
            >
                {vm.phase === 'forging' && (
                    <View style={styles.forge} testID="blacksmith-forging">
                        <View style={styles.topRow}>
                            <Text style={styles.eyebrow}>THE ANVIL</Text>
                            <Text style={styles.budgetValue} testID="blacksmith-budget">
                                {vm.budget} SHILLINGS
                            </Text>
                        </View>
                        <View style={styles.tabs}>
                            {vm.dice.map((d) => (
                                <BrassPlate
                                    key={d.color}
                                    label={d.label}
                                    selected={d.color === die.color}
                                    onPress={() => setChosen(d.color)}
                                    style={styles.tab}
                                    accessibilityLabel={`Work the ${d.color} die`}
                                    testID={`blacksmith-tab-${d.color}`}
                                />
                            ))}
                        </View>
                        {/* The smith fills the stage; the net sits at his
                            shoulder, clear of his face. */}
                        <View style={styles.stage}>
                            <Image
                                source={keeperPortrait('smith')}
                                style={styles.smith}
                                contentFit="contain"
                                testID="blacksmith-smith"
                            />
                            <FaceNet die={die} />
                        </View>
                        <Text style={styles.smithLine} testID="blacksmith-smith-line">{vm.smithLine}</Text>
                        {/* Every die prints `1 BOON · 2 MANA · 3 MISS`; this key
                            says what those three words are worth. */}
                        <Text style={styles.faceKey} testID="blacksmith-face-key">
                            {vm.faceKey}
                        </Text>
                        <View style={styles.offerRow}>
                            <OfferButton offer={die.hone} onPress={() => actions.honeBlacksmith(die.color)} />
                            <OfferButton offer={die.temper} onPress={() => actions.temperBlacksmith(die.color)} />
                        </View>

                        {vm.cardUpgrade !== null && (
                            <View style={styles.wide} testID="blacksmith-card-upgrade">
                                <OfferButton
                                    offer={vm.cardUpgrade}
                                    onPress={actions.chooseBlacksmithCardUpgrade}
                                />
                            </View>
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

                        <View style={styles.wide}>
                            <BrassPlate
                                accessibilityLabel="Take your dice and leave the anvil"
                                label="TAKE THEM AND GO"
                                onPress={actions.leaveBlacksmith}
                                testID="blacksmith-leave"
                            />
                        </View>
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
                        <View style={styles.wide}>
                            <BrassPlate
                                accessibilityLabel="Continue"
                                label={vm.card.refused ? 'HEAR HIM OUT' : 'GOOD'}
                                onPress={actions.continueBlacksmithCard}
                                testID="blacksmith-continue"
                            />
                        </View>
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
                        <View style={styles.wide}>
                            <BrassPlate
                                accessibilityLabel="Pay the smith and pocket your dice"
                                label="PAY AND POCKET THEM"
                                onPress={actions.claimBlacksmithOutcome}
                                testID="blacksmith-claim"
                            />
                        </View>
                    </View>
                )}

                {/* Shared bordered control — see LeaveRow. */}
                {vm.phase === 'forging' && (
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
        width: '100%',
        maxWidth: SCENE_MAX_WIDTH,
        alignSelf: 'center',
    },
    forge: { flexGrow: 1 },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    tabs: { flexDirection: 'row', gap: 6 },
    tab: { flex: 1, paddingHorizontal: 8 },
    stage: { flexGrow: 1, minHeight: 280, marginVertical: 4 },
    smith: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '64%' },
    net: { position: 'absolute', left: 0, top: 8, width: FACE * 3 + 8 },
    netRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
    netGap: { width: FACE },
    face: {
        width: FACE,
        height: FACE,
        borderWidth: 2,
        borderColor: AXM.bone,
        backgroundColor: AXM.panelBg,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    faceBoon: { backgroundColor: AXM.sulfur, borderColor: AXM.parchment },
    faceMiss: { backgroundColor: AXM.bg, borderColor: AXM.ash },
    faceText: { fontFamily: TYPE_ROLES.chip.fontFamily, fontSize: 11, color: AXM.parchment },
    faceTextBoon: { color: AXM.bg },
    smithLine: {
        fontFamily: TYPE_ROLES.narration.fontFamily,
        fontSize: 18,
        lineHeight: 24,
        color: AXM.parchment,
        textAlign: 'center',
        marginBottom: 4,
    },
    eyebrow: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 12,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.bone,
        marginBottom: 4,
    },
    body: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 13,
        lineHeight: 19,
        color: AXM.parchment,
        marginBottom: 8,
    },
    budgetValue: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 20, color: AXM.sulfur },
    sectionLabel: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 11,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.bone,
        marginTop: 6,
        marginBottom: 6,
    },
    // The legend for the per-die face read; chronicle voice, one
    // step quieter than the plates it explains.
    faceKey: {
        fontFamily: TYPE_ROLES.narration.fontFamily,
        fontSize: 12,
        lineHeight: 17,
        color: AXM.bone,
        textAlign: 'center',
        marginBottom: 8,
    },
    dieName: { fontFamily: TYPE_ROLES.title.fontFamily, fontSize: 16, color: AXM.parchment, letterSpacing: TYPE_ROLES.title.letterSpacing },
    dieFaces: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 10, color: AXM.bone, marginTop: 2 },
    swap: { marginTop: 8 },
    swapHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
    wide: { marginTop: 8 },
    offerRow: { flexDirection: 'row', gap: 8 },
    offerCol: { flex: 1 },
    // The trade a verb makes, in the die read's own face.
    offerEffect: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 11,
        lineHeight: 15,
        color: AXM.bone,
        marginTop: 4,
        textAlign: 'center',
    },
    offerReason: {
        fontFamily: TYPE_ROLES.narration.fontFamily,
        fontSize: 11,
        lineHeight: 15,
        color: AXM.bone,
        marginTop: 4,
        textAlign: 'center',
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
    inactiveWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    inactiveText: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 16, lineHeight: 22, color: AXM.parchment, opacity: 0.55, textAlign: 'center' },
}));
