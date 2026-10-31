/**
 * Hermetic component tests — CombatFriendshipPanel.
 *
 * Pins the render contract for the parley aftermath panel. Sibling of the victory-panel tests; the contract is
 * the same shape but tuned to the rust accent palette + the pixel
 * emblem centerpiece + the optional journal-entry section.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { CombatFriendshipPanel } from '@/components/event/aftermath/CombatFriendshipPanel';
import type { AftermathParleyViewModel } from '@/state/presenters/aftermath.engine';

const BASE_VM: AftermathParleyViewModel = {
    kind: 'parley',
    enemyName: 'THE LARCH-STALKER',
    enemyEpithet: 'cold-of-tooth',
    pactPhrase: 'it set down the bell, slow.',
    rewards: { currency: null, loot: [] },
    journalEntry: null,
};

describe('CombatFriendshipPanel: render contract', () => {
    it('mounts the panel root + the pixel emblem (the lone carve-out)', () => {
        const tree = render(<CombatFriendshipPanel vm={BASE_VM} onContinue={() => {}} />);
        expect(tree.queryByTestId('combat-friendship-panel')).not.toBeNull();
        // The PixelEmblem mounts with its own testID; the panel
        // doesn't expose a separate one for it.
        expect(tree.queryByTestId('pixel-emblem')).not.toBeNull();
    });

    it('renders the enemy name + italic epithet', () => {
        const tree = render(<CombatFriendshipPanel vm={BASE_VM} onContinue={() => {}} />);
        expect(tree.queryByTestId('combat-friendship-panel-enemy-name')?.props.children).toBe(
            'THE LARCH-STALKER',
        );
        const epithet = tree.queryByTestId('combat-friendship-panel-enemy-epithet');
        expect(epithet).not.toBeNull();
        expect(JSON.stringify(epithet?.props.children)).toContain('cold-of-tooth');
    });

    it('collapses the epithet line when enemyEpithet is null', () => {
        const tree = render(
            <CombatFriendshipPanel
                vm={{ ...BASE_VM, enemyEpithet: null }}
                onContinue={() => {}}
            />,
        );
        expect(tree.queryByTestId('combat-friendship-panel-enemy-epithet')).toBeNull();
    });

    it('renders the pact phrase verbatim (with quote marks)', () => {
        const tree = render(<CombatFriendshipPanel vm={BASE_VM} onContinue={() => {}} />);
        const phrase = tree.queryByTestId('combat-friendship-panel-pact-phrase');
        expect(phrase).not.toBeNull();
        expect(JSON.stringify(phrase?.props.children)).toContain('set down the bell');
    });

    it('renders the AN ACCORD label below the emblem', () => {
        const tree = render(<CombatFriendshipPanel vm={BASE_VM} onContinue={() => {}} />);
        expect(tree.queryByText('❦ AN ACCORD')).not.toBeNull();
    });

    it('shows no XP line and reads "+6 shillings" when the befriend paid shillings', () => {
        const tree = render(
            <CombatFriendshipPanel
                vm={{ ...BASE_VM, rewards: { currency: { shillings: 6 }, loot: [] } }}
                onContinue={() => {}}
            />,
        );
        expect(tree.queryByText('EXPERIENCE')).toBeNull();
        expect(tree.getByTestId('combat-friendship-panel-reward').props.children).toBe('+6 shillings');
    });

    it('reads the potion name when the befriend paid a potion', () => {
        const tree = render(
            <CombatFriendshipPanel
                vm={{
                    ...BASE_VM,
                    rewards: {
                        currency: null,
                        loot: [{ name: 'Minor Healing Potion', slot: 'consumable', rarity: 'common' }],
                    },
                }}
                onContinue={() => {}}
            />,
        );
        expect(tree.queryByText('EXPERIENCE')).toBeNull();
        expect(tree.getByTestId('combat-friendship-panel-reward').props.children).toBe('Minor Healing Potion');
    });

    it('collapses the journal entry section when journalEntry is null', () => {
        const tree = render(<CombatFriendshipPanel vm={BASE_VM} onContinue={() => {}} />);
        expect(tree.queryByTestId('combat-friendship-panel-journal-entry')).toBeNull();
    });

    it('renders the journal entry block when populated', () => {
        const tree = render(
            <CombatFriendshipPanel
                vm={{
                    ...BASE_VM,
                    journalEntry: {
                        bookName: 'THE CODEX OF KEPT WORDS',
                        entryTitle: 'On the Iron-Tongued',
                        preview: 'It does not eat. It does not speak the river-name.',
                    },
                }}
                onContinue={() => {}}
            />,
        );
        expect(tree.queryByTestId('combat-friendship-panel-journal-entry')).not.toBeNull();
        expect(tree.queryByText('THE CODEX OF KEPT WORDS')).not.toBeNull();
        expect(tree.queryByText('On the Iron-Tongued')).not.toBeNull();
    });
});

describe('CombatFriendshipPanel: PART AS FRIENDS button', () => {
    it('exposes the button by testID', () => {
        const tree = render(<CombatFriendshipPanel vm={BASE_VM} onContinue={() => {}} />);
        expect(tree.queryByTestId('combat-friendship-panel-part-as-friends')).not.toBeNull();
    });

    it('fires onContinue exactly once on press', () => {
        const onContinue = jest.fn();
        const tree = render(<CombatFriendshipPanel vm={BASE_VM} onContinue={onContinue} />);
        fireEvent.press(tree.getByTestId('combat-friendship-panel-part-as-friends'));
        expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('renders the PART AS FRIENDS label', () => {
        const tree = render(<CombatFriendshipPanel vm={BASE_VM} onContinue={() => {}} />);
        expect(tree.queryByText('❦ PART AS FRIENDS')).not.toBeNull();
    });
});
