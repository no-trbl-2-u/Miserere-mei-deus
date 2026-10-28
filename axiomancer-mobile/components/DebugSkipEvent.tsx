/**
 * Dev-only SKIP EVENT button.
 *
 * Resolves whatever the player is in — a live fight, a hazard / rest /
 * reliquary / anvil session, a paced event, a queued item reward — or the
 * arrival still owed on the node under them, with a plausible outcome
 * (`state/dev/skip-event.ts` has the per-kind table), then jumps to the
 * WILDS tab so the map is what's on screen. The same action backs
 * `globalThis.__AXM_SKIP_EVENT__` for browser drivers.
 *
 * Renders null outside dev builds. Mounted in the `/dev` ENCOUNTERS section.
 */

import React, { useState } from 'react';
import { useRouter } from '@/lib/platform/router';

import { DevButton, DevButtons, DevRow } from '@/components/dev/DevControls';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { useGameActions, useGameStore } from '@/state/GameStoreProvider';
import { skipCurrentEvent } from '@/state/dev/skip-event';

export function DebugSkipEvent() {
    const store = useGameStore();
    const actions = useGameActions();
    const router = useRouter();
    const [feedback, setFeedback] = useState<string | null>(null);

    if (!isDevToolsEnabled()) return null;

    const onSkip = () => {
        const result = skipCurrentEvent(store, actions);
        setFeedback(`${result.kind} @ ${result.nodeId ?? '?'} · ${result.outcome}`);
        // A lethal crossing revives behind the return moment, which also
        // consumes the flag the revive armed.
        if (result.detail?.deathOutcome === 'revived') router.push('/death-return');
        else if (result.kind !== 'none') router.push('/(tabs)/exploration');
    };

    return (
        <DevRow
            label="DEBUG · SKIP EVENT"
            sub={feedback ?? 'resolve the current event with a plausible outcome'}
            stacked
            testID="debug-skip-event"
        >
            <DevButtons>
                <DevButton
                    label="SKIP EVENT"
                    onPress={onSkip}
                    a11y="Resolve the current event with a plausible outcome and return to the world tab"
                    testID="debug-skip-event-button"
                />
            </DevButtons>
        </DevRow>
    );
}
