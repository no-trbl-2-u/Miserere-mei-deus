/**
 * CombatFriendshipPanel — the "the heart opens" panel rendered
 * inside the encounter modal seal once `lastOutcome === 'parley'`.
 *
 * Sibling of `<CombatVictoryPanel>` — same vertical rhythm, but the centerpiece
 * is the pixel-art emblem (the app's lone pixel-art carve-out;
 * see `PixelEmblem.tsx` for the rationale) and the accent palette
 * is rust + parchment (not blood + sulfur).
 *
 * Non-dismissible by tap-outside; only `❦ PART AS FRIENDS`
 * releases the seal.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path as SvgPath } from 'react-native-svg';

import { PixelEmblem } from '@/components/event/aftermath/PixelEmblem';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import type { AftermathParleyViewModel } from '@/state/presenters/aftermath.engine';

export interface CombatFriendshipPanelProps {
    vm: AftermathParleyViewModel;
    onContinue: () => void;
}

export function CombatFriendshipPanel({ vm, onContinue }: CombatFriendshipPanelProps) {
    const AXM = usePalette();
    const styles = useStyles();
    // A befriend pays no XP: shillings, or one potion.
    const rewardLine =
        vm.rewards.currency !== null
            ? `+${vm.rewards.currency.shillings} shillings`
            : vm.rewards.loot.length > 0
                ? vm.rewards.loot.map(l => l.name).join(', ')
                : '—';

    return (
        <View style={styles.root} testID="combat-friendship-panel">
            {/* Top binder — rust register signals the friendship outcome. */}
            <View style={styles.topBinder}>
                <Text style={styles.binderGlyphs}>
                    {'❦ ❦ ❦ ❦ ❦ ❦ ❦ ❦ ❦ ❦'}
                </Text>
            </View>

            <View style={styles.body}>
                <Text style={styles.eyebrow}>❦ THE HEART OPENS</Text>

                <View style={styles.titleBlock}>
                    <Text
                        style={styles.title}
                        testID="combat-friendship-panel-enemy-name"
                    >
                        {vm.enemyName}
                    </Text>
                    {vm.enemyEpithet !== null && (
                        <Text
                            style={styles.epithet}
                            testID="combat-friendship-panel-enemy-epithet"
                        >
                            — {vm.enemyEpithet}
                        </Text>
                    )}
                </View>

                {/* Pixel emblem — the app's lone deliberate carve-out. */}
                <View style={styles.emblemBlock}>
                    <PixelEmblem cell={11} />
                    <Text style={styles.accordLabel}>❦ AN ACCORD</Text>
                </View>

                <Text
                    style={styles.pactPhrase}
                    testID="combat-friendship-panel-pact-phrase"
                >
                    “{vm.pactPhrase}”
                </Text>

                <View style={styles.rewardStrip} testID="combat-friendship-panel-rewards">
                    <View style={styles.rewardCell}>
                        <Text
                            style={[styles.rewardValue, { color: AXM.rust }]}
                            testID="combat-friendship-panel-reward"
                        >
                            {rewardLine}
                        </Text>
                        <Text style={styles.rewardLabel}>THEIR GIFT</Text>
                    </View>
                </View>

                {vm.journalEntry !== null && (
                    <View
                        style={styles.journalSection}
                        testID="combat-friendship-panel-journal-entry"
                    >
                        <Text style={styles.journalEyebrow}>✎ A NEW ENTRY</Text>
                        <View style={styles.journalCard}>
                            <BookGlyph />
                            <View style={styles.journalCardText}>
                                <Text style={styles.journalBookName}>
                                    {vm.journalEntry.bookName}
                                </Text>
                                <Text style={styles.journalEntryTitle}>
                                    {vm.journalEntry.entryTitle}
                                </Text>
                                <Text
                                    style={styles.journalPreview}
                                    numberOfLines={2}
                                >
                                    “{vm.journalEntry.preview}…”
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                <View style={styles.spacer} />

                <Pressable
                    onPress={onContinue}
                    accessibilityRole="button"
                    accessibilityLabel="Part as friends"
                    testID="combat-friendship-panel-part-as-friends"
                    style={({ pressed }) => [
                        styles.partAsFriends,
                        pressed && styles.partAsFriendsPressed,
                    ]}
                >
                    <Text style={styles.partAsFriendsLabel}>❦ PART AS FRIENDS</Text>
                </Pressable>
            </View>
        </View>
    );
}

