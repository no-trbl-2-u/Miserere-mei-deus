/**
 * The equipment effect line: one wording per effect kind, read by every
 * surface. Pure presenter tests, no store.
 */

import {
    armorLibrary, weaponLibrary, type EquipmentCondition, type EquipmentEffect, type EquipmentTrigger,
    type SpecialPayloadKind,
} from '@mechanics';

import {
    dieChangeText, equipmentEffectLine, equipmentEffectParts, equipmentFiredText, specialFaceText,
    specialPayloadText,
} from '../equipment-effect-line';

describe('equipmentEffectLine — trigger pieces', () => {
    const cases: Array<[EquipmentTrigger, EquipmentEffect['payoff'], string]> = [
        ['first-card-deal', { kind: 'deal-bonus', amount: 2 }, 'First DEAL +2'],
        ['card-deal', { kind: 'heal', amount: 3 }, 'Each DEAL: HEAL 3'],
        ['first-guard', { kind: 'guard', amount: 2 }, 'First GUARD: GUARD 2'],
        ['sacrifice', { kind: 'guard', amount: 2 }, 'Each SACRIFICE: GUARD 2'],
        ['inferno', { kind: 'conviction', amount: 1 }, 'Each INFERNO: +1 Conviction'],
        ['discard-pay', { kind: 'draw', amount: 1 }, 'Each discard: Draw 1'],
        ['heal', { kind: 'guard', amount: 2 }, 'Each HEAL: GUARD 2'],
        ['sacrifice', { kind: 'deal-bonus', amount: 3 }, 'Each SACRIFICE: next DEAL +3'],
    ];
    it.each(cases)('%s pays %j', (trigger, payoff, line) => {
        expect(equipmentEffectLine({ trigger, payoff } as EquipmentEffect)).toBe(line);
    });
});

describe('equipmentEffectLine — condition pieces', () => {
    const cases: Array<[EquipmentCondition, string]> = [
        ['foe-has-weather', 'DEAL +2 while the foe has weather'],
        ['guard-holds', 'DEAL +2 while GUARD holds'],
        ['foe-above-half', 'DEAL +2 while the foe is above half VITAE'],
    ];
    it.each(cases)('%s', (condition, line) => {
        expect(equipmentEffectLine({ condition, bonus: 2 })).toBe(line);
    });
});

describe('equipmentEffectLine — the dice half', () => {
    const specials: Array<[SpecialPayloadKind, number, string]> = [
        ['conviction', 2, '+2 Conviction'],
        ['deal', 3, 'DEAL 3'],
        ['heal', 4, 'HEAL 4'],
        ['guard', 6, 'GUARD 6'],
        ['inferno', 2, 'INFERNO 2'],
        ['vulnerable', 1, 'VULNERABLE 1 turn'],
        ['vulnerable', 2, 'VULNERABLE 2 turns'],
    ];
    it.each(specials)('a %s special of %i', (kind, amount, text) => {
        expect(specialPayloadText({ kind, amount })).toBe(text);
        expect(equipmentEffectLine({ special: { kind, amount } })).toBe(`Special: ${text}`);
    });

    it('names the die and the change', () => {
        expect(dieChangeText({ color: 'wild', change: 'miss-to-mana' })).toBe('Gold die: +1 hit');
        expect(dieChangeText({ color: 'body', change: 'mana-to-special' })).toBe('Red die: 1 hit becomes special');
        expect(dieChangeText({ color: 'mind', change: 'miss-to-mana' })).toBe('Blue die: +1 hit');
        expect(dieChangeText({ color: 'heart', change: 'miss-to-mana' })).toBe('Purple die: +1 hit');
    });

    it('a piece with both halves says both, trigger first', () => {
        const parts = equipmentEffectParts({
            trigger: 'first-card-deal', payoff: { kind: 'deal-bonus', amount: 2 },
            special: { kind: 'conviction', amount: 2 },
        });
        expect(parts).toEqual(['First DEAL +2', 'Special: +2 Conviction']);
        expect(equipmentEffectLine({
            trigger: 'first-guard', payoff: { kind: 'guard', amount: 2 },
            die: { color: 'wild', change: 'miss-to-mana' },
        })).toBe('First GUARD: GUARD 2 · Gold die: +1 hit');
    });
});

describe('equipmentEffectLine — nothing to say', () => {
    it('is null for no effect and for an empty one', () => {
        expect(equipmentEffectLine(undefined)).toBeNull();
        expect(equipmentEffectLine(null)).toBeNull();
        expect(equipmentEffectLine({})).toBeNull();
        expect(equipmentEffectParts(undefined)).toEqual([]);
    });
});

describe('every library piece says something terse', () => {
    it.each([...weaponLibrary, ...armorLibrary].map((p) => [p.id, p] as const))('%s', (_id, piece) => {
        const line = equipmentEffectLine(piece.effect);
        expect(line).not.toBeNull();
        // Terse: no filler words the doctrine strips.
        expect(line).not.toMatch(/\b(your|you|when|each time)\b/i);
        expect(line!.length).toBeLessThanOrEqual(80);
    });
});

describe('the tray and the log', () => {
    it('the special face names the worn weapon payload, or says it only powers its card', () => {
        expect(specialFaceText({ kind: 'heal', amount: 4 }))
            .toBe("Your weapon's special: HEAL 4 when it powers a card.");
        expect(specialFaceText(undefined)).toBe('No weapon special worn: this face only powers its card.');
    });

    it('a fired piece reads its payload, and says so when it gave nothing', () => {
        expect(equipmentFiredText({ itemName: 'Opening Blade', payoff: 'deal-bonus', amount: 2 }))
            .toBe('Opening Blade: +2 DEAL.');
        expect(equipmentFiredText({ itemName: 'Siphoning Blade', payoff: 'heal', amount: 3 }))
            .toBe('Siphoning Blade: HEAL 3.');
        expect(equipmentFiredText({ itemName: 'Flame Guard', payoff: 'conviction', amount: 1 }))
            .toBe('Flame Guard: +1 Conviction.');
        expect(equipmentFiredText({ itemName: "Scavenger's Coat", payoff: 'draw', amount: 1 }))
            .toBe("Scavenger's Coat: Draw 1.");
        expect(equipmentFiredText({ itemName: 'Bracing Coat', payoff: 'guard', amount: 2 }))
            .toBe('Bracing Coat: GUARD 2.');
        expect(equipmentFiredText({ itemName: 'Siphoning Blade', payoff: 'heal', amount: 0 }))
            .toBe('Siphoning Blade: nothing to give.');
    });
});
