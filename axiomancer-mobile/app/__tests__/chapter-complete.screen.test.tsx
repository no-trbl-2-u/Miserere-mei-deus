/**
 * /chapter-complete - the far bank's chapter complete screen (phase CE1b, A2).
 * The title, the chapter's name, the stat rows and CONTINUE, no toast; CONTINUE
 * walks on into the Charcoal Wood with the save made.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import ChapterCompleteScreen from '@/app/chapter-complete/index';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import {
    CHAPTER_COMPLETE_CHAPTER_NAME,
    CHAPTER_COMPLETE_CONTINUE_LABEL,
    CHAPTER_COMPLETE_TITLE,
} from '@/state/presenters/chapter-complete.copy';
import { selectChapterCompleteSummary } from '@/state/presenters/chapter-complete.engine';
import { createFixtureStore } from '@/test-utils/fixtureStore';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { resolvePastScene } from '../../test-utils/pastScene';

const mockBack = jest.fn();
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: mockBack, canGoBack: () => true }),
}));

/** The far bank with the crossing said YES to: the screen's slice is open. */
function atTheFarBank() {
    const adapter = createMemoryAdapter();
    const handle = createFixtureStore(
        { id: 'ce1b-screen', seed: 'ce1b-screen', world: { continent: 'coastal-continent', map: 'breakwater', node: 'bw-b2' } },
        { adapter },
    );
    resolvePastScene(handle.store, handle.actions, 'travel');
    handle.actions.takeTravel();
    render(
        <GameStoreProvider store={handle.store}>
            <ChapterCompleteScreen />
        </GameStoreProvider>,
    );
    return { ...handle, adapter };
}

describe('/chapter-complete', () => {
    it('shows the title, the chapter name, every stat row and CONTINUE', () => {
        const { store } = atTheFarBank();
        expect(screen.getByTestId('chapter-complete-title').props.children).toBe(CHAPTER_COMPLETE_TITLE);
        expect(screen.getByTestId('chapter-complete-chapter').props.children).toBe(CHAPTER_COMPLETE_CHAPTER_NAME);
        const rows = selectChapterCompleteSummary(store.getState() as never);
        expect(rows.length).toBeGreaterThan(0);
        for (const r of rows) {
            expect(screen.getByTestId(`chapter-complete-row-${r.id}`)).toBeTruthy();
            expect(screen.getByText(r.label)).toBeTruthy();
            expect(screen.getByTestId(`chapter-complete-value-${r.id}`).props.children).toBe(r.value);
        }
        expect(screen.getByText(CHAPTER_COMPLETE_CONTINUE_LABEL)).toBeTruthy();
    });

    it('is up with no toast', () => {
        const { store } = atTheFarBank();
        expect(store.getState().notifications?.toast?.text ?? null).toBeNull();
    });

    it('CONTINUE crosses into the Charcoal Wood, with the save made and no toast', () => {
        const { store, adapter } = atTheFarBank();
        const saves = adapter.saveCount;
        fireEvent.press(screen.getByTestId('chapter-complete-continue'));
        expect(store.getState().world.currentMap.name).toBe('charcoal-wood');
        expect(store.getState().travel.open).toBeNull();
        expect(store.getState().notifications?.toast?.text ?? null).toBeNull();
        expect(adapter.saveCount).toBe(saves + 1);
        // The screen leaves once the crossing is taken.
        expect(mockBack).toHaveBeenCalled();
    });
});
