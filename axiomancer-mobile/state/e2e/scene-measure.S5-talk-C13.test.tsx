/**
 * Hermetic screen test — narrative screens keep a readable measure
 * (cluster S5-talk-C13).
 *
 * At a desktop width an uncapped /dialogue or /blacksmith scene runs the
 * full window: ~165 characters to a line, which loses the eye on every
 * return sweep. Both content columns are capped and centred; below the cap
 * the column is full-width, so phone layout is untouched.
 *
 * Contract asserted here: each screen's scroll content column declares a
 * numeric `maxWidth` inside the readable band, is centred, and still
 * stretches to the full width of a narrow viewport.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import BlacksmithScreen from '@/app/blacksmith/index';
import DialogueScreen from '@/app/dialogue/index';
import { createAppActions } from '@/state/actions';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, EMPTY_EVENT_SLICE, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

// Hoisted above the imports by babel-plugin-jest-hoist: these screens pop the
// route the moment their slice empties, so the router must be stubbed.
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        replace: jest.fn(),
        push: jest.fn(),
        back: jest.fn(),
        canGoBack: () => true,
    }),
}));

/** Roughly 45–90 characters at these body sizes — the readable band. */
const MIN_MEASURE = 360;
const MAX_MEASURE = 720;

function store(): AppStore {
    return createAppStore({ adapter: createMemoryAdapter() });
}

function mount(s: AppStore, child: React.ReactNode) {
    return render(<GameStoreProvider store={s}>{child}</GameStoreProvider>);
}

/** Seat a walking dialogue so /dialogue renders its scene. */
function dialogueStore(): AppStore {
    const s = store();
    s.setState({
        event: {
            ...EMPTY_EVENT_SLICE,
            pending: {
                state: undefined as never,
                event: { kind: 'cutscene', lines: [] } as never,
            },
            dialogueCursor: {
                tree: {
                    rootId: 'root',
                    nodes: {
                        root: {
                            id: 'root',
                            text: 'The tide took the good stock and left the rest of us.',
                            choices: [{ text: 'And the bad stock?' }],
                        },
                    },
                } as never,
                nodeId: 'root',
            },
        },
    });
    return s;
}

function columnStyle(testID: string, s: AppStore, child: React.ReactNode) {
    return StyleSheet.flatten(
        mount(s, child).getByTestId(testID).props.contentContainerStyle,
    ) as Record<string, unknown>;
}

/** The two narrative scenes under test, each with a reader for its column. */
const SCENES: readonly { name: string; readColumn: () => Record<string, unknown> }[] = [
    {
        name: 'dialogue',
        readColumn: () => columnStyle('dialogue-scroll', dialogueStore(), <DialogueScreen />),
    },
    {
        name: 'blacksmith',
        readColumn: () => {
            const s = store();
            createAppActions(s).beginBlacksmith();
            return columnStyle('blacksmith-scroll', s, <BlacksmithScreen />);
        },
    },
];

describe.each(SCENES)('$name scene column is capped (S5-talk-C13)', ({ readColumn }) => {
    it('caps the column inside the readable band', () => {
        const style = readColumn();

        expect(typeof style.maxWidth).toBe('number');
        expect(style.maxWidth as number).toBeGreaterThanOrEqual(MIN_MEASURE);
        expect(style.maxWidth as number).toBeLessThanOrEqual(MAX_MEASURE);
    });

    it('centres the column and still fills a narrow viewport', () => {
        const style = readColumn();

        expect(style.alignSelf).toBe('center');
        expect(style.width).toBe('100%');
    });
});
