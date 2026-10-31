/**
 * Hazard minigame screen — full-screen tactical surface.
 *
 * Phase orchestration only: the engine (axiomancer-mechanics
 * World/Hazard) owns rules,
 * the presenter owns mapping, this screen renders the VM, hosts the
 * shared screen-level drag ghost (`useHazardDrag`), and dispatches store
 * actions.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from '@/lib/platform/router';

import { HazardBoard } from '@/components/hazard/HazardBoard';
import {
    CardDetailOverlay,
    DiceRollOverlay,
    OutcomeOverlay,
    ResolveFlashOverlay,
} from '@/components/hazard/HazardOverlays';
import { RewardsOverlay } from '@/components/hazard/RewardsOverlay';
import { RouteSelect } from '@/components/hazard/RouteSelect';
import { StakesCard } from '@/components/hazard/StakesCard';
import { useHazardDrag } from '@/components/hazard/useHazardDrag';
import { isDeathReturnArmed } from '@/state/death-return';
import { armGameOver } from '@/state/game-over';
import { runEndRoute } from '@/state/run-end';
import { useActiveSlot } from '@/state/SaveSlotsProvider';
import { useGameActions, useGameState, useGameStore } from '@/state/GameStoreProvider';
import { selectHazardStakes } from '@/state/presenters/hazard-stakes.engine';
import { selectHazardViewModel, type HazardCardVM } from '@/state/presenters/hazard.engine';
import { HUE } from '@/theme/axm';

export default function HazardScreen() {
    const hazard = useGameState((s) => s.hazard);
    const world = useGameState((s) => s.world);
    const vm = useMemo(() => selectHazardViewModel({ hazard }), [hazard]);
    const stakes = useMemo(() => selectHazardStakes({ hazard, world }), [hazard, world]);
    // The stakes card shows once per hazard, before the route select.
    const [faced, setFaced] = useState(false);
    const actions = useGameActions();
    const store = useGameStore();
    const slot = useActiveSlot();
    const router = useRouter();

    const [detailCard, setDetailCard] = useState<HazardCardVM | null>(null);

    // Screen-level drag controller and ghost (shared with the puzzle board).
    const { drag, ghost } = useHazardDrag();

    // Leave the screen when the session clears (rewards claimed /
    // abandoned elsewhere).
    useEffect(() => {
        if (vm.active) return;
        setFaced(false);
        // A revive (armed in the claim, by the rewards ledger or the dev SKIP
        // EVENT alike) hands off to the return moment, which owns the way
        // back to the map: do not pop it as well.
        if (isDeathReturnArmed()) router.replace('/death-return');
        else if (store.getState().runOver === true) {
            armGameOver();
            router.replace(runEndRoute(slot) as never);
        }
        else if (router.canGoBack()) router.back();
    }, [vm.active, router, store, slot]);

    if (!vm.active) return <View style={styles.root} testID="hazard-empty" />;

    return (
        <View style={styles.root}>
            {vm.phase !== 'route-select' && (
                <HazardBoard
                    vm={vm}
                    drag={drag}
                    onStage={(uid) => actions.stageHazardCard(uid)}
                    onUnstage={(uid) => actions.unstageHazardCard(uid)}
                    onPower={(uid, dieId) => actions.powerHazardCard(uid, dieId)}
                    onApply={(uid) => actions.applyHazardCard(uid)}
                    onDiscard={(uid) => actions.discardHazardCard(uid)}
                    onResolve={() => actions.resolveHazardRound()}
                    onInspect={setDetailCard}
                />
            )}

            {vm.phase === 'route-select' && stakes !== null && !faced && (
                <StakesCard stakes={stakes} onFace={() => setFaced(true)} />
            )}

            {vm.phase === 'route-select' && (faced || stakes === null) && (
                <RouteSelect
                    vm={vm}
                    onPick={(route) => actions.selectHazardRoute(route)}
                    onInspect={setDetailCard}
                />
            )}

            {vm.phase === 'rolling' && vm.routeKey !== null && (
                <DiceRollOverlay
                    dice={vm.dice}
                    routeLabel={vm.routeLabel}
                    routeKey={vm.routeKey}
                    onDone={() => actions.finishHazardRolling()}
                />
            )}

            {vm.resolveFlash !== null && (
                <ResolveFlashOverlay
                    flash={vm.resolveFlash}
                    onDone={() => actions.continueHazardAfterResolve()}
                />
            )}

            {vm.phase === 'outcome' && vm.outcome !== null && (
                <OutcomeOverlay outcome={vm.outcome} onContinue={() => actions.acknowledgeHazardOutcome()} />
            )}

            {vm.phase === 'rewards' && vm.rewards !== null && (
                <RewardsOverlay
                    rewards={vm.rewards}
                    onConfirm={(cardId) => {
                        actions.claimHazardRewards(cardId);
                    }}
                />
            )}

            {detailCard !== null && (
                <CardDetailOverlay card={detailCard} onClose={() => setDetailCard(null)} />
            )}

            {ghost}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: HUE.inkBg },
});
