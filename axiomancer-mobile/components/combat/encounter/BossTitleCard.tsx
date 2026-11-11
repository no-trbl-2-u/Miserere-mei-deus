/**
 * The boss's held title card (the whole reveal for a boss): two gold rules
 * across the top and two across the foot, the eyebrow in spaced gold capitals,
 * the boss's name huge in gold (wrapped, never cut), the place in spaced bone
 * capitals, and the boss's painting rising from below on the shared warm
 * ground, with the tap hint over its foot. One tap anywhere starts the fight;
 * a screen reader reaches it as one button.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { RevealGround } from '@/components/combat/encounter/RevealGround';
import { Image } from '@/lib/platform/image';
import { HUE, TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

export interface BossTitleCardProps {
    readonly name: string;
    readonly place: string;
    readonly eyebrow: string;
    readonly hint: string;
    readonly art: React.ComponentProps<typeof Image>['source'];
    /** True lands the figure at once (reduced motion). */
    readonly instant: boolean;
    readonly onPress: () => void;
}

function Rules({ testID }: { testID: string }) {
    const styles = useStyles();
    return (
        <View style={styles.rules} testID={testID}>
            <View style={styles.rule} />
            <View style={styles.rule} />
        </View>
    );
}

export function BossTitleCard({ name, place, eyebrow, hint, art, instant, onPress }: BossTitleCardProps) {
    const styles = useStyles();
    return (
        <Pressable
            style={styles.card}
            onPress={onPress}
            testID="combat-reveal-boss-card"
            accessibilityRole="button"
            accessibilityLabel={`${name}. ${place}. ${eyebrow}. ${hint}`}
        >
            <Rules testID="combat-reveal-boss-rules-top" />
            <Text style={styles.eyebrow} testID="combat-reveal-boss-eyebrow">{eyebrow}</Text>
            <Text style={styles.name} testID="combat-reveal-boss-name">{name}</Text>
            <Text style={styles.place} testID="combat-reveal-boss-place">{place}</Text>
            <View style={styles.stage} testID="combat-reveal-frame-boss">
                <RevealGround tier="boss" />
                <Animated.View
                    entering={instant ? undefined : FadeInDown.delay(300).duration(600)}
                    style={styles.figureWrap}
                >
                    <Image
                        source={art}
                        style={styles.figure}
                        contentFit="contain"
                        contentPosition="bottom"
                        transition={0}
                        accessibilityLabel={name}
                    />
                </Animated.View>
                <Text style={styles.hint} testID="combat-reveal-boss-hint">{hint}</Text>
            </View>
            <Rules testID="combat-reveal-boss-rules-foot" />
        </Pressable>
    );
}

const useStyles = makeStyles((AXM) => ({
    card: { flex: 1, backgroundColor: HUE.inkBg, alignItems: 'center', paddingHorizontal: 22, paddingTop: 20, paddingBottom: 20 },
    rules: { alignSelf: 'stretch', gap: 4 },
    rule: { height: 1, backgroundColor: AXM.sulfur },
    eyebrow: { marginTop: 18, fontFamily: TYPE_ROLES.eyebrow.fontFamily, fontSize: 13, letterSpacing: 5, color: AXM.sulfur, textTransform: 'uppercase', textAlign: 'center' },
    name: { marginTop: 10, fontFamily: TYPE_ROLES.foeName.fontFamily, fontSize: 44, lineHeight: 50, color: AXM.sulfur, textAlign: 'center' },
    place: { marginTop: 10, fontFamily: TYPE_ROLES.eyebrow.fontFamily, fontSize: 12, letterSpacing: 4, color: AXM.bone, textTransform: 'uppercase', textAlign: 'center' },
    stage: { flex: 1, alignSelf: 'stretch', marginHorizontal: -22, marginVertical: 12, minHeight: 0, justifyContent: 'flex-end', alignItems: 'center' },
    figureWrap: { width: '100%', height: '100%', justifyContent: 'flex-end' },
    figure: { width: '100%', height: '100%' },
    hint: { position: 'absolute', bottom: 14, alignSelf: 'center', fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 13, letterSpacing: 2, color: AXM.parchment },
}));
