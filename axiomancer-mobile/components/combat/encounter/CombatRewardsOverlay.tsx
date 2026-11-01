/**
 * The post-combat card draft. After a won combat the player adds
 * ONE of three offered cards to their persistent deck, or keeps the deck lean.
 *
 *  1. REAL CARD FACES. The tiles render `CombatCardFace` off a real
 *     `CombatCardVM` — byte-identical to the face the card will
 *     show in hand. A card you are committing to for the rest of the run must
 *     be readable BEFORE you commit, so a second tap on the selected tile
 *     opens a full inspect (the hazard `RewardsOverlay`'s
 *     `hazard-card-preview` pattern): the large face, its keyword
 *     definitions, and the flavor. The first tap only selects, so taking a
 *     card is two taps: the tile, then TAKE CARD (Phase TQ1).
 *
 *  2. SKIP IS A CHOICE, not an escape hatch. It carries its own line — a lean
 *     deck draws its good cards more often — and is styled as a peer of TAKE,
 *     not a greyed-out afterthought. The Threadbare Office exists to teach
 *     exactly that.
 *
 * After an elite fight the draft carries a second option (Phase UP1f): one
 * upgrade of a card the player owns, drawn at random by the engine. UPGRADE
 * INSTEAD swaps the panel to the shared upgrade screen (`CardUpgradePicker`)
 * with that one card, so the player reads NOW, AFTER and the locked slot
 * before committing; BACK returns to the cards.
 *
 * Rarity is never colour-only: the draft is the one moment the player compares
 * three cards and keeps one for the rest of the run. Each tile carries the
 * rarity-tinted frame and a printed rarity word beneath the face, and the
 * shared `CombatCardFace` says the band to a screen reader. The rarity hexes
 * live only in `card-rarity.engine.ts`.
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CardKeywordLedger } from '@/components/card/CardKeywordLedger';
import { CombatCardFace } from '@/components/combat/encounter/CombatBoard';
import { FONTS, HUE } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import { CardUpgradePicker } from '@/components/upgrade/CardUpgradePicker';
import type { CombatCardVM } from '@/state/presenters/combat-encounter.engine';
import type { CardUpgradeRowVM } from '@/state/presenters/card-upgrade.engine';
import {
    ELITE_REWARD_SUB,
    ELITE_UPGRADE_BACK_LABEL,
    ELITE_UPGRADE_OPEN_LABEL,
    SPOILS_SUB,
    SPOILS_TILE_HINT,
    eliteUpgradeNote,
} from '@/state/presenters/combat-reward.copy';
// The ONE mobile source for the rarity band: the draft frame and the face's
// pips both read `RARITY_COLOR`, so they cannot drift apart.
import { rarityFor, RARITY_LABEL, RARITY_COLOR } from '@/state/presenters/card-rarity.engine';

/** Offer-tile face size. Smaller than the hand card (three must fit a phone
 *  width side by side) but the SAME face component at the same aspect. */
const OFFER_W = 100;
const OFFER_H = 147;
/** Inspect-preview face size. */
const PREVIEW_W = 208;
const PREVIEW_H = 305;

