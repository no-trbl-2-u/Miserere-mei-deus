/**
 * The shared card-upgrade presenter (Phase UP1d, A6): the rows list only
 * cards that can still take an upgrade, and the preview prints the card as
 * it is beside the card after this one upgrade, its numbers bigger.
 */

import { cardLibrary, getCardById, upgradableCardIds, upgradeLimit } from '@mechanics';

import { cardUpgradePreviewVM, cardUpgradeRowsVM } from '../card-upgrade.engine';

/** The library's rare (three upgrades), found by its limit rather than named. */
const RARE = cardLibrary.find((c) => upgradeLimit(c) === 3)!.id;

const DECK = ['grey-strike', 'grey-strike', 'grey-ward', 'grey-word+', `${RARE}+`];

describe('cardUpgradeRowsVM', () => {
    it('one row per upgradable card, with its copies and which upgrade it is', () => {
        const rows = cardUpgradeRowsVM(upgradableCardIds(DECK), DECK);
        expect(rows.map((r) => r.cardId)).toEqual(['grey-strike', 'grey-ward', `${RARE}+`]);
        expect(rows[0]).toMatchObject({ name: getCardById('grey-strike')!.name, count: 2, stepLabel: 'UPGRADE 1 OF 1' });
        // The rare takes three upgrades, and this copy has had one.
        expect(rows[2].stepLabel).toBe('UPGRADE 2 OF 3');
    });

    it('drops an id the library cannot resolve', () => {
        expect(cardUpgradeRowsVM(['no-such-card'], ['no-such-card'])).toEqual([]);
    });
});

describe('cardUpgradePreviewVM', () => {
    it('a grey card: NOW is the card, AFTER is its + copy with different printed numbers', () => {
        const vm = cardUpgradePreviewVM('grey-strike')!;
        expect(vm.before.cardId).toBe('grey-strike');
        expect(vm.after.cardId).toBe('grey-strike+');
        expect(vm.after.name).toBe(getCardById('grey-strike+')!.name);
        expect(vm.after.freeText).not.toBe(vm.before.freeText);
    });

    it('the rare, a Blood Price program card, prints its scaled payoff in the AFTER face', () => {
        const vm = cardUpgradePreviewVM(`${RARE}+`)!;
        expect(vm.after.cardId).toBe(`${RARE}++`);
        const before = [vm.before.outcomeLine, vm.before.freeText, vm.before.paidText].join(' ');
        const after = [vm.after.outcomeLine, vm.after.freeText, vm.after.paidText].join(' ');
        expect(after).not.toBe(before);
    });

    it('is null for a card at its limit, so no AFTER is shown that the commit would refuse', () => {
        expect(cardUpgradePreviewVM('grey-word+')).toBeNull();
        expect(cardUpgradePreviewVM(`${RARE}+++`)).toBeNull();
        expect(cardUpgradePreviewVM('no-such-card')).toBeNull();
    });
});
