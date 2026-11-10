/**
 * /village — the settlement hub (spec 168, V-02b).
 *
 * Arriving at a village opens this hub: the settlement's name and the purse,
 * the host standing tall down the left edge with the host's line under the
 * title, and one brass button per counter the village carries, each with its
 * keeper at the button's right end: REST (the innkeeper), SHOP (the
 * shopkeeper), BLACKSMITH (the smith). A counter the village lacks has no
 * button. Each button opens that counter's own screen (`/village/rest`,
 * `/village/shop`, the Anvil's `/blacksmith`); leaving it lands back here,
 * because the village stays the pending event. TAKE THE ROAD is pinned at the
 * foot and ends the village. The merchants' voices sit under the counters.
 *
 * The screen owns ONE scroller — the house shape (`/rest`, `/blacksmith`,
 * the inventory page) — and TAKE THE ROAD is pinned below it, so the exit
 * is whole at any counter count and at either width.
 */

import React, { useEffect, useMemo } from 'react';
import { useRouter } from '@/lib/platform/router';
import { ScrollView, Text, View } from 'react-native';

import { keeperPortrait } from '@/assets/images/keepers';
import { BrassButton } from '@/components/experience/BrassButton';
import { SCREEN_FRAME_INSET, ScreenBg } from '@/components/ScreenBg';
import { AxmIcon } from '@/components/icons';
import { KeeperButton } from '@/components/village/KeeperButton';
import { VILLAGE_REST_ROUTE, VILLAGE_SHOP_ROUTE } from '@/components/village/useVillageCounter';
import { Image } from '@/lib/platform/image';
import { useGameActions, useGameState } from '@/state/GameStoreProvider';
import {
    VILLAGE_HOST_EYEBROW,
    VILLAGE_HUB_REST_LABEL,
    VILLAGE_HUB_SHOP_LABEL,
    VILLAGE_HUB_SMITH_LABEL,
    VILLAGE_LEAVE_LABEL,
    VILLAGE_SETTLEMENT_EYEBROW,
    VILLAGE_VOICES_LABEL,
    villagePurseLine,
} from '@/state/presenters/village.copy';
import { selectVillageVM, villageHubCounters } from '@/state/presenters/village.engine';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

/** The settlement column's widest extent, in points (the main menu's width). */
export const VILLAGE_COLUMN_MAX_WIDTH = 520;

/** The host's share of the column's width, standing down its left edge. */
export const HOST_WIDTH_SHARE = 0.5;
/** How far in from the column's left edge the counter buttons start (V-02b). */
export const COUNTERS_INDENT_SHARE = 0.16;
/** The stage the host stands on: tall enough for the figure whatever the counter count. */
const STAGE_MIN_HEIGHT = 420;
/** Room above the first counter, so the host's head and shoulders show. */
const STAGE_HEAD_ROOM = 96;

/**
 * The settlement hub.
 *
 * Purpose: render the village view-model as the hub — heading, host and one
 * button per counter — with the exit pinned beneath the scroller. Inputs:
 * none (reads the store via `useGameState`; dispatches through
 * `useGameActions`). Output: the screen's element tree.
 */
