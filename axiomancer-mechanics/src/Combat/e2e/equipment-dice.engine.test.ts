/**
 * Hermetic E2E: a worn armor's die change and a worn weapon's special payload
 * (`Combat/combat.equipment-effects.ts`, `Combat/combat.upgradeable-dice.ts`).
 *
 *   · armor: each change on its own die (a miss becomes mana, a mana becomes a
 *     special) rolls the changed face table; a die with no face of the source
 *     kind left gains nothing; the change rides on the character's die gear,
 *     honed or railed;
 *   · weapon: each special payload (Conviction, DEAL, HEAL, GUARD, INFERNO on
 *     the foe only, VULNERABLE for n turns) pays when a special-face die
 *     powers a card, on the grey cards' path and on the program path;
 *   · with no weapon worn a special only powers its card;
 *   · the payload fires no worn trigger, and a payload DEAL that takes the
 *     foe's last VITAE ends the fight.
 *
 * The pieces and the cards are test fixtures; no library piece exists yet.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import { FloatEye } from '../../Enemy/enemy.library';
import type { Enemy } from '../../Enemy/types';
import { clearSandboxCards, registerSandboxCards } from '../../Cards/cards.sandbox';
import type { Card } from '../../Cards/types';
import type { Equipment, EquipmentDieChange, EquipmentEffect, SpecialPayload } from '../../Items/types';
import { deepClone } from '../../Utils';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard, CONVICTION_CAP,
} from '../combat.engine';
import type { CombatEncounterState, CombatEvent } from '../combat.encounter.types';
import { applyDieChanges } from '../combat.equipment-effects';
import {
    DEFAULT_DIE_GEAR, activeDieGear, honedDieGear, rollUpgradeableDice, rollUpgradeableFace,
} from '../combat.upgradeable-dice';
import { wearGreySword } from '../combat.grey-sword';

// ── Fixtures ────────────────────────────────────────────────────────────────

const GREY_CARD: Card = {
    id: 'ed-body-grey', name: 'ED Body Grey', color: 'body', description: 'body fixture', tier: 1,
    targetType: 'enemy', rank: 1, cardType: 'spell',
    combatEffects: [{ effectId: 'debuff_bleed', appliedTo: 'opponent', intensity: 1, duration: 2 }],
};
const PROGRAM_CARD: Card = {
    id: 'ed-body-prog', name: 'ED Body Program', color: 'body', description: 'body program fixture',
    tier: 1, rank: 1, cardType: 'skill', targetType: 'self',
    program: { free: { text: 'TEST.', run: () => undefined }, paid: { text: 'TEST.', run: () => undefined } },
};

beforeAll(() => registerSandboxCards([GREY_CARD, PROGRAM_CARD]));
afterAll(() => clearSandboxCards());

const PATHS = [
    { path: 'the grey cards', cardId: GREY_CARD.id },
    { path: 'a program card', cardId: PROGRAM_CARD.id },
] as const;

function seqRng(...vals: number[]): () => number {
    let i = 0;
    return () => vals[Math.min(i++, vals.length - 1)];
}
// Face index = floor(rng * 6): 0 special, 1-2 mana, 3-5 miss on the stock colour dice.
const SPECIAL = 0.05;
const MANA = 0.25;
const MISS = 0.95;

function piece(slot: 'weapon' | 'armor', effect: EquipmentEffect, id = `ed-${slot}`): Equipment {
    return { id, name: `Test ${slot}`, description: 'A test piece.', category: 'equipment', slot, effect };
}
const weapon = (special: SpecialPayload): Equipment => piece('weapon', { special });
const armor = (die: EquipmentDieChange): Equipment => piece('armor', { die });

interface Gear { weapon?: Equipment | null; armor?: Equipment | null }

function wearer(cardId: string, gear: Gear, mutate?: (c: Character) => void): Character {
    const p = deepClone(Player);
    p.knownCards = Array(6).fill(cardId);
    p.baseStats = { heart: 5, body: 5, mind: 5 };
    p.health = 100; p.maxHealth = 400;
    wearGreySword(p);
    p.equipment = { ...p.equipment, weapon: gear.weapon ?? null, armor: gear.armor ?? null };
    mutate?.(p);
    return p;
}

function foe(hp = 500): Enemy {
    const e = deepClone(FloatEye);
    e.id = 'enemy-ed-dummy';
    e.health = hp; e.maxHealth = hp; e.effects = [];
    return e;
}

/** A fight whose body die came up special and whose hand is the fixture card. */
function fightWithSpecial(cardId: string, gear: Gear, hp = 500): CombatEncounterState {
    const deck = Array(6).fill(cardId);
    let s = initializeCombatEncounter(wearer(cardId, gear), foe(hp), deck, 7);
    s = rollEncounterDice(s, seqRng(SPECIAL, MISS, MISS, MISS)).state;
    return { ...s, hand: [{ uid: 'h0', cardId }], conviction: 0, guard: 0 };
}

