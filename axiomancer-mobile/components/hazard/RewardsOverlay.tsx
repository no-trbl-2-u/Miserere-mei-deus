/**
 * The Reckoning — rewards & consequences ledger plus the pick-1-of-3
 * card offer. Opaque surface (cards must be readable). Boon and
 * consequence icons share one ledger area; tapping an icon opens its
 * explainer tooltip. Perfect runs show the ✕ skip affordance.
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from '@/lib/platform/image';
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';

import { TREASURE_CHEST_PALE } from '@/assets/images/treasure';
import type { HazardRewardsVM } from '@/state/presenters/hazard.engine';
import { HUE, TYPE_ROLES } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

import { HazardCard } from './HazardCard';
import { BoonIcon } from './glyphs';
import { HZ } from './palette';

function BoonChip({
    icon,
    name,
    desc,
    kind,
    active,
    onTap,
    testID,
}: {
    icon: string;
    name: string;
    desc: string;
    kind: 'reward' | 'conseq';
    active: boolean;
    onTap: () => void;
    testID: string;
}) {
    const AXM = usePalette();
    const styles = useStyles();
    const c = kind === 'reward' ? HZ.gold : AXM.blood;
    return (
        <View>
            <Pressable
                onPress={onTap}
                accessibilityRole="button"
                accessibilityLabel={`${name}. ${desc}`}
                testID={testID}
                style={[styles.boonChip, { borderColor: c, backgroundColor: active ? `${c}22` : 'rgba(0,0,0,0.4)' }]}
            >
                <BoonIcon icon={icon} color={c} size={24} />
            </Pressable>
            {active && (
                <Animated.View entering={FadeIn.duration(140)} style={[styles.tooltip, { borderColor: c }]}>
                    <Text style={[styles.tooltipName, { color: c }]}>{name.toUpperCase()}</Text>
                    <Text style={styles.tooltipDesc}>{desc}</Text>
                </Animated.View>
            )}
        </View>
    );
}

export function RewardsOverlay({
    rewards,
    onConfirm,
}: {
    rewards: HazardRewardsVM;
    onConfirm: (cardId: string | null) => void;
}) {
    const AXM = usePalette();
    const styles = useStyles();
    const [tip, setTip] = useState<string | null>(null);
    const [picked, setPicked] = useState<string | null>(null);
    const [previewCard, setPreviewCard] = useState<string | null>(null);
    const tierColor =
        rewards.tier === 'perfect' ? HZ.gold : rewards.tier === 'complete' ? AXM.parchment : AXM.blood;
    const hasOffer = rewards.offerCards.length > 0;
    const canConfirm = !hasOffer || picked !== null;

    return (
        <Animated.View entering={FadeInUp.duration(280)} style={styles.root} testID="hazard-rewards">
            <View style={{ alignItems: 'center', paddingTop: 16, paddingBottom: 8 }}>
                <Image
                    source={TREASURE_CHEST_PALE}
                    style={{ width: 96, height: 78, marginBottom: 4 }}
                    contentFit="contain"
                    transition={0}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                />
                <Text style={styles.eyebrow}>THE RECKONING</Text>
                <Text style={[styles.title, { color: tierColor }]}>SPOILS &amp; SCARS</Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
                {/* boon / consequence ledger */}
                <View style={styles.ledger}>
                    {rewards.rewards.length > 0 && (
                        <>
                            <Text style={[styles.ledgerLabel, { color: HZ.gold }]}>✦ REWARDS</Text>
                            <View style={styles.chipRow}>
                                {rewards.rewards.map((r) => (
                                    <BoonChip
                                        key={r.id}
                                        icon={r.icon}
                                        name={r.name}
                                        desc={r.desc}
                                        kind="reward"
                                        active={tip === `r-${r.id}`}
                                        onTap={() => setTip(tip === `r-${r.id}` ? null : `r-${r.id}`)}
                                        testID={`hazard-reward-${r.id}`}
                                    />
                                ))}
                            </View>
                        </>
                    )}
                    {rewards.reserveNote !== null && (
                        <Text style={styles.reserveNote}>⟜ {rewards.reserveNote}</Text>
                    )}
                    {rewards.consequences.length > 0 ? (
                        <>
                            <Text style={[styles.ledgerLabel, { color: AXM.blood, marginTop: rewards.rewards.length ? 12 : 0 }]}>
                                {rewards.consequencesLabel}
                            </Text>
                            <View style={styles.chipRow}>
                                {rewards.consequences.map((c) => (
                                    <BoonChip
                                        key={c.id}
                                        icon={c.icon}
                                        name={c.name}
                                        desc={c.desc}
                                        kind="conseq"
                                        active={tip === `c-${c.id}`}
                                        onTap={() => setTip(tip === `c-${c.id}` ? null : `c-${c.id}`)}
                                        testID={`hazard-consequence-${c.id}`}
                                    />
                                ))}
                            </View>
                        </>
                    ) : rewards.penaltyNote === null ? (
                        <Text style={styles.flawless}>— flawless. no consequences befall you —</Text>
                    ) : null}
                    {/* The route penalty stands on its own: a one-loss run has
                        a penalty and no consequence chip. */}
                    {rewards.penaltyNote !== null && (
                        <Text style={styles.penaltyNote} testID="hazard-rewards-penalty">{rewards.penaltyNote}</Text>
                    )}
                    <Text style={styles.tapHint}>TAP AN ICON TO READ IT</Text>
                </View>

                {/* card reward pick */}
                <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
                    {hasOffer ? (
                        <>
                            <Text style={styles.offerTitle}>ADD A CARD TO YOUR HAZARD DECK</Text>
                            <Text style={styles.offerSub}>{rewards.offerSubLabel}</Text>
                            <View style={styles.offerRow}>
                                {rewards.offerCards.map((card, i) => (
                                    <Animated.View key={card.uid} entering={FadeInDown.delay(150 + i * 120).duration(280)}>
                                        <Pressable
                                            onPress={() => setPreviewCard(card.cardId)}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Preview reward card ${card.name}, ${card.rarity}`}
                                            testID={`hazard-offer-${card.cardId}`}
                                            style={{ transform: [{ translateY: picked === card.cardId ? -8 : 0 }] }}
                                        >
                                            <View
                                                style={[
                                                    styles.offerFrame,
                                                    {
                                                        borderColor:
                                                            card.rarity === 'rare' ? HZ.gold : card.rarity === 'uncommon' ? HUE.blockBlue : HUE.stoneGrey,
                                                        shadowOpacity: picked === card.cardId ? 0.9 : 0.3,
                                                    },
                                                ]}
                                            >
                                                <HazardCard card={card} mode="offer" />
                                            </View>
                                            {picked === card.cardId && (
                                                <Animated.View entering={ZoomIn.duration(160)} style={styles.pickedBadge}>
                                                    <Text style={styles.pickedBadgeText}>✓</Text>
                                                </Animated.View>
                                            )}
                                        </Pressable>
                                    </Animated.View>
                                ))}
                            </View>
                        </>
                    ) : (
                        <Text style={styles.noSpoils}>No spoils for the fallen. Only the scars remain.</Text>
                    )}
                </View>
            </ScrollView>

            {/* card preview overlay */}
            {previewCard && (
                <Animated.View entering={FadeIn.duration(200)} style={styles.previewOverlay} testID="hazard-card-preview">
                    <View style={styles.previewContainer}>
                        <Text style={styles.previewTitle}>REWARD PREVIEW</Text>
                        
                        {(() => {
                            const card = rewards.offerCards.find(c => c.cardId === previewCard);
                            if (!card) return null;
                            
                            return (
                                <>
                                    <View style={styles.previewCardContainer}>
                                        <HazardCard card={card} mode="detail" />
                                    </View>
                                    
                                    <View style={styles.previewInfo}>
                                        <Text style={styles.previewCardName}>{card.name}</Text>
                                        <Text style={styles.previewArchetype}>{card.kind.toUpperCase()} CARD</Text>
                                        {card.keywords && card.keywords.length > 0 && (
                                            <View style={styles.previewKeywords}>
                                                <Text style={styles.previewKeywordsLabel}>KEYWORDS:</Text>
                                                <Text style={styles.previewKeywordsList}>
                                                    {card.keywords.map((kw) => kw.name).join(', ')}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    
                                    <View style={styles.previewActions}>
                                        <Pressable
                                            onPress={() => setPreviewCard(null)}
                                            accessibilityRole="button"
                                            accessibilityLabel="Cancel card selection"
                                            testID="hazard-preview-cancel"
                                            style={[styles.previewBtn, styles.previewCancelBtn]}
                                        >
                                            <Text style={[styles.previewBtnText, styles.previewCancelText]}>CANCEL</Text>
                                        </Pressable>
                                        
                                        <Pressable
                                            onPress={() => {
                                                setPicked(card.cardId);
                                                setPreviewCard(null);
                                            }}
                                            accessibilityRole="button"
                                            accessibilityLabel="Confirm card selection"
                                            testID="hazard-preview-confirm"
                                            style={[styles.previewBtn, styles.previewConfirmBtn]}
                                        >
                                            <Text style={[styles.previewBtnText, styles.previewConfirmText]}>TAKE THIS CARD</Text>
                                        </Pressable>
                                    </View>
                                </>
                            );
                        })()}
                    </View>
                </Animated.View>
            )}

            {/* confirm / skip */}
            <View style={styles.confirmRow}>
                <Pressable
                    onPress={() => {
                        if (canConfirm) onConfirm(picked);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canConfirm }}
                    testID="hazard-rewards-confirm"
                    style={[
                        styles.confirmBtn,
                        {
                            borderColor: canConfirm ? AXM.sulfur : AXM.ash,
                            backgroundColor: canConfirm ? 'rgba(212,192,38,0.14)' : 'rgba(0,0,0,0.3)',
                        },
                    ]}
                >
                    <Text style={[styles.confirmText, { color: canConfirm ? AXM.sulfur : AXM.bone }]}>
                        {!hasOffer ? '✠ ONWARD' : picked !== null ? '✠ TAKE IT — ONWARD' : 'CHOOSE A CARD'}
                    </Text>
                </Pressable>
                {rewards.canSkip && hasOffer && (
                    <Pressable
                        onPress={() => onConfirm(null)}
                        accessibilityRole="button"
                        accessibilityLabel="Skip the card reward"
                        testID="hazard-rewards-skip"
                        style={styles.skipBtn}
                    >
                        <Text style={styles.skipX}>✕</Text>
                        <Text style={styles.skipLabel}>SKIP</Text>
                    </Pressable>
                )}
            </View>
        </Animated.View>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: { ...StyleSheet.absoluteFillObject, zIndex: 62, backgroundColor: HUE.overlayBg },
    eyebrow: { fontFamily: TYPE_ROLES.eyebrow.fontFamily, fontSize: 12, letterSpacing: TYPE_ROLES.eyebrow.letterSpacing, color: AXM.bone },
    title: { fontFamily: TYPE_ROLES.title.fontFamily, fontSize: 26, letterSpacing: TYPE_ROLES.title.letterSpacing, marginTop: 2, textShadowColor: HUE.black, textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 0 },
    ledger: { marginHorizontal: 14, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: AXM.ash },
    ledgerLabel: { fontFamily: TYPE_ROLES.eyebrow.fontFamily, fontSize: 12, letterSpacing: TYPE_ROLES.eyebrow.letterSpacing, marginBottom: 6 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    boonChip: { width: 46, height: 46, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    tooltip: { position: 'absolute', bottom: '108%', left: -60, width: 168, zIndex: 5, backgroundColor: 'rgba(6,5,5,0.98)', borderWidth: 1, paddingHorizontal: 9, paddingVertical: 7 },
    tooltipName: { fontFamily: TYPE_ROLES.title.fontFamily, fontSize: 12, letterSpacing: TYPE_ROLES.title.letterSpacing},
    tooltipDesc: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 13, color: AXM.parchment, lineHeight: 17, marginTop: 2 },
    reserveNote: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 12, color: HZ.gold, marginTop: 8 },
    penaltyNote: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 12, color: AXM.blood, marginTop: 8 },
    flawless: { fontFamily: TYPE_ROLES.narration.fontFamily, fontStyle: 'italic', fontSize: 13, color: HZ.acid, marginTop: 4 },
    tapHint: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 11, color: AXM.bone, marginTop: 8 },
    offerTitle: { fontFamily: TYPE_ROLES.title.fontFamily, fontSize: 17, color: AXM.parchment, letterSpacing: TYPE_ROLES.title.letterSpacing, textAlign: 'center' },
    offerSub: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 11, color: AXM.bone, marginTop: 2, textAlign: 'center' },
    offerRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 10 },
    offerFrame: { borderWidth: 2, padding: 3, shadowColor: HZ.gold, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
    pickedBadge: { position: 'absolute', top: -10, right: -10, width: 22, height: 22, borderRadius: 11, backgroundColor: AXM.sulfur, alignItems: 'center', justifyContent: 'center' },
    pickedBadgeText: { fontFamily: TYPE_ROLES.chip.fontFamily, fontSize: 14, color: HUE.badgeInk },
    noSpoils: { fontFamily: TYPE_ROLES.narration.fontFamily, fontStyle: 'italic', fontSize: 13, color: AXM.bone, textAlign: 'center', paddingVertical: 24 },
    confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 16 },
    confirmBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 2 },
    confirmText: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 17, letterSpacing: TYPE_ROLES.button.letterSpacing},
    skipBtn: { width: 54, height: 54, borderWidth: 1.5, borderColor: AXM.bone, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
    skipX: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 20, lineHeight: 21, color: AXM.bone },
    skipLabel: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 10, letterSpacing: TYPE_ROLES.button.letterSpacing, color: AXM.bone },
    
    // Preview overlay styles
    previewOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 70, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
    previewContainer: { backgroundColor: HUE.overlayBg, borderWidth: 2, borderColor: AXM.sulfur, paddingHorizontal: 16, paddingVertical: 20, maxWidth: 400, width: '100%' },
    previewTitle: { fontFamily: TYPE_ROLES.title.fontFamily, fontSize: 16, letterSpacing: TYPE_ROLES.title.letterSpacing, color: AXM.sulfur, textAlign: 'center', marginBottom: 16 },
    previewCardContainer: { alignItems: 'center', marginBottom: 16 },
    previewInfo: { alignItems: 'center', marginBottom: 20 },
    previewCardName: { fontFamily: TYPE_ROLES.cardName.fontFamily, fontSize: 18, color: AXM.parchment, textAlign: 'center', marginBottom: 4 },
    previewArchetype: { fontFamily: TYPE_ROLES.eyebrow.fontFamily, fontSize: 12, letterSpacing: TYPE_ROLES.eyebrow.letterSpacing, color: AXM.bone, textAlign: 'center', marginBottom: 8 },
    previewKeywords: { alignItems: 'center', marginTop: 8 },
    previewKeywordsLabel: { fontFamily: TYPE_ROLES.eyebrow.fontFamily, fontSize: 11, letterSpacing: TYPE_ROLES.eyebrow.letterSpacing, color: AXM.ash, marginBottom: 2 },
    previewKeywordsList: { fontFamily: TYPE_ROLES.cardRules.fontFamily, fontSize: 13, color: AXM.parchment, textAlign: 'center' },
    previewActions: { flexDirection: 'row', gap: 12 },
    previewBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 2 },
    previewCancelBtn: { borderColor: AXM.ash, backgroundColor: 'rgba(0,0,0,0.3)' },
    previewConfirmBtn: { borderColor: AXM.sulfur, backgroundColor: 'rgba(212,192,38,0.14)' },
    previewBtnText: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 15, letterSpacing: TYPE_ROLES.button.letterSpacing},
    previewCancelText: { color: AXM.bone },
    previewConfirmText: { color: AXM.sulfur },
}));
