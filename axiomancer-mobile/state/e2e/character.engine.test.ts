/**
 * Hermetic E2E Tests — Character screen presenter
 *
 * Drives `selectCharacterViewModel` end-to-end with real engine reads.
 * Every test is self-contained and deterministic (no network, no RNG,
 * no real timers). See docs/testing.md for the full standard.
 */

import { afterEach, describe, it, expect, jest } from '@jest/globals';
import {
    createGameStore,
    createCharacter,
    experienceForLevel,
    createNewGameState,
    applyEffect,
    effectsLibrary,
    type Effect,
} from '@mechanics';

import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import {
    selectCharacterViewModel,
    type CharacterViewModel,
} from '@/state/presenters/character.engine';

afterEach(() => {
    jest.restoreAllMocks();
});

/** The effects library carries no buffs, so the buff mapping runs on a test-local buff registered into the live
 *  registry (jest isolates files). */
const TEST_BUFF: Effect = {
    id: 'fixture_test_buff', name: 'Test Buff', description: 'Test fixture: no payload.',
    type: 'buff', category: 'stat', duration: 3, stacking: 'none', tier: 1, payload: {},
};
effectsLibrary.registry.set(TEST_BUFF.id, TEST_BUFF);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStore(playerOverrides: Partial<ReturnType<typeof createCharacter>> = {}) {
    const base = createCharacter({ name: 'Test Hero', level: 1, baseStats: { heart: 1, body: 1, mind: 1 } });
    const player = { ...base, ...playerOverrides };
    return createGameStore(createMemoryAdapter(), { player });
}

// ---------------------------------------------------------------------------
// Shape contract — every field present, of the documented type
// ---------------------------------------------------------------------------

