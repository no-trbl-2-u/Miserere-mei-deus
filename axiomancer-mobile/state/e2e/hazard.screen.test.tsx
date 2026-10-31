/**
 * Hermetic E2E Tests — Hazard screen rendering & dispatch.
 *
 * Mounts the real `/hazard` screen against a rigged store and walks
 * the visible phases: route choice (stacked panels with thresholds),
 * dice board with accessibility labels, play-area staging, the PLAY
 * button gate, resolve flash, outcome, and the rewards ledger.
 * Drag gestures are exercised at the unit level by the engine/store
 * suites and end-to-end by the Playwright playthrough
 * (`scripts/hazard-e2e.mjs`); here taps and store-driven state carry
 * the assertions.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, describe, expect, it, jest } from '@jest/globals';

import HazardScreen from '@/app/hazard/index';
import { createAppActions, type AppActions } from '@/state/actions';
import type { AppStore } from '@/state/store';
import { HAZARD_CRACK_CARD } from '@mechanics';
import type { HazardHandEntry } from '@mechanics';
import { withAllProviders } from '@/test-utils/withAllProviders';

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        back: jest.fn(),
        push: jest.fn(),
        canGoBack: () => false,
    }),
}));

afterEach(() => {
    jest.clearAllMocks();
});

function mountHazard(): { store: AppStore; actions: AppActions } {
    const { tree, store } = withAllProviders(<HazardScreen />);
    render(tree);
    const actions = createAppActions(store);
    return { store, actions };
}

function rigHand(store: AppStore, cards: { uid: string; cardId: string }[]): void {
    const s = store.getState().hazard.session;
    if (!s) throw new Error('no session');
    const hand: HazardHandEntry[] = cards.map((c) => ({ ...c, dieId: null }));
    store.setState({ hazard: { session: { ...s, hand, play: [] } } });
}

describe('hazard screen — opening', () => {
    it('opens on the stakes card, and Face it leads on to route select', () => {
        const { actions } = mountHazard();
        act(() => {
            actions.beginHazard({ seed: 7, hazardId: 'cracked-cliff' });
        });
        expect(screen.getByTestId('hazard-stakes')).toBeTruthy();
        expect(screen.queryByTestId('hazard-route-select')).toBeNull();
        fireEvent.press(screen.getByTestId('hazard-stakes-face'));
        expect(screen.queryByTestId('hazard-stakes')).toBeNull();
        expect(screen.getByTestId('hazard-route-select')).toBeTruthy();
        expect(screen.getAllByText('CRACKED CLIFF PATH').length).toBeGreaterThan(0);
    });
});

describe('hazard screen — route select', () => {
    it('renders the reveal: title, scenario, opening hand, both stacked route panels with thresholds', () => {
        const { actions } = mountHazard();
        act(() => {
            actions.beginHazard({ seed: 7, hazardId: 'cracked-cliff' });
        });
        fireEvent.press(screen.getByTestId('hazard-stakes-face'));
        expect(screen.getByTestId('hazard-route-select')).toBeTruthy();
        expect(screen.getAllByText('CRACKED CLIFF PATH').length).toBeGreaterThan(0);
        expect(screen.getByTestId('hazard-opening-hand')).toBeTruthy();
        expect(screen.getByTestId('hazard-route-safe')).toBeTruthy();
        expect(screen.getByTestId('hazard-route-risk')).toBeTruthy();
        expect(screen.getByText('SAFER')).toBeTruthy();
        expect(screen.getByText('BETTER REWARD')).toBeTruthy();
        // per-round threshold ladders render (REC#2 visibility)
        expect(screen.getAllByText(/R[I]+\s?/).length).toBeGreaterThan(0);
    });

    it('pressing a route dispatches the binding choice and rolls the dice overlay', () => {
        const { store, actions } = mountHazard();
        act(() => {
            actions.beginHazard({ seed: 7, hazardId: 'cracked-cliff' });
        });
        fireEvent.press(screen.getByTestId('hazard-stakes-face'));
        fireEvent.press(screen.getByTestId('hazard-route-risk'));
        expect(store.getState().hazard.session?.route).toBe('risk');
        expect(store.getState().hazard.session?.phase).toBe('rolling');
        expect(screen.getByTestId('hazard-dice-roll')).toBeTruthy();
        expect(screen.getByText('CASTING THE DICE')).toBeTruthy();
    });
});

describe('hazard screen — round play board', () => {
    function toPlaying(actions: AppActions, route: 'safe' | 'risk' = 'risk') {
        act(() => {
            actions.beginHazard({ seed: 7, hazardId: 'cracked-cliff' });
            actions.selectHazardRoute(route);
            actions.finishHazardRolling();
        });
    }

    it('renders the board: ledger, meters with BOTH REQUIRED, dice tray, hand, deck counts', () => {
        const { store, actions } = mountHazard();
        toPlaying(actions);
        expect(screen.getByTestId('hazard-board')).toBeTruthy();
        expect(screen.getByTestId('hazard-ledger')).toBeTruthy();
        expect(screen.getByText('BOTH REQUIRED')).toBeTruthy();
        expect(screen.getByText('FORCE')).toBeTruthy();
        expect(screen.getByText('ESCAPE')).toBeTruthy();
        expect(screen.getByTestId('hazard-dice-tray')).toBeTruthy();
        const session = store.getState().hazard.session!;
        expect(session.dice).toHaveLength(4);
        expect(screen.getByTestId('hazard-deck-counts')).toBeTruthy();
        expect(screen.getByTestId('hazard-hand').children.length).toBeGreaterThan(0);
    });

    it('renders the trash bin; discarding through the store removes the card and grants salvage', () => {
        const { store, actions } = mountHazard();
        toPlaying(actions, 'safe');
        expect(screen.getByTestId('hazard-trash')).toBeTruthy();
        expect(screen.getByLabelText(/Trash bin/)).toBeTruthy();
        act(() => {
            rigHand(store, [
                { uid: 'h1', cardId: 'grip' },
                { uid: 'h2', cardId: 'scram' },
            ]);
            actions.discardHazardCard('h1'); // salvage: +1 FORCE this round
        });
        const session = store.getState().hazard.session!;
        expect(session.hand.map((h) => h.uid)).toEqual(['h2']);
        expect(session.discardPile).toContain('grip');
        expect(session.progressBase.force).toBe(1);
        expect(screen.getByText(/DISCARD 1/)).toBeTruthy();
    });

    it('kept hand survives the round boundary and draws back up to 5', () => {
        const { store, actions } = mountHazard();
        toPlaying(actions, 'safe');
        act(() => {
            rigHand(store, [
                { uid: 'keep1', cardId: 'scram' },
                { uid: 'play1', cardId: 'grip' },
            ]);
            actions.stageHazardCard('play1');
            actions.resolveHazardRound();
            actions.continueHazardAfterResolve();
        });
        const session = store.getState().hazard.session!;
        expect(session.round).toBe(2);
        expect(session.hand.map((h) => h.uid)).toContain('keep1');
        expect(session.hand).toHaveLength(5);
    });

    it('safe route renders the single combined PASSAGE meter', () => {
        const { actions } = mountHazard();
        toPlaying(actions, 'safe');
        expect(screen.getByText('PASSAGE — FORCE + ESCAPE')).toBeTruthy();
        expect(screen.queryByText('BOTH REQUIRED')).toBeNull();
    });

    it('dice expose colour-independent accessibility labels; hex dice read blocked', () => {
        const { store, actions } = mountHazard();
        toPlaying(actions);
        act(() => {
            const s = store.getState().hazard.session!;
            store.setState({
                hazard: {
                    session: {
                        ...s,
                        dice: [
                            { id: 'd1', kind: 'red', state: 'available' },
                            { id: 'd2', kind: 'hex', state: 'available' },
                        ],
                    },
                },
            });
        });
        expect(screen.getByLabelText('Red blade die, available')).toBeTruthy();
        expect(screen.getByLabelText('Blocked hex die, blocked')).toBeTruthy();
    });

    it('PLAY arms on staging and auto-applies the set; resolve stamps the round', () => {
        const { store, actions } = mountHazard();
        toPlaying(actions, 'safe');
        act(() => {
            rigHand(store, [{ uid: 'h1', cardId: 'grip' }]);
        });
        expect(screen.getByText('STAGE A CARD')).toBeTruthy();
        fireEvent.press(screen.getByTestId('hazard-play-button'));
        expect(store.getState().hazard.session?.phase).toBe('playing'); // gated — nothing staged

        act(() => {
            actions.stageHazardCard('h1');
        });
        expect(screen.getByTestId('hazard-staged-h1')).toBeTruthy();
        // staged — PLAY arms immediately; no per-card APPLY required
        expect(screen.getByText('RESOLVE')).toBeTruthy();
        fireEvent.press(screen.getByTestId('hazard-play-button'));
        // the un-applied card was auto-committed on resolve
        expect(store.getState().hazard.session?.play.every((p) => p.applied)).toBe(true);
        expect(store.getState().hazard.session?.phase).toBe('resolve-flash');
        expect(screen.getByTestId('hazard-resolve-flash')).toBeTruthy();
        // 1×IRON GRIP (5) < threshold → FALLEN
        expect(screen.getByText('FALLEN')).toBeTruthy();
        // tapping the flash advances to round II with the same dice
        const diceBefore = store.getState().hazard.session!.dice;
        fireEvent.press(screen.getByTestId('hazard-resolve-flash'));
        const session = store.getState().hazard.session!;
        expect(session.round).toBe(2);
        expect(session.dice).toEqual(diceBefore); // no re-cast — doctrine
        expect(screen.getByText('ROUND II / III')).toBeTruthy();
    });
});

describe('hazard screen — outcome and rewards', () => {
    function finishAll(store: AppStore, actions: AppActions, cardId: string | null) {
        act(() => {
            actions.beginHazard({ seed: 9, hazardId: 'cracked-cliff' });
            actions.selectHazardRoute('safe');
            actions.finishHazardRolling();
        });
        for (let round = 0; round < 3; round++) {
            act(() => {
                rigHand(
                    store,
                    cardId
                        ? Array.from({ length: 6 }, (_, i) => ({ uid: `r${round}-${i}`, cardId }))
                        : [{ uid: `r${round}-0`, cardId: HAZARD_CRACK_CARD.id }],
                );
                for (const h of store.getState().hazard.session!.hand.slice()) {
                    actions.stageHazardCard(h.uid);
                }
                actions.resolveHazardRound();
                actions.continueHazardAfterResolve();
            });
        }
    }

    it('perfect run: outcome modal, then rewards ledger with skippable guaranteed-rare offer', () => {
        const { store, actions } = mountHazard();
        finishAll(store, actions, 'grip');
        expect(screen.getByTestId('hazard-outcome')).toBeTruthy();
        expect(screen.getByText('PERFECT')).toBeTruthy();
        fireEvent.press(screen.getByTestId('hazard-outcome-continue'));
        expect(screen.getByTestId('hazard-rewards')).toBeTruthy();
        expect(screen.getByText('SPOILS & SCARS')).toBeTruthy();
        expect(screen.getByText('GUARANTEED RARE · CHOOSE ONE OR SKIP')).toBeTruthy();
        expect(screen.getByTestId('hazard-rewards-skip')).toBeTruthy();
        // tooltips: tapping a boon chip reveals its explainer copy
        fireEvent.press(screen.getByTestId('hazard-reward-shillings'));
        expect(screen.getAllByText(/\+12 shillings/).length).toBeGreaterThan(0);
        // confirm requires a pick when an offer exists
        fireEvent.press(screen.getByTestId('hazard-rewards-confirm'));
        expect(store.getState().hazard.session).not.toBeNull();
        const offer = store.getState().hazard.session!.outcome!.offerCards[0];
        // new flow: tap card opens preview overlay, then confirm in preview
        fireEvent.press(screen.getByTestId(`hazard-offer-${offer.id}`));
        expect(screen.getByTestId('hazard-card-preview')).toBeTruthy();
        fireEvent.press(screen.getByTestId('hazard-preview-confirm'));
        fireEvent.press(screen.getByTestId('hazard-rewards-confirm'));
        expect(store.getState().hazard.session).toBeNull(); // claimed & cleared
    });

    it('failure run: FACE THE COST, consequence chips, no card offer, ONWARD claims', () => {
        const { store, actions } = mountHazard();
        finishAll(store, actions, null);
        expect(screen.getByText('FAILURE')).toBeTruthy();
        fireEvent.press(screen.getByTestId('hazard-outcome-continue'));
        expect(screen.getByText(/CONSEQUENCES — 3 ROUNDS LOST/)).toBeTruthy();
        expect(screen.getByTestId('hazard-consequence-minhp')).toBeTruthy();
        expect(screen.queryByTestId('hazard-rewards-skip')).toBeNull();
        fireEvent.press(screen.getByTestId('hazard-rewards-confirm'));
        expect(store.getState().hazard.session).toBeNull();
    });
});
