/**
 * Dev-only aftermath-panel showcase. Renders the
 * combat aftermath panel that has no organic capture path — DEFEAT
 * (no seeded fight loses deterministically) — with a fixed sample view-model
 * so the panel internals can be eyeballed without driving combat to that
 * outcome. Victory is already captured via the real combat flow (screen 11),
 * so it's omitted here.
 *
 * The capture (`/devaftermath?panel=defeat`) is a true 390×844 frame — the panels are full-screen seal bodies in
 * the real flow. Pure presentational: each panel takes a hand-built VM +
 * no-op handlers. No store, no engine. Gated to dev builds; production
 * renders nothing. Mirrors the `/devart` enemy-art gallery.
 *
 * Route: /devaftermath
 */

import React from 'react';
import { View } from 'react-native';

import { makeStyles } from '@/theme/runtime';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { CombatDefeatPanel } from '@/components/event/aftermath/CombatDefeatPanel';
import type { AftermathDefeatViewModel } from '@/state/presenters/aftermath.engine';

const noop = () => {};

const DEFEAT_VM: AftermathDefeatViewModel = {
    kind: 'defeat',
    characterName: 'WORM-EATEN PILGRIM',
    killer: {
        name: 'Green Jelly',
        epithet: 'keeps what it eats',
        finalCard: 'STRIKE',
        damage: 6,
    },
    causePhrase:
        'You catch your reflection in her tide pool and it does not follow you home.',
    runSummary: { rounds: 4, encountersFaced: 3, deepestNodeId: 'DOCK' },
};

export default function DevAftermathPanel() {
    const styles = useStyles();
    if (!isDevToolsEnabled()) {
        return <View style={styles.root} testID="devaftermath-disabled" />;
    }
    return (
        <View style={styles.root} testID="devaftermath-panel">
            <CombatDefeatPanel vm={DEFEAT_VM} onBeginAgain={noop} onLetClose={noop} />
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    // Full-screen container — the panels are seal bodies that fill the
    // encounter modal in the real flow; their flex:1 root fills this.
    root: { flex: 1, backgroundColor: AXM.bg },
}));
