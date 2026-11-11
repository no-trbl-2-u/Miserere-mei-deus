/**
 * Mounts for the five screens that wear round 2's looks, and a count of the
 * kit pieces drawn in a mounted tree. The look-gate tests use them to pin
 * that a place whose look is `normal` draws no kit piece, and one whose look
 * is a kit look draws one.
 */

import { render, type RenderAPI } from '@testing-library/react-native';
import React from 'react';

import { KIT } from '@/assets/images/experience/kit';
import DialogueScreen from '@/app/dialogue/index';
import LabyrinthScreen from '@/app/labyrinth/index';
import QuestScreen from '@/app/quest/index';
import TravelScreen from '@/app/travel/index';
import { StakesCard } from '@/components/hazard/StakesCard';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, EMPTY_EVENT_SLICE } from '@/state/store';
import { createFixtureStore } from '@/test-utils/fixtureStore';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { FIXTURE_LINE, FIXTURE_NODES } from '@/test-utils/questlineFixture';
import { withAllProviders } from '@/test-utils/withAllProviders';

/** How many images in the mounted tree are kit pieces. */
export function kitImagesIn(view: RenderAPI): number {
    const sources = new Set<unknown>(Object.values(KIT).map((piece) => piece.source));
    return view.UNSAFE_root.findAll(
        (n: { props: { source?: unknown }; type: unknown }) => typeof n.type !== 'string' && sources.has(n.props.source),
    ).length;
}

export function mountDialogue(): RenderAPI {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    store.setState({
        event: {
            ...EMPTY_EVENT_SLICE,
            pending: { state: undefined as never, event: { kind: 'cutscene', lines: [] } as never },
            dialogueCursor: {
                tree: {
                    rootId: 'root',
                    nodes: { root: { id: 'root', text: 'The tide took the good stock.', choices: [{ text: 'And the bad stock?' }] } },
                } as never,
                nodeId: 'root',
            },
        },
    });
    return render(<GameStoreProvider store={store}><DialogueScreen /></GameStoreProvider>);
}

export function mountTravel(): RenderAPI {
    const handle = createFixtureStore({
        id: 'lookgate-bridge', seed: 'lookgate-bridge',
        world: { continent: 'coastal-continent', map: 'breakwater', node: 'bw-b2' },
    });
    handle.actions.resolveCurrentMapEvent('travel');
    return render(<GameStoreProvider store={handle.store}><TravelScreen /></GameStoreProvider>);
}

/** Needs `registerFixtureQuestline()` to have run. */
export function mountQuest(): RenderAPI {
    const handle = createFixtureStore({
        id: 'lookgate-quest', seed: 'lookgate-quest',
        world: { continent: 'coastal-continent', map: 'breakwater', node: FIXTURE_NODES[0] },
    });
    handle.actions.resolveCurrentMapEvent(undefined, {
        kind: 'quest', questline: FIXTURE_LINE, node: 1, description: 'A line.', lockedLine: 'Not yet.',
        giver: { name: '[content] The Ferryman', portrait: 'fishermen-elder' },
    });
    return render(<GameStoreProvider store={handle.store}><QuestScreen /></GameStoreProvider>);
}

export function mountLabyrinth(): RenderAPI {
    return render(withAllProviders(<LabyrinthScreen />).tree);
}

export function mountStakes(): RenderAPI {
    return render(
        <StakesCard
            stakes={{
                place: 'River meadow',
                kindLine: 'Hazard',
                goalLine: 'Goal: Force 18 | Escape 10',
                timeLine: 'Time: 60 secs',
                lines: [],
                cta: 'Face it',
            } as never}
            onFace={() => undefined}
        />,
    );
}
