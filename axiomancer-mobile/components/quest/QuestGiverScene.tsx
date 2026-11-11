/**
 * The quest screen's relic rise (phase ET1d): the relic that lifts into view
 * on a turn-in. The giver's figure lives in the quest card. The
 * motion takes the reduced-motion answer from their caller (the screen asks
 * the platform once); with it on the relic lands its end state at once.
 */

import React, { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ItemGlyph } from '@/components/inventory/ItemCard';
import { giverFigure } from '@/assets/images/givers';
import { resolveJuiceMode } from '@/lib/juice/instant';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

/** The giver's figure for a giver id; the table's stand-in answers an unknown one. */
export function giverPortraitSource(slug: string): number {
    return giverFigure(slug);
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
    relicName: { fontFamily: TYPE_ROLES.title.fontFamily, fontSize: 20, color: AXM.sulfur },
}));
