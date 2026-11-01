/**
 * Hermetic E2E: a worn weapon's and armor's fight effect
 * (`Combat/combat.equipment-effects.ts`).
 *
 *   · every trigger: a card's DEAL, the first card DEAL each turn, the first
 *     GUARD each turn, a SACRIFICE, laying INFERNO, paying by discarding, a HEAL;
 *   · every condition (+n to each card DEAL while it holds): the foe has any
 *     weather, your GUARD holds, the foe is above half VITAE;
 *   · every payoff: HEAL n, GUARD n, Conviction n (capped), +n to the DEAL, draw n;
 *   · both paths: program cards and the grey cards (FREE riders, PAID deal/guard);
 *   · the "first" triggers re-arm at the start of your next turn;
 *   · only while worn, whatever the deck; RADIANCE and the MERCY burst are a
 *     card's DEAL, a Global's, TETHER's and THORNS' are not;
 *   · each firing emits an `equipment-fired` event naming the piece.
 *
 * The pieces and the program cards are test fixtures (sandbox registry); no
 * library piece exists yet (that is chunk 136.6).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import { Sandbag_01 } from '../../Enemy/enemy.library';
import { clearSandboxCards, registerSandboxCards } from '../../Cards/cards.sandbox';
import type { Card } from '../../Cards/types';
import type { ProgramCtx } from '../../Cards/card-program.types';
import type { Equipment, EquipmentEffect } from '../../Items/types';
import { deepClone } from '../../Utils';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard, resolveThreatPhase, startTurn, CONVICTION_CAP,
} from '../combat.engine';
import { programSignatureHeal } from '../combat.card-program';
import type { CombatEncounterState, CombatEvent } from '../combat.encounter.types';

const WILD = { id: 'w', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };

function card(id: string, run: (c: ProgramCtx) => void): Card {
    return {
        id, name: id, color: 'any', description: 'An equipment-effect test card.',
        tier: 1, rank: 1, cardType: 'skill', targetType: 'self',
        program: { free: { text: 'TEST.', run }, paid: { text: 'TEST.', run } },
    };
}

const CARDS: Card[] = [
    card('eq-deal-10', c => { c.deal(10, { exact: true }); }),
    card('eq-guard-4', c => { c.guard(4, { exact: true }); }),
    card('eq-sac-3', c => c.sacrifice(3)),
    card('eq-inferno-2', c => c.inferno(2, 'foe')),
    card('eq-discard-1', c => { c.discardRandom(1); }),
    card('eq-heal-5', c => { c.heal(5, { exact: true }); }),
    card('eq-radiance-2', c => { c.radiance(2); }),
    card('eq-mercy-burst', c => { c.mercy(10, { exact: true }); c.burstMercy(2); }),
    card('eq-tether-sac', c => { c.tether(3); c.sacrifice(4); }),
    card('eq-thorns-3', c => { c.thorns(3, { exact: true }); }),
    card('eq-filler', () => undefined),
    {
        id: 'eq-global-deal', name: 'eq-global-deal', color: 'any', description: 'An equipment-effect test Global.',
        tier: 1, rank: 1, cardType: 'global', targetType: 'self',
        program: { global: {
            trigger: 'turn', text: 'TEST.',
            free: c => { c.deal(10, { exact: true }); }, paid: c => { c.deal(10, { exact: true }); },
        } },
    },
];

beforeAll(() => registerSandboxCards(CARDS));
afterAll(() => clearSandboxCards());

function piece(id: string, slot: 'weapon' | 'armor', effect?: EquipmentEffect): Equipment {
    return {
        id, name: `Test ${id}`, description: 'A test piece.', category: 'equipment', slot,
        ...(effect ? { effect } : {}),
    };
}

interface Gear { weapon?: Equipment; armor?: Equipment; carried?: Equipment[] }

function wearer(gear: Gear): Character {
    const p = deepClone(Player);
    p.baseStats = { heart: 5, body: 5, mind: 5 };
    p.equipment = { weapon: gear.weapon ?? null, armor: gear.armor ?? null, relics: [] };
    p.inventory = gear.carried ?? [];
    // The grey cards' PAID line runs through the card engine, which plays only known cards.
    p.knownCards = ['grey-strike', 'grey-ward', 'grey-word'];
    return p;
}

interface FightOpts { vitae?: number; foeVitae?: number; foeMax?: number; filler?: string }

/** A fight on the sandbag wearing `gear`, `hand` in hand, one wild die, VITAE 50 / 100. */
function fight(hand: string[], gear: Gear, opts: FightOpts = {}): CombatEncounterState {
    const foeMax = opts.foeMax ?? 500;
    const enemy = { ...deepClone(Sandbag_01), health: opts.foeVitae ?? foeMax, maxHealth: foeMax, effects: [] };
    const filler = opts.filler ?? 'eq-filler';
    let s = initializeCombatEncounter(wearer(gear), enemy, [...hand, ...Array(10).fill(filler)], 7);
    s = rollEncounterDice(s).state;
    return {
        ...s,
        hand: hand.map((cardId, i) => ({ uid: `t${i}`, cardId })),
        player: { ...s.player, health: opts.vitae ?? 50, maxHealth: 100 },
        dice: [{ ...WILD }], reserve: [], guard: 0, conviction: 0,
    };
}

