/**
 * The dev-menu HAZARD PUZZLES flow on the live hazard surface: the list of
 * demo puzzles, the live `RouteSelect` (before the clock starts), the live
 * `HazardBoard` under the clock with the shared drag controller, and the
 * outcome. The puzzle session lives in local state and is never saved; the
 * engine runs every move, the presenter shapes every view (the board is the
 * live `HazardViewModel`), and only the outcome reaches the store
 * (`claimHazardPuzzle`).
 *
 * Board moves, all through the live board's own gestures:
 *  - drag a hand card into the play area → stage;
 *  - tap a staged card, or drag it out → unstage;
 *  - drag a die onto a staged card of its colour (or gold) → power;
 *  - a staged card's APPLY → apply (a DRAW card draws from the reserve);
 *  - drag a hand card onto the bin → discard for salvage;
 *  - CONFIRM (or the clock running out) → resolve;
 *  - tap a hand card → read it.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
    activeHazardPuzzleUnlocks,
    applyHazardPuzzleCard,
    confirmHazardPuzzle,
    createHazardPuzzleSession,
    discardHazardPuzzleCard,
    getHazardPuzzleLayout,
    powerHazardPuzzleCard,
    stageHazardPuzzleCard,
    unstageHazardPuzzleCard,
    type HazardPuzzleLayout,
    type HazardPuzzleSession,
    type HazardPuzzleUnlock,
    type HazardRouteKey,
} from '@mechanics';

import { HazardBoard } from '@/components/hazard/HazardBoard';
import { CardDetailOverlay } from '@/components/hazard/HazardOverlays';
import { RouteSelect } from '@/components/hazard/RouteSelect';
import { useHazardDrag } from '@/components/hazard/useHazardDrag';
import { useGameActions, useGameState } from '@/state/GameStoreProvider';
import type { HazardCardVM } from '@/state/presenters/hazard.engine';
import { HAZARD_PUZZLE_RESOLVE_HINT } from '@/state/presenters/hazard-puzzle.copy';
import {
    hazardPuzzleClockFor,
    selectHazardPuzzleListVM,
    selectHazardPuzzleOutcomeVM,
    selectHazardPuzzleRouteSelectVM,
    selectHazardPuzzleStripVM,
    selectHazardPuzzleUnlockLine,
    selectHazardPuzzleViewModel,
    type HazardPuzzleOutcomeVM,
} from '@/state/presenters/hazard-puzzle.engine';
import { HUE } from '@/theme/axm';

import { HazardPuzzleList } from './HazardPuzzleList';
import { HazardPuzzleOutcomePanel } from './HazardPuzzleOutcomePanel';
import { HazardPuzzleStrip, stripProps } from './HazardPuzzleStrip';
import { useHazardPuzzleClock } from './useHazardPuzzleClock';

export interface HazardPuzzleDemoProps {
    /** Open this demo straight away (smoke shots, deep links). */
    initialId?: string;
    /** With `initialId`, start this route straight away. */
    initialRoute?: HazardRouteKey;
    /** With both, confirm at once to show the outcome panel. */
    autoConfirm?: boolean;
    /** Hold the clock (stable smoke shots of the board). */
    clockPaused?: boolean;
}

interface Play {
    layout: HazardPuzzleLayout;
    session: HazardPuzzleSession;
    unlocks: HazardPuzzleUnlock[];
    /** Changes on every start, so the clock refills. */
    startKey: number;
}

function findLayout(id: string | undefined): HazardPuzzleLayout | null {
    if (!id) return null;
    try {
        return getHazardPuzzleLayout(id);
    } catch {
        return null;
    }
}

