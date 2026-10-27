/**
 * CombatVictoryPanel — the "the foe falls" panel for a won fight.
 *
 * The component is a pure render of the VM produced
 * by `selectAftermathViewModel`; the host wires the dismiss handler
 * (today only the `/devaftermath` gallery mounts it).
 *
 * Non-dismissible by tap-outside — the only release is the CARRY ON
 * button below.
 *
 * An empty loot list shows the "no spoils. only quiet." fallback, and
 * a null reward field (the VM's currency is always null) shows a
 * single em-dash.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from '@/lib/platform/image';
import Svg, { Circle, Path as SvgPath } from 'react-native-svg';

import { TREASURE_FALLING_COINS } from '@/assets/images/treasure';
import { AxmIcon } from '@/components/icons';
import { Splatter } from '@/components/Splatter';
import { VictoryWreath } from '@/components/art/VictoryWreath';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import { rarityAffordance, rarityColors } from '@/components/inventory/rarityAffordance';
import type { AftermathVictoryViewModel } from '@/state/presenters/aftermath.engine';

export interface CombatVictoryPanelProps {
    vm: AftermathVictoryViewModel;
    onContinue: () => void;
}

export function CombatVictoryPanel({ vm, onContinue }: CombatVictoryPanelProps) {
    const AXM = usePalette();
    const styles = useStyles();
    const lootCount = vm.rewards.loot.length;
    const xpDisplay = vm.rewards.xp === null ? '—' : String(vm.rewards.xp);
    const currencyDisplay =
        vm.rewards.currency === null ? '—' : String(vm.rewards.currency.shillings);
    const lootDisplay = lootCount === 0 ? '—' : String(lootCount);

    return (
        <View style={styles.root} testID="combat-victory-panel">
            {/* Top chronicle binder — visually separates the seal chrome
                from the page content. */}
            <View style={styles.topBinder}>
                <Text style={styles.binderGlyphs}>
                    {'✠ ✠ ✠ ✠ ✠ ✠ ✠ ✠ ✠ ✠'}
                </Text>
            </View>

            <View style={styles.body}>
                <Text style={styles.eyebrow}>✠ THE FOE FALLS</Text>

                <View style={styles.titleBlock}>
                    <Text style={styles.title} testID="combat-victory-panel-enemy-name">
                        {vm.enemyName}
                    </Text>
                    {vm.enemyEpithet !== null && (
                        <Text
                            style={styles.epithet}
                            testID="combat-victory-panel-enemy-epithet"
                        >
                            — {vm.enemyEpithet}
                        </Text>
                    )}
                </View>

                {/* Final-blow panel. */}
                <View style={styles.finalBlowWrap}>
                    <Splatter
                        color={AXM.blood}
                        size={120}
                        seed={73}
                        style={styles.splatterTopRight}
                    />
                    <Splatter
                        color={AXM.blood}
                        size={92}
                        seed={91}
                        style={styles.splatterBottomLeft}
                    />
                    <View style={styles.finalBlowInner}>
                        <View style={styles.finalBlowHeaderRow}>
                            <Text style={styles.finalBlowHeader}>
                                FINAL BLOW
                                {vm.finalBlow !== null && (
                                    <>
                                        {' · '}
                                        <Text style={styles.finalBlowCard}>
                                            {vm.finalBlow.cardName}
                                        </Text>
                                        {' · '}
                                        <Text style={styles.finalBlowDamage}>
                                            {vm.finalBlow.damage}
                                        </Text>
                                    </>
                                )}
                            </Text>
                        </View>
                        <Text
                            style={styles.finalBlowPhrase}
                            testID="combat-victory-panel-final-blow-phrase"
                        >
                            “{vm.finalBlowPhrase}”
                        </Text>
                        {vm.finalBlow !== null && (
                            <Text style={styles.finalBlowDescriptor}>
                                — {vm.finalBlow.descriptor}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Reward strip. */}
                <View style={styles.rewardStrip} testID="combat-victory-panel-rewards">
                    <RewardCell label="EXPERIENCE" value={xpDisplay} tint={AXM.parchment} />
                    <View style={styles.rewardDivider} />
                    <RewardCell
                        label="SHILLINGS"
                        value={currencyDisplay}
                        tint={AXM.sulfur}
                    />
                    <View style={styles.rewardDivider} />
                    <RewardCell label="LOOT" value={lootDisplay} tint={AXM.parchment} />
                </View>

                {/* Spoils / loot list. */}
                <View style={styles.lootSection}>
                    <Text style={styles.lootHeader}>✠ SPOILS OF THE FELLED</Text>
                    {lootCount === 0 ? (
                        <Text style={styles.lootEmpty} testID="combat-victory-panel-loot-empty">
                            “no spoils. only quiet.”
                        </Text>
                    ) : (
                        <View style={styles.lootList}>
                            {vm.rewards.loot.map((it, i) => {
                                const rarityLabel = rarityAffordance(it.rarity).label;
                                const lootLabel = rarityLabel === null
                                    ? `${it.name}, ${it.slot}`
                                    : `${it.name}, ${it.slot}, ${rarityLabel}`;
                                return (
                                    <View
                                        key={`${it.name}-${i}`}
                                        style={styles.lootRow}
                                        accessibilityLabel={lootLabel}
                                        testID={`loot-row-${i}`}
                                    >
                                        <View style={styles.lootGlyphWrap}>
                                            <ItemGlyph slot={it.slot} />
                                        </View>
                                        <View style={styles.lootRowText}>
                                            <Text style={styles.lootName}>{it.name}</Text>
                                            <Text style={styles.lootSlot}>
                                                {it.slot.toUpperCase()}
                                            </Text>
                                        </View>
                                        <RarityRail rarity={it.rarity} testID={`loot-rarity-${i}`} />
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* Spoils tableau — coins spill over the ceremonial laurel in the
                    void above the CTA so a win always reads as an earned beat. */}
                <View style={styles.spacer}>
                    <View style={styles.wreathWatermark} pointerEvents="none">
                        <VictoryWreath size={132} />
                    </View>
                    <Image
                        source={TREASURE_FALLING_COINS}
                        style={styles.coinSpill}
                        contentFit="contain"
                        transition={0}
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                    />
                </View>

                <Pressable
                    onPress={onContinue}
                    accessibilityRole="button"
                    accessibilityLabel="Carry on"
                    testID="combat-victory-panel-carry-on"
                    style={({ pressed }) => [
                        styles.carryOn,
                        pressed && styles.carryOnPressed,
                    ]}
                >
                    <Text style={styles.carryOnLabel}>✠ CARRY ON</Text>
                </Pressable>
            </View>
        </View>
    );
}

interface RewardCellProps {
    label: string;
    value: string;
    tint: string;
}

function RewardCell({ label, value, tint }: RewardCellProps) {
    const styles = useStyles();
    return (
        <View style={styles.rewardCell}>
            <Text style={[styles.rewardValue, { color: tint }]}>{value}</Text>
            <Text style={styles.rewardLabel}>{label}</Text>
        </View>
    );
}

/**
 * Slot glyph. Stroke-only woodcut style; the slot string keys
 * which glyph to draw. Unknown slots fall through to the bone
 * fragment default.
 */
function ItemGlyph({ slot, size = 18 }: { slot: string; size?: number }) {
    const AXM = usePalette();
    const c = AXM.parchment;
    if (slot === 'weapon') {
        // Canonical sword mark from the icon registry.
        return <AxmIcon name="action-sword" size={size} color={c} />;
    }
    if (slot === 'relic' || slot === 'trinket') {
        return (
            <Svg width={size} height={size} viewBox="0 0 32 32">
                <Circle cx="16" cy="18" r="8" fill="none" stroke={c} strokeWidth="2" />
                <Circle cx="16" cy="18" r="3" fill={AXM.sulfur} />
                <SvgPath d="M16 4 L 18 10 L 14 10 Z" fill={c} />
            </Svg>
        );
    }
    return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
            <SvgPath
                d="M8 6 L24 6 L26 12 L20 18 L24 28 L12 28 L8 22 L12 16 Z"
                fill="none"
                stroke={c}
                strokeWidth="2"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

/**
 * Loot-tile rarity rail. The rail colours follow the shared rarity rule so reward tiles speak the same language as the
 * inventory `ItemCard`: uncommon green, rare blue, unique red. Unique
 * renders a thicker, full-opacity bar so its red outline reads as the
 * "set-in-stone" tier; common stays a muted hairline.
 */
function RarityRail({
    rarity,
    testID,
}: {
    rarity: AftermathVictoryViewModel['rewards']['loot'][number]['rarity'];
    testID?: string;
}) {
    const AXM = usePalette();
    const styles = useStyles();
    const affordance = rarityAffordance(rarity);
    const colors = rarityColors(rarity, AXM);
    return (
        <View
            testID={testID}
            style={[
                styles.rarityRail,
                { backgroundColor: colors.accent },
                affordance.isOutline && styles.rarityRailUnique,
                rarity === 'common' && styles.rarityRailCommon,
            ]}
        />
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    binderGlyphs: {
        fontFamily: FONTS.mono,
        fontSize: 8,
        color: AXM.blood,
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
        color: AXM.blood,
        letterSpacing: 2.2,
    },
    titleBlock: { marginTop: 6 },
    title: {
        fontFamily: FONTS.gothic,
        fontSize: 28,
        lineHeight: 30,
        letterSpacing: 1,
        color: AXM.parchment,
    },
    epithet: {
        fontFamily: FONTS.serifItalic,
        fontSize: 13,
        color: AXM.bone,
        marginTop: 4,
    },
    finalBlowWrap: {
        marginTop: 14,
        position: 'relative',
        borderWidth: 1,
        borderColor: AXM.blood,
        backgroundColor: AXM.dockBg,
        overflow: 'hidden',
    },
    splatterTopRight: {
        position: 'absolute',
        top: -22,
        right: -22,
        opacity: 0.42,
    },
    splatterBottomLeft: {
        position: 'absolute',
        bottom: -28,
        left: -18,
        opacity: 0.3,
    },
    finalBlowInner: {
        paddingTop: 12,
        paddingHorizontal: 14,
        paddingBottom: 10,
    },
    finalBlowHeaderRow: {},
    finalBlowHeader: {
        fontFamily: FONTS.mono,
        fontSize: 9,
        letterSpacing: 1.5,
        color: AXM.bone,
    },
    finalBlowCard: {
        color: AXM.parchment,
    },
    finalBlowDamage: {
        color: AXM.blood,
    },
    finalBlowPhrase: {
        fontFamily: FONTS.serifItalic,
        fontSize: 13,
        lineHeight: 18,
        color: AXM.parchment,
        marginTop: 8,
    },
    finalBlowDescriptor: {
        fontFamily: FONTS.mono,
        fontSize: 9,
        // Was AXM.ash (~2.1:1 on the dock-bg box) at 8px — the "— felled
        // the foe" caption read as near-black grime on the box edge.
        // bone (~6.5:1) makes it legible without competing with the
        // parchment phrase above it.
        color: AXM.bone,
        letterSpacing: 1.4,
        marginTop: 8,
    },
    rewardStrip: {
        flexDirection: 'row',
        marginTop: 16,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.silhouette,
    },
    rewardDivider: {
        width: 1,
        backgroundColor: AXM.ash,
    },
    rewardCell: {
        flex: 1,
        paddingHorizontal: 4,
        paddingTop: 10,
        paddingBottom: 10,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    rewardValue: {
        fontFamily: FONTS.mono,
        fontSize: 27,
        lineHeight: 30,
        // Lift the payoff numbers off the strip so a win reads as a reward.
        textShadowColor: AXM.shadow,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    rewardLabel: {
        fontFamily: FONTS.sans,
        fontSize: 9,
        letterSpacing: 2,
        color: AXM.bone,
        marginTop: 5,
    },
    lootSection: { marginTop: 14 },
    lootHeader: {
        fontFamily: FONTS.sans,
        fontSize: 9,
        letterSpacing: 2,
        color: AXM.parchment,
    },
    lootEmpty: {
        fontFamily: FONTS.serifItalic,
        fontSize: 13,
        color: AXM.bone,
        marginTop: 6,
        textAlign: 'center',
    },
    lootList: { marginTop: 6 },
    lootRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: AXM.ash,
    },
    lootGlyphWrap: {
        width: 22,
        height: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lootRowText: { flex: 1 },
    lootName: {
        fontFamily: FONTS.sans,
        fontSize: 12,
        letterSpacing: 1.2,
        color: AXM.parchment,
    },
    lootSlot: {
        fontFamily: FONTS.sans,
        fontSize: 9,
        letterSpacing: 1.4,
        color: AXM.bone,
        marginTop: 2,
    },
    rarityRail: {
        width: 28,
        height: 2,
    },
    rarityRailCommon: { opacity: 0.6 },
    rarityRailUnique: { height: 4 },
    spacer: { flex: 1, minHeight: 8, alignItems: 'center', justifyContent: 'center' },
    wreathWatermark: { opacity: 0.16, position: 'absolute' },
    coinSpill: { width: 132, height: 110 },
    carryOn: {
        paddingVertical: 12,
        backgroundColor: AXM.silhouette,
        borderWidth: 2,
        borderColor: AXM.sulfur,
        alignItems: 'center',
        justifyContent: 'center',
        // Gold glow so the exit reads as the rewarding way forward.
        shadowColor: AXM.sulfur,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 6,
    },
    carryOnPressed: {
        opacity: 0.85,
    },
    carryOnLabel: {
        fontFamily: FONTS.gothic,
        fontSize: 16,
        color: AXM.sulfur,
        letterSpacing: 2,
    },
}));
