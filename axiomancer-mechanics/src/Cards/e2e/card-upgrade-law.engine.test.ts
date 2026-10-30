/**
 * GUARD — the upgrade law and program scaling (Phase UP1b, brief
 * `plan/phases/phase_UP1_card_upgrades.md` A2, A3, A4).
 *
 *   A2  rarity sets how many upgrades a card takes (common 1, uncommon 2,
 *       rare 3), ids `<id>+` / `++` / `+++`, `baseCardId` strips every `+`,
 *       one past the limit is refused, and every legal id resolves in a deck
 *       and in a save.
 *   A3  every upgrade makes a payoff number bigger, Blood Price programs
 *       included, and no cost (SACRIFICE, TETHER, EXILE) grows; the face prints
 *       the applied numbers.
 *   A4  `REPLACE_CARD` swaps one owned copy for its upgrade.
 */

import { describe, expect, it } from 'vitest';
import { cardLibrary, getCardById, TRIAL_SETS } from '../cards.library';
import { getCardLane } from '../card.lanes';
import {
    baseCardId, canUpgrade, upgradeCard, upgradeLevel, upgradeLimit, UPGRADE_LIMITS,
} from '../card-upgrades';
import { replaceCard } from '../card.engine';
import { cardLinesText } from '../card-rules';
import type { Card, CardRank } from '../types';
import type { ProgramCtx, ProgramQuery } from '../card-program.types';
import { runOneEncounter } from '../../Combat/combat.encounter.sim';
import { STARTING_CARD_IDS } from '../../Combat/combat.rewards';
import { dropUnknownCardIds } from '../../Game/game.migrate';
import { createGameStore } from '../../Game/store';
import { createNewGameState } from '../../Game/game.reducer';
import { nullAdapter } from '../../Game/persistence/null.adapter';
import type { GameState } from '../../Game/types';
import { Player } from '../../Character/characters.mock';
import { FloatEye } from '../../Enemy/enemy.library';
import { deepClone } from '../../Utils';

const fixture = (rank: CardRank, over: Partial<Card> = {}): Card => ({
    id: `fx-r${rank}`, name: `Fx ${rank}`, color: 'body', description: 'x',
    tier: 1, rank, cardType: 'attack', targetType: 'enemy',
    free: { damage: 3 }, specialMechanics: [{ kind: 'deal', amount: 6 }], ...over,
});

/** Upgrade until refused; returns every copy made. */
function chain(card: Card): Card[] {
    const out: Card[] = [];
    for (let c = upgradeCard(card); c; c = upgradeCard(c)) out.push(c);
    return out;
}

