/**
 * The victory screen (phase FE1b, S-07c): a won fight ends here, over the board.
 *
 * Top to bottom, on the screen's dark ground: the top band (the chapter's name
 * at the left, the purse at the right, over the node's arena plate fading into
 * the ground, the fallen foe standing in it upright and greyed: its own art,
 * desaturated and dimmed, never rotated or animated away), the engine's
 * headline in the title face and gold, the paid line, the level panel
 * (`VictoryLevelPanel`) and the card offer (`CombatRewardsOverlay` on the
 * ground, its buttons on the brass plate). A win with no offer (an elite's
 * relic took its place) shows CONTINUE on the brass plate where the offer sits.
 *
 * Pure presentation: what the fight paid is FE1a's `FightPaid`, read through
 * `selectFightEndVM`; the words live in `fight-end.copy.ts`. Taking or refusing
 * the card, the upgrade and CONTINUE are the caller's (they close the fight).
 */

import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { CombatRewardsOverlay } from '@/components/combat/encounter/CombatRewardsOverlay';
import { VictoryLevelPanel } from '@/components/combat/encounter/VictoryLevelPanel';
import { BrassButton } from '@/components/experience/BrassButton';
import { Image } from '@/lib/platform/image';
import type { CardUpgradeRowVM } from '@/state/presenters/card-upgrade.engine';
import type { CombatCardVM } from '@/state/presenters/combat-encounter.engine';
import { FIGHT_END_CONTINUE_LABEL, fightEndFoeA11yLabel, fightEndPurseLine } from '@/state/presenters/fight-end.copy';
import { selectFightEndVM, type FightPaid } from '@/state/presenters/fight-end.engine';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

/** iOS draws no grayscale filter: there the dimmed art takes a grey wash instead. */
const HAS_IMAGE_FILTER = Platform.OS !== 'ios';

export interface VictoryScreenProps {
    /** The engine's headline ("Victory — the enemy falls"). */
    headline: string;
    /** What the settle paid (FE1a). */
    paid: FightPaid;
    /** The chapter's name for the top band ('' for none). */
    chapter: string;
    /** The player's shillings now. */
    purse: number;
    /** The node's arena plate, or null for the plain dark ground. */
    arena: number | null;
    /** The fallen foe's own art. */
    foeArt: number;
    foeName: string;
    /** The card offer; empty shows CONTINUE in its place. */
    offers: CombatCardVM[];
    onPick: (cardId: string | null) => void;
    upgradeRows?: readonly CardUpgradeRowVM[] | null;
    onUpgrade?: (cardId: string) => void;
    /** CONTINUE, when there is no offer. */
    onContinue: () => void;
    /** Draw the level panel at its settled end (the dev preview's shot). */
    settled?: boolean;
}

