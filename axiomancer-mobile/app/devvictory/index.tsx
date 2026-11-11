/**
 * Dev-only VICTORY SCREEN preview (phase FE1b, A7): the victory screen a
 * fallen foe ends on, from a fixed fight, so `verify:visual` can shoot it.
 * A real victory needs a won fight; this route mounts the same
 * `VictoryScreen` with the Quay-Crab fallen on the Breakwater's plate, a
 * purse of 41 and the three grey cards on offer, drawn at the level panel's
 * settled end (the shot is the settled shot's). Gated to dev-tools builds;
 * production renders nothing.
 *
 * Route: /devvictory (no level: XP +40, "30 XP to level 2").
 * `?levelled=1`: the level-up (XP +70, "LEVEL 2").
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ENEMY_REGISTRY } from '@mechanics';

import { ARENA_PLATES_SHOWN, arenaBackdropFor } from '@/assets/images/combat';
import { getEncounterEnemyArt } from '@/assets/images/enemies';
import { VictoryScreen } from '@/components/combat/encounter/VictoryScreen';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { useLocalSearchParams, useRouter } from '@/lib/platform/router';
import { rewardCardVMs } from '@/state/presenters/combat-encounter.engine';
import { fightPaidFrom, victoryChapterName } from '@/state/presenters/fight-end.engine';
import { HUE } from '@/theme/axm';

const FOE = ENEMY_REGISTRY['quay-crab'];
const REGION = 'The Breakwater';
const PURSE = 41;
const WAGE = 15;
const OFFER_IDS = ['grey-strike', 'grey-ward', 'grey-word'];
/** The engine's own headline for a foe that falls (`buildCombatSummary`). */
const HEADLINE = 'Victory — the enemy falls';

const LEVELLED = fightPaidFrom({ experience: 0, level: 1 }, { experience: 70, level: 2 }, WAGE);
const PLAIN = fightPaidFrom({ experience: 0, level: 1 }, { experience: 40, level: 1 }, WAGE);

export default function DevVictoryPreview() {
    const params = useLocalSearchParams<{ levelled?: string }>();
    const router = useRouter();
    if (!isDevToolsEnabled()) return <View style={styles.root} testID="devvictory-disabled" />;
    const leave = () => router.back();
    return (
        <View style={styles.root} testID="devvictory-screen">
            <VictoryScreen
                headline={HEADLINE}
                paid={params.levelled === '1' ? LEVELLED : PLAIN}
                chapter={victoryChapterName(REGION)}
                purse={PURSE}
                arena={ARENA_PLATES_SHOWN ? arenaBackdropFor(REGION) : null}
                foeArt={getEncounterEnemyArt(FOE.portraitAsset ?? FOE.id)}
                foeName={FOE.name}
                offers={rewardCardVMs(OFFER_IDS)}
                onPick={leave}
                onContinue={leave}
                settled
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: HUE.inkBg },
});
