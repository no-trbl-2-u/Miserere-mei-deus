/**
 * Dev-only RUN controls + gallery links.
 *
 *   SAVE       — persist now (`actions.save`).
 *   RESET RUN  — `resetRun({ keepCharacter: true })`: fresh world, same
 *                character. Blood border: it discards map progress.
 *   NEW RUN    — `resetRun({ keepCharacter: false })`: a run end, as in play;
 *                saved, then character select for the slot.
 *   GALLERIES  — the dev-only visual routes: enemy art (`/devart`),
 *                Aporia rooms (`/devart/rooms`), the DEFEAT / PARLEY
 *                aftermath panels (`/devaftermath?panel=…`), and the
 *                frame-engine harness (`/devframes`).
 *
 * Renders null outside dev builds.
 */

import React, { useState } from 'react';
import { useRouter } from '@/lib/platform/router';

import { DevButton, DevButtons, DevRow } from '@/components/dev/DevControls';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { useGameActions, useGameStore } from '@/state/GameStoreProvider';
import { runEndRoute } from '@/state/run-end';
import { useActiveSlot } from '@/state/SaveSlotsProvider';

const GALLERIES: readonly { label: string; route: string; testID: string }[] = [
    { label: 'ENEMY ART', route: '/devart', testID: 'debug-gallery-enemy-art' },
    { label: 'APORIA ROOMS', route: '/devart/rooms', testID: 'debug-gallery-rooms' },
    { label: 'DEFEAT PANEL', route: '/devaftermath?panel=defeat', testID: 'debug-gallery-defeat' },
    { label: 'PARLEY PANEL', route: '/devaftermath?panel=parley', testID: 'debug-gallery-parley' },
    { label: 'FRAME ENGINE', route: '/devframes', testID: 'debug-gallery-frames' },
];

export function DebugRunControls() {
    const actions = useGameActions();
    const store = useGameStore();
    const slot = useActiveSlot();
    const router = useRouter();
    const [feedback, setFeedback] = useState<string | null>(null);

    if (!isDevToolsEnabled()) return null;

    const onSave = () => {
        actions.save();
        setFeedback('saved');
    };
    const onReset = (keepCharacter: boolean) => {
        actions.resetRun({ keepCharacter });
        setFeedback(keepCharacter ? 'run reset · character kept' : 'new run · choose a character');
        if (!keepCharacter) {
            store.getState().save();
            router.replace(runEndRoute(slot) as never);
        }
    };

    return (
        <>
            <DevRow label="DEBUG · RUN" sub={feedback ?? 'save · reset world · start over'} testID="debug-run">
                <DevButtons>
                    <DevButton label="SAVE" onPress={onSave} a11y="Save the game now" testID="debug-run-save" />
                    <DevButton label="RESET RUN" danger onPress={() => onReset(true)} a11y="Reset the run but keep the character" testID="debug-run-reset" />
                    <DevButton label="NEW RUN" danger onPress={() => onReset(false)} a11y="Start a completely new run" testID="debug-run-new" />
                </DevButtons>
            </DevRow>
            <DevRow label="DEBUG · GALLERIES" sub="dev-only visual routes">
                <DevButtons>
                    {GALLERIES.map((g) => (
                        <DevButton key={g.route} label={g.label} onPress={() => router.push(g.route as never)} a11y={`Open the ${g.label.toLowerCase()} gallery`} testID={g.testID} />
                    ))}
                </DevButtons>
            </DevRow>
        </>
    );
}
