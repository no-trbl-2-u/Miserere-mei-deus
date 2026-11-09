/**
 * /item-reward — the hand-over screen.
 *
 * A granted relic is presented here: name and art, the SIGNATURE SKILL it
 * grants (the engine's own name, Conviction cost and effect text, never a
 * rewrite), the stats it moves, and — when wearing it would push something off
 * the body — exactly what is gained and what is lost, with the displaced piece
 * named as returning to the satchel (never swap blind).
 *
 * Two commits:
 *   - CONFIRM — the item goes to the satchel;
 *   - EQUIP   — the item goes to the satchel AND onto the body.
 * Both route through the engine's shared `grantItem` path, so nothing is ever
 * destroyed and a full relic row swaps instead of silently no-oping.
 * EQUIP is HIDDEN, not greyed, for an item that cannot be worn.
 *
 * ## Dismissal posture — deliberately the inverse of /cache
 *
 * `/cache` is a no-back-out screen: `gestureEnabled: false` in the root layout
 * plus a `<HardwareBackHandler>`. This one carries NEITHER, because it is
 * dismissible — the item is already the player's and no exit path may lose it.
 * Back, swipe and Android hardware-back all unmount the route, and the unmount
 * cleanup below commits every queued entry as CONFIRM. Leaving is keeping.
 *
 * Structure mirrors `app/cache/index.tsx`: a full-screen non-tab
 * route that renders a presenter VM and dispatches store actions only.
 *
 * ## No rarity row
 *
 * Every relic is `common` by construction, so a rarity badge here would
 * render a constant. There is none.
 */