const playT = (s: CombatEncounterState, uid: string, paid = false) =>
    playCombatCard({ ...s, dice: [{ ...WILD }] }, { uid }, paid, paid ? 'w' : undefined);
const play = (s: CombatEncounterState, uid: string, paid = false): CombatEncounterState => playT(s, uid, paid).state;

/** The start of your next turn (a fresh threat phase), with `hand` back in hand. */
function nextTurn(s: CombatEncounterState, hand: string[]): CombatEncounterState {
    const t = startTurn({ ...s, turnTakenThisPhase: false }).state;
    return { ...t, hand: hand.map((cardId, i) => ({ uid: `n${i}`, cardId })), dice: [{ ...WILD }] };
}

const fired = (events: readonly CombatEvent[]) =>
    events.filter((e): e is Extract<CombatEvent, { kind: 'equipment-fired' }> => e.kind === 'equipment-fired');
const guardOf = (s: CombatEncounterState): number => s.guard ?? 0;
const foeLost = (before: CombatEncounterState, after: CombatEncounterState) => before.enemy.health - after.enemy.health;

// ── The pieces (fixtures in the slate's shape) ──────────────────────────────
const SIPHON = piece('t-siphon', 'weapon', { trigger: 'card-deal', payoff: { kind: 'heal', amount: 3 } });
const FIRST_EDGE = piece('t-first-edge', 'weapon', { trigger: 'first-card-deal', payoff: { kind: 'deal-bonus', amount: 2 } });
const FIRST_COAT = piece('t-first-coat', 'armor', { trigger: 'first-guard', payoff: { kind: 'guard', amount: 2 } });
const SAC_PLATE = piece('t-sac-plate', 'armor', { trigger: 'sacrifice', payoff: { kind: 'guard', amount: 2 } });
const FLAME_GUARD = piece('t-flame-guard', 'armor', { trigger: 'inferno', payoff: { kind: 'conviction', amount: 1 } });
const DISCARD_MAIL = piece('t-discard-mail', 'armor', { trigger: 'discard-pay', payoff: { kind: 'draw', amount: 1 } });
const HEAL_WARD = piece('t-heal-ward', 'armor', { trigger: 'heal', payoff: { kind: 'guard', amount: 2 } });
const STORM_BLADE = piece('t-storm-blade', 'weapon', { condition: 'foe-has-weather', bonus: 2 });
const WALL_BLADE = piece('t-wall-blade', 'weapon', { condition: 'guard-holds', bonus: 2 });
const HIGH_BLADE = piece('t-high-blade', 'weapon', { condition: 'foe-above-half', bonus: 2 });

describe('fight setup reads the worn gear', () => {
    it('a worn piece with an effect gives the fight its equipment state, even with no program card in the deck', () => {
        const s = fight(['grey-strike'], { weapon: FIRST_EDGE }, { filler: 'grey-word' });
        expect(s.program).toBeUndefined();
        expect(s.equipmentEffects?.worn).toEqual([
            { itemId: 't-first-edge', itemName: 'Test t-first-edge', slot: 'weapon', effect: FIRST_EDGE.effect },
        ]);
    });

    it('a piece carried but not worn, or worn without an effect, gives none and fires nothing', () => {
        const carried = fight(['eq-deal-10'], { carried: [SIPHON, FIRST_EDGE] });
        expect(carried.equipmentEffects).toBeUndefined();
        const r = playT(carried, 't0');
        expect(fired(r.events)).toEqual([]);
        expect(foeLost(carried, r.state)).toBe(10);
        expect(r.state.player.health).toBe(50);
        expect(fight(['eq-deal-10'], { weapon: piece('t-bare', 'weapon') }).equipmentEffects).toBeUndefined();
    });
});

