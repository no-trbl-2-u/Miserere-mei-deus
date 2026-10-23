/**
 * GUARD — CARD UPGRADES (2026-09-02), the Slay the Spire progression axis.
 *
 * `upgradeCard` turns a card into its next `+` copy: an authored `Card.upgrade`
 * patch when one exists, the documented default rule otherwise
 * (`src/Cards/card-upgrades.ts`). These are bug detectors, not a balance
 * grade — they pin the properties an upgrade must never violate:
 *
 *   1. Every library card yields a STRUCTURALLY VALID upgraded copy.
 *   2. No number an upgrade touches goes DOWN (a `+` never subtracts) and no
 *      field is dropped.
 *   3. The id and name carry the `+` suffix.
 *   4. `paidSummary` never retains a stale number — the repo's one surviving
 *      text law (`src/Combat/e2e/paid-summary-honesty.engine.test.ts`), checked
 *      here with the SAME parity rule, against the upgraded payload.
 *   5. The input card is not mutated, and no state is shared with the copy.
 *   6. No upgrade prints an intensity above MAX_EFFECT_INTENSITY.
 */

import { describe, expect, it } from 'vitest';
import { cardLibrary } from '../cards.library';
import { lookupEffect } from '../../Effects';
import { paidText } from '../../Combat/combat.cards';
import { MAX_EFFECT_INTENSITY } from '../../Game/game-mechanics.constants';
import {
    baseCardId,
    getUpgradedCardById,
    isUpgradedCardId,
    upgradeCard,
    UPGRADE_SUFFIX,
} from '../card-upgrades';
import type { Card } from '../types';

/** The plain (non-program) cards of the curated library: the default rule's
 *  surface. Program cards grow through `programAt`; their suite is
 *  `card-upgrade-law.engine.test.ts`. */
const LIBRARY: readonly Card[] = cardLibrary.filter(c => !c.program);

/** One upgrade of a card that has one left (every plain library card is common). */
function up1(card: Card): Card {
    const up = upgradeCard(card);
    if (!up) throw new Error(`${card.id} refused its first upgrade`);
    return up;
}

/** Flatten every numeric leaf of a card to `path -> value`. */
function numericLeaves(value: unknown, path = '', out = new Map<string, number>()): Map<string, number> {
    if (typeof value === 'number') {
        out.set(path, value);
    } else if (Array.isArray(value)) {
        value.forEach((v, i) => numericLeaves(v, `${path}[${i}]`, out));
    } else if (value !== null && typeof value === 'object') {
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            numericLeaves(v, path ? `${path}.${k}` : k, out);
        }
    }
    return out;
}

/** The numeric payload the card FACE prints (the honesty law's surface). */
function facePayload(card: Card): Map<string, number> {
    return numericLeaves({
        combatEffects: card.combatEffects ?? null,
        specialMechanics: card.specialMechanics ?? null,
    });
}

function changedSomething(base: Card, up: Card): boolean {
    const a = numericLeaves(base);
    const b = numericLeaves(up);
    for (const [path, n] of a) if (b.get(path) !== n) return true;
    return b.size !== a.size;
}

describe('card upgrades — structure', () => {
    it('every library card yields an upgraded copy with the + suffix', () => {
        const offenders: string[] = [];
        for (const card of LIBRARY) {
            const up = up1(card);
            if (up.id !== `${card.id}${UPGRADE_SUFFIX}`) offenders.push(`${card.id} → id "${up.id}"`);
            if (!up.name.endsWith(UPGRADE_SUFFIX)) offenders.push(`${card.id} → name "${up.name}"`);
            if (up.name === card.name) offenders.push(`${card.id} → name unchanged`);
        }
        expect(offenders).toEqual([]);
    });

    it('the upgraded copy keeps the card identity fields', () => {
        const offenders: string[] = [];
        for (const card of LIBRARY) {
            const up = up1(card);
            if (up.rank !== card.rank) offenders.push(`${card.id}: rank`);
            if (up.tier !== card.tier) offenders.push(`${card.id}: tier`);
            if (up.cardType !== card.cardType) offenders.push(`${card.id}: cardType`);
            if (up.targetType !== card.targetType) offenders.push(`${card.id}: targetType`);
            if (up.color !== card.color) offenders.push(`${card.id}: aspect`);
            // The FREE-line law (constraint 2) survives the upgrade.
            const hadFree = card.free !== undefined;
            if (hadFree && up.free === undefined) offenders.push(`${card.id}: lost its FREE line`);
        }
        expect(offenders).toEqual([]);
    });

    it('the upgrade never drops or re-shapes a mechanic or an effect', () => {
        const offenders: string[] = [];
        for (const card of LIBRARY) {
            const up = up1(card);
            const before = (card.specialMechanics ?? []).map(m => m.kind).join(',');
            const after = (up.specialMechanics ?? []).map(m => m.kind).join(',');
            if (before !== after) offenders.push(`${card.id}: mechanics ${before} → ${after}`);
            const be = (card.combatEffects ?? []).map(e => `${e.effectId}/${e.appliedTo}`).join(',');
            const ae = (up.combatEffects ?? []).map(e => `${e.effectId}/${e.appliedTo}`).join(',');
            if (be !== ae) offenders.push(`${card.id}: effects ${be} → ${ae}`);
        }
        expect(offenders).toEqual([]);
    });

    it('an upgraded copy carries no upgrade patch of its own (the patch is the first upgrade only)', () => {
        for (const card of LIBRARY) expect(up1(card).upgrade).toBeUndefined();
    });
});

