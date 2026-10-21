/**
 * Dev-only entry to the HAZARD PUZZLES board: the three fixed demo puzzles
 * and the labelled candidates (grouped easy, medium, hard), each under its
 * clock. Tap pushes `/devpuzzle`. Renders null outside dev builds.
 */

import React from 'react';

import { DevButton, DevButtons, DevRow } from '@/components/dev/DevControls';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { useRouter } from '@/lib/platform/router';
import { HAZARD_PUZZLE_LIST_TITLE } from '@/state/presenters/hazard-puzzle.copy';

export const DEBUG_HAZARD_PUZZLES_SUB = 'three demos and the candidates, under a clock';
export const DEBUG_HAZARD_PUZZLES_OPEN = 'OPEN';

export function DebugHazardPuzzlesButton() {
    const router = useRouter();
    if (!isDevToolsEnabled()) return null;
    return (
        <DevRow label={`DEBUG · ${HAZARD_PUZZLE_LIST_TITLE}`} sub={DEBUG_HAZARD_PUZZLES_SUB}>
            <DevButtons>
                <DevButton
                    label={DEBUG_HAZARD_PUZZLES_OPEN}
                    a11y="Open the hazard puzzle demos"
                    testID="debug-hazard-puzzles-button"
                    onPress={() => router.push('/devpuzzle' as never)}
                />
            </DevButtons>
        </DevRow>
    );
}