/**
 * Closed-book glyph rendered next to the journal-entry text block.
 * 28×34 SVG,
 * rust spine + parchment-bone page hatching + a small rust dot
 * standing in for the codex seal.
 */
function BookGlyph() {
    const AXM = usePalette();
    return (
        <Svg width={28} height={34} viewBox="0 0 28 34">
            <SvgPath
                d="M4 3 L24 3 L24 31 L4 31 Z"
                fill={AXM.silhouette}
                stroke={AXM.rust}
                strokeWidth="1.4"
            />
            <SvgPath d="M4 3 L4 31" stroke={AXM.rust} strokeWidth="2.5" />
            <SvgPath
                d="M9 10 L 19 10 M 9 14 L 19 14 M 9 18 L 16 18"
                stroke={AXM.bone}
                strokeWidth="1"
            />
            <Circle cx="20" cy="24" r="1.6" fill={AXM.rust} />
        </Svg>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: {
        flex: 1,
        backgroundColor: AXM.bg,
    },
    topBinder: {
        height: 16,
        borderBottomWidth: 1,
        borderBottomColor: AXM.ash,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    binderGlyphs: {
        fontFamily: FONTS.mono,
        fontSize: 8,
        color: AXM.rust,
        letterSpacing: 2,
    },
    body: {
        flex: 1,
        paddingHorizontal: 18,
        paddingTop: 14,
        paddingBottom: 14,
    },
    eyebrow: {
        fontFamily: FONTS.sans,
        fontSize: 11,
        color: AXM.rust,
        letterSpacing: 2.2,
    },
    titleBlock: { marginTop: 6 },
    title: {
        fontFamily: FONTS.gothic,
        fontSize: 26,
        lineHeight: 28,
        letterSpacing: 1,
        color: AXM.parchment,
    },
    epithet: {
        fontFamily: FONTS.serifItalic,
        fontSize: 13,
        color: AXM.bone,
        marginTop: 4,
    },
    emblemBlock: {
        marginTop: 14,
        alignItems: 'center',
        gap: 6,
    },
    accordLabel: {
        fontFamily: FONTS.sans,
        fontSize: 10,
        color: AXM.rust,
        letterSpacing: 2.4,
        marginTop: 2,
    },
    pactPhrase: {
        fontFamily: FONTS.serifItalic,
        fontSize: 13,
        lineHeight: 18,
        color: AXM.parchment,
        marginTop: 10,
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    rewardStrip: {
        flexDirection: 'row',
        marginTop: 14,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.silhouette,
    },
    rewardCell: {
        flex: 1,
        paddingHorizontal: 4,
        paddingTop: 6,
        paddingBottom: 8,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    rewardValue: {
        fontFamily: FONTS.mono,
        fontSize: 18,
        lineHeight: 20,
    },
    rewardLabel: {
        fontFamily: FONTS.sans,
        fontSize: 9,
        letterSpacing: 2,
        color: AXM.bone,
        marginTop: 5,
    },
    journalSection: { marginTop: 12 },
    journalEyebrow: {
        fontFamily: FONTS.sans,
        fontSize: 9,
        color: AXM.rust,
        letterSpacing: 2,
    },
    journalCard: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: AXM.rust,
        backgroundColor: AXM.panelBg,
    },
    journalCardText: { flex: 1, minWidth: 0 },
    journalBookName: {
        fontFamily: FONTS.sans,
        fontSize: 9,
        color: AXM.rust,
        letterSpacing: 1.4,
    },
    journalEntryTitle: {
        fontFamily: FONTS.gothic,
        fontSize: 16,
        color: AXM.parchment,
        letterSpacing: 0.5,
        marginTop: 4,
    },
    journalPreview: {
        fontFamily: FONTS.serifItalic,
        fontSize: 11,
        color: AXM.bone,
        marginTop: 4,
        lineHeight: 15,
    },
    spacer: { flex: 1, minHeight: 8 },
    partAsFriends: {
        paddingVertical: 12,
        backgroundColor: AXM.silhouette,
        borderWidth: 2,
        borderColor: AXM.rust,
        alignItems: 'center',
        justifyContent: 'center',
    },
    partAsFriendsPressed: { opacity: 0.85 },
    partAsFriendsLabel: {
        fontFamily: FONTS.gothic,
        fontSize: 16,
        color: AXM.rust,
        letterSpacing: 2,
    },
}));
