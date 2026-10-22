/**
 * Dev-only aftermath-panel showcase. Renders the
 * combat aftermath panels that have no organic capture path — DEFEAT
 * (no seeded fight loses deterministically) and
 * PARLEY (mercy is a branch combat-drive doesn't take) — with fixed
 * sample view-models so the panel internals can be eyeballed without
 * driving combat to those outcomes. Victory is already captured via the
 * real combat flow (screen 11), so it's omitted here.
 *
 * One panel per render, chosen by the `panel` query param
 * (`/devaftermath?panel=defeat|parley`, default defeat), so each capture
 * is a true 390×844 frame — the panels are full-screen seal bodies in
 * the real flow. Pure presentational: each panel takes a hand-built VM +
 * no-op handlers. No store, no engine. Gated to dev builds; production
 * renders nothing. Mirrors the `/devart` enemy-art gallery.
 *
 * Route: /devaftermath
 */

import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from '@/lib/platform/router';

import { makeStyles } from '@/theme/runtime';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { CombatDefeatPanel } from '@/components/event/aftermath/CombatDefeatPanel';
import { CombatFriendshipPanel } from '@/components/event/aftermath/CombatFriendshipPanel';
import type {
    AftermathDefeatViewModel,
    AftermathParleyViewModel,
} from '@/state/presenters/aftermath.engine';

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

const PARLEY_VM: AftermathParleyViewModel = {
    kind: 'parley',
    enemyName: 'SALT-GNAW RAT',
    enemyEpithet: 'no longer hungry',
    pactPhrase: 'It set the knife down, slow, and let the wet ground take the rest.',
    rewards: {
        xp: 6,
        currency: { shillings: 4 },
        loot: [{ name: 'Walking Rite', slot: 'hazard', rarity: 'uncommon' }],
    },
    journalEntry: {
        bookName: 'THE BESTIARY',
        entryTitle: 'On Rats That Reconsider',
        // No trailing period — the panel appends its own ellipsis
        // (`…`); a period here would render a malformed `.…` terminator.
        preview: 'They are not brave, but they are not, every time, cruel',
    },
};

export default function DevAftermathPanel() {
    const styles = useStyles();
    const params = useLocalSearchParams<{ panel?: string }>();
    if (!isDevToolsEnabled()) {
        return <View style={styles.root} testID="devaftermath-disabled" />;
    }
    const which = params.panel === 'parley' ? 'parley' : 'defeat';
    return (
        <View style={styles.root} testID="devaftermath-panel">
            {which === 'parley' ? (
                <CombatFriendshipPanel vm={PARLEY_VM} onContinue={noop} />
            ) : (
                <CombatDefeatPanel vm={DEFEAT_VM} onBeginAgain={noop} onLetClose={noop} />
            )}
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    // Full-screen container — the panels are seal bodies that fill the
    // encounter modal in the real flow; their flex:1 root fills this.
    root: { flex: 1, backgroundColor: AXM.bg },
}));
