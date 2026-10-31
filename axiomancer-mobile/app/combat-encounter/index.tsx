/**
 * The live fight — its own full-screen route.
 *
 * `<CombatGate>` engages every map and labyrinth encounter and pushes this
 * route while the store holds the fight (`currentEncounter`). The screen
 * reads that foe once, on mount, and hands it to `<CombatEncounterPanel>`,
 * which keeps the fight's own state locally and writes the outcome back
 * through `endCombat` (`persistOutcome`). The store clears the encounter
 * the moment the fight ends, while the panel is still showing its summary,
 * so the foe is captured rather than re-read.
 *
 * Registered `fullScreenModal` with `gestureEnabled: false`, and the
 * combat flag it raises locks Android hardware back
 * (`<HardwareBackHandler>`): the only ways out are the fight's own ends.
 *
 * Opened with no fight staged (a cold web load, a deep link, a reload
 * that dropped the fight) it leaves at once. A reload mid-fight lands on
 * the map, where the owed arrival replays the encounter and the gate
 * brings the player back here.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/lib/platform/router';

import { CombatEncounterPanel } from '@/components/combat/encounter/CombatEncounterPanel';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { useCombatMode } from '@/state/combat-mode';
import { armDeathReturn } from '@/state/death-return';
import { runEndRoute } from '@/state/run-end';
import { useActiveSlot } from '@/state/SaveSlotsProvider';
import { useGameActions, useGameState, useGameStore } from '@/state/GameStoreProvider';
import { selectExplorationViewModel } from '@/state/presenters/exploration.engine';
import { selectResumableFight } from '@/state/presenters/navigation.engine';
import type { AppStoreState } from '@/state/store';
import { makeStyles } from '@/theme/runtime';
import type { CombatOutcome } from '@mechanics';

/** Browser drivers pin the engine seed with this global; dev builds only. */
function readDevSeed(): number | undefined {
    if (!isDevToolsEnabled()) return undefined;
    const g = (globalThis as { __AXM_COMBAT_SEED__?: number }).__AXM_COMBAT_SEED__;
    return typeof g === 'number' ? g : undefined;
}

/** The arena plate's region: the map's, unless the fight is in the labyrinth. */
function regionOf(state: AppStoreState): string | undefined {
    if (state.labyrinthUi?.session) return undefined;
    return selectExplorationViewModel(state).region;
}

/** The map node the fight was walked to: none in the labyrinth. */
function nodeOf(state: AppStoreState): string | undefined {
    if (state.labyrinthUi?.session) return undefined;
    return selectExplorationViewModel(state).currentNodeId;
}

export default function CombatEncounterScreen() {
    const styles = useStyles();
    const router = useRouter();
    const store = useGameStore();
    const actions = useGameActions();
    const slot = useActiveSlot();
    const { inCombat, enterCombat, exitCombat, resetRunStats } = useCombatMode();
    const player = useGameState((s) => s.player);
    const flags = useGameState((s) => (s as unknown as { flags?: string[] }).flags);

    const [fight] = useState(() => selectResumableFight(store.getState()));
    const [region] = useState(() => regionOf(store.getState()));
    const [nodeId] = useState(() => nodeOf(store.getState()));
    const [seed] = useState(readDevSeed);

    const leave = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/exploration' as never);
    }, [router]);

    // Mount only: no fight leaves; a fight staged without the gate's engage
    // (continued in memory) raises the combat flag here.
    useEffect(() => {
        if (!fight) {
            leave();
            return;
        }
        if (!inCombat) enterCombat();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // The panel already persisted the outcome. A defeat in the Labyrinth
    // resets the run, keeping the character (full heal, fresh world). On the
    // map it is the death rule: a first death revives the player on the node
    // they walked from, dying, behind the full-screen return moment; a death
    // while dying ends the run (`playerDied` resets it, play log included).
    const onExit = useCallback((outcome: CombatOutcome | null) => {
        if (outcome === 'defeat') {
            if (store.getState().labyrinthUi?.session) {
                // A Labyrinth defeat is a run end: no character, the codex kept.
                actions.resetRun({ keepCharacter: false });
                resetRunStats();
            } else if (actions.playerDied('fight') === 'revived') {
                exitCombat();
                armDeathReturn();
                router.replace('/death-return');
                return;
            } else {
                resetRunStats();
            }
            if (store.getState().runOver === true) {
                // Checkpoint the run-over state so a reload reopens character select.
                try {
                    store.getState().save();
                } catch {
                    /* persistence must not strand the player on the fight */
                }
                exitCombat();
                router.replace(runEndRoute(slot) as never);
                return;
            }
        }
        exitCombat();
        leave();
    }, [actions, store, router, resetRunStats, exitCombat, leave, slot]);

    // WITHDRAW, from the reveal: pay the retreat and settle the node, then end
    // the staged encounter so the gate does not route straight back into it.
    const onWithdraw = useCallback(() => {
        actions.fleeEncounter();
        actions.endCombat('flee');
        exitCombat();
        leave();
    }, [actions, exitCombat, leave]);

    // Dev-only SKIP EVENT settles the fight in the store and bumps this
    // counter; the panel's local fight has no other way to hear it.
    const devSkipSeq = useGameState((s) => s._devSkipSeq ?? 0);
    const seenSkipSeq = useRef(devSkipSeq);
    useEffect(() => {
        if (devSkipSeq === seenSkipSeq.current) return;
        seenSkipSeq.current = devSkipSeq;
        exitCombat();
        leave();
    }, [devSkipSeq, exitCombat, leave]);

    if (!fight || !player) {
        return <View style={styles.root} testID="combat-encounter-empty" />;
    }

    return (
        <SafeAreaView style={styles.root} edges={['top']} testID="combat-encounter-live">
            <CombatEncounterPanel
                key={fight.enemy.id}
                enemy={fight.enemy}
                bootstrapPlayer={player}
                flags={flags}
                seed={seed}
                persistOutcome
                onWithdraw={fight.fleeAllowed ? onWithdraw : undefined}
                onExit={onExit}
                region={region}
                nodeId={nodeId}
            />
        </SafeAreaView>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: { flex: 1, backgroundColor: AXM.deepBg },
}));
