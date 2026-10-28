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
import { useHazardDrag } from '@/components/hazard/useHazardDrag';
import { isDeathReturnArmed } from '@/state/death-return';
import { useGameActions, useGameState } from '@/state/GameStoreProvider';
import { selectHazardViewModel, type HazardCardVM } from '@/state/presenters/hazard.engine';
import { HUE } from '@/theme/axm';

export default function HazardScreen() {
    const hazard = useGameState((s) => s.hazard);
    const vm = useMemo(() => selectHazardViewModel({ hazard }), [hazard]);
    const actions = useGameActions();
    const router = useRouter();

    const [detailCard, setDetailCard] = useState<HazardCardVM | null>(null);

    // Screen-level drag controller and ghost (shared with the puzzle board).
    const { drag, ghost } = useHazardDrag();

    // Leave the screen when the session clears (rewards claimed /
    // abandoned elsewhere).
    useEffect(() => {
        // A revive hands off to the return moment (`replace`), which owns the
        // way back to the map: do not pop it as well.
        if (!vm.active && !isDeathReturnArmed() && router.canGoBack()) router.back();
    }, [vm.active, router]);

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

            {vm.phase === 'route-select' && (
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
                        const claim = actions.claimHazardRewards(cardId);
                        if (claim.outcome === 'revived') {
                            router.replace('/death-return');
                        }
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