describe('trigger: a card\'s DEAL', () => {
    it('program path: HEAL 3 on each card DEAL, an event naming the piece each time', () => {
        const s = fight(['eq-deal-10', 'eq-deal-10'], { weapon: SIPHON });
        const r1 = playT(s, 't0');
        expect(r1.state.player.health).toBe(53);
        expect(fired(r1.events)).toEqual([{
            kind: 'equipment-fired', itemId: 't-siphon', itemName: 'Test t-siphon', slot: 'weapon',
            trigger: 'card-deal', payoff: 'heal', amount: 3,
        }]);
        const r2 = playT(r1.state, 't1');
        expect(r2.state.player.health).toBe(56);
        expect(fired(r2.events)).toHaveLength(1);
    });

    it('grey path: the FREE rider and the PAID deal each HEAL 3', () => {
        const s = fight(['grey-strike', 'grey-strike'], { weapon: SIPHON }, { filler: 'grey-word' });
        const free = playT(s, 't0', false);
        expect(free.state.player.health).toBe(53);
        expect(fired(free.events)[0]).toMatchObject({ itemId: 't-siphon', trigger: 'card-deal', payoff: 'heal', amount: 3 });
        const paid = playT(free.state, 't1', true);
        expect(paid.state.player.health).toBe(56);
        expect(fired(paid.events)).toHaveLength(1);
    });

    it('RADIANCE and the MERCY burst are a card\'s DEAL', () => {
        const rad = playT(fight(['eq-radiance-2'], { weapon: SIPHON }), 't0');
        expect(rad.events.some(e => e.kind === 'radiance-struck')).toBe(true);
        expect(fired(rad.events).map(e => e.trigger)).toContain('card-deal');
        const burst = playT(fight(['eq-mercy-burst'], { weapon: SIPHON }, { foeVitae: 300 }), 't0');
        expect(burst.events.some(e => e.kind === 'mercy-burst')).toBe(true);
        expect(fired(burst.events).map(e => e.trigger)).toEqual(['card-deal']);
    });
});

describe('trigger: the first card DEAL each turn (+2 to that DEAL)', () => {
    it('program path: the first DEAL deals 12, the second 10, and the next turn re-arms it', () => {
        const s = fight(['eq-deal-10', 'eq-deal-10'], { weapon: FIRST_EDGE });
        const r1 = playT(s, 't0');
        expect(foeLost(s, r1.state)).toBe(12);
        expect(fired(r1.events)).toEqual([{
            kind: 'equipment-fired', itemId: 't-first-edge', itemName: 'Test t-first-edge', slot: 'weapon',
            trigger: 'first-card-deal', payoff: 'deal-bonus', amount: 2,
        }]);
        const r2 = playT(r1.state, 't1');
        expect(foeLost(r1.state, r2.state)).toBe(10);
        expect(fired(r2.events)).toEqual([]);
        const t2 = nextTurn(r2.state, ['eq-deal-10']);
        const r3 = playT(t2, 'n0');
        expect(foeLost(t2, r3.state)).toBe(12);
    });

    it('grey path: +2 on the first DEAL (FREE or PAID), none after, re-armed next turn', () => {
        const bare = fight(['grey-strike', 'grey-strike'], {}, { filler: 'grey-word' });
        const worn = fight(['grey-strike', 'grey-strike'], { weapon: FIRST_EDGE }, { filler: 'grey-word' });
        const bareFree = play(bare, 't0', false);
        const wornFree = play(worn, 't0', false);
        expect(foeLost(worn, wornFree)).toBe(foeLost(bare, bareFree) + 2);
        const barePaid = play(bareFree, 't1', true);
        const wornPaid = play(wornFree, 't1', true);
        expect(foeLost(wornFree, wornPaid)).toBe(foeLost(bareFree, barePaid));
        const t2 = nextTurn(wornPaid, ['grey-strike']);
        const bt2 = nextTurn(barePaid, ['grey-strike']);
        expect(foeLost(t2, play(t2, 'n0', true))).toBe(foeLost(bt2, play(bt2, 'n0', true)) + 2);
    });
});

