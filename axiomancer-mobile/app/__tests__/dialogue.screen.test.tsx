/**
 * Hermetic screen test: /dialogue shows its two copy lines.
 *
 * The eyebrow over the nameplate and the shell shown once no one is left
 * to speak both come from `dialogue.copy.ts`; the screen holds no string of
 * its own, so this fails if either stops being rendered.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

import DialogueScreen from '@/app/dialogue/index';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { DIALOGUE_EYEBROW, DIALOGUE_INACTIVE_TEXT } from '@/state/presenters/dialogue.copy';
import { createAppStore, EMPTY_EVENT_SLICE, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

// The screen pops the route the moment its slice empties.
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        replace: jest.fn(),
        push: jest.fn(),
        back: jest.fn(),
        canGoBack: () => false,
    }),
}));

function mount(s: AppStore) {
    return render(
        <GameStoreProvider store={s}>
            <DialogueScreen />
        </GameStoreProvider>,
    );
}

function seatedStore(): AppStore {
    const s = createAppStore({ adapter: createMemoryAdapter() });
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
                            text: 'The tide took the good stock.',
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

describe('/dialogue copy', () => {
    it('reads the words eyebrow over a seated conversation', () => {
        const { getByText } = mount(seatedStore());
        expect(DIALOGUE_EYEBROW).toBe('◉ WORDS');
        expect(getByText(DIALOGUE_EYEBROW)).toBeTruthy();
    });

    it('reads the words-are-done line when no one is waiting', () => {
        const { getByTestId, getByText } = mount(createAppStore({ adapter: createMemoryAdapter() }));
        expect(getByTestId('dialogue-inactive')).toBeTruthy();
        expect(DIALOGUE_INACTIVE_TEXT).toBe('No one is waiting. The words are done.');
        expect(getByText(DIALOGUE_INACTIVE_TEXT)).toBeTruthy();
    });
});