describe('A2 — the upgrade law', () => {
    it('limits by rarity: common 1, uncommon 2, rare 3, and one past is refused', () => {
        expect(UPGRADE_LIMITS).toEqual({ common: 1, uncommon: 2, rare: 3 });
        const cases: [CardRank, number][] = [[1, 1], [2, 1], [3, 2], [4, 2], [5, 3], [6, 3]];
        for (const [rank, limit] of cases) {
            const ups = chain(fixture(rank));
            expect([rank, ups.length]).toEqual([rank, limit]);
            const last = ups[ups.length - 1];
            expect(canUpgrade(last)).toBe(false);
            expect(upgradeCard(last)).toBeUndefined();
        }
    });

    it('ids and names gain one + per upgrade; baseCardId strips every +', () => {
        const ups = chain(fixture(5));
        expect(ups.map(c => c.id)).toEqual(['fx-r5+', 'fx-r5++', 'fx-r5+++']);
        expect(ups.map(c => c.name)).toEqual(['Fx 5+', 'Fx 5++', 'Fx 5+++']);
        expect(ups.map(c => baseCardId(c.id))).toEqual(['fx-r5', 'fx-r5', 'fx-r5']);
        expect(ups.map(c => upgradeLevel(c.id))).toEqual([1, 2, 3]);
        expect(upgradeLevel('fx-r5')).toBe(0);
    });

    it('each upgrade applies to the previous one', () => {
        const amounts = chain(fixture(5)).map(c => (c.specialMechanics?.[0] as { amount: number }).amount);
        // 6 -> 8 -> 11 -> 15 (+40%, at least +2, each step on the last).
        expect(amounts).toEqual([8, 11, 15]);
    });

    it('a Curse takes no upgrade', () => {
        const curses = cardLibrary.filter(c => c.cardType === 'curse');
        expect(curses.length).toBeGreaterThan(0);
        for (const c of curses) {
            expect(upgradeLimit(c)).toBe(0);
            expect(upgradeCard(c)).toBeUndefined();
            expect(getCardById(`${c.id}+`)).toBeUndefined();
        }
    });

    it('every library card resolves at each level up to its limit, and not one past', () => {
        const offenders: string[] = [];
        for (const card of cardLibrary) {
            const limit = upgradeLimit(card);
            for (let k = 1; k <= limit; k++) {
                const id = `${card.id}${'+'.repeat(k)}`;
                if (getCardById(id)?.id !== id) offenders.push(`${id} does not resolve`);
            }
            if (getCardById(`${card.id}${'+'.repeat(limit + 1)}`)) offenders.push(`${card.id} resolves past its limit`);
        }
        expect(offenders).toEqual([]);
    });

    it('a save keeps an upgraded id and drops one past the limit', () => {
        const state = {
            version: 0,
            player: { ...deepClone(Player), knownCards: ['grey-strike+', 'grey-strike++'], combatRewardCards: ['grey-ward+'] },
        } as unknown as GameState;
        const out = dropUnknownCardIds(state);
        expect(out.player.knownCards).toEqual(['grey-strike+']);
        expect(out.player.combatRewardCards).toEqual(['grey-ward+']);
    });

    it('a deck of upgraded cards, program cards included, fights to an outcome', () => {
        const lane = getCardLane('blood-price');
        expect(lane?.testDeck?.length).toBeGreaterThan(0);
        const deck = [...STARTING_CARD_IDS, ...(lane?.testDeck ?? [])].map(id => `${id}+`);
        for (const id of deck) expect(getCardById(id)?.id).toBe(id);
        const player = { ...deepClone(Player), knownCards: deck };
        const run = runOneEncounter(player, deepClone(FloatEye), 3, 'greedy', { deck });
        expect(['victory', 'mercy', 'defeat']).toContain(run.outcome);
        expect(run.plays).toBeGreaterThan(0);
    });
});

// ── A3: payoffs grow, costs do not ──────────────────────────────────────────

const PAYOFF_VERBS = new Set([
    'deal', 'guard', 'heal', 'vulnerable', 'foeLoses', 'leech', 'empowerNextDeal',
    'conviction', 'healNextTurn', 'drain',
    // The weather: an element's number and the STORM's extra growth.
    'inferno', 'blizzard', 'storm', 'stormGrowthMarker',
    // The spikes: THORNS and REFLECT numbers.
    'thorns', 'reflect', 'reflectOnAttack',
]);
const COST_VERBS = new Set(['sacrifice', 'sacrificeX', 'tether']);

/** Costs T ruled may grow on upgrade, by card id, as each trial set records
 *  them. Each entry is a ruling, not a loosening of the law. */
const RULED_COST_GROWTH: Readonly<Record<string, readonly string[]>> =
    Object.assign({}, ...TRIAL_SETS.map(set => set.ruledCostGrowth ?? {}));

interface Call { verb: string; n: number; exact: boolean }

function record(fn: (c: ProgramCtx) => void, q: ProgramQuery): Call[] {
    const calls: Call[] = [];
    const ctx = new Proxy({ q } as unknown as ProgramCtx, {
        get(target, prop) {
            if (prop === 'q') return target.q;
            return (...args: unknown[]) => {
                const n = typeof args[0] === 'number' ? args[0] : 0;
                const opts = args[1] as { exact?: boolean } | undefined;
                calls.push({ verb: String(prop), n, exact: typeof opts === 'object' && !!opts?.exact });
                return n;
            };
        },
    });
    fn(ctx);
    return calls;
}