describe('selectCharacterViewModel: shape contract', () => {
    it('returns a totally-shaped CharacterViewModel for a fresh game', () => {
        const store = createGameStore(createMemoryAdapter());

        const vm: CharacterViewModel = selectCharacterViewModel(store.getState());

        expect(typeof vm.displayName).toBe('string');
        expect(typeof vm.subtitle).toBe('string');
        expect(typeof vm.level).toBe('number');
        expect(typeof vm.xp).toBe('number');
        expect(typeof vm.xpMax).toBe('number');
        expect(typeof vm.pendingPoints).toBe('number');
        expect(Array.isArray(vm.base)).toBe(true);
        expect(Array.isArray(vm.effects)).toBe(true);
        expect(Array.isArray(vm.equipment)).toBe(true);
        expect(Array.isArray(vm.cards)).toBe(true);
        // The sheet carries no GRACE meter and no alignment grid.
        expect(vm).not.toHaveProperty('morale');
        expect(vm).not.toHaveProperty('alignment');
        expect(vm).not.toHaveProperty('graceCopy');
    });

    it('threads availableStatPoints onto vm.pendingPoints (Phase 73)', () => {
        const store = createGameStore(createMemoryAdapter());
        // Fresh game starts with availableStatPoints === 0 (no
        // pending levelup at boot). The mobile-side VM reads the
        // engine field with a `?? 0` fallback so older saves with
        // an absent field still resolve.
        const vm = selectCharacterViewModel(store.getState());
        expect(vm.pendingPoints).toBe(0);
    });

    describe('levelUpReady (Phase 73 follow-up — user-jot 2026-05-24)', () => {
        it('is false on a fresh game (xp 0 < threshold)', () => {
            const store = createGameStore(createMemoryAdapter());
            const vm = selectCharacterViewModel(store.getState());
            expect(vm.levelUpReady).toBe(false);
        });

        it('flips true the moment xp crosses experienceToNextLevel', () => {
            const store = createGameStore(createMemoryAdapter());
            const p = store.getState().player;
            store.setState({
                player: {
                    ...p,
                    experience: p.experienceToNextLevel,
                },
            });
            const vm = selectCharacterViewModel(store.getState());
            expect(vm.levelUpReady).toBe(true);
        });

        it('stays true when xp overshoots the threshold', () => {
            const store = createGameStore(createMemoryAdapter());
            const p = store.getState().player;
            store.setState({
                player: {
                    ...p,
                    experience: p.experienceToNextLevel + 50,
                },
            });
            const vm = selectCharacterViewModel(store.getState());
            expect(vm.levelUpReady).toBe(true);
        });

        it('flips back to false after the engine levelUp drains the XP', () => {
            const store = createGameStore(createMemoryAdapter());
            const p = store.getState().player;
            store.setState({
                player: { ...p, experience: p.experienceToNextLevel },
            });
            expect(selectCharacterViewModel(store.getState()).levelUpReady).toBe(true);
            // Drain via engine levelUp — applyLevelUps lifts xp under
            // the new threshold (or to 0 when xp exactly hit the
            // boundary).
            store.getState().levelUp();
            expect(selectCharacterViewModel(store.getState()).levelUpReady).toBe(false);
            // And the player picked up stat points.
            expect(selectCharacterViewModel(store.getState()).pendingPoints).toBeGreaterThan(0);
        });
    });

    it('exposes the three base stat rows keyed by stance', () => {
        const store = createGameStore(createMemoryAdapter());

        const vm = selectCharacterViewModel(store.getState());

        const stances = vm.base.map((r) => r.stanceKey).sort();
        expect(stances).toEqual(['body', 'heart', 'mind']);
        for (const row of vm.base) {
            expect(typeof row.label).toBe('string');
            expect(typeof row.value).toBe('number');
        }
    });

    it('exposes five equipment slot rows in display order', () => {
        const store = createGameStore(createMemoryAdapter());

        const vm = selectCharacterViewModel(store.getState());

        // The slot model is Weapon, Armor, and three interchangeable
        // relic positions. 'Trinket' (not 'Accessory')
        // aligns the SELF tab with the inventory dock's TRINKET chrome.
        expect(vm.equipment).toHaveLength(5);
        const names = vm.equipment.map((s) => s.name);
        expect(names).toEqual(['Weapon', 'Armor', 'Trinket', 'Trinket', 'Trinket']);
        // The three relic rows carry their 0-2 position index.
        const relics = vm.equipment.filter((s) => s.slotKey === 'relic');
        expect(relics.map((s) => s.relicIndex)).toEqual([0, 1, 2]);
    });
});

// ---------------------------------------------------------------------------
// Happy path — engine values reflected in VM
// ---------------------------------------------------------------------------

describe('selectCharacterViewModel: happy path', () => {
    it('reflects player name as displayName', () => {
        const store = makeStore({ name: 'Iron Pilgrim' });

        const vm = selectCharacterViewModel(store.getState());

        expect(vm.displayName).toBe('Iron Pilgrim');
    });

    it('reflects player level', () => {
        const base = createCharacter({ name: 'Hero', level: 5, baseStats: { heart: 5, body: 5, mind: 5 } });
        const store = createGameStore(createMemoryAdapter(), { player: base });

        const vm = selectCharacterViewModel(store.getState());

        expect(vm.level).toBe(5);
    });

    it('reflects experience and experienceToNextLevel as xp/xpMax', () => {
        const store = createGameStore(createMemoryAdapter());

        const vm = selectCharacterViewModel(store.getState());

        // Fresh character starts at 0 XP; next level threshold is EXPERIENCE_PER_LEVEL * level.
        expect(vm.xp).toBe(0);
        expect(vm.xpMax).toBeGreaterThan(0);
    });

    it('derives base stat values from player.baseStats', () => {
        const base = createCharacter({ name: 'Hero', level: 1, baseStats: { heart: 4, body: 8, mind: 6 } });
        const store = createGameStore(createMemoryAdapter(), { player: base });

        const vm = selectCharacterViewModel(store.getState());

        const heartRow = vm.base.find((r) => r.stanceKey === 'heart')!;
        const bodyRow  = vm.base.find((r) => r.stanceKey === 'body')!;
        const mindRow  = vm.base.find((r) => r.stanceKey === 'mind')!;
        expect(heartRow.value).toBe(4);
        expect(bodyRow.value).toBe(8);
        expect(mindRow.value).toBe(6);
    });
});