export function HazardPuzzleDemo({ initialId, initialRoute, autoConfirm, clockPaused }: HazardPuzzleDemoProps) {
    const actions = useGameActions();
    const baseStats = useGameState((s) => s.player.baseStats);
    const [picked, setPicked] = useState<HazardPuzzleLayout | null>(() => findLayout(initialId));
    const [play, setPlay] = useState<Play | null>(null);
    const [outcome, setOutcome] = useState<HazardPuzzleOutcomeVM | null>(null);
    const [detailCard, setDetailCard] = useState<HazardCardVM | null>(null);
    const { drag, ghost } = useHazardDrag();
    // Never reused for the life of the screen: the clock remembers which key
    // it already expired for, so a key restarting at 1 after DONE would leave
    // the next board's clock stuck at 0:00 without confirming.
    const startCount = useRef(0);

    const start = useCallback(
        (layout: HazardPuzzleLayout, route: HazardRouteKey) => {
            const unlocks = activeHazardPuzzleUnlocks(layout, baseStats);
            startCount.current += 1;
            const startKey = startCount.current;
            setPlay({
                layout,
                unlocks,
                session: createHazardPuzzleSession(layout, route, unlocks),
                startKey,
            });
            setOutcome(null);
        },
        [baseStats],
    );

    const finish = useCallback(
        (timedOut: boolean) => {
            if (!play || play.session.phase !== 'playing') return;
            const resolved = confirmHazardPuzzle(play.session);
            const result = resolved.result;
            if (!result) return;
            const claim = actions.claimHazardPuzzle(play.layout, resolved.route, result.p);
            setPlay({ ...play, session: resolved });
            setOutcome(selectHazardPuzzleOutcomeVM(result, claim.outcome, timedOut, claim));
        },
        [actions, play],
    );

    const seconds = play ? hazardPuzzleClockFor(play.layout, play.session.route) : 0;
    const running = play !== null && play.session.phase === 'playing' && !clockPaused;
    const remaining = useHazardPuzzleClock(seconds, running, play?.startKey ?? 0, () => finish(true));

    useEffect(() => {
        if (picked && initialRoute && !play && !outcome) start(picked, initialRoute);
        // Deep-link start only: runs once the picked layout is set.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [picked]);

    useEffect(() => {
        if (autoConfirm && play && play.session.phase === 'playing' && !outcome) finish(false);
    }, [autoConfirm, play, outcome, finish]);

    const move = (fn: (s: HazardPuzzleSession) => HazardPuzzleSession) => {
        if (play) setPlay({ ...play, session: fn(play.session) });
    };

    const list = useMemo(() => selectHazardPuzzleListVM(), []);

    const detail =
        detailCard !== null ? <CardDetailOverlay card={detailCard} onClose={() => setDetailCard(null)} /> : null;

    if (play) {
        const vm = selectHazardPuzzleViewModel(play.layout, play.session);
        return (
            <View style={styles.root} testID="hazard-puzzle-board">
                <HazardPuzzleStrip
                    {...stripProps(selectHazardPuzzleStripVM(play.session, remaining))}
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
                        onDiscard={(uid) => move((s) => discardHazardPuzzleCard(s, uid))}
                        onResolve={() => finish(false)}
                        onInspect={setDetailCard}
                        resolveLabel={vm.resolveLabel}
                        resolveHint={HAZARD_PUZZLE_RESOLVE_HINT}
                    />
                    {outcome ? (
                        <HazardPuzzleOutcomePanel
                            vm={outcome}
                            onDone={() => {
                                setPlay(null);
                                setOutcome(null);
                                setPicked(null);
                            }}
                        />
                    ) : null}
                </View>
                {detail}
                {ghost}
            </View>
        );
    }

    if (picked) {
        const unlocks = activeHazardPuzzleUnlocks(picked, baseStats);
        return (
            <View style={styles.root} testID="hazard-puzzle-routes">
                <HazardPuzzleStrip
                    clockLabel={null}
                    clockUrgent={false}
                    reserveLabel={selectHazardPuzzleStripVM(createHazardPuzzleSession(picked, 'safe', unlocks), 0).reserveLabel}
                    unlockLine={selectHazardPuzzleUnlockLine(unlocks)}
                    onBack={() => setPicked(null)}
                />
                <View style={styles.surface}>
                    <RouteSelect
                        vm={selectHazardPuzzleRouteSelectVM(picked, unlocks)}
                        onPick={(route) => start(picked, route)}
                        onInspect={setDetailCard}
                    />
                </View>
                {detail}
            </View>
        );
    }

    return <HazardPuzzleList items={list} onPick={(id) => setPicked(findLayout(id))} />;
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: HUE.inkBg },
    // The live board and route select fill this box (the route select is absolute-fill).
    surface: { flex: 1 },
});
