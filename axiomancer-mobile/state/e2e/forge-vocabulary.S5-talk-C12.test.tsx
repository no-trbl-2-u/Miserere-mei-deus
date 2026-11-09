/**
 * Hermetic tests — the forge teaches its own words (cluster S5-talk-C12).
 *
 * The smith sold "drawing a miss out true" and "hardening a face into
 * something that pays", then printed `1 BOON · 2 MANA · 3 MISS` per die, two
 * buttons labelled HONE and TEMPER, and a PURSE counted in `s`. Not one of
 * those words is introduced anywhere else in the game.
 *
 * Contract asserted here: the opening speech names the three faces and what
 * each pays; the die list carries a key for the face read; each service offer
 * states the trade it makes; the purse and every offer spell SHILLINGS out
 * (CRITIQUE LOW, the pass-84 village fix's residue); and no control offers to
 * charge a player "diamonds" — the combat board's CONVICTION glyph.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

import BlacksmithScreen from '@/app/blacksmith/index';
import { createAppActions } from '@/state/actions';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

// Hoisted above the imports by babel-plugin-jest-hoist: this screen pops the
// route the moment its slice empties, so the router must be stubbed.
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        replace: jest.fn(),
        push: jest.fn(),
        back: jest.fn(),
        canGoBack: () => true,
    }),
}));

/** A budget that leaves every offer affordable, so nothing greys out. */
const FAT_PURSE = 500;

/** Flatten a `<Text>`'s children into the string a player reads. */
function textOf(node: { props: { children?: unknown } }): string {
    const children = node.props.children;
    return (Array.isArray(children) ? children : [children])
        .map((c) => (typeof c === 'number' ? String(c) : typeof c === 'string' ? c : ''))
        .join('');
}

/** An anvil session at `phase`, rendered. */
function forge(phase: 'intro' | 'forging') {
    const store: AppStore = createAppStore({ adapter: createMemoryAdapter() });
    const actions = createAppActions(store);
    actions.beginBlacksmith({ budget: FAT_PURSE });
    if (phase === 'forging') actions.startBlacksmithForging();
    return render(
        <GameStoreProvider store={store}>
            <BlacksmithScreen />
        </GameStoreProvider>,
    );
}

describe('the smith names the faces he is selling (S5-talk-C12)', () => {
    it('opens by saying what MISS, MANA and BOON each pay', () => {
        const body = textOf(forge('intro').getByTestId('blacksmith-intro-body'));

        expect(body).toContain('MISS');
        expect(body).toContain('MANA');
        expect(body).toContain('BOON');
        expect(body).toContain("fires your weapon's special");
        expect(body).not.toContain('CONVICTION');
    });
});

describe('the forging table decodes its own readouts (S5-talk-C12)', () => {
    it('keys the per-die face read', () => {
        const key = textOf(forge('forging').getByTestId('blacksmith-face-key'));

        expect(key).toContain('MANA');
        expect(key).toContain('BOON');
        expect(key).toContain('MISS');
    });

    it('states the trade HONE and TEMPER each make', () => {
        const r = forge('forging');

        expect(textOf(r.getByTestId('blacksmith-offer-hone:heart-effect')))
            .toBe('MISS face → MANA');
        expect(textOf(r.getByTestId('blacksmith-offer-temper:heart-effect')))
            .toBe('MANA face → BOON');
    });

    it('spells the purse out in SHILLINGS, the unit the prices are in', () => {
        const purse = textOf(forge('forging').getByTestId('blacksmith-budget'));

        expect(purse).toContain('SHILLINGS');
        expect(purse).toContain(`${FAT_PURSE}`);
    });

    it('prints each offer\'s price in SHILLINGS, not a bare `s`', () => {
        const r = forge('forging');

        for (const id of ['hone:heart', 'temper:heart']) {
            const price = textOf(r.getByTestId(`blacksmith-offer-${id}-price`));
            expect(price).toMatch(/^\d+ SHILLINGS$/);
        }
    });

    it('never offers to charge a screen reader in diamonds', () => {
        const label = forge('forging').getByTestId('blacksmith-offer-hone:heart')
            .props.accessibilityLabel as string;

        expect(label).not.toMatch(/diamond/i);
        expect(label).toContain('shillings');
    });
});