export default function VillageScreen() {
    const styles = useStyles();
    const event = useGameState((s) => s.event);
    const player = useGameState((s) => s.player);
    const flags = useGameState((s) => s.flags);
    const vm = useMemo(
        () => selectVillageVM({ event, player, flags }),
        [event, player, flags],
    );
    const actions = useGameActions();
    const router = useRouter();

    useEffect(() => {
        if (!vm.active && router.canGoBack()) router.back();
    }, [vm.active, router]);

    // Inactive shell — visible for a frame while the router unwinds; never a
    // blank screen.
    if (!vm.active) {
        return (
            <ScreenBg scrollable={false} art="village">
                <View style={styles.inactiveWrap} testID="village-inactive">
                    <Text style={styles.inactiveText}>No settlement here. Only the road.</Text>
                </View>
            </ScreenBg>
        );
    }

    const counters = villageHubCounters(vm);

    return (
        <ScreenBg scrollable={false} art="village">
            <ScrollView
                style={styles.scrollOuter}
                contentContainerStyle={styles.scroll}
                testID="village-scroll"
            >
                <View style={styles.column} testID="village-column">
                    <View style={styles.eyebrowRow}>
                        <AxmIcon name="action-village" size={18} />
                        <Text style={styles.eyebrow}>{VILLAGE_SETTLEMENT_EYEBROW}</Text>
                    </View>
                    <Text style={styles.title}>{vm.villageName.toUpperCase()}</Text>
                    <Text style={styles.purse} testID="village-purse">
                        {villagePurseLine(vm.currency, vm.health, vm.maxHealth)}
                    </Text>
                    <Text style={styles.hostEyebrow}>{VILLAGE_HOST_EYEBROW}</Text>
                    <Text style={styles.hostLine} testID="village-host-line">“{vm.hostLine}”</Text>

                    <View style={styles.stage} testID="village-stage">
                        <View style={styles.host} pointerEvents="none" testID="village-host">
                            <Image
                                source={keeperPortrait('host')}
                                style={styles.hostImage}
                                contentFit="contain"
                                contentPosition="left bottom"
                                transition={0}
                                accessible={false}
                            />
                        </View>
                        <View style={styles.counters} testID="village-counters">
                            {counters.includes('rest') && (
                                <KeeperButton
                                    label={VILLAGE_HUB_REST_LABEL}
                                    role="innkeeper"
                                    onPress={() => router.push(VILLAGE_REST_ROUTE)}
                                    accessibilityLabel={`Rest. ${vm.rest?.effect ?? ''}`}
                                    testID="village-open-rest"
                                />
                            )}
                            {counters.includes('shop') && (
                                <KeeperButton
                                    label={VILLAGE_HUB_SHOP_LABEL}
                                    role="shopkeeper"
                                    onPress={() => router.push(VILLAGE_SHOP_ROUTE)}
                                    accessibilityLabel="Open the shop: cards, weapons and armor"
                                    testID="village-open-shop"
                                />
                            )}
                            {counters.includes('smith') && (
                                <KeeperButton
                                    label={VILLAGE_HUB_SMITH_LABEL}
                                    role="smith"
                                    onPress={() => actions.beginBlacksmith({ variants: vm.anvil?.variants })}
                                    accessibilityLabel={`Open the Anvil. The smith's cheapest work is ${vm.anvil?.cheapestWork ?? 0} shillings`}
                                    testID="village-anvil"
                                />
                            )}
                        </View>
                    </View>

                    {vm.merchants.length > 0 && (
                        <View testID="village-voices">
                            <Text style={styles.sectionLabel}>{VILLAGE_VOICES_LABEL}</Text>
                            {vm.merchants.map(merchant => (
                                <View key={merchant.name} style={styles.merchantCard} testID={`village-merchant-${merchant.name}`}>
                                    <Text style={styles.merchantName}>{merchant.name}</Text>
                                    {merchant.line.length > 0 && (
                                        <Text style={styles.merchantLine}>“{merchant.line}”</Text>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* 14-village: the exit sits OUTSIDE the scroller, so it is whole
                however long the hub runs, at 375 and at 1280 alike. */}
            <View style={styles.exitBar} testID="village-exit-bar">
                <View style={styles.column} testID="village-exit-column">
                    <BrassButton
                        label={VILLAGE_LEAVE_LABEL}
                        onPress={actions.dismissEvent}
                        align="center"
                        accessibilityLabel="Leave the village"
                        testID="village-leave"
                    />
                </View>
            </View>
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    // One scroller, sized to the space the pinned exit leaves it
    // (14-village) — the shape `/rest` and `/blacksmith` already use.
    scrollOuter: { flex: 1 },
    // The top clears the backdrop's vignette, so the kicker and title sit
    // inside the plate rather than on its dark frame.
    scroll: { padding: 14, paddingTop: SCREEN_FRAME_INSET, paddingBottom: 16 },
    // A phone fills the column edge to edge; a wide window keeps the hub at
    // the main menu's width instead of stretching it across the screen.
    column: { width: '100%', maxWidth: VILLAGE_COLUMN_MAX_WIDTH, alignSelf: 'center' },
    eyebrowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    eyebrow: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 10,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.parchment,
        marginBottom: 4,
    },
    title: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 30,
        lineHeight: 34,
        color: AXM.parchment,
        marginBottom: 4,
    },
    purse: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 13, color: AXM.sulfur },
    hostEyebrow: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 11,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.sulfur,
        marginTop: 12,
    },
    hostLine: {
        fontFamily: TYPE_ROLES.spoken.fontFamily,
        fontSize: 16,
        lineHeight: 22,
        color: AXM.parchment,
        marginTop: 2,
    },
    // The host stands on the stage behind the counters, down its left edge.
    stage: { position: 'relative', minHeight: STAGE_MIN_HEIGHT, paddingTop: STAGE_HEAD_ROOM, justifyContent: 'flex-end' },
    host: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: `${HOST_WIDTH_SHARE * 100}%`,
    },
    hostImage: { width: '100%', height: '100%' },
    counters: { marginLeft: `${COUNTERS_INDENT_SHARE * 100}%`, gap: 4 },
    sectionLabel: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 10,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.bone,
        marginTop: 16,
        marginBottom: 6,
    },
    // Not an ash-bordered panel: that is this app's DISABLED grammar
    // (`offerDisabled` on /rest and /blacksmith), and a named merchant would
    // read as a locked button. It is an inert View by design: a sulfur left
    // rule is the screen's flavour grammar (the event shell's `loreBox`),
    // which reads as quoted voice and plainly not a control.
    merchantCard: {
        borderLeftWidth: 2,
        borderLeftColor: AXM.sulfur,
        paddingLeft: 10,
        paddingVertical: 2,
        marginBottom: 8,
    },
    merchantName: { fontFamily: TYPE_ROLES.title.fontFamily, fontSize: 16, color: AXM.sulfur, letterSpacing: TYPE_ROLES.title.letterSpacing},
    merchantLine: { fontFamily: TYPE_ROLES.spoken.fontFamily, fontSize: 12, color: AXM.parchment, marginTop: 4 },
    // The pinned exit keeps the page's 14pt gutter and clears the
    // vignette below it.
    exitBar: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: SCREEN_FRAME_INSET },
    inactiveWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    inactiveText: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 16, lineHeight: 22, color: AXM.parchment, opacity: 0.55, textAlign: 'center' },
}));