describe('card upgrades — a + never subtracts', () => {
    it('no numeric field goes DOWN, and none is dropped', () => {
        const offenders: string[] = [];
        for (const card of LIBRARY) {
            const up = up1(card);
            const before = numericLeaves(card);
            const after = numericLeaves(up);
            for (const [path, n] of before) {
                const m = after.get(path);
                if (m === undefined) {
                    offenders.push(`${card.id} → dropped ${path} (${n})`);
                } else if (m < n) {
                    offenders.push(`${card.id} → ${path} ${n} → ${m}`);
                }
            }
        }
        expect(offenders).toEqual([]);
    });

    it('no upgrade prints an intensity above MAX_EFFECT_INTENSITY', () => {
        const offenders: string[] = [];
        for (const card of LIBRARY) {
            for (const [path, n] of numericLeaves(up1(card))) {
                if (/intensity$/i.test(path) && n > MAX_EFFECT_INTENSITY) {
                    offenders.push(`${card.id} → ${path} = ${n}`);
                }
            }
        }
        expect(offenders).toEqual([]);
    });

    it('the default rule raises SOMETHING on every card that has a number to raise', () => {
        const inert = LIBRARY
            .filter(c => !changedSomething(c, up1(c)))
            .map(c => c.id);
        expect(inert).toEqual([]);
    });

    it('never raises a self-inflicted debuff (a cost wearing an effect)', () => {
        const offenders: string[] = [];
        for (const card of LIBRARY) {
            const up = up1(card);
            (card.combatEffects ?? []).forEach((ce, i) => {
                if (ce.appliedTo !== 'self' || !ce.effectId.startsWith('debuff_')) return;
                const after = up.combatEffects?.[i];
                if (after?.intensity !== ce.intensity) offenders.push(`${card.id} → self ${ce.effectId}`);
            });
            const ae = card.free?.applyEffect;
            if (ae?.to === 'self' && ae.effectId.startsWith('debuff_')) {
                if (up.free?.applyEffect?.intensity !== ae.intensity) {
                    offenders.push(`${card.id} → FREE self ${ae.effectId}`);
                }
            }
        }
        expect(offenders).toEqual([]);
    });
});