/** The weather and spikes reads, clear and busy. */
const CLEAR = { foeInferno: 0, yourInferno: 0, blizzard: 0, storm: 0, frozen: false, elementsOnFoe: 0, handSize: 4, thorns: 0, reflect: 0, guard: 0, dealtThisTurn: 0, foeMercy: 0, foeHasMercy: false, foeAtMax: true, healedThisTurn: 0, belowHalf: false };
const STORMY = { foeInferno: 6, yourInferno: 3, blizzard: 4, storm: 3, frozen: true, elementsOnFoe: 3, handSize: 4, thorns: 3, reflect: 50, guard: 6, dealtThisTurn: 5, foeMercy: 6, foeHasMercy: true, foeAtMax: false, healedThisTurn: 6, belowHalf: true };

/** Healthy, at half after damage, and deep enough that every cap binds. */
const PROBES: readonly ProgramQuery[] = [
    { ...CLEAR, vitae: 100, maxVitae: 100, missing: 0, atHalf: false, takenLastTurn: 0, lostThisCombat: 0, lostThisRound: 0, cursesInHand: 0, cursesInDiscard: 0 },
    { ...STORMY, vitae: 40, maxVitae: 100, missing: 60, atHalf: true, takenLastTurn: 10, lostThisCombat: 60, lostThisRound: 10, cursesInHand: 1, cursesInDiscard: 1 },
    { ...STORMY, vitae: 1, maxVitae: 1000, missing: 999, atHalf: true, takenLastTurn: 1000, lostThisCombat: 1000, lostThisRound: 1000, cursesInHand: 1, cursesInDiscard: 1 },
];

/** Every line of a program card as a runnable, with its name. */
function programLines(card: Card): [string, (c: ProgramCtx) => void, boolean][] {
    const p = card.program;
    if (!p) return [];
    const out: [string, (c: ProgramCtx) => void, boolean][] = [];
    if (p.free) out.push(['FREE', p.free.run, false]);
    if (p.paid) out.push(['PAID', p.paid.run, !!p.paid.exile]);
    if (p.global) {
        const g = p.global;
        out.push(['FREE', c => g.free(c, 4), false], ['PAID', c => g.paid(c, 4), false]);
    }
    return out;
}

/** Per verb, the sum of its amounts over every line and probe. */
function verbTotals(card: Card): Map<string, number> {
    const totals = new Map<string, number>();
    for (const [, run] of programLines(card)) {
        for (const q of PROBES) {
            for (const call of record(run, q)) totals.set(call.verb, (totals.get(call.verb) ?? 0) + call.n);
        }
    }
    return totals;
}

/** Plain cards: every numeric payoff leaf (rider, mechanics, effect intensity). */
function plainPayoffs(card: Card): number[] {
    return [
        card.free?.damage ?? 0, card.free?.guard ?? 0, card.free?.applyEffect?.intensity ?? 0,
        ...(card.specialMechanics ?? []).map(m => m.amount),
        ...(card.combatEffects ?? []).map(e => e.intensity ?? 0),
    ];
}

/** Program cards whose payoff numbers an upgrade leaves alone: no payoff verb
 *  anywhere, or only a formula or a resolved number ("GUARD equal to the
 *  foe's BLIZZARD"). Each set's own test pins them by id. */
function cardsWithNoPayoff(cards: readonly Card[]): string[] {
    return cards
        .filter(c => {
            if (!c.program || !canUpgrade(c)) return false;
            const base = verbTotals(c), up = verbTotals(upgradeCard(c)!);
            return ![...PAYOFF_VERBS].some(v => (up.get(v) ?? 0) !== (base.get(v) ?? 0));
        })
        .map(c => c.id);
}

