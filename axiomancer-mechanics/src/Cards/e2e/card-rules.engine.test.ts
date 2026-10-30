/**
 * Hermetic E2E — the card-rules fence (Phase CS1).
 *
 * Runs every ratified text rule (`Cards/card-rules.ts`) over every library
 * card (the grey office and every registered trial set) and fails on:
 *   · a violation the exemptions fixture does not list (a new card broke a rule);
 *   · a listed exemption that no longer violates (stale: delete its row).
 *
 * Pin, then fail (T, 2026-10-12): today's offenders are pinned in
 * `card-rules.exemptions.json` with a reason and an AUDIT row; the fence is
 * for new cards. Re-seed after T's card session fixes or rules on them:
 *
 *   CARD_RULES_SEED=1 npx vitest run src/Cards/e2e/card-rules.engine.test.ts
 *
 * Seeding keeps each surviving row's reason and date, drops fixed ones and
 * adds new ones as pinned, so a re-seed at HEAD writes no diff.
 *
 * This file names no trial card id (the trial-set removal test forbids it);
 * the fixture is JSON.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

import type { Card } from '../types';
import { cardLibrary } from '../cards.library';
import { upgradeCard } from '../card-upgrades';
import {
    checkCarrierRule, checkComplexityBudget, checkDiscardCost, checkGlobalTemplate, checkScrapFloor, checkSpellLaw,
    parseAtlasKeywords, printedKeywords,
    type CardRuleId, type CardRuleViolation,
} from '../card-rules';
import { RESERVE_MAX, RESERVE_PIP_CAP } from '../../Combat/combat.dice';
import { SPECIAL_CONVICTION_DEFAULT, UPGRADEABLE_DIE_COLORS } from '../../Combat/combat.upgradeable-dice';
import { CONVICTION_CAP } from '../../Combat/combat.engine';
import { ANVIL_VERB_PRICING } from '../../World/Blacksmith/blacksmith.engine';
import { EnemyLibrary } from '../../Enemy/enemy.library';
import { enemyPhaseKeywords } from '../../Enemy/enemy-keywords';

const ATLAS_PATH = path.resolve(__dirname, '../../../docs/keyword-atlas.md');
const FIXTURE_PATH = path.resolve(__dirname, 'card-rules.exemptions.json');
const SEED = process.env.CARD_RULES_SEED === '1';
const PINNED_REASON = "pinned at CS1, awaits T's card session";

interface Exemption {
    rule: CardRuleId;
    id: string;
    reason: string;
    filed: string;
}

const ATLAS = parseAtlasKeywords(fs.readFileSync(ATLAS_PATH, 'utf8'));
const CARD_KEYWORDS = new Set(ATLAS.filter(a => a.kind === 'card').map(a => a.word));

/**
 * Words carried outside the card library (the carrier rule's list: dice and blacksmith
 * systems, the engine's resources). Each names the live code that carries
 * it; the imports fail to compile if that code goes.
 */
const NON_CARD_CARRIERS: ReadonlyMap<string, string> = new Map([
    ['PIP', `Reserve dice ripen pips (RESERVE_PIP_CAP ${RESERVE_PIP_CAP})`],
    ['RESERVE', `the Reserve (RESERVE_MAX ${RESERVE_MAX})`],
    ['BOON', `every die's special face (SPECIAL_CONVICTION_DEFAULT ${SPECIAL_CONVICTION_DEFAULT})`],
    ['HONE', `the anvil (ANVIL_VERB_PRICING.hone ${ANVIL_VERB_PRICING.hone})`],
    ['TEMPER', `the anvil (ANVIL_VERB_PRICING.temper ${ANVIL_VERB_PRICING.temper})`],
    ['CONVICTION', `the Conviction pool (CONVICTION_CAP ${CONVICTION_CAP})`],
    ['WILD', `the gold die (${UPGRADEABLE_DIE_COLORS.includes('wild') ? 'wild' : 'missing'})`],
]);

/** Enemy words by how many live foes' moves carry them (`enemyPhaseKeywords`). */
const ENEMY_CARRIERS: ReadonlyMap<string, number> = (() => {
    const counts = new Map<string, number>();
    for (const enemy of EnemyLibrary) {
        for (const k of enemyPhaseKeywords(enemy)) counts.set(k.toUpperCase(), (counts.get(k.toUpperCase()) ?? 0) + 1);
    }
    return counts;
})();

/** System words the admission bar skips (ballot §8). */
const BAR_EXEMPT: ReadonlySet<string> = new Set(['CONVICTION', 'RESERVE', 'WILD', 'PIP']);