function useSpecial(s: CombatEncounterState): { state: CombatEncounterState; events: CombatEvent[] } {
    const die = s.dice.find(d => d.color === 'body' && d.face === 'special');
    if (!die) throw new Error('no special body die');
    return playCombatCard(s, { uid: 'h0' }, true, die.id, seqRng(0.5));
}
const firedEvents = (events: CombatEvent[]) => events.filter(e => e.kind === 'special-fired');

// ── A17: the armor's die change ─────────────────────────────────────────────

describe('A17 — a worn armor changes one die', () => {
    const stock = (c: 'heart' | 'body' | 'mind' | 'wild') => DEFAULT_DIE_GEAR[c];

    it('a miss becomes a mana face on each die', () => {
        for (const color of ['heart', 'body', 'mind', 'wild'] as const) {
            const g = applyDieChanges(stock(color), [{ color, change: 'miss-to-mana' }]);
            expect(g.manaFaces).toBe(stock(color).manaFaces + 1);
            expect(g.specialFaces).toBe(stock(color).specialFaces);
        }
    });

    it('a mana face becomes a special on each die', () => {
        for (const color of ['heart', 'body', 'mind', 'wild'] as const) {
            const g = applyDieChanges(stock(color), [{ color, change: 'mana-to-special' }]);
            expect(g.manaFaces).toBe(stock(color).manaFaces - 1);
            expect(g.specialFaces).toBe(stock(color).specialFaces + 1);
        }
    });

    it('a change touches only the die it names', () => {
        expect(applyDieChanges(stock('mind'), [{ color: 'body', change: 'miss-to-mana' }])).toBe(stock('mind'));
    });

    it('the gold die rolls the changed table: face 2 is a miss stock and a mana face worn', () => {
        const worn = applyDieChanges(stock('wild'), [{ color: 'wild', change: 'miss-to-mana' }]);
        expect(rollUpgradeableFace(stock('wild'), () => 0.4)).toBe('miss');
        expect(rollUpgradeableFace(worn, () => 0.4)).toBe('mana');
    });

    it('the red die rolls a second special: face 1 is mana stock and a special worn', () => {
        const worn = applyDieChanges(stock('body'), [{ color: 'body', change: 'mana-to-special' }]);
        expect(rollUpgradeableFace(stock('body'), () => 0.25)).toBe('mana');
        expect(rollUpgradeableFace(worn, () => 0.25)).toBe('special');
    });

    it('the blue and purple dice gain the hit they name', () => {
        const mind = applyDieChanges(stock('mind'), [{ color: 'mind', change: 'miss-to-mana' }]);
        const heart = applyDieChanges(stock('heart'), [{ color: 'heart', change: 'miss-to-mana' }]);
        expect(rollUpgradeableFace(mind, () => 0.5)).toBe('mana');
        expect(rollUpgradeableFace(heart, () => 0.5)).toBe('mana');
        expect(rollUpgradeableFace(stock('mind'), () => 0.5)).toBe('miss');
    });

    it('a die with no miss face left gains nothing (fully honed)', () => {
        const honed = honedDieGear('body', 3); // 1 special / 5 mana / 0 miss
        expect(honed.specialFaces + honed.manaFaces).toBe(6);
        expect(applyDieChanges(honed, [{ color: 'body', change: 'miss-to-mana' }])).toBe(honed);
        const gold = honedDieGear('wild', 4); // 1 / 5 / 0
        expect(applyDieChanges(gold, [{ color: 'wild', change: 'miss-to-mana' }])).toBe(gold);
    });

    it('a die with no mana face left gains no special', () => {
        const bare = { ...stock('body'), manaFaces: 0 };
        expect(applyDieChanges(bare, [{ color: 'body', change: 'mana-to-special' }])).toBe(bare);
    });

    it('the fight reads the worn armor: activeDieGear stacks it on the honed default and on a rail', () => {
        const s = initializeCombatEncounter(
            wearer(GREY_CARD.id, { armor: armor({ color: 'mind', change: 'miss-to-mana' }) }, c => {
                c.dieUpgradeLevel = 1;
            }),
            foe(), Array(6).fill(GREY_CARD.id), 7,
        );
        // Honed once: 1 / 3 / 2; the armor adds a mana face: 1 / 4 / 1.
        expect(activeDieGear(s, 'mind')).toMatchObject({ specialFaces: 1, manaFaces: 4 });
        expect(activeDieGear(s, 'body')).toMatchObject({ specialFaces: 1, manaFaces: 3 });

        const railed = initializeCombatEncounter(
            wearer(GREY_CARD.id, { armor: armor({ color: 'body', change: 'mana-to-special' }) }, c => {
                c.dieGear = { body: { dieColor: 'body', specialFaces: 1, manaFaces: 3, specialConviction: 2 } };
            }),
            foe(), Array(6).fill(GREY_CARD.id), 7,
        );
        expect(activeDieGear(railed, 'body')).toMatchObject({ specialFaces: 2, manaFaces: 2 });
    });

    it('a fully honed die in a fight gains nothing from the worn armor', () => {
        const s = initializeCombatEncounter(
            wearer(GREY_CARD.id, { armor: armor({ color: 'body', change: 'miss-to-mana' }) }, c => {
                c.dieUpgradeLevel = 3;
            }),
            foe(), Array(6).fill(GREY_CARD.id), 7,
        );
        expect(activeDieGear(s, 'body')).toEqual(honedDieGear('body', 3));
    });

    it('the rolled tray carries the changed table', () => {
        const s = initializeCombatEncounter(
            wearer(GREY_CARD.id, { armor: armor({ color: 'wild', change: 'miss-to-mana' }) }),
            foe(), Array(6).fill(GREY_CARD.id), 7,
        );
        // Gold face index 2 (0.4): a miss stock, a mana face with the armor on.
        const tray = rollUpgradeableDice(1, s, new Set(), seqRng(MISS, MISS, MISS, 0.4));
        expect(tray.find(d => d.color === 'wild')?.face).toBe('mana');
        const bare = initializeCombatEncounter(
            wearer(GREY_CARD.id, {}), foe(), Array(6).fill(GREY_CARD.id), 7,
        );
        const bareTray = rollUpgradeableDice(1, bare, new Set(), seqRng(MISS, MISS, MISS, 0.4));
        expect(bareTray.find(d => d.color === 'wild')?.face).toBe('miss');
    });

    it('an armor with no die change leaves the state without dice effects', () => {
        const s = initializeCombatEncounter(wearer(GREY_CARD.id, {}), foe(), Array(6).fill(GREY_CARD.id), 7);
        expect(s.equipmentDice?.dieChanges ?? []).toEqual([]);
    });
});