/** The top of the screen: the band, the headline, the paid line and the level panel. */
function VictoryHeader({ headline, paid, chapter, purse, arena, foeArt, foeName, settled }: Pick<
    VictoryScreenProps, 'headline' | 'paid' | 'chapter' | 'purse' | 'arena' | 'foeArt' | 'foeName' | 'settled'
>) {
    const styles = useStyles();
    const AXM = usePalette();
    const vm = useMemo(() => selectFightEndVM(paid), [paid]);
    return (
        <View style={styles.header} testID="combat-victory">
            <View style={styles.band} testID="combat-victory-band">
                {arena != null && (
                    <Image source={arena} style={styles.arena} contentFit="cover" testID="combat-victory-arena" />
                )}
                {/* The plate fades into the ground at its foot. */}
                <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none">
                    <Defs>
                        <LinearGradient id="axmVictoryBand" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset={0} stopColor={AXM.deepBg} stopOpacity={0.35} />
                            <Stop offset={0.6} stopColor={AXM.deepBg} stopOpacity={0.2} />
                            <Stop offset={1} stopColor={AXM.deepBg} stopOpacity={1} />
                        </LinearGradient>
                    </Defs>
                    <Rect x={0} y={0} width={100} height={100} fill="url(#axmVictoryBand)" />
                </Svg>
                {/* The fallen foe: upright, greyed, still. */}
                <View
                    style={[styles.foe, HAS_IMAGE_FILTER ? styles.foeFiltered : styles.foeDimmed]}
                    testID="combat-victory-foe"
                    accessible
                    accessibilityRole="image"
                    accessibilityLabel={fightEndFoeA11yLabel(foeName)}
                >
                    <Image source={foeArt} style={styles.foeArt} contentFit="contain" />
                    {!HAS_IMAGE_FILTER && <View style={styles.foeWash} pointerEvents="none" />}
                </View>
                <View style={styles.bandRow}>
                    <Text style={styles.chapter} numberOfLines={1} testID="combat-victory-chapter">{chapter}</Text>
                    <Text style={styles.purse} numberOfLines={1} testID="combat-victory-purse">{fightEndPurseLine(purse)}</Text>
                </View>
            </View>
            <View style={styles.words}>
                <Text style={styles.headline} accessibilityRole="header" testID="combat-victory-headline">{headline}</Text>
                <Text style={styles.paid} testID="combat-victory-paid">{vm.paidLine}</Text>
                <VictoryLevelPanel vm={vm} settled={settled} />
            </View>
        </View>
    );
}

export function VictoryScreen(props: VictoryScreenProps) {
    const styles = useStyles();
    const AXM = usePalette();
    const { offers, onPick, upgradeRows, onUpgrade, onContinue } = props;
    const header = <VictoryHeader {...props} />;
    if (offers.length > 0) {
        return (
            <CombatRewardsOverlay
                ground
                header={header}
                offers={offers}
                onPick={onPick}
                upgradeRows={upgradeRows}
                onUpgrade={onUpgrade}
            />
        );
    }
    return (
        <View style={[styles.root, { backgroundColor: AXM.deepBg }]} testID="combat-victory-screen">
            {header}
            <View style={styles.continueRow}>
                <BrassButton
                    label={FIGHT_END_CONTINUE_LABEL}
                    align="center"
                    onPress={onContinue}
                    testID="combat-victory-continue"
                    style={styles.continue}
                />
            </View>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: { ...StyleSheet.absoluteFillObject, zIndex: 60, alignItems: 'center' },
    header: { width: '100%', alignItems: 'center' },
    band: { width: '100%', height: 250, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' },
    arena: { ...StyleSheet.absoluteFillObject, opacity: 0.55 },
    bandRow: {
        position: 'absolute', top: 14, left: 16, right: 16,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12,
    },
    chapter: {
        flexShrink: 1,
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 14,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.parchment,
    },
    purse: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 14, color: AXM.sulfur },
    foe: { width: '78%', maxWidth: 320, height: 190, marginBottom: 6 },
    // Desaturated and dimmed where the platform filters an image.
    foeFiltered: { filter: 'grayscale(1) brightness(0.55)' },
    // Elsewhere the art dims and a grey wash stands in for the filter.
    foeDimmed: { opacity: 0.5 },
    foeArt: { width: '100%', height: '100%' },
    foeWash: { ...StyleSheet.absoluteFillObject, backgroundColor: AXM.ash, opacity: 0.35 },
    words: { width: '100%', maxWidth: 420, paddingHorizontal: 16, alignItems: 'center', gap: 8 },
    headline: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 26,
        letterSpacing: TYPE_ROLES.title.letterSpacing,
        color: AXM.sulfur,
        textAlign: 'center',
    },
    paid: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 15, color: AXM.sulfur, textAlign: 'center', marginBottom: 4 },
    continueRow: { width: '100%', maxWidth: 420, paddingHorizontal: 16, marginTop: 22 },
    continue: { alignSelf: 'stretch' },
}));