describe('trigger: the first GUARD each turn (GUARD 2)', () => {
    it('program path: the first GUARD gives 2 more, the second none, and the next turn re-arms it', () => {
        const s = fight(['eq-guard-4', 'eq-guard-4'], { armor: FIRST_COAT });
        const r1 = playT(s, 't0');
        expect(r1.state.guard).toBe(6);
        expect(fired(r1.events)).toEqual([{
            kind: 'equipment-fired', itemId: 't-first-coat', itemName: 'Test t-first-coat', slot: 'armor',
            trigger: 'first-guard', payoff: 'guard', amount: 2,
        }]);
        const r2 = playT(r1.state, 't1');
        expect(r2.state.guard).toBe(10);
        const t2 = nextTurn({ ...r2.state, guard: 0 }, ['eq-guard-4']);
        expect(play({ ...t2, guard: 0 }, 'n0').guard).toBe(6);
    });

    it('grey path: the FREE rider\'s GUARD and the PAID GUARD each take it on the first of the turn', () => {
        const bare = fight(['grey-ward', 'grey-ward'], {}, { filler: 'grey-word' });
        const worn = fight(['grey-ward', 'grey-ward'], { armor: FIRST_COAT }, { filler: 'grey-word' });
        const bareFree = play(bare, 't0', false);
        const wornFree = play(worn, 't0', false);
        expect(guardOf(wornFree)).toBe(guardOf(bareFree) + 2);
        expect(guardOf(play(wornFree, 't1', true)) - guardOf(wornFree))
            .toBe(guardOf(play(bareFree, 't1', true)) - guardOf(bareFree));
        const bp = fight(['grey-ward'], {}, { filler: 'grey-word' });
        const wp = fight(['grey-ward'], { armor: FIRST_COAT }, { filler: 'grey-word' });
        expect(guardOf(play(wp, 't0', true))).toBe(guardOf(play(bp, 't0', true)) + 2);
    });
});

describe('trigger: a SACRIFICE (GUARD 2)', () => {
    it('each SACRIFICE gives GUARD 2', () => {
        const s = fight(['eq-sac-3', 'eq-sac-3'], { armor: SAC_PLATE });
        const r1 = playT(s, 't0');
        expect(r1.state.player.health).toBe(47);
        expect(r1.state.guard).toBe(2);
        expect(fired(r1.events)).toEqual([expect.objectContaining({ itemId: 't-sac-plate', trigger: 'sacrifice', payoff: 'guard', amount: 2 })]);
        expect(play(r1.state, 't1').guard).toBe(4);
    });

    it('a +n payoff off a SACRIFICE waits for your next card DEAL this turn, and expires at your next turn', () => {
        const sacEdge = piece('t-sac-edge', 'weapon', { trigger: 'sacrifice', payoff: { kind: 'deal-bonus', amount: 3 } });
        const s = play(fight(['eq-sac-3', 'eq-deal-10', 'eq-deal-10'], { weapon: sacEdge }), 't0');
        const d1 = play(s, 't1');
        expect(foeLost(s, d1)).toBe(13);
        expect(foeLost(d1, play(d1, 't2'))).toBe(10);
        const unspent = play(fight(['eq-sac-3'], { weapon: sacEdge }), 't0');
        const t2 = nextTurn(unspent, ['eq-deal-10']);
        expect(foeLost(t2, play(t2, 'n0'))).toBe(10);
    });
});

describe('trigger: laying INFERNO (Conviction 1)', () => {
    it('each INFERNO laid gives 1 Conviction', () => {
        const s = fight(['eq-inferno-2', 'eq-inferno-2'], { armor: FLAME_GUARD });
        const r1 = playT(s, 't0');
        expect(r1.state.conviction).toBe(1);
        expect(fired(r1.events)).toEqual([expect.objectContaining({ itemId: 't-flame-guard', trigger: 'inferno', payoff: 'conviction', amount: 1 })]);
        expect(play(r1.state, 't1').conviction).toBe(2);
    });

    it('stops at the Conviction cap', () => {
        const s = { ...fight(['eq-inferno-2'], { armor: FLAME_GUARD }), conviction: CONVICTION_CAP };
        const r = playT(s, 't0');
        expect(r.state.conviction).toBe(CONVICTION_CAP);
        expect(fired(r.events)[0]).toMatchObject({ trigger: 'inferno', amount: 0 });
        expect(r.events.some(e => e.kind === 'conviction-gained')).toBe(false);
    });
});

