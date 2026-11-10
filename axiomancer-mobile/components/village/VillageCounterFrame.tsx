/**
 * VillageCounterFrame — the keeper screen every village counter opens onto
 * (spec 168: the paid rest, A5; the Shop, A2): the counter's name and the purse
 * across the top, the counter's own wares in one scroller, the keeper standing
 * at the foot with their line, and the way back to the hub pinned below.
 *
 * The house shape (`/village`, `/rest`, `/blacksmith`): ONE scroller sized to
 * the space the pinned exit leaves it, the exit outside it, the scroller's top
 * and the exit's bottom clear of the backdrop's vignette frame.
 *
 * Inputs: `title` (the counter's name), `purse` (the purse line), `role` (the
 * keeper), `keeperEyebrow` and `keeperLine` (who speaks, and what), `backLabel`,
 * `onBack`, `testIDPrefix` (every testID here starts with it), `children` (the
 * counter's wares). Output: the screen's element tree.
 */

import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { keeperPortrait, type KeeperRole } from '@/assets/images/keepers';
import { BrassButton } from '@/components/experience/BrassButton';
import { SCREEN_FRAME_INSET, ScreenBg } from '@/components/ScreenBg';
import { Image } from '@/lib/platform/image';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

/** The counter column's widest extent, in points (the hub's and the main menu's width). */
export const COUNTER_COLUMN_MAX_WIDTH = 520;

/** The keeper's box at the foot of a counter screen, in points. */
export const COUNTER_KEEPER_W = 104;
export const COUNTER_KEEPER_H = 128;

export interface VillageCounterFrameProps {
    title: string;
    purse: string;
    role: KeeperRole;
    keeperEyebrow: string;
    keeperLine: string;
    backLabel: string;
    onBack: () => void;
    testIDPrefix: string;
    /** The way back's testID, written out at the caller so the playtest guides can find it. */
    testIDBack: string;
    children: React.ReactNode;
}

export function VillageCounterFrame({
    title, purse, role, keeperEyebrow, keeperLine, backLabel, onBack, testIDPrefix, testIDBack, children,
}: VillageCounterFrameProps) {
    const styles = useStyles();
    return (
        <ScreenBg scrollable={false} art="village">
            <ScrollView
                style={styles.scrollOuter}
                contentContainerStyle={styles.scroll}
                testID={`${testIDPrefix}-scroll`}
            >
                <View style={styles.column} testID={`${testIDPrefix}-column`}>
                    <View style={styles.headRow}>
                        <Text style={styles.title} testID={`${testIDPrefix}-title`}>{title}</Text>
                        <Text style={styles.purse} testID="village-purse">{purse}</Text>
                    </View>
                    <View style={styles.wares}>{children}</View>
                    <View style={styles.keeperRow} testID={`${testIDPrefix}-keeper`}>
                        <View style={styles.keeperBox} pointerEvents="none">
                            <Image
                                source={keeperPortrait(role)}
                                style={styles.keeperImage}
                                contentFit="contain"
                                contentPosition="bottom"
                                transition={0}
                                accessible={false}
                            />
                        </View>
                        <View style={styles.keeperWords}>
                            <Text style={styles.keeperEyebrow}>{keeperEyebrow}</Text>
                            <Text style={styles.keeperLine} testID={`${testIDPrefix}-keeper-line`}>“{keeperLine}”</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
            <View style={styles.exitBar} testID={`${testIDPrefix}-exit-bar`}>
                <View style={styles.column}>
                    <BrassButton
                        label={backLabel}
                        onPress={onBack}
                        align="center"
                        testID={testIDBack}
                    />
                </View>
            </View>
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    scrollOuter: { flex: 1 },
    scroll: { padding: 14, paddingTop: SCREEN_FRAME_INSET, paddingBottom: 16, flexGrow: 1 },
    column: { width: '100%', maxWidth: COUNTER_COLUMN_MAX_WIDTH, alignSelf: 'center' },
    headRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 8,
    },
    title: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 15,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.parchment,
        flexShrink: 1,
    },
    purse: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 13, color: AXM.sulfur },
    wares: { flexGrow: 1 },
    keeperRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 16 },
    keeperBox: { width: COUNTER_KEEPER_W, height: COUNTER_KEEPER_H },
    keeperImage: { width: '100%', height: '100%' },
    keeperWords: { flex: 1, paddingBottom: 8 },
    keeperEyebrow: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 11,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.sulfur,
        marginBottom: 2,
    },
    keeperLine: { fontFamily: TYPE_ROLES.spoken.fontFamily, fontSize: 14, lineHeight: 20, color: AXM.parchment },
    // The pinned exit keeps the page's 14pt gutter and clears the vignette below it.
    exitBar: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: SCREEN_FRAME_INSET },
}));