function allViolations(cards: readonly Card[]): CardRuleViolation[] {
    return [
        ...checkComplexityBudget(cards, CARD_KEYWORDS),
        ...checkScrapFloor(cards),
        ...checkGlobalTemplate(cards),
        ...checkCarrierRule({
            cards, atlas: ATLAS, nonCardCarriers: NON_CARD_CARRIERS, enemyCarriers: ENEMY_CARRIERS, barExempt: BAR_EXEMPT,
        }),
        ...checkSpellLaw(cards),
        ...checkDiscardCost(cards),
    ];
}

const key = (r: { rule: string; id: string }): string => `${r.rule} ${r.id}`;

function loadExemptions(): Exemption[] {
    if (!fs.existsSync(FIXTURE_PATH)) return [];
    return JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8')) as Exemption[];
}

/** Writes the fixture: every current violation, keeping a surviving row's reason and date. */
function seedExemptions(violations: readonly CardRuleViolation[], prior: readonly Exemption[]): void {
    const kept = new Map(prior.map(e => [key(e), e]));
    const today = new Date().toISOString().slice(0, 10);
    const rows = violations
        .map(v => kept.get(key(v)) ?? { rule: v.rule, id: v.id, reason: PINNED_REASON, filed: today })
        .sort((a, b) => key(a).localeCompare(key(b)));
    const unique = rows.filter((r, i) => i === 0 || key(r) !== key(rows[i - 1]));
    fs.writeFileSync(FIXTURE_PATH, `${JSON.stringify(unique, null, 2)}\n`);
}

const LIVE = allViolations(cardLibrary);
if (SEED) seedExemptions(LIVE, loadExemptions());
const EXEMPTIONS = loadExemptions();
const EXEMPT_KEYS = new Set(EXEMPTIONS.map(key));
const LIVE_KEYS = new Set(LIVE.map(key));

