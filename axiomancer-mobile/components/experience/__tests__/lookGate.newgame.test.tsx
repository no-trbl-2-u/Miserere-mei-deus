/**
 * The look affordance for round 2's new-game and ending places (N-01, N-02,
 * G-01). With the table's real looks each screen draws kit pieces; with every
 * look forced to `normal` it draws none. The screens read the table at import,
 * so each case loads them fresh under the mode it wants.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

import { KIT } from '@/assets/images/experience/kit';
import { armDeathReturn, clearDeathReturn } from '@/state/death-return';
import { armGameOver, clearGameOver } from '@/state/game-over';

let mockForceNormal = false;
jest.mock('@/components/experience/looks', () => {
    const actual = jest.requireActual('@/components/experience/looks') as { lookOf: (p: never) => string };
    return { ...actual, lookOf: (p: never) => (mockForceNormal ? 'normal' : actual.lookOf(p)) };
});

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
    useLocalSearchParams: () => ({ slot: '1' }),
}));

/** Images in the tree that are kit pieces. */
function kitImages(view: ReturnType<typeof render>): number {
    const sources = new Set<unknown>(Object.values(KIT).map((piece) => piece.source));
    return view.UNSAFE_root.findAll(
        (n: { props: { source?: unknown }; type: unknown }) => typeof n.type !== 'string' && sources.has(n.props.source),
    ).length;
}

function load<T>(fn: () => T): T {
    let out: T | undefined;
    jest.isolateModules(() => { out = fn(); });
    return out as T;
}

const ROW = {
    id: 1, numeral: 'I', status: 'occupied', detail: 'Level 3 · Northern Forest', stamp: 'today',
    action: 'start', actionLabel: 'BEGIN', clearable: true, mostRecent: true,
} as never;

beforeEach(() => { armGameOver(); armDeathReturn(); });
afterEach(() => { clearGameOver(); clearDeathReturn(); mockForceNormal = false; });

describe.each([
    ['their kit looks', false],
    ['normal', true],
])('the new-game and ending screens on %s', (_name, normal) => {
    const expectPieces = (view: ReturnType<typeof render>) => {
        if (normal) expect(kitImages(view)).toBe(0);
        else expect(kitImages(view)).toBeGreaterThan(0);
    };

    it('N-01 and N-02: a save slot row and its BEGIN', () => {
        mockForceNormal = normal;
        const { SaveSlotRow } = load(() => require('@/components/menu/SaveSlotRow'));
        const view = render(<SaveSlotRow row={ROW} onAction={() => undefined} onClear={() => undefined} />);
        expect(view.getByTestId('save-slot-1-action')).toBeTruthy();
        expectPieces(view);
    });

    it('G-01: the death screen button', () => {
        mockForceNormal = normal;
        const Screen = load(() => require('@/app/death-return/index').default);
        const view = render(<Screen />);
        expect(view.getByTestId('death-return-continue')).toBeTruthy();
        expectPieces(view);
    });

    it('G-01: the game over button', () => {
        mockForceNormal = normal;
        const Screen = load(() => require('@/app/game-over/index').default);
        const view = render(<Screen />);
        expect(view.getByTestId('game-over-new-character')).toBeTruthy();
        expectPieces(view);
    });
});