// ── A18: the weapon's special payload ───────────────────────────────────────

describe.each(PATHS)('A18 — a worn weapon sets the special, on $path', ({ cardId }) => {
    it('Conviction n: the special pays n Conviction (the grey sword pays 2)', () => {
        const grey = fightWithSpecial(cardId, { weapon: { ...weapon({ kind: 'conviction', amount: 2 }) } });
        const res = useSpecial(grey);
        expect(res.state.conviction).toBe(2);
        expect(firedEvents(res.events)).toHaveLength(1);

        const rich = fightWithSpecial(cardId, { weapon: weapon({ kind: 'conviction', amount: 5 }) });
        expect(useSpecial(rich).state.conviction).toBe(5);
    });

    it('Conviction stops at the cap', () => {
        const s = { ...fightWithSpecial(cardId, { weapon: weapon({ kind: 'conviction', amount: 5 }) }), conviction: CONVICTION_CAP - 1 };
        expect(useSpecial(s).state.conviction).toBe(CONVICTION_CAP);
    });

    it('DEAL n: the foe loses n VITAE', () => {
        const s = fightWithSpecial(cardId, { weapon: weapon({ kind: 'deal', amount: 6 }) });
        const res = useSpecial(s);
        // The same play with no weapon worn is the baseline. The payload is a hit: a BLEED the grey
        // card just laid ticks on that damage instance, so that path loses 6 plus the tick.
        const baseline = useSpecial(fightWithSpecial(cardId, { weapon: null }));
        const lost = baseline.state.enemy.health - res.state.enemy.health;
        if (cardId === PROGRAM_CARD.id) expect(lost).toBe(6);
        else expect(lost).toBeGreaterThanOrEqual(6);
        expect(res.state.conviction).toBe(0);
        const fired = firedEvents(res.events)[0];
        expect(fired.kind === 'special-fired' && fired.payload).toEqual({ kind: 'deal', amount: 6 });
    });

    it('HEAL n: you heal n VITAE', () => {
        const s = fightWithSpecial(cardId, { weapon: weapon({ kind: 'heal', amount: 4 }) });
        const res = useSpecial(s);
        expect(res.state.player.health).toBe(s.player.health + 4);
        expect(res.events.some(e => e.kind === 'player-healed' && e.amount === 4)).toBe(true);
    });

    it('GUARD n: you gain n GUARD', () => {
        const s = fightWithSpecial(cardId, { weapon: weapon({ kind: 'guard', amount: 6 }) });
        expect(useSpecial(s).state.guard).toBe(6);
    });

    it('INFERNO n: it lays on the foe only', () => {
        const s = fightWithSpecial(cardId, { weapon: weapon({ kind: 'inferno', amount: 2 }) });
        const el = useSpecial(s).state.program?.el;
        expect(el?.infFoe).toBe(2);
        expect(el?.infShared).toBe(0);
        expect(el?.infSelf).toBe(0);
    });

    it('VULNERABLE n: the foe is vulnerable for n turns', () => {
        const s = fightWithSpecial(cardId, { weapon: weapon({ kind: 'vulnerable', amount: 2 }) });
        const vuln = useSpecial(s).state.enemy.effects.find(e => e.effectId === 'debuff_vulnerable');
        expect(vuln).toBeDefined();
        expect(vuln?.remainingDuration).toBe(2);
    });

    it('with no weapon worn a special only powers its card', () => {
        const s = fightWithSpecial(cardId, { weapon: null });
        const res = useSpecial(s);
        expect(res.events.some(e => e.kind === 'card-played')).toBe(true);
        expect(firedEvents(res.events)).toHaveLength(0);
        expect(res.state.conviction).toBe(0);
        expect(res.state.guard).toBe(0);
        expect(res.state.player.health).toBe(s.player.health);
    });

    it('a mana face fires no special', () => {
        let s = initializeCombatEncounter(
            wearer(cardId, { weapon: weapon({ kind: 'conviction', amount: 2 }) }), foe(), Array(6).fill(cardId), 7,
        );
        s = rollEncounterDice(s, seqRng(MANA, MISS, MISS, MISS)).state;
        s = { ...s, hand: [{ uid: 'h0', cardId }] };
        const die = s.dice.find(d => d.color === 'body')!;
        const res = playCombatCard(s, { uid: 'h0' }, true, die.id, seqRng(0.5));
        expect(firedEvents(res.events)).toHaveLength(0);
        expect(res.state.conviction).toBe(0);
    });

    it('a FREE play (no die) fires no special', () => {
        const s = fightWithSpecial(cardId, { weapon: weapon({ kind: 'guard', amount: 6 }) });
        const res = playCombatCard(s, { uid: 'h0' }, false, undefined, seqRng(0.5));
        expect(firedEvents(res.events)).toHaveLength(0);
        expect(res.state.guard).toBe(0);
    });
});

