/**
 * Hermetic presenter tests — `selectCombatLogHistory`.
 *
 * Every combat beat is a floating token that vanishes in ~1s, so the history
 * is the persistent log. This pins the history selector: it walks the full `state.log`
 * event stream, narrates the raw beats `selectCombatLogLines` deliberately
 * omits (damage, DoT ticks, card plays, threats, turn dividers), and still carries every line that function already produces.
 *
 * Hermetic = self-contained + deterministic + isolated. See docs/testing.md.
 */

import { describe, expect, it } from '@jest/globals';
import type { CombatEncounterState, CombatEvent } from '@mechanics';

import { selectCombatLogHistory } from '@/state/presenters/combat-encounter.engine';

/** `selectCombatLogHistory` only reads `state.log` — a bare literal cast
 *  keeps these hermetic, matching `combat-log-lines.engine.test.ts`'s own
 *  bare-array-of-events convention one level up. */
function stateWith(events: CombatEvent[]): CombatEncounterState {
    return { log: events } as unknown as CombatEncounterState;
}

describe('selectCombatLogHistory — damage-dealt is narrated on both sides', () => {
    it('damage dealt TO the enemy reads as "You deal N" and carries the card name', () => {
        const events: CombatEvent[] = [{ kind: 'damage-dealt', cardId: 'grey-strike', target: 'enemy', amount: 9 }];
        const history = selectCombatLogHistory(stateWith(events));
        expect(history).toHaveLength(1);
        expect(history[0].side).toBe('enemy');
        expect(history[0].text).toContain('You deal 9');
        expect(history[0].text).toContain('A Plain Blow');
    });

    it('damage dealt TO the player reads as "It deals N to you"', () => {
        const events: CombatEvent[] = [{ kind: 'damage-dealt', cardId: 'grey-strike', target: 'self', amount: 4 }];
        const history = selectCombatLogHistory(stateWith(events));
        expect(history).toHaveLength(1);
        expect(history[0].side).toBe('player');
        expect(history[0].text).toContain('It deals 4 to you');
    });
});

describe('selectCombatLogHistory — dot-tick', () => {
    it('a DoT tick names the affliction, the amount, and whose side it hit', () => {
        const events: CombatEvent[] = [{ kind: 'dot-tick', effectId: 'debuff_poison', label: 'POISON', amount: 3, target: 'enemy' }];
        const [line] = selectCombatLogHistory(stateWith(events));
        expect(line.side).toBe('enemy');
        expect(line.text).toContain('POISON');
        expect(line.text).toContain('3');
    });
});

describe('selectCombatLogHistory — card-played: FREE vs die-powered', () => {
    it('dieId === null reads as FREE', () => {
        const events: CombatEvent[] = [{ kind: 'card-played', cardId: 'grey-strike', useBottom: false, dieId: null }];
        const [line] = selectCombatLogHistory(stateWith(events));
        expect(line.text).toContain('A Plain Blow');
        expect(line.text).toContain('FREE');
        expect(line.text).not.toContain('die-powered');
    });

    it('a real dieId reads as die-powered', () => {
        const events: CombatEvent[] = [{ kind: 'card-played', cardId: 'grey-strike', useBottom: true, dieId: 'die-0' }];
        const [line] = selectCombatLogHistory(stateWith(events));
        expect(line.text).toContain('die-powered');
    });
});

describe('selectCombatLogHistory — turn dividers', () => {
    it('emits one TURN N divider per distinct turn, not per event', () => {
        const dice = [{ id: 'die-0', color: 'body' as const, state: 'available' as const, temporary: false }];
        const events: CombatEvent[] = [
            { kind: 'turn-dice-rolled', turn: 1, dice },
            { kind: 'turn-dice-rolled', turn: 1, dice },
            { kind: 'turn-dice-rolled', turn: 2, dice },
        ];
        const history = selectCombatLogHistory(stateWith(events));
        const dividers = history.filter((l) => l.side === 'system' && /^TURN \d+$/.test(l.text));
        expect(dividers.map((d) => d.text)).toEqual(['TURN 1', 'TURN 2']);
    });

    it('the dice-tray summary names each die\'s stance and face', () => {
        const dice = [
            { id: 'die-0', color: 'body' as const, state: 'available' as const, temporary: false, face: 'special' as const },
            { id: 'die-1', color: 'mind' as const, state: 'available' as const, temporary: false, face: 'mana' as const },
        ];
        const events: CombatEvent[] = [{ kind: 'turn-dice-rolled', turn: 3, dice }];
        const history = selectCombatLogHistory(stateWith(events));
        const summary = history.find((l) => l.text.startsWith('Turn 3. Dice:'));
        expect(summary?.text).toContain('BODY special');
        expect(summary?.text).toContain('MIND mana');
    });
});

describe('selectCombatLogHistory — caps at the most recent 200 entries', () => {
    it('a longer event stream is trimmed to the last 200, oldest first dropped', () => {
        const events: CombatEvent[] = Array.from({ length: 250 }, (_, i) => (
            { kind: 'damage-dealt', cardId: 'grey-strike', target: 'enemy', amount: i } as CombatEvent
        ));
        const history = selectCombatLogHistory(stateWith(events));
        expect(history).toHaveLength(200);
        // The first 50 (amount 0..49) were dropped; the surviving oldest line
        // is the 51st event (amount 50).
        expect(history[0].text).toContain('You deal 50');
        expect(history[history.length - 1].text).toContain('You deal 249');
    });
});

describe('selectCombatLogHistory — carries every line selectCombatLogLines already produces', () => {
    it('an enemy-healed ledger line appears in the history untouched', () => {
        const events: CombatEvent[] = [{ kind: 'enemy-healed', enemyId: 'e', source: 'STAGE', amount: 13 }];
        const [line] = selectCombatLogHistory(stateWith(events));
        expect(line.side).toBe('enemy');
        expect(line.text).toContain('STAGE');
        expect(line.text).toContain('VITAE +13');
    });

    it('a stage-entered line still carries its ‡ banner', () => {
        const events: CombatEvent[] = [{ kind: 'stage-entered', enemyId: 'e', name: 'The Green Jelly', text: 'She rises anew.' }];
        const [line] = selectCombatLogHistory(stateWith(events));
        expect(line.text).toContain('THE GREEN JELLY');
        expect(line.text).toContain('She rises anew.');
    });
});

describe('selectCombatLogHistory — a denied phase', () => {
    it('reads as a clean DENIED', () => {
        const events: CombatEvent[] = [{ kind: 'phase-resolved', phaseIndex: 2, mark: 'clear' }];
        const [line] = selectCombatLogHistory(stateWith(events));
        expect(line.text).toBe('PHASE 2 — DENIED.');
    });
});
