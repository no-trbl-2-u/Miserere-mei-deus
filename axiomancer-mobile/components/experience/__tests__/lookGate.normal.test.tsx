/**
 * The look affordance: a place whose look is `normal` in the table draws no
 * kit piece. Every look is forced to `normal` here, so each screen the table
 * dresses must fall back to today's plain code path, press and disabled
 * states included. `lookGate.worn.test.tsx` is the other half: the table's
 * real looks do draw their pieces.
 */

import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { kitImagesIn, mountDialogue, mountLabyrinth, mountQuest, mountStakes, mountTravel } from '@/test-utils/lookGate';
import { registerFixtureQuestline, unregisterFixtureQuestline } from '@/test-utils/questlineFixture';

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

jest.mock('@/components/experience/looks', () => ({
    ...(jest.requireActual('@/components/experience/looks') as object),
    lookOf: () => 'normal',
    // BrassButton reads the table directly, so the table itself reads normal.
    LOOKS: new Proxy({}, { get: () => 'normal' }),
}));

beforeAll(() => { registerFixtureQuestline(); });
afterAll(() => { unregisterFixtureQuestline(); });

describe('a place set to normal draws no kit piece', () => {
    it('E-02 and E-03: the dialogue', () => {
        const view = mountDialogue();
        expect(view.getByTestId('dialogue-speech')).toBeTruthy();
        expect(kitImagesIn(view)).toBe(0);
    });

    it('T-02: the travel buttons', () => {
        const view = mountTravel();
        expect(view.getByTestId('travel-move')).toBeTruthy();
        expect(kitImagesIn(view)).toBe(0);
    });

    it('H-01: the stakes card', () => {
        const view = mountStakes();
        expect(view.getByTestId('hazard-stakes-place')).toBeTruthy();
        expect(kitImagesIn(view)).toBe(0);
    });

    it('Q-01: the quest panel', () => {
        const view = mountQuest();
        expect(view.getByTestId('quest-offer')).toBeTruthy();
        expect(kitImagesIn(view)).toBe(0);
    });

    it('X-01 and X-02: the labyrinth act rows and LEAVE', () => {
        const view = mountLabyrinth();
        expect(view.getByTestId('labyrinth-act-act1')).toBeTruthy();
        expect(view.getByTestId('labyrinth-leave')).toBeTruthy();
        expect(kitImagesIn(view)).toBe(0);
    });
});