describe('card upgrades — paidSummary never lies', () => {
    it('an upgraded card whose printed payload changed does not keep the old face', () => {
        const offenders: string[] = [];
        for (const card of LIBRARY) {
            if (card.paidSummary === undefined) continue;
            const up = up1(card);
            const before = [...facePayload(card).entries()].join('|');
            const after = [...facePayload(up).entries()].join('|');
            if (before !== after && up.paidSummary !== undefined && !card.upgrade?.paidSummary) {
                offenders.push(`${card.id} → kept "${up.paidSummary}"`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it('every surviving paidSummary still passes the number-parity law', () => {
        const offenders: string[] = [];
        for (const card of LIBRARY) {
            const up = up1(card);
            if (up.paidSummary === undefined) continue;
            // Same normalisation as paid-summary-honesty.engine.test.ts: DOOM's
            // explanatory "+1 each time the foe acts" is a rule, not a number
            // this card applies.
            const generated = paidText(up, lookupEffect)
                .replace(/\(grows \+1 each time the foe acts\)/g, '');
            const applied = [...new Set(generated.match(/\d+(?:\.\d+)?/g) ?? [])];
            const missing = applied.filter(n => !(up.paidSummary as string).includes(n));
            if (missing.length) offenders.push(`${up.id} → missing [${missing.join(', ')}] in "${up.paidSummary}"`);
        }
        expect(offenders).toEqual([]);
    });

    it('a face that only changed its FREE line keeps its authored sentence', () => {
        // `paidText` reads combatEffects + specialMechanics only, so a FREE-only
        // upgrade leaves the PAID sentence true.
        const card: Card = {
            id: 'fixture-free-only', name: 'Fixture', color: 'mind',
            description: 'x', tier: 1, rank: 1, cardType: 'spell', targetType: 'enemy',
            paidSummary: 'Nothing more.',
            free: { damage: 2 },
        };
        const up = up1(card);
        expect(up.free?.damage).toBe(4);
        expect(up.paidSummary).toBe('Nothing more.');
    });
});

describe('card upgrades — purity', () => {
    it('never mutates the input card', () => {
        const offenders: string[] = [];
        for (const card of LIBRARY) {
            const snapshot = JSON.stringify(card);
            up1(card);
            if (JSON.stringify(card) !== snapshot) offenders.push(card.id);
        }
        expect(offenders).toEqual([]);
    });

    it('shares no object with the input card', () => {
        // After the card purge (P1, 2026-09-27) no library card carries all
        // three payload shapes at once, so the witness joins A Plain Blow's
        // mechanic + FREE line with A Plain Word's status.
        const strike = LIBRARY.find(c => c.id === 'grey-strike');
        const word = LIBRARY.find(c => c.id === 'grey-word');
        expect(strike?.specialMechanics?.length).toBeGreaterThan(0);
        expect(word?.combatEffects?.length).toBeGreaterThan(0);
        const card: Card = { ...strike!, id: 'upgrade-purity-witness', combatEffects: word!.combatEffects };
        expect(card.free).toBeDefined();
        const up = up1(card);
        expect(up).not.toBe(card);
        expect(up.specialMechanics).not.toBe(card.specialMechanics);
        expect(up.specialMechanics?.[0]).not.toBe(card.specialMechanics?.[0]);
        expect(up.combatEffects?.[0]).not.toBe(card.combatEffects?.[0]);
        expect(up.free).not.toBe(card.free);
        // Mutating the copy cannot reach back into the library.
        const before = JSON.stringify(card);
        (up.combatEffects as { intensity?: number }[])[0].intensity = 99;
        expect(JSON.stringify(card)).toBe(before);
    });

    it('is deterministic — the same card upgrades to the same copy every time', () => {
        for (const card of LIBRARY) {
            expect(JSON.stringify(up1(card))).toBe(JSON.stringify(up1(card)));
        }
    });
});

describe('card upgrades — the default rule numbers', () => {
    const fixture = (over: Partial<Card>): Card => ({
        id: 'fx', name: 'Fx', color: 'body', description: 'x',
        tier: 1, rank: 1, cardType: 'spell', targetType: 'enemy', ...over,
    });

    it('MAGNITUDE is +40%, at least +2', () => {
        const cases: [number, number][] = [[6, 8], [7, 10], [8, 11], [12, 17], [14, 20], [22, 31], [45, 63]];
        for (const [from, to] of cases) {
            const up = up1(fixture({ specialMechanics: [{ kind: 'deal', amount: from }] }));
            expect([from, (up.specialMechanics?.[0] as { amount: number }).amount]).toEqual([from, to]);
        }
    });

    it('DoT intensity is +1 (duration untouched); a FREE line grows by MAGNITUDE', () => {
        const up = up1(fixture({
            free: { damage: 2, guard: 5 },
            combatEffects: [{ effectId: 'debuff_poison', appliedTo: 'opponent', intensity: 4, duration: 3 }],
        }));
        expect(up.free).toEqual({ damage: 4, guard: 7 });
        expect(up.combatEffects?.[0]).toMatchObject({ intensity: 5, duration: 3 });
    });

    it('clamps a DoT at MAX_EFFECT_INTENSITY rather than printing past it', () => {
        const up = up1(fixture({
            combatEffects: [{ effectId: 'debuff_poison', appliedTo: 'opponent', intensity: MAX_EFFECT_INTENSITY }],
        }));
        expect(up.combatEffects?.[0].intensity).toBe(MAX_EFFECT_INTENSITY);
    });
});

describe('card upgrades — an authored patch wins over the default', () => {
    const base: Card = {
        id: 'authored', name: 'Authored', color: 'heart', description: 'x',
        tier: 2, rank: 3, cardType: 'spell', targetType: 'enemy',
        paidSummary: 'Deal 7. Inflict BLEED 4 for 2 turns.',
        free: { damage: 4 },
        combatEffects: [{ effectId: 'debuff_bleed', appliedTo: 'opponent', intensity: 4, duration: 2 }],
        specialMechanics: [{ kind: 'deal', amount: 7 }],
        upgrade: {
            mechanics: [{ kind: 'deal', fields: { amount: 1 } }],
            effects: [{ effectId: 'debuff_bleed', duration: 1 }],
            paidSummary: 'Deal 8. Inflict BLEED 4 for 3 turns.',
        },
    };

    it('applies the patch instead of the default rule', () => {
        const up = up1(base);
        // The default would have raised `amount` to 10 and intensity to 5.
        expect(up.specialMechanics?.[0]).toEqual({ kind: 'deal', amount: 8 });
        expect(up.combatEffects?.[0]).toMatchObject({ intensity: 4, duration: 3 });
        expect(up.free).toEqual({ damage: 4 });
        expect(up.paidSummary).toBe('Deal 8. Inflict BLEED 4 for 3 turns.');
        expect(up.id).toBe('authored+');
        expect(up.name).toBe('Authored+');
    });

    it('clears the face when the patch changes numbers and supplies no new sentence', () => {
        const silent: Card = { ...base, upgrade: { mechanics: [{ kind: 'deal', fields: { amount: 5 } }] } };
        const up = up1(silent);
        expect(up.paidSummary).toBeUndefined();
        expect((up.specialMechanics?.[0] as { amount: number }).amount).toBe(12);
    });

    it('clamps a negative delta to zero — a + never subtracts', () => {
        const sneaky: Card = { ...base, upgrade: { mechanics: [{ kind: 'deal', fields: { amount: -5 } }] } };
        expect((up1(sneaky).specialMechanics?.[0] as { amount: number }).amount).toBe(7);
    });

    it('targets one occurrence of a repeated kind with `index`', () => {
        const twoDeals: Card = {
            ...base,
            specialMechanics: [{ kind: 'deal', amount: 7 }, { kind: 'deal', amount: 3 }],
            upgrade: { mechanics: [{ kind: 'deal', index: 1, fields: { amount: 4 } }] },
        };
        expect(up1(twoDeals).specialMechanics).toEqual([
            { kind: 'deal', amount: 7 }, { kind: 'deal', amount: 7 },
        ]);
    });

    it('an authored name / description override the derived ones', () => {
        const renamed: Card = { ...base, upgrade: { name: 'The Second Cut', description: 'y' } };
        const up = up1(renamed);
        expect(up.name).toBe('The Second Cut');
        expect(up.description).toBe('y');
        expect(up.id).toBe('authored+');
    });
});

describe('getUpgradedCardById', () => {
    const sample = LIBRARY[0];

    it('resolves a + id to the upgraded card', () => {
        const up = getUpgradedCardById(`${sample.id}+`);
        expect(up).toBeDefined();
        expect(up?.id).toBe(`${sample.id}+`);
        expect(JSON.stringify(up)).toBe(JSON.stringify(up1(sample)));
    });

    it('accepts the bare base id too', () => {
        expect(getUpgradedCardById(sample.id)?.id).toBe(`${sample.id}+`);
    });

    it('returns undefined for an unknown card', () => {
        expect(getUpgradedCardById('no-such-card+')).toBeUndefined();
    });

    it('resolves every library card', () => {
        const missing = LIBRARY.filter(c => getUpgradedCardById(`${c.id}+`) === undefined).map(c => c.id);
        expect(missing).toEqual([]);
    });

    it('baseCardId / isUpgradedCardId are the id law', () => {
        expect(baseCardId('spoiled-poultice+')).toBe('spoiled-poultice');
        expect(baseCardId('spoiled-poultice')).toBe('spoiled-poultice');
        expect(isUpgradedCardId('spoiled-poultice+')).toBe(true);
        expect(isUpgradedCardId('spoiled-poultice')).toBe(false);
    });
});
