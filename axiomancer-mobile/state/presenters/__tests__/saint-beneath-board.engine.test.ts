/**
 * The first boss-tier foe on `phases`, on the board: the Saint Beneath at the
 * chapter door reads as a boss with no deck behind it, its reveal lists three
 * DANGERs unseen, and its intent shows a kind and a name with no number.
 */

import { describe, expect, it } from '@jest/globals';
import { rollEncounterDice, type CombatEncounterState } from '@mechanics';

import { buildCombatViewModel, NO_DANGERS_SEEN, revealDangers, UNSEEN_DANGER_LINE } from '../combat-encounter.engine';
import { REAL_BOSS_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';

const DECK = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike', 'grey-ward'];

function door(): CombatEncounterState {
    return rollEncounterDice(startRealFight(REAL_BOSS_FIGHT_FIXTURE, { deck: DECK, seed: 3 }).combat).state;
}

describe('the Saint Beneath at the door', () => {
    it('is a boss pane with three unnamed DANGERs and no stages', () => {
        const s = door();
        const vm = buildCombatViewModel(s);
        expect(vm.enemy.name).toBe('The Saint Beneath');
        expect(vm.enemy.isBoss).toBe(true);
        expect(vm.enemy.dangers?.map((d) => [d.phase, d.name])).toEqual([[2, null], [3, null], [4, null]]);
        expect(s.enemy.stages).toEqual([]);
    });

    it('reveals one unseen line per DANGER, then the move once seen', () => {
        const s = door();
        expect(revealDangers(s, NO_DANGERS_SEEN)?.map((d) => d.line)).toEqual([UNSEEN_DANGER_LINE, UNSEEN_DANGER_LINE, UNSEEN_DANGER_LINE]);
        const seen = revealDangers(s, new Set(['Pull Under']))!;
        expect(seen[2]!.line).toBe('Pull Under: 16 damage. If you are under half VITAE: 24 damage, and it MENDs 12.');
        expect(seen[0]!.line).toBe(UNSEEN_DANGER_LINE);
    });

    it('telegraphs Communion as an attack with no number', () => {
        const intent = buildCombatViewModel(door()).enemy.intent;
        expect([intent.type, intent.moveName]).toEqual(['attack', 'Communion']);
        expect(intent.damage).toBe(0);
    });
});
