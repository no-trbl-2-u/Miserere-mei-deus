/**
 * The puzzle board a puzzle hazard node opens on `/hazard` (phase HP6c, A6,
 * A7): the stakes card (the one goal), then the `/devpuzzle` board, with no
 * route select. It is the dev board's play surface (B3e2), driven from the
 * store's `hazard.puzzle` instead of local state: the strip and its clock,
 * the live `HazardBoard` with the shared drag controller, the opening dice
 * roll (the clock starts when it settles), the reroll tumble, and the outcome
 * panel. The dev-only move log and the solve-time posting stay on
 * `/devpuzzle`; a run's puzzle records nothing beyond the run log.
 *
 * CONFIRM (or the clock running out) resolves the round and claims it onto
 * the player; the outcome panel's button closes the board, and the hazard
 * screen goes back to the map.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
    applyHazardPuzzleCard,
    getHazardPuzzleCandidate,
    powerHazardPuzzleCard,
    stageHazardPuzzleCard,
    unstageHazardPuzzleCard,
    type HazardPuzzleSession,
} from '@mechanics';

import { HazardBoard } from '@/components/hazard/HazardBoard';
import { CardDetailOverlay, DiceRollOverlay } from '@/components/hazard/HazardOverlays';
import { StakesCard } from '@/components/hazard/StakesCard';
import { useHazardDrag } from '@/components/hazard/useHazardDrag';
import type { HazardPuzzleNodePlay } from '@/state/hazard/puzzle-node-actions';
import { useGameActions, useGameState } from '@/state/GameStoreProvider';
import type { HazardCardVM, HazardDieRoll } from '@/state/presenters/hazard.engine';
import { HAZARD_PUZZLE_RESOLVE_HINT } from '@/state/presenters/hazard-puzzle.copy';
import {
    hazardPuzzleClockFor,
    nextHazardPuzzleDieRolls,
    selectHazardPuzzleDiceChange,
    selectHazardPuzzleOutcomeVM,
    selectHazardPuzzleStripVM,
    selectHazardPuzzleUnlockLine,
    selectHazardPuzzleViewModel,
} from '@/state/presenters/hazard-puzzle.engine';
import { selectHazardPuzzleStakes } from '@/state/presenters/hazard-stakes.engine';
import { HUE } from '@/theme/axm';

import { HazardPuzzleOutcomePanel } from './HazardPuzzleOutcomePanel';
import { HazardPuzzleStrip, stripProps } from './HazardPuzzleStrip';
import { useHazardPuzzleClock } from './useHazardPuzzleClock';

export interface HazardPuzzleNodeBoardProps {
    play: HazardPuzzleNodePlay;
    /** Hold the clock (stable smoke shots and screen tests). */
    clockPaused?: boolean;
}

export function HazardPuzzleNodeBoard({ play, clockPaused }: HazardPuzzleNodeBoardProps) {
    const actions = useGameActions();
    const world = useGameState((s) => s.world);
    const hazard = useGameState((s) => s.hazard);
    const stakes = useMemo(() => selectHazardPuzzleStakes({ hazard, world }), [hazard, world]);
    const layout = useMemo(() => getHazardPuzzleCandidate(play.candidateId), [play.candidateId]);
    // The stakes card shows once, before the board; the clock waits on the roll after it.
    const [faced, setFaced] = useState(false);
    const [rolled, setRolled] = useState(false);
    const [dieRolls, setDieRolls] = useState<Readonly<Record<string, HazardDieRoll>>>({});
    const [detailCard, setDetailCard] = useState<HazardCardVM | null>(null);
    const { drag, ghost } = useHazardDrag();

    const session = play.session;
    const playing = session.phase === 'playing' && play.claim === null;
    const seconds = hazardPuzzleClockFor(layout, session.route);
    const running = faced && rolled && playing && !clockPaused;
    const remaining = useHazardPuzzleClock(seconds, running, 1, () => actions.confirmHazardPuzzleNode({ timedOut: true }));

    // A new puzzle (another node) starts over on its own stakes card.
    useEffect(() => {
        setFaced(false);
        setRolled(false);
        setDieRolls({});
    }, [play.nodeId, play.candidateId]);

    const move = (fn: (s: HazardPuzzleSession) => HazardPuzzleSession) => {
        const next = fn(session);
        setDieRolls((rolls) => nextHazardPuzzleDieRolls(rolls, selectHazardPuzzleDiceChange(session, next).rerolled));
        actions.moveHazardPuzzleNode(() => next);
    };

    if (!faced && stakes !== null) {
        return <StakesCard stakes={stakes} onFace={() => setFaced(true)} />;
    }

    const vm = selectHazardPuzzleViewModel(layout, session);
    const outcome =
        play.claim !== null && session.result
            ? selectHazardPuzzleOutcomeVM(session.result, play.claim.outcome, play.timedOut, play.claim)
            : null;

    return (
        <View style={styles.root} testID="hazard-puzzle-node">
            <HazardPuzzleStrip
                {...stripProps(selectHazardPuzzleStripVM(session, remaining))}
                unlockLine={selectHazardPuzzleUnlockLine(play.unlocks)}
            />
            <View style={styles.surface}>
                <HazardBoard
                    vm={vm}
                    drag={drag}
                    onStage={(uid) => move((s) => stageHazardPuzzleCard(s, uid))}
                    onUnstage={(uid) => move((s) => unstageHazardPuzzleCard(s, uid))}
                    onPower={(uid, dieId) => move((s) => powerHazardPuzzleCard(s, uid, dieId))}
                    onApply={(uid) => move((s) => applyHazardPuzzleCard(s, uid))}
                    onResolve={() => actions.confirmHazardPuzzleNode()}
                    onInspect={setDetailCard}
                    resolveLabel={vm.resolveLabel}
                    resolveHint={HAZARD_PUZZLE_RESOLVE_HINT}
                    dieRolls={dieRolls}
                />
                {outcome ? <HazardPuzzleOutcomePanel vm={outcome} onDone={() => actions.leaveHazardPuzzleNode()} /> : null}
            </View>
            {!rolled && playing && vm.routeKey !== null ? (
                <DiceRollOverlay
                    dice={vm.dice}
                    routeLabel={vm.routeLabel}
                    routeKey={vm.routeKey}
                    onDone={() => setRolled(true)}
                />
            ) : null}
            {detailCard !== null ? <CardDetailOverlay card={detailCard} onClose={() => setDetailCard(null)} /> : null}
            {ghost}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: HUE.inkBg },
    // The live board fills this box.
    surface: { flex: 1 },
});
