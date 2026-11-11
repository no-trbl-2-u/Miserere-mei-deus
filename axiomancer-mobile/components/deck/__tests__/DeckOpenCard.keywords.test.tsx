/**
 * Keywords in the open card's own text: tapped for the gloss, held to pin it.
 */

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { createNewGameState, type Character } from '@mechanics';
import { DeckOpenCard } from '@/components/deck/DeckOpenCard';
import { selectDeckViewModel, type DeckCardVM } from '@/state/presenters/deck.engine';
import { withAllProviders } from '@/test-utils/withAllProviders';

function card(): DeckCardVM {
    return {
        cardId: 'x',
        name: 'Test card',
        art: 1,
        lines: [
            {
                label: '◇ No die',
                runs: [
                    { kind: 'label', text: '◇ No die' },
                    { kind: 'text', text: ' · ' },
                    { kind: 'text', text: 'Gain ' },
                    { kind: 'keyword', word: 'GUARD', keyword: 'Guard', gloss: 'Soaks damage.', minor: false },
                    { kind: 'text', text: ' and ' },
                    { kind: 'keyword', word: 'BOON', keyword: 'Boon', gloss: 'A die face.', minor: true },
                ],
            },
        ],
        stacksText: null,
        a11yLabel: 'Test card',
    } as unknown as DeckCardVM;
}

function mount() {
    const { tree } = withAllProviders(<DeckOpenCard card={card()} />);
    return render(tree);
}

describe('DeckOpenCard keywords', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        // Host views have no layout under jest: answer every measure.
        (View.prototype as unknown as { measureInWindow: unknown }).measureInWindow = (
            cb: (x: number, y: number, w: number, h: number) => void,
        ) => cb(40, 300, 60, 20);
    });
    afterEach(() => {
        jest.useRealTimers();
    });

    it('carries the word as label and the gloss as hint', () => {
        mount();
        const guard = screen.getByTestId('deck-keyword-Guard');
        expect(guard.props.accessibilityLabel).toBe('GUARD');
        expect(guard.props.accessibilityHint).toBe('Soaks damage.');
        expect(screen.getByTestId('deck-keyword-Boon').props.accessibilityHint).toContain('minor');
    });

    it('draws the label and the effect in one Text, with no band under the name', () => {
        mount();
        const line = screen.getByTestId('deck-open-card-line-0');
        // One Text child in the line: the label is a run of it, not its own row.
        expect(React.Children.count(line.props.children)).toBe(1);
        expect(screen.getByText('◇ No die')).toBeTruthy();
        expect(screen.getByTestId('deck-keyword-Guard').props.children).toBe('GUARD');
        expect(screen.getByTestId('deck-open-card-art')).toBeTruthy();
        expect(screen.queryByTestId('deck-open-card-scrim')).toBeNull();
        const name = StyleSheet.flatten(screen.getByTestId('deck-open-card-name').props.style) as Record<string, unknown>;
        expect(name.textShadowColor).toBeTruthy();
        expect(name.textShadowRadius).toBeGreaterThan(0);
    });

    it('a tap shows the gloss and it times out', () => {
        mount();
        fireEvent.press(screen.getByTestId('deck-keyword-Guard'));
        expect(screen.getByTestId('tap-tooltip-title').children[0]).toBe('GUARD');
        act(() => {
            jest.advanceTimersByTime(6100);
        });
        expect(screen.queryByTestId('tap-tooltip')).toBeNull();
    });

    it('a hold pins the gloss past the timer; the next press replaces it', () => {
        mount();
        fireEvent(screen.getByTestId('deck-keyword-Guard'), 'longPress');
        expect(screen.getByTestId('tap-tooltip-title').children[0]).toBe('GUARD');
        act(() => {
            jest.advanceTimersByTime(20000);
        });
        expect(screen.queryByTestId('tap-tooltip')).not.toBeNull();

        fireEvent.press(screen.getByTestId('deck-keyword-Boon'));
        expect(screen.getByTestId('tap-tooltip-title').children[0]).toBe('BOON');
        act(() => {
            jest.advanceTimersByTime(6100);
        });
        expect(screen.queryByTestId('tap-tooltip')).toBeNull();
    });

    it('a hold on a word whose timed gloss is already up pins it instead of closing it', () => {
        mount();
        fireEvent.press(screen.getByTestId('deck-keyword-Guard'));
        fireEvent(screen.getByTestId('deck-keyword-Guard'), 'longPress');
        act(() => {
            jest.advanceTimersByTime(20000);
        });
        expect(screen.queryByTestId('tap-tooltip')).not.toBeNull();
        // A pinned gloss is closed by pressing the same word again.
        fireEvent.press(screen.getByTestId('deck-keyword-Guard'));
        expect(screen.queryByTestId('tap-tooltip')).toBeNull();
    });

    it('a pinned gloss is tapped away by the backdrop', () => {
        mount();
        fireEvent(screen.getByTestId('deck-keyword-Guard'), 'longPress');
        fireEvent.press(screen.getByTestId('tap-tooltip-backdrop'));
        expect(screen.queryByTestId('tap-tooltip')).toBeNull();
    });
});

describe('DeckOpenCard keyword case on a real card', () => {
    it('Word prints VULNERABLE in capitals in both play lines, and each is pressable', () => {
        const player = createNewGameState().player as Character;
        const run = { player: { ...player, knownCards: ['grey-word'], combatRewardCards: [] }, flags: [] } as never;
        const word = selectDeckViewModel(run).groups.flatMap((g) => g.cards).find((c) => c.cardId === 'grey-word')!;
        const { tree } = withAllProviders(<DeckOpenCard card={word} />);
        render(tree);
        const nodes = screen.getAllByTestId('deck-keyword-Vulnerable');
        expect(nodes.length).toBe(2);
        for (const n of nodes) {
            expect(n.props.children).toBe('VULNERABLE');
            expect(n.props.onPress).toBeDefined();
        }
    });
});