describe('A3 — every upgrade makes the numbers bigger, never a cost', () => {
    const upgradable = cardLibrary.filter(canUpgrade);
    const noPayoff = new Set(cardsWithNoPayoff(cardLibrary));

    it('only the pinned cards have nothing to grow: two Blood Price, six Elementalist, five Defender', () => {
        expect(noPayoff.size).toBe(13);
        // The Defender's five: formulas and holds (THORNS or HEAL read off the fight, a Global GUARD
        // equal to THORNS, DRAW 1, RETRIEVE and the exile return).
        const defender = cardLibrary.filter(c => noPayoff.has(c.id) && c.tags?.includes('defender'));
        expect(defender.map(c => c.name)).toEqual(['Spite Growth', 'Bramble Carapace', 'Mend the Shell', 'Steady Shell', 'Rummage']);
    });

    it('covers every library card but the Curses', () => {
        expect(upgradable.length).toBe(cardLibrary.filter(c => c.cardType !== 'curse').length);
    });

    it('after each upgrade, at least one payoff number is higher (program cards by their verbs)', () => {
        const offenders: string[] = [];
        for (const card of upgradable) {
            if (noPayoff.has(card.id)) continue;
            let prev = card;
            for (const up of chain(card)) {
                if (prev.program) {
                    const a = verbTotals(prev), b = verbTotals(up);
                    const grew = [...PAYOFF_VERBS].some(v => (b.get(v) ?? 0) > (a.get(v) ?? 0));
                    const shrank = [...PAYOFF_VERBS].some(v => (b.get(v) ?? 0) < (a.get(v) ?? 0));
                    if (!grew || shrank) offenders.push(`${up.id}: payoffs ${grew ? 'shrank' : 'did not grow'}`);
                } else {
                    const a = plainPayoffs(prev), b = plainPayoffs(up);
                    if (!b.some((n, i) => n > a[i]) || b.some((n, i) => n < a[i])) offenders.push(`${up.id}: payoffs did not grow`);
                }
                prev = up;
            }
        }
        expect(offenders).toEqual([]);
    });

    it('no cost grows: SACRIFICE, TETHER and the SACRIFICE-X cap are the same, and EXILE stays', () => {
        const offenders: string[] = [];
        for (const card of upgradable.filter(c => c.program)) {
            const base = verbTotals(card);
            const baseExile = programLines(card).map(([, , exile]) => exile).join();
            for (const up of chain(card)) {
                const t = verbTotals(up);
                for (const v of COST_VERBS) {
                    if (RULED_COST_GROWTH[card.id]?.includes(v)) continue;
                    if ((t.get(v) ?? 0) !== (base.get(v) ?? 0)) offenders.push(`${up.id}: ${v} ${base.get(v)} -> ${t.get(v)}`);
                }
                if (programLines(up).map(([, , exile]) => exile).join() !== baseExile) offenders.push(`${up.id}: EXILE changed`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it('the face prints every payoff number the upgrade changed', () => {
        // The deep probe binds every cap, so a scaled literal or cap is what
        // the line applies; an amount equal to the base card's is a formula
        // ("DEAL 2X") or a resolved number, and the base honesty suites own it.
        const deep = PROBES[PROBES.length - 1];
        const offenders: string[] = [];
        // How many payoff changes only the flat "+n" escape below explains:
        // a live card must actually use it, or it is dead code pinning nothing.
        let flatPlusHits = 0;
        for (const card of upgradable.filter(c => c.program && !c.program.global)) {
            const baseLines = programLines(card);
            for (const up of chain(card)) {
                const text = cardLinesText(up);
                programLines(up).forEach(([name, run], li) => {
                    const printed = name === 'FREE' ? text.free : text.paid;
                    const nums = new Set(printed.match(/\d+/g) ?? []);
                    const before = record(baseLines[li][1], deep);
                    record(run, deep).forEach((call, ci) => {
                        if (!PAYOFF_VERBS.has(call.verb) || call.n === before[ci]?.n) return;
                        // "SACRIFICE any amount X (max m), DEAL kX": the deep probe pays the
                        // cap, so the hit is k times m, both printed.
                        const formula = /max (\d+)\).*?(\d+)X\./.exec(printed);
                        if (formula && call.n === Number(formula[1]) * Number(formula[2])) return;
                        // "doubled if the foe is FROZEN": the deep probe meets the
                        // condition, so the line applies twice the printed number.
                        if (/\bdoubled\b/.test(printed) && nums.has(String(call.n / 2))) return;
                        // "+n% per STORM", "n per different element": the printed rate
                        // times the deep probe's count.
                        const per = /per STORM/.test(printed) ? deep.storm : /per different element/.test(printed) ? deep.elementsOnFoe : 0;
                        if (per > 0 && nums.has(String(call.n / per))) return;
                        // "INFERNO equal to half the damage dealt": half the printed hit.
                        if (/\bhalf the damage dealt\b/.test(printed) && nums.has(String(call.n * 2))) return;
                        if (nums.has(String(call.n))) return;
                        // An uncapped read with a flat bonus ("DEAL all the VITAE you lost this
                        // combat +2"): the upgrade added exactly the printed "+n".
                        const delta = call.n - (before[ci]?.n ?? 0);
                        if (new RegExp(`\\+${delta}\\b`).test(printed)) { flatPlusHits += 1; return; }
                        offenders.push(`${up.id} ${name}: applies ${call.verb} ${call.n}, prints "${printed}"`);
                    });
                });
            }
        }
        expect(offenders).toEqual([]);
        // The escape above must earn its keep: at least one live, uncapped
        // line actually relies on it today (Phase NC1 A4), or it pins nothing.
        expect(flatPlusHits).toBeGreaterThan(0);
    });

    it('a Global prints its trigger bonus once upgraded', () => {
        const offenders: string[] = [];
        for (const card of upgradable.filter(c => c.program?.global)) {
            const g = card.program!.global!;
            if (!/\bn\b/.test(g.text)) continue;
            const up = upgradeCard(card)!;
            if (!/\bn\+2\b/.test(up.program!.global!.text)) offenders.push(`${up.id}: "${up.program!.global!.text}"`);
        }
        expect(offenders).toEqual([]);
    });

    it('the base card is unchanged by the scale at level 0', () => {
        for (const card of cardLibrary.filter(c => c.programAt)) {
            const again = card.programAt!({ level: 0, m: n => n, i: n => n, plus: 0 });
            expect([card.id, card.program?.free?.text, card.program?.paid?.text, card.program?.global?.text])
                .toEqual([card.id, again.free?.text, again.paid?.text, again.global?.text]);
        }
    });
});

// ── A4: the replace action ──────────────────────────────────────────────────

describe('A4 — REPLACE_CARD swaps one owned copy', () => {
    const owner = (knownCards: string[], combatRewardCards: string[] = []) =>
        ({ ...deepClone(Player), knownCards, combatRewardCards });

    it('replaces one copy in knownCards and keeps the duplicates', () => {
        const out = replaceCard(owner(['grey-strike', 'grey-ward', 'grey-strike']), 'grey-strike', 'grey-strike+');
        expect(out.knownCards).toEqual(['grey-strike+', 'grey-ward', 'grey-strike']);
    });

    it('reaches a reward card when knownCards has no copy', () => {
        const out = replaceCard(owner(['grey-ward'], ['grey-strike', 'grey-strike']), 'grey-strike', 'grey-strike+');
        expect(out.knownCards).toEqual(['grey-ward']);
        expect(out.combatRewardCards).toEqual(['grey-strike+', 'grey-strike']);
    });

    it('is a no-op when the card is not owned or the new id does not resolve', () => {
        const c = owner(['grey-ward']);
        expect(replaceCard(c, 'grey-strike', 'grey-strike+')).toBe(c);
        expect(replaceCard(c, 'grey-ward', 'grey-ward++')).toBe(c);
    });

    it('runs through the store as the REPLACE_CARD action', () => {
        const player = { ...deepClone(Player), knownCards: ['grey-strike', 'grey-strike'] };
        const store = createGameStore(nullAdapter, { ...createNewGameState(), player });
        store.getState().replaceCard('grey-strike', 'grey-strike+');
        expect(store.getState().player.knownCards).toEqual(['grey-strike+', 'grey-strike']);
    });
});