describe('trigger: paying by discarding (draw 1)', () => {
    it('each payment by discarding draws 1', () => {
        const s = fight(['eq-discard-1', 'eq-filler', 'eq-filler'], { armor: DISCARD_MAIL });
        const r = playT(s, 't0');
        expect(r.events.some(e => e.kind === 'cards-discarded')).toBe(true);
        expect(fired(r.events)).toEqual([expect.objectContaining({ itemId: 't-discard-mail', trigger: 'discard-pay', payoff: 'draw', amount: 1 })]);
        // Played one, discarded one, drew one.
        expect(r.state.hand).toHaveLength(2);
    });
});

describe('trigger: a HEAL (GUARD 2)', () => {
    it('a HEAL that restores VITAE gives GUARD 2; a HEAL at full VITAE fires nothing', () => {
        const r = playT(fight(['eq-heal-5'], { armor: HEAL_WARD }), 't0');
        expect(r.state.player.health).toBe(55);
        expect(r.state.guard).toBe(2);
        expect(fired(r.events)).toEqual([expect.objectContaining({ itemId: 't-heal-ward', trigger: 'heal', payoff: 'guard', amount: 2 })]);
        const full = playT(fight(['eq-heal-5'], { armor: HEAL_WARD }, { vitae: 100 }), 't0');
        expect(fired(full.events)).toEqual([]);
    });

    it('a signature\'s HEAL fires it too', () => {
        const s = fight([], { armor: HEAL_WARD });
        const r = programSignatureHeal(s, 3, 'sig-test');
        expect(r.state.guard).toBe(2);
        expect(fired(r.events)).toHaveLength(1);
    });

    it('the gear\'s own HEAL never fires a gear trigger (no recursion)', () => {
        const s = fight(['eq-deal-10'], { weapon: SIPHON, armor: HEAL_WARD });
        const r = playT(s, 't0');
        expect(r.state.player.health).toBe(53);
        expect(r.state.guard).toBe(0);
        expect(fired(r.events).map(e => e.itemId)).toEqual(['t-siphon']);
        const loop = piece('t-loop', 'armor', { trigger: 'heal', payoff: { kind: 'heal', amount: 2 } });
        const l = playT(fight(['eq-heal-5'], { armor: loop }), 't0');
        expect(l.state.player.health).toBe(57);
        expect(fired(l.events)).toHaveLength(1);
    });
});

describe('condition: the foe has any weather (+2 to each card DEAL)', () => {
    const withStorm = (s: CombatEncounterState): CombatEncounterState =>
        ({ ...s, program: { ...s.program!, el: { ...s.program!.el, storm: 2 } } });

    it('program path: 10 with no weather, 12 once the foe has INFERNO', () => {
        const s = fight(['eq-deal-10', 'eq-inferno-2', 'eq-deal-10'], { weapon: STORM_BLADE });
        const r1 = playT(s, 't0');
        expect(foeLost(s, r1.state)).toBe(10);
        expect(fired(r1.events)).toEqual([]);
        const lit = play(r1.state, 't1');
        const r2 = playT(lit, 't2');
        expect(foeLost(lit, r2.state)).toBe(12);
        expect(fired(r2.events)).toEqual([{
            kind: 'equipment-fired', itemId: 't-storm-blade', itemName: 'Test t-storm-blade', slot: 'weapon',
            condition: 'foe-has-weather', payoff: 'deal-bonus', amount: 2,
        }]);
    });

    it('grey path: each grey DEAL takes +2 while the foe has STORM', () => {
        const bare = withStorm(fight(['grey-strike'], {}));
        const worn = withStorm(fight(['grey-strike'], { weapon: STORM_BLADE }));
        expect(foeLost(worn, play(worn, 't0', true))).toBe(foeLost(bare, play(bare, 't0', true)) + 2);
        expect(foeLost(worn, play(worn, 't0', false))).toBe(foeLost(bare, play(bare, 't0', false)) + 2);
    });
});

