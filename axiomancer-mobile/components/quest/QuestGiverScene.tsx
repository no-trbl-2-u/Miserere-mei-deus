/**
 * The quest screen's giver scene (phase ET1d): the giver's portrait and name
 * above their lines, and the relic that rises into view on a turn-in. Both
 * motions take the reduced-motion answer from their caller (the screen asks
 * the platform once); with it on the relic lands its end state at once.
 */

import React, { useEffect } from 'react';
import { Image, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ItemGlyph } from '@/components/inventory/ItemCard';
import { PLAYER_PORTRAITS } from '@/assets/images/portraits';
import { resolveJuiceMode } from '@/lib/juice/instant';
import type { QuestGiverVM } from '@/state/presenters/quest.engine';
import { FONTS } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

/** The portrait art for a slug; the first gallery entry stands in for an unknown one. */
export function giverPortraitSource(slug: string): number {
    return (PLAYER_PORTRAITS.find(p => p.id === slug) ?? PLAYER_PORTRAITS[0]!).source;
}

export interface QuestGiverSceneProps {
    giver: QuestGiverVM;
    /** True while the giver turns the player away: the portrait dims. */
    turnedAway: boolean;
}

export function QuestGiverScene({ giver, turnedAway }: QuestGiverSceneProps) {
    const styles = useStyles();
    return (
        <View style={styles.row} testID={turnedAway ? 'quest-giver-turned-away' : 'quest-giver'}>
            <Image
                source={giverPortraitSource(giver.portrait)}
                style={[styles.portrait, turnedAway && styles.portraitAway]}
                accessibilityLabel={giver.name}
                testID="quest-giver-portrait"
                resizeMode="cover"
            />
            <Text style={styles.name} testID="quest-giver-name">{giver.name}</Text>
        </View>
    );
}

export interface RelicRiseProps {
    itemId: string | null;
    name: string;
    reducedMotion: boolean;
}

/** The turned-in step's relic, rising into view before the paid card. */
export function RelicRise({ itemId, name, reducedMotion }: RelicRiseProps) {
    const styles = useStyles();
    const instant = resolveJuiceMode({ reducedMotion }) === 'instant';
    const progress = useSharedValue(instant ? 1 : 0);
    useEffect(() => {
        progress.value = instant ? 1 : withTiming(1, { duration: 700 });
    }, [instant, progress]);
    const lift = useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [{ translateY: (1 - progress.value) * 24 }],
    }));
    return (
        <Animated.View style={[styles.relic, lift]} testID="quest-relic-rise">
            <ItemGlyph category="equipment" sub="Relic" itemId={itemId} />
            <Text style={styles.relicName} testID="quest-relic-name">{name}</Text>
        </Animated.View>
    );
}

const useStyles = makeStyles((AXM) => ({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    portrait: { width: 72, height: 72, borderWidth: 2, borderColor: AXM.ash },
    portraitAway: { opacity: 0.35 },
    name: { flex: 1, fontFamily: FONTS.gothic, fontSize: 22, lineHeight: 26, color: AXM.parchment },
    relic: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 2,
        borderColor: AXM.sulfur,
        backgroundColor: AXM.panelBg,
        padding: 10,
        marginBottom: 10,
    },
    relicName: { fontFamily: FONTS.gothic, fontSize: 20, color: AXM.sulfur },
}));