// ---------------------------------------------------------------------------
// Boundary conditions
// ---------------------------------------------------------------------------

describe('selectCharacterViewModel: boundary conditions', () => {
    it('0 XP fresh character: xp = 0, xpMax > 0', () => {
        const store = createGameStore(createMemoryAdapter());

        const vm = selectCharacterViewModel(store.getState());

        expect(vm.xp).toBe(0);
        expect(vm.xpMax).toBeGreaterThan(0);
    });

    it('xp is always in [0, xpMax]', () => {
        const store = createGameStore(createMemoryAdapter());

        const vm = selectCharacterViewModel(store.getState());

        expect(vm.xp).toBeGreaterThanOrEqual(0);
        expect(vm.xp).toBeLessThanOrEqual(vm.xpMax);
    });

    it('character with no effects: effects array is empty', () => {
        const store = createGameStore(createMemoryAdapter());

        const vm = selectCharacterViewModel(store.getState());

        expect(vm.effects).toHaveLength(0);
    });

    it('character with no inventory: all equipment slots are null', () => {
        // Use the relic-free fixture player so the worn window is genuinely
        // empty.
        const store = makeStore();

        const vm = selectCharacterViewModel(store.getState());

        for (const slot of vm.equipment) {
            expect(slot.item).toBeNull();
        }
    });
});

// ---------------------------------------------------------------------------
// Effects — mapping from engine ActiveEffect to CharacterEffectRow
// ---------------------------------------------------------------------------

describe('selectCharacterViewModel: effects', () => {
    it('maps a buff effect to kind="buff" and tint="buff"', () => {
        const buff = TEST_BUFF;
        const base = createCharacter({ name: 'Hero', level: 1, baseStats: { heart: 1, body: 1, mind: 1 } });
        const { activeEffects } = applyEffect(base.effects, buff, 1);
        const player = { ...base, effects: activeEffects };
        const store = createGameStore(createMemoryAdapter(), { player });

        const vm = selectCharacterViewModel(store.getState());

        expect(vm.effects).toHaveLength(1);
        expect(vm.effects[0].kind).toBe('buff');
        expect(vm.effects[0].tint).toBe('buff');
        expect(vm.effects[0].name).toBe(buff.name);
        expect(typeof vm.effects[0].description).toBe('string');
    });

    it('threads the engine effectId onto vm.effects[i].effectId (Phase 74 walkthrough Tick 1)', () => {
        // The SELF tooltip wrapper needs the engine id to look up
        // the kind:'effect' tooltip content. Pin the threading.
        const buff = TEST_BUFF;
        const base = createCharacter({ name: 'Hero', level: 1, baseStats: { heart: 1, body: 1, mind: 1 } });
        const { activeEffects } = applyEffect(base.effects, buff, 1);
        const player = { ...base, effects: activeEffects };
        const store = createGameStore(createMemoryAdapter(), { player });

        const vm = selectCharacterViewModel(store.getState());
        expect(vm.effects[0].effectId).toBe(buff.id);
    });

    it('maps a debuff effect to kind="debuff" and tint="debuff"', () => {
        const debuff = effectsLibrary.debuffs[0];
        const base = createCharacter({ name: 'Hero', level: 1, baseStats: { heart: 1, body: 1, mind: 1 } });
        const { activeEffects } = applyEffect(base.effects, debuff, 1);
        const player = { ...base, effects: activeEffects };
        const store = createGameStore(createMemoryAdapter(), { player });

        const vm = selectCharacterViewModel(store.getState());

        expect(vm.effects).toHaveLength(1);
        expect(vm.effects[0].kind).toBe('debuff');
        expect(vm.effects[0].tint).toBe('debuff');
    });

    it('preserves effect ordering from player.effects', () => {
        const base = createCharacter({ name: 'Hero', level: 1, baseStats: { heart: 1, body: 1, mind: 1 } });
        let effects = base.effects;
        // The test buff, then two library debuffs.
        const usedBuffs = [TEST_BUFF, ...effectsLibrary.debuffs].slice(0, 3);
        usedBuffs.forEach((buff, round) => {
            ({ activeEffects: effects } = applyEffect(effects, buff, round + 1));
        });
        const player = { ...base, effects };
        const store = createGameStore(createMemoryAdapter(), { player });

        const vm = selectCharacterViewModel(store.getState());

        expect(vm.effects).toHaveLength(3);
        usedBuffs.forEach((buff, i) => {
            expect(vm.effects[i].name).toBe(buff.name);
        });
    });

    it('effect duration matches activeEffect.remainingDuration', () => {
        const buff = TEST_BUFF;
        const base = createCharacter({ name: 'Hero', level: 1, baseStats: { heart: 1, body: 1, mind: 1 } });
        const { activeEffects } = applyEffect(base.effects, buff, 1);
        const player = { ...base, effects: activeEffects };
        const store = createGameStore(createMemoryAdapter(), { player });

        const vm = selectCharacterViewModel(store.getState());

        expect(vm.effects[0].duration).toBe(activeEffects[0].remainingDuration);
        expect(vm.effects[0].intensity).toBe(activeEffects[0].intensity);
    });
});