describe('condition: your GUARD holds (+2 to each card DEAL)', () => {
    it('program path: 10 with no GUARD, 12 with GUARD up, every DEAL', () => {
        const s = fight(['eq-deal-10', 'eq-deal-10'], { weapon: WALL_BLADE });
        expect(foeLost(s, play(s, 't0'))).toBe(10);
        const g = { ...s, guard: 5 };
        const r1 = play(g, 't0');
        expect(foeLost(g, r1)).toBe(12);
        expect(foeLost(r1, play(r1, 't1'))).toBe(12);
    });

    it('grey path', () => {
        const bare = { ...fight(['grey-strike'], {}, { filler: 'grey-word' }), guard: 5 };
        const worn = { ...fight(['grey-strike'], { weapon: WALL_BLADE }, { filler: 'grey-word' }), guard: 5 };
        expect(foeLost(worn, play(worn, 't0', true))).toBe(foeLost(bare, play(bare, 't0', true)) + 2);
        const noGuard = fight(['grey-strike'], { weapon: WALL_BLADE }, { filler: 'grey-word' });
        const bareNo = fight(['grey-strike'], {}, { filler: 'grey-word' });
        expect(foeLost(noGuard, play(noGuard, 't0', true))).toBe(foeLost(bareNo, play(bareNo, 't0', true)));
    });
});

describe('condition: the foe is above half VITAE (+2 to each card DEAL)', () => {
    it('program path: 12 above half, 10 at half or below', () => {
        const high = fight(['eq-deal-10'], { weapon: HIGH_BLADE }, { foeVitae: 300 });
        expect(foeLost(high, play(high, 't0'))).toBe(12);
        const low = fight(['eq-deal-10'], { weapon: HIGH_BLADE }, { foeVitae: 250 });
        expect(foeLost(low, play(low, 't0'))).toBe(10);
    });

    it('grey path', () => {
        const bare = fight(['grey-strike'], {}, { filler: 'grey-word', foeVitae: 300 });
        const worn = fight(['grey-strike'], { weapon: HIGH_BLADE }, { filler: 'grey-word', foeVitae: 300 });
        expect(foeLost(worn, play(worn, 't0', true))).toBe(foeLost(bare, play(bare, 't0', true)) + 2);
        const bareLow = fight(['grey-strike'], {}, { filler: 'grey-word', foeVitae: 200 });
        const wornLow = fight(['grey-strike'], { weapon: HIGH_BLADE }, { filler: 'grey-word', foeVitae: 200 });
        expect(foeLost(wornLow, play(wornLow, 't0', true))).toBe(foeLost(bareLow, play(bareLow, 't0', true)));
    });
});

describe('a Global\'s, TETHER\'s and THORNS\' DEAL fire nothing', () => {
    // A DEAL-trigger weapon and a DEAL condition that holds (the foe is at full VITAE).
    const gear: Gear = { weapon: SIPHON, armor: piece('t-high-coat', 'armor', { condition: 'foe-above-half', bonus: 2 }) };

    it('a Global\'s DEAL at the start of your turn', () => {
        const s = play(fight(['eq-global-deal'], gear), 't0');
        const t = startTurn({ ...s, turnTakenThisPhase: false });
        expect(t.events).toContainEqual({ kind: 'damage-dealt', cardId: 'eq-global-deal', target: 'enemy', amount: 10 });
        expect(foeLost(s, t.state)).toBe(10);
        expect(fired(t.events)).toEqual([]);
        expect(t.state.player.health).toBe(s.player.health);
    });

    it('TETHER\'s hit on a SACRIFICE', () => {
        const s = fight(['eq-tether-sac'], gear);
        const r = playT(s, 't0');
        expect(foeLost(s, r.state)).toBe(4);
        expect(fired(r.events)).toEqual([]);
    });

    it('THORNS on the foe\'s attack', () => {
        const s = play(fight(['eq-thorns-3'], gear), 't0');
        const foe = resolveThreatPhase(s);
        expect(foe.events.some(e => e.kind === 'spike-struck')).toBe(true);
        expect(fired(foe.events)).toEqual([]);
    });
});
