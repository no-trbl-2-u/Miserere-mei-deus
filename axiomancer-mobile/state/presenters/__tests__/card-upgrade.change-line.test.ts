/**
 * The string of beads (spec 127, UP1i, A13): under the new card, the change
 * alone ('LEECH 4 → 5'), read off the faces the presenter already builds, so
 * the line cannot disagree with the card the player will draw.
 */

import { getCardById } from '@mechanics';

import { cardUpgradeLineChange, cardUpgradePreviewVM, cardUpgradeRowsVM } from '../card-upgrade.engine';

describe('cardUpgradeLineChange', () => {
    it('a one-number upgrade names the keyword and both numbers', () => {
        expect(cardUpgradeLineChange('LEECH 4', 'LEECH 5')).toEqual({ text: 'LEECH 4 → 5', changedNumbers: [0] });
    });

    it('a two-number upgrade joins its changes with a middle dot', () => {
        expect(cardUpgradeLineChange('DEAL 4, LEECH 2', 'DEAL 6, LEECH 3')).toEqual({
            text: 'DEAL 4 → 6 · LEECH 2 → 3',
            changedNumbers: [0, 1],
        });
    });

    it('an unchanged number is left out, and the changed one is counted among every run of digits', () => {
        expect(cardUpgradeLineChange('SACRIFICE 4, DEAL 16', 'SACRIFICE 4, DEAL 22')).toEqual({
            text: 'DEAL 16 → 22',
            changedNumbers: [1],
        });
        expect(cardUpgradeLineChange('VULNERABLE 25% for 2 turns', 'VULNERABLE 26% for 2 turns').text)
            .toBe('VULNERABLE 25% → 26%');
    });

    it('both numbers of an either-or clause read as one change', () => {
        expect(cardUpgradeLineChange('DEAL 6 or 14 at half your VITAE', 'DEAL 8 or 20 at half your VITAE').text)
            .toBe('DEAL 6 → 8 or 14 → 20');
    });

    it('when only the second number of an either-or moves, the keyword still names it', () => {
        expect(cardUpgradeLineChange('DEAL 6 or 14 at half your VITAE', 'DEAL 6 or 20 at half your VITAE')).toEqual({
            text: 'DEAL 14 → 20',
            changedNumbers: [1],
        });
    });

    it('a leading multiplier (how a FREE rider prints its intensity) is a number too', () => {
        expect(cardUpgradeLineChange('BLEED ×2', 'BLEED ×3')).toEqual({ text: 'BLEED ×2 → ×3', changedNumbers: [0] });
        expect(cardUpgradeLineChange('×2 your next SACRIFICE', '×3 your next SACRIFICE').text).toBe('×2 → ×3');
    });

    it('a number the upgrade adds is named by its clause keyword', () => {
        expect(cardUpgradeLineChange('When you SACRIFICE X: DEAL X', 'When you SACRIFICE X: DEAL X +2')).toEqual({
            text: 'DEAL +2',
            changedNumbers: [0],
        });
    });

    it('no line when no number moved', () => {
        expect(cardUpgradeLineChange('DRAW 2', 'DRAW 2')).toEqual({ text: null, changedNumbers: [] });
        expect(cardUpgradeLineChange('GUARD = your THORNS', 'GUARD = your THORNS, DRAW 1').text).toBe('DRAW 1');
        expect(cardUpgradeLineChange(null, 'DEAL 2')).toEqual({ text: null, changedNumbers: [] });
    });
});

describe('cardUpgradePreviewVM carries the pair and the change', () => {
    it('the change line reads the numbers off the two faces it hands the screen', () => {
        const vm = cardUpgradePreviewVM('grey-strike')!;
        expect(vm.beforeCard.cardId).toBe('grey-strike');
        expect(vm.afterCard.cardId).toBe('grey-strike+');
        expect(vm.afterCard.name).toBe(getCardById('grey-strike+')!.name);
        const was = vm.beforeCard.face.paidLine.match(/\d+/)![0];
        const now = vm.afterCard.face.paidLine.match(/\d+/)![0];
        expect(was).not.toBe(now);
        expect(vm.changeLine).toBe(`DEAL ${was} → ${now}`);
        expect(vm.changed.paid).toEqual([0]);
    });

    it('a row carries its bead ring, the card colour of its face', () => {
        const [row] = cardUpgradeRowsVM(['grey-strike'], ['grey-strike']);
        expect(row.ringColor).toBe(cardUpgradePreviewVM('grey-strike')!.beforeCard.stanceColor);
        expect(row.ringColor).not.toBe('');
    });
});