// ---------------------------------------------------------------------------
// Invariants — VM is total + deep-frozen
// ---------------------------------------------------------------------------

describe('selectCharacterViewModel: invariants', () => {
    it('the returned VM is deep-frozen', () => {
        const store = createGameStore(createMemoryAdapter());

        const vm = selectCharacterViewModel(store.getState());

        expect(Object.isFrozen(vm)).toBe(true);
        expect(Object.isFrozen(vm.base)).toBe(true);
        expect(Object.isFrozen(vm.equipment)).toBe(true);
    });

    it('the VM is total: no undefined fields for a fresh character', () => {
        const store = createGameStore(createMemoryAdapter());

        const vm = selectCharacterViewModel(store.getState());

        for (const [key, val] of Object.entries(vm)) {
            expect(val).not.toBeUndefined();
        }
    });
});

// ---------------------------------------------------------------------------
// Store lifecycle — mutation is reflected, selection is read-only
// ---------------------------------------------------------------------------

describe('selectCharacterViewModel: store lifecycle', () => {
    it('selecting the VM does not call adapter.save', () => {
        const adapter = createMemoryAdapter();
        const store = createGameStore(adapter);
        const saveSpy = jest.spyOn(adapter, 'save');

        selectCharacterViewModel(store.getState());
        selectCharacterViewModel(store.getState());

        expect(saveSpy).not.toHaveBeenCalled();
    });

    it('VM reflects a mutated player after store state changes', () => {
        const adapter = createMemoryAdapter();
        const store = createGameStore(adapter);

        const before = selectCharacterViewModel(store.getState());
        const beforeName = before.displayName;

        // Mutate player name via internal state override
        const newPlayer = { ...store.getState().player, name: 'Upgraded Hero' };
        store.setState({ player: newPlayer });

        const after = selectCharacterViewModel(store.getState());
        expect(after.displayName).toBe('Upgraded Hero');
        expect(after.displayName).not.toBe(beforeName);
    });
});

// ---------------------------------------------------------------------------
// createCharacter fixture — happy path with a known character
// ---------------------------------------------------------------------------

