/**
 * /village/rest — the paid rest as its own keeper screen (spec 168, A5).
 *
 * Opened from the hub's REST button. The innkeeper stands at the foot with
 * the line; above sit the price and the VITAE the rest restores, and REST on
 * the brass plate. A refused rest (VITAE full, rested this visit, a short
 * purse) shows the disabled plate and names its reason under it. BACK TO THE
 * VILLAGE returns to the hub. It is a keeper screen like the Shop's, not the
 * campfire rest screen (T, 2026-11-10). Every price and refusal is the
 * engine's (`World/Village`); the village stays the pending event throughout.
 */

import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { BrassButton } from '@/components/experience/BrassButton';
import { ScreenBg } from '@/components/ScreenBg';
import { VillageCounterFrame } from '@/components/village/VillageCounterFrame';
import { useVillageCounter } from '@/components/village/useVillageCounter';
import { useGameActions } from '@/state/GameStoreProvider';
import {
    VILLAGE_BACK_LABEL,
    VILLAGE_INNKEEPER_EYEBROW,
    VILLAGE_INNKEEPER_LINE,
    VILLAGE_REST_BUY_LABEL,
    VILLAGE_REST_LABEL,
    VILLAGE_REST_LINE,
    villageCounterNote,
    villagePurseLine,
    villageRefusalNote,
} from '@/state/presenters/village.copy';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

export default function VillageRestScreen() {
    const styles = useStyles();
    const { vm, back } = useVillageCounter();
    const actions = useGameActions();
    const [note, setNote] = useState<string | null>(null);

    if (!vm.active) {
        return (
            <ScreenBg scrollable={false} art="village">
                <View style={styles.inactiveWrap} testID="village-rest-inactive" />
            </ScreenBg>
        );
    }

    const rest = vm.rest;
    return (
        <VillageCounterFrame
            title={VILLAGE_REST_LABEL}
            purse={villagePurseLine(vm.currency, vm.health, vm.maxHealth)}
            role="innkeeper"
            keeperEyebrow={VILLAGE_INNKEEPER_EYEBROW}
            keeperLine={VILLAGE_INNKEEPER_LINE}
            backLabel={VILLAGE_BACK_LABEL}
            onBack={back}
            testIDPrefix="village-rest-screen"
            testIDBack="village-rest-screen-back"
        >
            {rest && (
                <View style={styles.offer} testID="village-rest-offer">
                    <Text style={styles.effect} testID="village-rest-effect">{rest.effect}</Text>
                    <Text style={styles.desc} testID="village-rest-desc">{VILLAGE_REST_LINE}</Text>
                    <BrassButton
                        label={VILLAGE_REST_BUY_LABEL}
                        detail={`${rest.price} SHILLINGS`}
                        align="center"
                        disabled={!rest.enabled}
                        onPress={() => {
                            const result = actions.restAtVillage();
                            setNote(result.ok ? villageCounterNote('Rested', result.spent) : villageRefusalNote(result.refusal));
                        }}
                        accessibilityLabel={
                            rest.enabled
                                ? `Rest for ${rest.price} shillings. ${rest.effect}`
                                : `Rest unavailable: ${rest.refusal}`
                        }
                        testID="village-rest"
                        testIDDetail="village-rest-price"
                        style={styles.buy}
                    />
                    {rest.refusal !== null && (
                        <Text style={styles.refusal} testID="village-rest-refusal">{rest.refusal}</Text>
                    )}
                    {note !== null && <Text style={styles.note} testID="village-note">{note}</Text>}
                </View>
            )}
        </VillageCounterFrame>
    );
}

const useStyles = makeStyles((AXM) => ({
    offer: { marginTop: 24, alignItems: 'stretch' },
    effect: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 18,
        lineHeight: 24,
        color: AXM.parchment,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    desc: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 12,
        color: AXM.bone,
        textAlign: 'center',
        marginTop: 4,
        textTransform: 'uppercase',
    },
    buy: { marginTop: 18 },
    // A refused rest names its reason under the plate, in the inn's reason voice.
    refusal: {
        fontFamily: TYPE_ROLES.narration.fontFamily,
        fontSize: 13,
        lineHeight: 18,
        color: AXM.bone,
        textAlign: 'center',
        marginTop: 6,
    },
    note: {
        fontFamily: TYPE_ROLES.narration.fontFamily,
        fontSize: 13,
        color: AXM.sulfur,
        textAlign: 'center',
        marginTop: 6,
    },
    inactiveWrap: { flex: 1 },
}));