describe('the card-rules fence reads real inputs', () => {
    it('runs over every library card, grey and trial', () => {
        expect(cardLibrary.length).toBeGreaterThan(3);
        expect(cardLibrary.some(c => c.tags?.includes('grey'))).toBe(true);
        expect(cardLibrary.some(c => c.tags?.includes('trial'))).toBe(true);
    });

    it('parses the atlas into Card, Rule and system rows', () => {
        const kinds = new Map(ATLAS.map(a => [a.word, a.kind]));
        expect(kinds.get('DEAL')).toBe('card');
        expect(kinds.get('SACRIFICE')).toBe('card');
        expect(kinds.get('EXILE')).toBe('rule');
        expect(kinds.get('GLOBAL')).toBe('rule');
        expect(kinds.get('CONVICTION')).toBe('system');
    });

    it('every exemption row is well formed', () => {
        for (const e of EXEMPTIONS) {
            expect(['complexity-budget', 'scrap-floor', 'global-template', 'carrier-rule', 'spell-law']).toContain(e.rule);
            expect(e.reason.length).toBeGreaterThan(0);
            expect(e.filed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
        expect(new Set(EXEMPTIONS.map(key)).size).toBe(EXEMPTIONS.length);
    });
});

for (const rule of ['complexity-budget', 'scrap-floor', 'global-template', 'carrier-rule', 'spell-law'] as const) {
    describe(`rule: ${rule}`, () => {
        it('no card breaks it unless the fixture pins the break', () => {
            const fresh = LIVE.filter(v => v.rule === rule && !EXEMPT_KEYS.has(key(v)))
                .map(v => `${v.id}: ${v.detail}`);
            expect(fresh).toEqual([]);
        });

        it('every pinned break still happens (no stale exemption)', () => {
            const stale = EXEMPTIONS.filter(e => e.rule === rule && !LIVE_KEYS.has(key(e))).map(e => e.id);
            expect(stale).toEqual([]);
        });
    });
}

// ── Each rule fires on a card built to break it ─────────────────────────────

const base: Card = {
    id: 'synthetic', name: 'Synthetic', color: 'any', description: 'A test card.',
    tier: 1, rank: 1, cardType: 'skill', targetType: 'self',
};

describe('each rule fires on a synthetic breaker', () => {
    it('complexity budget: an Ash card with two keywords and a condition', () => {
        const card: Card = { ...base, id: 'syn-budget', program: {
            free: { text: 'SACRIFICE 2, LEECH 1, or 2 at half VITAE or less.', run: () => {} },
            paid: { text: 'SACRIFICE 4.', run: () => {} },
        } };
        const v = allViolations([...cardLibrary, card]).filter(x => x.id === 'syn-budget');
        expect(v.map(x => x.rule)).toContain('complexity-budget');
    });

    it('scrap floor: a PAID line that only gains 1 Conviction', () => {
        const card: Card = { ...base, id: 'syn-scrap', program: {
            free: { text: 'GUARD 3.', run: c => { c.guard(3); } },
            paid: { text: 'Gain 1 Conviction.', run: c => { c.conviction(1); } },
        } };
        expect(checkScrapFloor([card]).map(x => x.id)).toEqual(['syn-scrap']);
    });

    it('Global template: a body that prints its own duration', () => {
        const card: Card = { ...base, id: 'syn-global', cardType: 'global', program: {
            global: { trigger: 'turn', text: 'GUARD 2 for 3 turns.', free: c => { c.guard(2); }, paid: c => { c.guard(2); } },
        } };
        expect(checkGlobalTemplate([card]).map(x => x.id)).toEqual(['syn-global']);
    });

    it('carrier rule: a card that prints a word with no atlas row', () => {
        const card: Card = { ...base, id: 'syn-carrier', paidSummary: 'SMITE 4.' };
        expect(printedKeywords(card)).toContain('SMITE');
        const v = checkCarrierRule({ cards: [...cardLibrary, card], atlas: ATLAS, nonCardCarriers: NON_CARD_CARRIERS, barExempt: BAR_EXEMPT });
        expect(v.map(x => x.id)).toContain('syn-carrier:SMITE');
    });
});

// ── The Spell law over every lane, upgrades included ───────────────────────

describe('the Spell law (T, 2026-10-24)', () => {
    const spells = cardLibrary.filter(c => c.cardType === 'spell');
    const held = new Set(EXEMPTIONS.filter(e => e.rule === 'spell-law').map(e => e.id));

    it('reads every Spell: the grey Word and the four trial lanes; A Plain Word, one Defender Spell and three Merciful Spells are held, for T', () => {
        expect(spells.length).toBe(26);
        expect(held.size).toBe(5);
        expect(held.has('grey-word')).toBe(true);
        const lanesOf = (tag: string): number =>
            [...held].filter(id => cardLibrary.find(c => c.id === id)?.tags?.includes(tag)).length;
        expect([lanesOf('defender'), lanesOf('merciful')]).toEqual([1, 3]);
        expect(spells.some(c => c.tags?.includes('grey'))).toBe(true);
        expect(spells.some(c => c.tags?.includes('blood-price'))).toBe(true);
        expect(spells.some(c => c.tags?.includes('elementalist'))).toBe(true);
        expect(spells.some(c => c.tags?.includes('defender'))).toBe(true);
        expect(spells.some(c => c.tags?.includes('merciful'))).toBe(true);
    });

    it('every upgraded Spell keeps EXILE on PAID and stays a step past its baseline', () => {
        const ups: Card[] = [];
        const lawful = spells.filter(c => !held.has(c.id));
        for (const card of lawful) for (let c = upgradeCard(card); c; c = upgradeCard(c)) ups.push(c);
        expect(ups.length).toBeGreaterThanOrEqual(lawful.length);
        expect(checkSpellLaw(ups).map(v => `${v.id}: ${v.detail}`)).toEqual([]);
    });

    it('fires on a Spell whose PAID does not EXILE, whose FREE does, or whose PAID is not a step up', () => {
        const spell: Card = { ...base, cardType: 'spell', spellLawBaseline: { guard: 5 } };
        const noExile: Card = { ...spell, id: 'syn-no-exile', program: {
            free: { text: 'GUARD 2.', run: c => { c.guard(2); } },
            paid: { text: 'GUARD 7.', run: c => { c.guard(7); } },
        } };
        const freeExile: Card = { ...spell, id: 'syn-free-exile', program: {
            free: { text: 'GUARD 2. EXILE.', run: c => { c.guard(2); }, exile: true },
            paid: { text: 'GUARD 7. EXILE.', run: c => { c.guard(7); }, exile: true },
        } };
        const flat: Card = { ...spell, id: 'syn-flat', program: {
            free: { text: 'GUARD 2.', run: c => { c.guard(2); } },
            paid: { text: 'GUARD 6. EXILE.', run: c => { c.guard(6); }, exile: true },
        } };
        const plain: Card = { ...base, cardType: 'spell', id: 'syn-plain', specialMechanics: [{ kind: 'guard', amount: 7 }] };
        const v = checkSpellLaw([noExile, freeExile, flat, plain]);
        expect(v.map(x => x.id)).toEqual(['syn-no-exile', 'syn-free-exile', 'syn-flat', 'syn-plain']);
        expect(v[0].detail).toContain('PAID does not EXILE');
        expect(v[1].detail).toContain('FREE EXILEs');
        expect(v[2].detail).toContain('needs at least 7');
        expect(v[3].detail).toContain('PAID does not EXILE');
        expect(v[3].detail).toContain('no spellLawBaseline');
    });
});