describe('selectCharacterViewModel: createCharacter fixture', () => {
    it('a level-7 character with meaningful stats produces correct level, name and base values', () => {
        const base = createCharacter({
            name: 'WORM-EATEN PILGRIM',
            level: 7,
            baseStats: { heart: 12, body: 14, mind: 10 },
        });
        const store = createGameStore(createMemoryAdapter(), { player: base });

        const vm = selectCharacterViewModel(store.getState());

        expect(vm.level).toBe(7);
        expect(vm.displayName).toBe('WORM-EATEN PILGRIM');

        const body = vm.base.find((r) => r.stanceKey === 'body')!;
        expect(body.value).toBe(14);
    });
});

// ---------------------------------------------------------------------------
// A11y wiring (AUDIT row [MED] /app/(tabs)/character — vm.a11y unused)
// ---------------------------------------------------------------------------

describe('selectCharacterViewModel: a11y block', () => {
    it('surfaces the full set of section labels the character screen wires', () => {
        const store = createGameStore(createMemoryAdapter());

        const vm = selectCharacterViewModel(store.getState());

        // Every section the screen renders has a matching a11y label so
        // the screen can wire `accessibilityLabel` without inventing
        // strings at the view layer (Hard Rule #8).
        expect(typeof vm.a11y.characterName).toBe('string');
        expect(typeof vm.a11y.level).toBe('string');
        expect(typeof vm.a11y.experience).toBe('string');
        expect(typeof vm.a11y.baseStats).toBe('string');
        expect(typeof vm.a11y.equipment).toBe('string');
        expect(typeof vm.a11y.effects).toBe('string');
        // Crucible button label lives on the presenter (added when
        // wiring the a11y block onto the screen) so the screen has no
        // inline a11y literal for it either.
        expect(vm.a11y.crucibleOpen).toBe('Open Token Crucible.');
    });

    it('exposes a lowercase-ritual emptyEffectsMessage so the screen renders no literal', () => {
        const store = createGameStore(createMemoryAdapter());

        const vm = selectCharacterViewModel(store.getState());

        // Lowercase ritual register — view renders via
        // `textTransform: 'uppercase'`. No banned pronouns.
        expect(vm.emptyEffectsMessage).toBe('none at hand.');
    });
});

/**
 * FE-004 — the XP row must not read as the player's current level. It sits
 * beside a medallion printing the current level, and printed `XP · LVL 2`
 * for a level-1 character.
 */
describe('FE-004: xp label names the NEXT level', () => {
    it('says TOWARD and points at level + 1', () => {
        const store = makeStore({ level: 1 });
        const vm = selectCharacterViewModel(store.getState() as never);
        expect(vm.xpLabel).toBe('XP TO LVL 2');
        expect(vm.xpLabel).not.toBe(`XP · LVL ${vm.level}`);
    });

    it('tracks a higher level', () => {
        const store = makeStore({ level: 15 });
        const vm = selectCharacterViewModel(store.getState() as never);
        expect(vm.xpLabel).toBe('XP TO LVL 16');
    });
});


describe('selectCharacterViewModel: a fight worth three levels (LV1 A7)', () => {
    it('names the landing level before the tap, then the span and the points after it', () => {
        const store = makeStore({ experience: experienceForLevel(4) });
        const before = selectCharacterViewModel(store.getState());
        expect(before.levelUpReady).toBe(true);
        expect(before.readyLevel).toBe(4);

        store.getState().levelUp();
        const after = selectCharacterViewModel(store.getState());
        expect(after.level).toBe(4);
        expect(after.pendingPoints).toBe(3);
        expect(after.levelUpFrom).toBe(1);
        expect(after.levelUpSummary).toBe('3 levels gained · 3 points banked');
        expect(after.levelUpSummary).not.toMatch(/heal|restor|refill|mend/i);
    });

    it('keeps "from" at level 1 when old banked points outnumber the levels', () => {
        const store = makeStore({ level: 2, availableStatPoints: 6 });
        const vm = selectCharacterViewModel(store.getState());
        expect(vm.levelUpFrom).toBe(1);
        expect(vm.levelUpSummary).toBe('1 level gained · 6 points banked');
    });
});
