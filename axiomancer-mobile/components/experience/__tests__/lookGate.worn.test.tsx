/**
 * The look affordance, worn side: with the table's real looks, each screen
 * round 2 dresses draws its kit piece. Paired with `lookGate.normal.test.tsx`,
 * which forces every look to `normal` and expects none.
 */

import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { kitImagesIn, mountDialogue, mountLabyrinth, mountQuest, mountStakes, mountTravel } from '@/test-utils/lookGate';
import { registerFixtureQuestline, unregisterFixtureQuestline } from '@/test-utils/questlineFixture';

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

beforeAll(() => { registerFixtureQuestline(); });
afterAll(() => { unregisterFixtureQuestline(); });

describe('a place on a kit look draws its kit piece', () => {
    it('E-02 and E-03: the dialogue', () => {
        expect(kitImagesIn(mountDialogue())).toBeGreaterThan(0);
    });

    it('T-02: the travel buttons', () => {
        expect(kitImagesIn(mountTravel())).toBeGreaterThan(0);
    });

    it('H-01: the stakes card', () => {
        expect(kitImagesIn(mountStakes())).toBeGreaterThan(0);
    });

    it('the quest card and its brass buttons', () => {
        expect(kitImagesIn(mountQuest())).toBeGreaterThan(0);
    });

    it('X-01 and X-02: the labyrinth act rows and LEAVE', () => {
        expect(kitImagesIn(mountLabyrinth())).toBeGreaterThan(0);
    });
});