describe('A18 — what a payload does not do', () => {
    it('a payload HEAL passes through the Merciful heal modifiers (times, then plus)', () => {
        const s = fightWithSpecial(PROGRAM_CARD.id, { weapon: weapon({ kind: 'heal', amount: 4 }) });
        const mods = { healed: 0, plus: 1, times: 2, nextRadiance: 0, allRadianceDouble: false };
        const withMods = { ...s, program: { ...s.program!, heals: mods } };
        // 4 x 2 + 1 = 9
        expect(useSpecial(withMods).state.player.health).toBe(s.player.health + 9);
    });

    it('a payload DEAL is attributed to the weapon by its printed name', () => {
        const s = fightWithSpecial(PROGRAM_CARD.id, { weapon: weapon({ kind: 'deal', amount: 6 }) });
        const attribution = useSpecial(s).state.attribution;
        expect(Object.values(attribution).some(a => a.name === 'Test weapon')).toBe(true);
    });

    it('a payload HEAL is halved by the foe\'s veil', () => {
        const s = fightWithSpecial(PROGRAM_CARD.id, { weapon: weapon({ kind: 'heal', amount: 4 }) });
        const veiled = { ...s, enemyRiders: { veil: true } };
        expect(useSpecial(veiled).state.player.health).toBe(s.player.health + 2);
    });

    it('the payload fires no worn trigger: a special HEAL does not fire a HEAL trigger', () => {
        const trigger = piece('armor', { trigger: 'heal', payoff: { kind: 'conviction', amount: 3 } }, 'ed-heal-trigger');
        const s = fightWithSpecial(PROGRAM_CARD.id, { weapon: weapon({ kind: 'heal', amount: 4 }), armor: trigger });
        const res = useSpecial(s);
        expect(res.events.some(e => e.kind === 'equipment-fired')).toBe(false);
        expect(res.state.conviction).toBe(0);
    });

    it('the payload DEAL takes no worn DEAL bonus: it is not a card DEAL', () => {
        const bonus = piece('armor', { trigger: 'card-deal', payoff: { kind: 'deal-bonus', amount: 5 } }, 'ed-deal-bonus');
        const s = fightWithSpecial(PROGRAM_CARD.id, { weapon: weapon({ kind: 'deal', amount: 6 }), armor: bonus });
        const res = useSpecial(s);
        expect(res.state.enemy.health).toBe(s.enemy.health - 6);
    });

    it('only the weapon slot sets a special: an armor carrying one pays nothing', () => {
        const odd = piece('armor', { special: { kind: 'conviction', amount: 4 } }, 'ed-odd-armor');
        const s = fightWithSpecial(GREY_CARD.id, { weapon: null, armor: odd });
        const res = useSpecial(s);
        expect(firedEvents(res.events)).toHaveLength(0);
        expect(res.state.conviction).toBe(0);
    });

    it('a payload DEAL that takes the foe\'s last VITAE ends the fight in victory', () => {
        const s = fightWithSpecial(PROGRAM_CARD.id, { weapon: weapon({ kind: 'deal', amount: 50 }) }, 30);
        const res = useSpecial(s);
        expect(res.state.enemy.health).toBe(0);
        expect(res.state.phase).toBe('complete');
        expect(res.state.finalOutcome).toBe('victory');
        expect(res.events.some(e => e.kind === 'combat-ended' && e.outcome === 'victory')).toBe(true);
    });

    it('a grey-cards fight with no program ledger keeps none for a non-INFERNO payload', () => {
        const s = fightWithSpecial(GREY_CARD.id, { weapon: weapon({ kind: 'guard', amount: 3 }) });
        expect(s.program).toBeUndefined();
        expect(useSpecial(s).state.program).toBeUndefined();
    });
});