export function CombatRewardsOverlay({
    offers,
    onPick,
    upgradeRows = null,
    onUpgrade,
}: {
    offers: CombatCardVM[];
    onPick: (cardId: string | null) => void;
    /** The elite reward's upgrade, as the shared picker's rows (one card);
     *  null or empty hides the option. */
    upgradeRows?: readonly CardUpgradeRowVM[] | null;
    /** Commits the upgrade of `cardId`, from the shared picker's confirm. */
    onUpgrade?: (cardId: string) => void;
}) {
    const AXM = usePalette();
    const styles = useStyles();
    const [picked, setPicked] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [upgrading, setUpgrading] = useState(false);
    const previewCard = preview ? offers.find((o) => o.cardId === preview) ?? null : null;
    const upgradeRow = upgradeRows && upgradeRows.length > 0 && onUpgrade ? upgradeRows[0] : null;

    if (upgrading && upgradeRow && onUpgrade) {
        return (
            <View style={styles.backdrop} testID="combat-rewards">
                <View style={[styles.panel, styles.upgradePanel, { borderColor: AXM.sulfur }]} testID="combat-reward-upgrade-sheet">
                    <CardUpgradePicker rows={[upgradeRow]} onConfirm={onUpgrade} />
                    <Pressable
                        onPress={() => setUpgrading(false)}
                        testID="combat-reward-upgrade-back"
                        accessibilityRole="button"
                        accessibilityLabel="Back to the offered cards"
                        style={[styles.btn, styles.upgradeBack, { borderColor: AXM.ash }]}
                    >
                        <Text style={[styles.btnText, { color: AXM.bone }]}>{ELITE_UPGRADE_BACK_LABEL}</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.backdrop} testID="combat-rewards">
            <View style={[styles.panel, { borderColor: AXM.sulfur }]}>
                <Text style={styles.eyebrow}>✦ SPOILS</Text>
                <Text style={styles.title}>Add a card to your deck</Text>
                <Text style={styles.sub}>{upgradeRow ? ELITE_REWARD_SUB : SPOILS_SUB}</Text>

                <View style={styles.offerRow}>
                    {offers.map((card) => {
                        const on = picked === card.cardId;
                        // The rarity signals on one tile: the FRAME COLOUR (this
                        // border, unless the tile is selected — selection owns
                        // the gold) and the NAMED LABEL (the caption below).
                        const band = rarityFor(card);
                        const rarityColor = RARITY_COLOR[band];
                        return (
                            <Pressable
                                key={card.cardId}
                                // First tap selects; a tap on the selected tile reads it.
                                onPress={() => (on ? setPreview(card.cardId) : setPicked(card.cardId))}
                                testID={`combat-reward-${card.cardId}`}
                                accessibilityRole="button"
                                accessibilityState={{ selected: on }}
                                accessibilityLabel={`${card.name}, ${RARITY_LABEL[band]}, ${card.stance} card. ${card.detail.outcomeLine}. ${SPOILS_TILE_HINT}${on ? ', selected' : ''}`}
                                style={[
                                    styles.offerFrame,
                                    {
                                        borderColor: on ? AXM.sulfur : rarityColor,
                                        backgroundColor: on ? 'rgba(212,192,38,0.16)' : 'transparent',
                                        transform: [{ translateY: on ? -6 : 0 }],
                                    },
                                ]}
                            >
                                <CombatCardFace card={card} width={OFFER_W} height={OFFER_H} />
                                {/* The NAMED LABEL signal. The 100pt offer face is
                                    too narrow to print the word in its own name
                                    band, and this is the one screen where the
                                    player is choosing BETWEEN cards — the band
                                    has to be a word here, not a hue to decode. */}
                                <Text
                                    style={[styles.offerRarity, { color: rarityColor }]}
                                    numberOfLines={1}
                                    allowFontScaling={false}
                                    testID={`combat-reward-rarity-${card.cardId}`}
                                >
                                    {RARITY_LABEL[band].toUpperCase()}
                                </Text>
                                {on && (
                                    <View style={[styles.pickedBadge, { backgroundColor: AXM.sulfur }]}>
                                        <Text style={styles.pickedBadgeText}>✓</Text>
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </View>

                <View style={styles.btnRow}>
                    <Pressable
                        onPress={() => onPick(null)}
                        testID="combat-reward-skip"
                        accessibilityRole="button"
                        accessibilityLabel="Take nothing — keep the deck lean"
                        style={[styles.btn, { borderColor: AXM.bone }]}
                    >
                        <Text style={[styles.btnText, { color: AXM.parchment }]}>TAKE NOTHING</Text>
                        <Text style={styles.btnNote}>a lean deck draws its best more often</Text>
                    </Pressable>
                    <Pressable
                        disabled={!picked}
                        onPress={() => onPick(picked)}
                        testID="combat-reward-confirm"
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !picked }}
                        accessibilityLabel="Take the selected card"
                        style={[styles.btn, { borderColor: picked ? AXM.sulfur : AXM.ash, opacity: picked ? 1 : 0.55 }]}
                    >
                        <Text style={[styles.btnText, { color: picked ? AXM.sulfur : AXM.bone }]}>TAKE CARD</Text>
                        <Text style={styles.btnNote}>{picked ? 'it joins your deck for the run' : 'choose a card first'}</Text>
                    </Pressable>
                </View>

                {upgradeRow && (
                    <Pressable
                        onPress={() => setUpgrading(true)}
                        testID="combat-reward-upgrade-open"
                        accessibilityRole="button"
                        accessibilityLabel={`Upgrade ${upgradeRow.name} instead of taking a card`}
                        style={[styles.btn, styles.upgradeOpen, { borderColor: AXM.sulfur }]}
                    >
                        <Text style={[styles.btnText, { color: AXM.sulfur }]}>{ELITE_UPGRADE_OPEN_LABEL}</Text>
                        <Text style={styles.btnNote}>{eliteUpgradeNote(upgradeRow.name)}</Text>
                    </Pressable>
                )}
            </View>

            {/* tap-to-inspect — the FULL face plus its keyword definitions, so
                nothing is committed to the run unread. */}
            {previewCard && (
                <View style={styles.previewOverlay} testID="combat-reward-preview">
                    <View style={styles.previewColumn}>
                    <CardKeywordLedger
                        keywords={previewCard.detail.keywords}
                        testID="combat-reward-preview-keywords"
                    />
                    <View style={[styles.previewPanel, { borderColor: previewCard.face.categoryColor }]} testID="combat-reward-preview-panel">
                        <ScrollView contentContainerStyle={styles.previewScroll}>
                            <CombatCardFace card={previewCard} width={PREVIEW_W} height={PREVIEW_H} large />
                            {/* The face carries only KEYWORD · value, so the preview states the two plays itself —
                                "nothing is committed to the run unread" still has to hold. */}
                            <View style={styles.previewPlays}>
                                <Text style={styles.previewPlayLine}>
                                    <Text style={styles.previewPlayTag}>◇ NO DIE  </Text>
                                    {previewCard.detail.freePill}
                                </Text>
                                <Text style={styles.previewPlayLine}>
                                    <Text style={[styles.previewPlayTag, { color: previewCard.face.categoryColor }]}>◆ +DIE  </Text>
                                    {previewCard.detail.diePaidLine ?? previewCard.detail.outcomeLine}
                                </Text>
                            </View>
                            {previewCard.flavor ? (
                                <Text style={styles.previewFlavor} testID="combat-reward-preview-flavor">{previewCard.flavor}</Text>
                            ) : null}
                        </ScrollView>
                        <View style={styles.previewActions}>
                            <Pressable
                                onPress={() => setPreview(null)}
                                testID="combat-reward-preview-close"
                                accessibilityRole="button"
                                accessibilityLabel="Back to the offers"
                                style={[styles.previewBtn, { borderColor: AXM.ash }]}
                            >
                                <Text style={[styles.previewBtnText, { color: AXM.bone }]}>BACK</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => {
                                    setPicked(previewCard.cardId);
                                    setPreview(null);
                                }}
                                testID="combat-reward-preview-select"
                                accessibilityRole="button"
                                accessibilityLabel={`Choose ${previewCard.name}`}
                                style={[styles.previewBtn, { borderColor: AXM.sulfur, backgroundColor: 'rgba(212,192,38,0.14)' }]}
                            >
                                <Text style={[styles.previewBtnText, { color: AXM.sulfur }]}>CHOOSE THIS</Text>
                            </Pressable>
                        </View>
                    </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 12, zIndex: 60 },
    panel: { width: '100%', maxWidth: 420, borderWidth: 2, backgroundColor: AXM.panelBg, paddingHorizontal: 12, paddingVertical: 16, alignItems: 'center' },
    eyebrow: { fontFamily: FONTS.sans, fontSize: 12, letterSpacing: 2, color: AXM.sulfur, marginBottom: 4 },
    title: { fontFamily: FONTS.gothic, fontSize: 20, color: AXM.parchment, textAlign: 'center' },
    sub: { fontFamily: FONTS.serifItalic, fontStyle: 'italic', fontSize: 12, color: AXM.bone, textAlign: 'center', marginTop: 3, marginBottom: 14 },
    offerRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
    offerFrame: { borderWidth: 2, padding: 3, alignItems: 'center' },
    // The rarity word under each offer face. Hue matches the frame it sits in,
    // but the WORD is the signal — the colour is never asked to carry it alone.
    offerRarity: { fontFamily: FONTS.sans, fontSize: 9, letterSpacing: 1.4, marginTop: 3 },
    pickedBadge: { position: 'absolute', top: -9, right: -9, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    pickedBadgeText: { fontFamily: FONTS.gothic, fontSize: 14, color: HUE.badgeInk },
    btnRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
    btn: { flex: 1, borderWidth: 2, paddingHorizontal: 10, paddingVertical: 9, alignItems: 'center' },
    btnText: { fontFamily: FONTS.gothic, fontSize: 15, letterSpacing: 1 },
    upgradeOpen: { flex: 0, alignSelf: 'stretch', marginTop: 10 },
    upgradePanel: { alignItems: 'stretch' },
    upgradeBack: { flex: 0, marginTop: 12 },
    btnNote: { fontFamily: FONTS.sans, fontSize: 9, color: AXM.bone, letterSpacing: 0.3, marginTop: 3, textAlign: 'center' },
    previewOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 70, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 14 },
    previewColumn: { width: '100%', maxWidth: 400, maxHeight: '100%' },
    previewPanel: { width: '100%', maxWidth: 400, flexShrink: 1, borderWidth: 2, backgroundColor: AXM.panelBg, paddingHorizontal: 14, paddingTop: 16, paddingBottom: 12 },
    previewScroll: { alignItems: 'center', paddingBottom: 10 },
    previewPlays: { marginTop: 12, alignSelf: 'stretch', paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.16)' },
    previewPlayLine: { fontFamily: FONTS.serif, fontSize: 13, color: AXM.parchment, lineHeight: 18, marginBottom: 4 },
    previewPlayTag: { fontFamily: FONTS.sans, fontSize: 10, letterSpacing: 1, color: AXM.bone },
    previewFlavor: { fontFamily: FONTS.serifItalic, fontStyle: 'italic', fontSize: 13, color: AXM.bone, textAlign: 'center', marginTop: 12, lineHeight: 18 },
    previewActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
    previewBtn: { flex: 1, borderWidth: 2, paddingVertical: 11, alignItems: 'center' },
    previewBtnText: { fontFamily: FONTS.gothic, fontSize: 15, letterSpacing: 1.5 },
}));