import React, { useEffect, useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { useRouter } from '@/lib/platform/router';
import { ScreenBg } from '@/components/ScreenBg';
import { ItemGlyph } from '@/components/inventory/ItemCard';
import { ItemRewardTradePanel } from '@/components/item-reward/ItemRewardTradePanel';
import { useGameState, useGameStore } from '@/state/GameStoreProvider';
import {
    confirmItemRewardAction,
    dismissItemRewardAction,
    equipItemRewardAction,
} from '@/state/item-reward/store-actions';
import {
    ITEM_REWARD_INACTIVE_NOTE,
    selectItemRewardVM,
} from '@/state/presenters/item-reward.engine';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

export default function ItemRewardScreen() {
    const styles = useStyles();
    const store = useGameStore();
    const itemReward = useGameState((s) => s.itemReward);
    const player = useGameState((s) => s.player);
    const vm = useMemo(
        () => selectItemRewardVM({ itemReward, player }),
        [itemReward, player],
    );
    const router = useRouter();

    // Every exit is CONFIRM. Back, swipe and Android hardware-back all
    // unmount this route; whatever is still queued is paid on the way out, so
    // no exit path can lose a reward. A no-op when the queue is already empty
    // (the ordinary case: the button handlers drained it).
    useEffect(() => () => { dismissItemRewardAction(store); }, [store]);

    useEffect(() => {
        if (!vm.active && router.canGoBack()) router.back();
    }, [vm.active, router]);

    // Inactive shell — visible for a frame while the router unwinds; never a
    // blank screen (the house convention, see `/cache`).
    if (!vm.active) {
        return (
            <ScreenBg scrollable={false} art="cache">
                <View style={styles.inactiveWrap} testID="item-reward-inactive">
                    <Text style={styles.inactiveText}>{ITEM_REWARD_INACTIVE_NOTE}</Text>
                </View>
            </ScreenBg>
        );
    }

    return (
        <ScreenBg scrollable={false} art="cache">
            <ScrollView style={styles.scrollOuter} contentContainerStyle={styles.scroll}>
                <Text style={styles.eyebrow} testID="item-reward-eyebrow">{vm.eyebrow}</Text>

                <View style={styles.card} testID="item-reward-card">
                    <View style={styles.columns}>
                        <View style={styles.artPlate} testID="item-reward-art">
                            <ItemGlyph category="equipment" sub={vm.sub} itemId={vm.itemId} />
                        </View>

                        <View style={styles.factsCol}>
                            <Text style={styles.name} testID="item-reward-name">{vm.name}</Text>
                            {vm.slotLabel !== '' && (
                                <Text style={styles.slot}>{vm.slotLabel.toUpperCase()}</Text>
                            )}
                        </View>
                    </View>

                    {/* What it adds to the body. */}
                    {vm.statLines.length > 0 && (
                        <View style={styles.block} testID="item-reward-stats">
                            <Text style={styles.blockEyebrow}>GRANTS</Text>
                            {vm.statLines.map((s) => (
                                <View key={s.id} style={styles.statRow} testID={`item-reward-stat-${s.id}`}>
                                    <Text style={styles.statLabel}>{s.label}</Text>
                                    <Text style={styles.statValue}>{s.value}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* The signature skill, in the engine's own words. */}
                    {vm.signature !== null && (
                        <View style={styles.block} testID="item-reward-signature">
                            <Text style={styles.blockEyebrow}>SIGNATURE SKILL</Text>
                            <View style={styles.sigHeadRow}>
                                <Text style={styles.sigName}>{vm.signature.name}</Text>
                                <Text style={styles.sigCost}>{vm.signature.cost}◆</Text>
                            </View>
                            <Text style={styles.sigDesc}>{vm.signature.description}</Text>
                        </View>
                    )}

                    {/* The card lane a worn relic opens. */}
                    {vm.lane !== null && (
                        <Text style={styles.laneLine} testID="item-reward-lane">{vm.lane}</Text>
                    )}

                    {/* Gained, lost, and the piece that returns to the satchel. */}
                    {vm.canEquip && (
                        <ItemRewardTradePanel itemId={vm.itemId} delta={vm.delta} trade={vm.trade} />
                    )}

                    {vm.flavor !== '' && (
                        <Text style={styles.flavor} testID="item-reward-flavor">{vm.flavor}</Text>
                    )}
                </View>

                {/* EQUIP is HIDDEN, not greyed, when the item cannot be worn. */}
                {vm.canEquip && (
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Wear ${vm.name} now. It also goes to the satchel.`}
                        onPress={() => equipItemRewardAction(store)}
                        style={styles.primaryButton}
                        testID="item-reward-equip"
                    >
                        <Text style={styles.primaryButtonText}>{vm.equipLabel}</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Put ${vm.name} in the satchel.`}
                    onPress={() => confirmItemRewardAction(store)}
                    style={styles.secondaryButton}
                    testID="item-reward-confirm"
                >
                    <Text style={styles.secondaryButtonText}>{vm.confirmLabel}</Text>
                </TouchableOpacity>

                <Text style={styles.keepNote} testID="item-reward-keep-note">{vm.keepNote}</Text>

                {vm.remainingNote !== null && (
                    <Text style={styles.remainingNote} testID="item-reward-remaining">
                        {vm.remainingNote}
                    </Text>
                )}
            </ScrollView>
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    scrollOuter: { flex: 1 },
    scroll: { padding: 14, paddingBottom: 24, flexGrow: 1, justifyContent: 'center' },
    eyebrow: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 11,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.bone,
        marginBottom: 6,
    },
    card: {
        borderWidth: 1,
        borderRadius: 14,
        borderColor: AXM.parchmentMed,
        backgroundColor: AXM.panelBg,
        padding: 14,
    },
    columns: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    artPlate: {
        width: 84,
        height: 84,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 10,
        borderColor: AXM.ash,
        backgroundColor: AXM.deepBg,
    },
    factsCol: { flex: 1, minWidth: 0 },
    name: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 21,
        lineHeight: 25,
        color: AXM.parchment,
        letterSpacing: TYPE_ROLES.title.letterSpacing,
    },
    slot: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 9,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.bone,
        marginTop: 2,
    },
    block: {
        borderWidth: 1,
        borderRadius: 10,
        borderColor: AXM.ash,
        backgroundColor: AXM.deepBg,
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginTop: 10,
    },
    blockEyebrow: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 8,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.sulfur,
        marginBottom: 6,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 1,
    },
    statLabel: { fontFamily: TYPE_ROLES.eyebrow.fontFamily, fontSize: 10, letterSpacing: TYPE_ROLES.eyebrow.letterSpacing, color: AXM.bone },
    statValue: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 12, color: AXM.parchment },
    sigHeadRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 8,
    },
    sigName: { flex: 1, fontFamily: TYPE_ROLES.cardRules.fontFamily, fontSize: 13, color: AXM.parchment },
    sigCost: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 11, color: AXM.sulfur },
    sigDesc: {
        fontFamily: TYPE_ROLES.cardRules.fontFamily,
        fontSize: 12,
        lineHeight: 17,
        color: AXM.bone,
        marginTop: 5,
    },
    laneLine: {
        fontFamily: TYPE_ROLES.cardRules.fontFamily,
        fontSize: 12,
        lineHeight: 17,
        color: AXM.sulfur,
        marginTop: 10,
    },
    // The one unbordered block, matching EquipmentDetailModal's flavour rule.
    flavor: {
        fontFamily: TYPE_ROLES.narration.fontFamily,
        fontSize: 12,
        lineHeight: 18,
        color: AXM.bone,
        opacity: 0.85,
        marginTop: 12,
    },
    primaryButton: {
        borderWidth: 2,
        borderColor: AXM.sulfur,
        marginTop: 12,
        minHeight: 44,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: AXM.bg,
    },
    primaryButtonText: {
        fontFamily: TYPE_ROLES.button.fontFamily,
        fontSize: 18,
        letterSpacing: TYPE_ROLES.button.letterSpacing,
        color: AXM.sulfur,
    },
    secondaryButton: {
        borderWidth: 1,
        borderColor: AXM.parchmentMed,
        marginTop: 8,
        minHeight: 44,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: AXM.bg,
    },
    secondaryButtonText: {
        fontFamily: TYPE_ROLES.button.fontFamily,
        fontSize: 16,
        letterSpacing: TYPE_ROLES.button.letterSpacing,
        color: AXM.parchment,
    },
    keepNote: {
        fontFamily: TYPE_ROLES.narration.fontFamily,
        fontSize: 11,
        lineHeight: 16,
        color: AXM.bone,
        marginTop: 8,
        textAlign: 'center',
    },
    remainingNote: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 10,
        color: AXM.bone,
        marginTop: 4,
        textAlign: 'center',
    },
    inactiveWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    inactiveText: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 16, lineHeight: 22, color: AXM.parchment, opacity: 0.55, textAlign: 'center' },
}));
