/**
 * The lighthouse path's elites on the board (phase EN1k, A16, A17): `bw-l4`
 * stages the Lamplighter or the Wrecker with its stand-in portrait. The
 * Lamplighter's lamp stands on its side as a LIT or DARK state chip, and
 * while Dark every intent the board shows (the intent and its next preview)
 * reads UNKNOWN with no name. The Wrecker's Bait telegraphs UNKNOWN with its
 * name, and a BAIT chip stands on its side while the Bait is its next move.
 */

import { describe, expect, it } from '@jest/globals';
import { rollEncounterDice, type CombatEncounterState, type StateFixture } from '@mechanics';

import { buildCombatViewModel, effectChipA11y, type CombatEffectChipVM } from '../combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';

const DECK = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike', 'grey-ward'];

/** The live fight at the lighthouse path, as the app stages it for one run seed. */
function lighthouse(seed: string): CombatEncounterState {
    const ref: StateFixture = {
        ...REAL_FIGHT_FIXTURE,
        id: `en1k-bw-l4-${seed}`,
        seed,
        world: { ...REAL_FIGHT_FIXTURE.world!, node: 'bw-l4' },
        player: { level: 1, baseStats: { heart: 5, body: 5, mind: 5 } },
    };
    const { combat } = startRealFight(ref, { deck: DECK, seed: 3 });
    return rollEncounterDice(combat).state;
}

/** The first run seed whose draw at `bw-l4` is the named foe. */
function drawn(name: 'The Lamplighter' | 'The Wrecker'): CombatEncounterState {
    for (let i = 0; i < 40; i++) {
        const s = lighthouse(`fixture-en1k-bw-l4-${i}`);
        if (s.enemy.name === name) return s;
    }
    throw new Error(`no seed drew ${name}`);
}

/** The fight with the foe about to play `move` in `phase` (0 = the opening loop). */
function at(s: CombatEncounterState, move: string, phase: number): CombatEncounterState {
    const i = s.threatPhases.findIndex((p) => p.enemyMove?.name === move && p.enemyMove.phase === phase);
    expect(i).toBeGreaterThanOrEqual(0);
    return { ...s, currentPhaseIndex: i };
}

const chip = (s: CombatEncounterState, id: string): CombatEffectChipVM | undefined =>
    buildCombatViewModel(s).enemy.effects.find((e) => e.effectId === id);

describe('the lighthouse path stages one of its two elites', () => {
    it('the Lamplighter and the Wrecker, each with its stand-in portrait and two unnamed DANGERs', () => {
        const lamp = buildCombatViewModel(drawn('The Lamplighter'));
        expect(lamp.enemy.artKey).toBe('lamplighter');
        expect(lamp.enemy.dangers?.map((d) => d.name)).toEqual([null, null]);
        const wreck = buildCombatViewModel(drawn('The Wrecker'));
        expect(wreck.enemy.artKey).toBe('wrecker');
        expect(wreck.enemy.dangers?.map((d) => d.name)).toEqual([null, null]);
    });
});

describe('A16 — the Lamplighter\'s lamp on its pane', () => {
    it('opens Lit: a state chip with no badge number, and its intents named', () => {
        const s = at(drawn('The Lamplighter'), 'Wick-Lash', 0);
        const lit = chip(s, 'enemy-counter-lamp')!;
        expect(lit).toMatchObject({ noBadge: true, caption: 'Its intents show', glyph: { label: 'Lit' } });
        expect(lit.gloss).toMatch(/Glare is skipped/);
        expect(effectChipA11y(lit)).toBe('Lit, until a Shutter puts it Dark. Its intents show');
        const intent = buildCombatViewModel(s).enemy.intent;
        expect([intent.type, intent.moveName, intent.next?.moveName]).toEqual(['attack', 'Wick-Lash', 'Shutter']);
    });

    it('while Dark every intent reads UNKNOWN with no name, the next preview too', () => {
        const s = { ...at(drawn('The Lamplighter'), 'Wick-Lash', 0), enemyRiders: { lamp: 'dark' as const } };
        const intent = buildCombatViewModel(s).enemy.intent;
        expect([intent.type, intent.label, intent.moveName, intent.description]).toEqual(['unknown', 'UNKNOWN', null, '']);
        expect([intent.next?.type, intent.next?.moveName]).toEqual(['unknown', null]);
        expect(intent.damage).toBe(0);
        const dark = chip(s, 'enemy-counter-lamp')!;
        expect(dark).toMatchObject({ glyph: { label: 'Dark' }, caption: 'Its intents read UNKNOWN' });
        expect(effectChipA11y(dark)).toContain('until Lure Light or a Shutter lights it again');
    });

    it('a DANGER while Dark reads UNKNOWN too', () => {
        const s = { ...at(drawn('The Lamplighter'), 'Lure Light', 1), enemyRiders: { lamp: 'dark' as const } };
        expect(buildCombatViewModel(s).enemy.intent.type).toBe('unknown');
    });

    it('once the lamp is out the chip says so, and that it lasts the fight', () => {
        const s = { ...at(drawn('The Lamplighter'), 'Wick-Lash', 2), enemyRiders: { lamp: 'out' as const } };
        const out = chip(s, 'enemy-counter-lamp')!;
        expect(out).toMatchObject({ glyph: { label: 'Dark' }, caption: 'The lamp is out for good' });
        expect(effectChipA11y(out)).toContain('for the rest of the fight');
        expect(buildCombatViewModel(s).enemy.intent.moveName).toBeNull();
    });

    it('the lamp stands only on the Lamplighter\'s side', () => {
        const s = drawn('The Lamplighter');
        expect(buildCombatViewModel(s).player.effects.some((e) => e.effectId === 'enemy-counter-lamp')).toBe(false);
        expect(chip(drawn('The Wrecker'), 'enemy-counter-lamp')).toBeUndefined();
    });
});

describe('A17 — the Wrecker\'s Bait on the board', () => {
    it('telegraphs UNKNOWN with its name and no number', () => {
        const intent = buildCombatViewModel(at(drawn('The Wrecker'), "Wrecker's Bait", 0)).enemy.intent;
        expect([intent.type, intent.moveName]).toEqual(['unknown', "Wrecker's Bait"]);
        expect(`${intent.label} ${intent.description}`).not.toMatch(/\d/);
        expect(intent.damage).toBe(0);
    });

    it('a BAIT chip stands while the Bait is next, saying it reads your turn end', () => {
        const s = at(drawn('The Wrecker'), "Wrecker's Bait", 0);
        const bait = chip(s, 'enemy-counter-bait')!;
        expect(bait).toMatchObject({ noBadge: true, glyph: { label: 'Bait' }, caption: 'End your turn with GUARD up' });
        expect(bait.gloss).toMatch(/turn end/);
        expect(bait.gloss).not.toMatch(/\d/);
        expect(effectChipA11y(bait)).toBe('Bait, until your turn ends and the Bait reads it. End your turn with GUARD up');
        expect(chip(at(drawn('The Wrecker'), 'Cudgel', 0), 'enemy-counter-bait')).toBeUndefined();
    });
});
