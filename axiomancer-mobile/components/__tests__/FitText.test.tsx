/**
 * FitText: text steps its font down until it fits, and never truncates.
 *
 * Every width fed in here was read off a rendered web export (Chromium, the
 * bundled UncialAntiqua at the nominal size), not estimated from a font table;
 * the sizes expected back are the ones the same export drew, checked there by
 * measuring the name's right edge against the shield. So these fits are pinned
 * to a render, not to a guess the code also makes.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

import { FitText } from '../FitText';
import { enemyNameRoom } from '../combat/encounter/enemy-name-fit';

type Layout = { nativeEvent: { layout: { x: number; y: number; width: number; height: number } } };
const layout = (width: number): Layout => ({ nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } } });

/** Mount FitText, then play the two layout events a render gives it. */
function mountAt(props: Partial<React.ComponentProps<typeof FitText>> & { text: string }, wrapperWidth: number, naturalWidth: number) {
    const utils = render(
        <FitText style={{ fontSize: 99 }} nominal={18} floor={11} testID="fit" {...props} />,
    );
    const drawn = utils.getByTestId('fit');
    fireEvent(utils.getByTestId('fit-probe', { includeHiddenElements: true }), 'layout', layout(naturalWidth));
    fireEvent(drawn, 'layout', layout(wrapperWidth));
    const size = () => StyleSheet.flatten(utils.getByTestId('fit').props.style).fontSize as number;
    return { ...utils, size };
}

describe('FitText', () => {
    it('draws at the nominal size until it has been measured', () => {
        const { getByTestId } = render(<FitText text="The Death Beholder" style={{}} nominal={18} floor={11} testID="fit" />);
        expect(StyleSheet.flatten(getByTestId('fit').props.style).fontSize).toBe(18);
    });

    it('keeps a name that fits at the nominal size ("Float-Eye", 107.9 wide, room 144)', () => {
        const { size } = mountAt({ text: 'Float-Eye', letterSpacing: 0.6, room: enemyNameRoom }, 366, 107.9);
        expect(size()).toBe(18);
    });

    // Foe names beside the VITAE shield, row 366 wide (a 390 phone): room 144.
    // Measured at 18 points; the export drew these sizes and cleared the shield.
    it.each([
        ['The Death Beholder', 213.6, 11.5],
        ['The Tithe-Collector', 212.9, 11.5],
        ['Smokehouse Gutter', 214.7, 11.5],
        ['The Saint Beneath', 199.4, 12.5],
    ])('steps %s (%d wide at 18) down to %d at 390', (text, natural, expected) => {
        const { size } = mountAt({ text, letterSpacing: 0.6, room: enemyNameRoom }, 366, natural);
        expect(size()).toBe(expected);
    });

    // At 360 the row is 336, room 129 (the shield is 62 wide, 8 of air).
    it.each([
        ['The Death Beholder', 213.6, 11],
        ['The Saint Beneath', 199.4, 11],
    ])('never goes under the floor at 360 for %s', (text, natural, expected) => {
        const { size } = mountAt({ text, letterSpacing: 0.6, room: enemyNameRoom }, 336, natural);
        expect(size()).toBe(expected);
    });

    // The relic plate at 390 is 97.6 wide; "Suppliant's" measured 100.03 at 16.
    it('shrinks the relic name until its longest word fits, so it breaks only between words', () => {
        const { size, getByTestId } = mountAt(
            { text: "Suppliant's Ring", fitText: "Suppliant's", numberOfLines: 3, nominal: 16, floor: 10 }, 97.59375, 100.03125,
        );
        expect(size()).toBeLessThan(16);
        expect(size() * (100.03125 / 16)).toBeLessThanOrEqual(97.59375);
        expect(getByTestId('fit').props.children).toBe("Suppliant's Ring");
        // The twin that measures is hidden from screen readers.
        expect(getByTestId('fit-probe', { includeHiddenElements: true }).props['aria-hidden']).toBe(true);
    });

    it('always renders the whole text, never an ellipsis cut', () => {
        const { getByTestId } = mountAt({ text: 'The Death Beholder', letterSpacing: 0.6, room: enemyNameRoom }, 336, 213.6);
        expect(getByTestId('fit').props.children).toBe('The Death Beholder');
    });
});

/**
 * The twin is re-measured, never trusted from before the game's font arrived.
 * `document.fonts` is stubbed (the jest env has none) and put back after each
 * case. A re-measure is a remount of the twin (its key changes), watched
 * directly: the twin host element is a new object after it, the same object
 * when nothing re-keyed it.
 */
describe('FitText re-measures', () => {
    type Listener = () => void;
    const g = globalThis as unknown as { document?: { fonts?: unknown } };
    let hadDocument = false;
    let prevDocument: { fonts?: unknown } | undefined;
    let prevFonts: unknown;
    let listeners: Map<string, Set<Listener>>;
    let resolveReady: () => void;
    let addEventListener: jest.Mock;
    let removeEventListener: jest.Mock;

    beforeEach(() => {
        hadDocument = g.document !== undefined;
        prevDocument = g.document;
        prevFonts = g.document?.fonts;
        listeners = new Map();
        addEventListener = jest.fn((type: string, fn: Listener) => {
            if (!listeners.has(type)) listeners.set(type, new Set());
            listeners.get(type)!.add(fn);
        });
        removeEventListener = jest.fn((type: string, fn: Listener) => {
            listeners.get(type)?.delete(fn);
        });
        const ready = new Promise<void>((resolve) => { resolveReady = resolve; });
        const fonts = { addEventListener, removeEventListener, ready };
        if (g.document) g.document.fonts = fonts;
        else g.document = { fonts };
    });

    afterEach(() => {
        if (!hadDocument) delete g.document;
        else if (prevDocument) prevDocument.fonts = prevFonts;
    });

    const twin = (u: ReturnType<typeof render>) => u.getByTestId('fit-probe', { includeHiddenElements: true });
    const mount = () => {
        const u = render(<FitText text="The Death Beholder" style={{}} nominal={18} floor={11} testID="fit" />);
        // Settle the first width so each case starts from a steady twin.
        fireEvent(u.getByTestId('fit'), 'layout', layout(366));
        return u;
    };

    it('leaves the twin alone when nothing changed', () => {
        const u = mount();
        const before = twin(u);
        fireEvent(u.getByTestId('fit'), 'layout', layout(366));
        expect(twin(u)).toBe(before);
    });

    it('remounts the twin when the fonts finish a load (loadingdone)', () => {
        const u = mount();
        const before = twin(u);
        expect(addEventListener).toHaveBeenCalledWith('loadingdone', expect.any(Function));
        act(() => { listeners.get('loadingdone')!.forEach((fn) => fn()); });
        expect(twin(u)).not.toBe(before);
    });

    it('remounts the twin once document.fonts.ready resolves', async () => {
        const u = mount();
        const before = twin(u);
        await act(async () => { resolveReady(); });
        expect(twin(u)).not.toBe(before);
    });

    it('remounts the twin when the wrapper\'s width changes', () => {
        const u = mount();
        const before = twin(u);
        fireEvent(u.getByTestId('fit'), 'layout', layout(336));
        expect(twin(u)).not.toBe(before);
    });

    it('removes its loadingdone listener on unmount', () => {
        const u = mount();
        const added = addEventListener.mock.calls.find(([type]) => type === 'loadingdone')![1];
        u.unmount();
        expect(removeEventListener).toHaveBeenCalledWith('loadingdone', added);
        expect(listeners.get('loadingdone')!.size).toBe(0);
    });
});
