/**
 * CARD RULES — the ratified text rules as pure checkers (Phase CS1).
 *
 * Each checker reads cards (and, for the carrier rule, the keyword atlas)
 * and returns the cards or words that break it. They judge nothing that T
 * has not ratified: the complexity budget by rank (atlas bands, card-spec
 * ballot §9), the scrap floor and the Global text template (T, 2026-09-30,
 * `plan/revamp/cards.md`) and the carrier rule with its admission bar
 * (ballot §8). `docs/card-spec.md` §17 maps each rule to its test.
 *
 * The fence is `e2e/card-rules.engine.test.ts`: it runs every checker over
 * every library card and fails on a violation that its exemptions fixture
 * does not list. B5's card-creator can call the same functions.
 *
 * Pure: no I/O. Callers pass the atlas rows and the non-card carriers.
 *
 * Functions:
 *   cardLinesText(card)                 the printed FREE / PAID text
 *   printedKeywords(card)               the uppercase words a card prints
 *   cardConditions(card)                its trigger and condition labels
 *   parseAtlasKeywords(markdown)        atlas rows with their Card / Rule kind
 *   checkComplexityBudget(cards, kws)   keywords and conditions by rank
 *   checkScrapFloor(cards)              a line that only gains 1 Conviction
 *   checkGlobalTemplate(cards)          trigger first, no duration, PAID only if it differs
 *   checkCarrierRule(input)             every atlas word carried; every printed word in the atlas
 *   spellPaidPayoffs(card)              a Spell's applied PAID payoffs at the law's probe
 *   checkSpellLaw(cards)                a Spell's PAID EXILEs, its FREE does not, its PAID is a step up
 */

import type { Card, CardRank } from './types';
import type { ProgramCtx, ProgramQuery } from './card-program.types';
import { GLOBAL_TRIGGER_TEXT, programFaceText } from '../Combat/combat.cards';
import { magnitudeStep, UPGRADE_INTENSITY_STEP } from './card-upgrade.scale';

/** The rules this module checks; the exemptions fixture keys on these. */
export type CardRuleId = 'complexity-budget' | 'scrap-floor' | 'global-template' | 'carrier-rule' | 'spell-law' | 'discard-cost';

/** One break of one rule. `id` is a card id, an atlas word, or `cardId:WORD`. */
export interface CardRuleViolation {
    readonly rule: CardRuleId;
    readonly id: string;
    readonly detail: string;
}

/** An atlas row's section: a Card keyword (on a card face), a Rule keyword
 *  (lives on the board: the EXILE pile, the GLOBAL space), a system term, or
 *  an enemy keyword. Ballot §9. */
export type AtlasKeywordKind = 'card' | 'rule' | 'system' | 'enemy';

export interface AtlasKeyword {
    readonly word: string;
    readonly kind: AtlasKeywordKind;
}

/** Uppercase words a face prints that are not keywords. */
const STRUCTURAL_UPPER: ReadonlySet<string> = new Set(['FREE', 'PAID', 'VITAE', 'HP', 'X']);

/** The two verbs the budget never counts (ballot §9: "other than DEAL and GUARD"). */
const BUDGET_FREE_VERBS: ReadonlySet<string> = new Set(['DEAL', 'GUARD']);

/**
 * The complexity budget by rank (atlas bands, ratified as written, ballot
 * §9): Ash/Tooth at most 1 keyword beyond DEAL/GUARD and no condition;
 * Splinter/Rib at most 2 and one condition; Skull/Saint unbudgeted.
 */
export const COMPLEXITY_BUDGET: Readonly<Record<CardRank, { keywords: number; conditions: number } | null>> =
    Object.freeze({
        1: { keywords: 1, conditions: 0 },
        2: { keywords: 1, conditions: 0 },
        3: { keywords: 2, conditions: 1 },
        4: { keywords: 2, conditions: 1 },
        5: null,
        6: null,
    });

/** Condition phrases in printed text, each with the label it counts as. A
 *  Global's trigger and a line's `requires` count too (`cardConditions`). */
const CONDITION_PHRASES: readonly (readonly [RegExp, string])[] = [
    [/\bat half VITAE or less\b/i, 'at half VITAE'],
    [/\beach time\b/i, 'each time'],
    [/\bwhen you\b/i, 'when you'],
    [/\bif\b/i, 'if'],
];

/** Number tokens (`{deal:7}`) print as their number. */
const untoken = (text: string): string => text.replace(/\{[a-z]+:(\d+)\}/g, '$1');

/** `debuff_vulnerable` → `VULNERABLE`. */
const effectWord = (effectId: string): string => effectId.replace(/^(debuff|buff)_/, '').toUpperCase();

/**
 * The text a card prints on its FREE and PAID lines. A program card prints
 * its lines (`programFaceText`, a Global's trigger opener included); a plain
 * card prints its `paidSummary` and the rider and mechanic words it implies.
 */
export function cardLinesText(card: Card): { free: string; paid: string } {
    if (card.program) {
        const face = programFaceText(card);
        return { free: untoken(face.free), paid: untoken(face.paid) };
    }
    const free: string[] = [];
    if (card.free?.damage) free.push(`DEAL ${card.free.damage}`);
    if (card.free?.guard) free.push(`GUARD ${card.free.guard}`);
    if (card.free?.applyEffect) free.push(effectWord(card.free.applyEffect.effectId));
    const paid = card.paidSummary ?? [
        ...(card.specialMechanics ?? []).map(m => `${m.kind.toUpperCase()} ${m.amount}`),
        ...(card.combatEffects ?? []).map(e => effectWord(e.effectId)),
    ].join(', ');
    return { free: free.join(', '), paid };
}

/**
 * Every uppercase word the card prints (both lines), plus GLOBAL or CURSE
 * when that is its type, sorted. Structural words (FREE, PAID, VITAE) are
 * not keywords.
 */
export function printedKeywords(card: Card): string[] {
    const { free, paid } = cardLinesText(card);
    const words = new Set<string>();
    for (const run of `${free} ${paid}`.match(/[A-Z]{2,}/g) ?? []) {
        if (!STRUCTURAL_UPPER.has(run)) words.add(run);
    }
    if (card.cardType === 'global' || card.cardType === 'curse') words.add(card.cardType.toUpperCase());
    return [...words].sort();
}

/** The distinct conditions a card carries: a Global trigger, a line's
 *  `requires`, and the condition phrases its text prints. Sorted labels. */
export function cardConditions(card: Card): string[] {
    const labels = new Set<string>();
    const g = card.program?.global;
    if (g) labels.add(`trigger: ${g.trigger}`);
    const texts = [card.program?.free, card.program?.paid]
        .flatMap(line => line ? [line.text, line.requires?.why ?? ''] : []);
    if (g) texts.push(g.text, g.paidDelta ?? '');
    if (!card.program) texts.push(card.paidSummary ?? '');
    for (const [re, label] of CONDITION_PHRASES) {
        if (texts.some(t => re.test(t))) labels.add(label);
    }
    for (const line of [card.program?.free, card.program?.paid]) {
        if (line?.requires && !CONDITION_PHRASES.some(([re]) => re.test(line.requires!.why))) {
            labels.add(`requires: ${line.requires.why}`);
        }
    }
    return [...labels].sort();
}

/**
 * The keyword atlas's rows with their kind, from the markdown. A row's kind
 * is its `##` section: "Card keywords", "Rule keywords", "System terms",
 * "Enemy keywords". The word is the row's first cell's first word, without
 * bold or code marks (`**DEAL N**` → `DEAL`, `CONVICTION ◆` → `CONVICTION`).
 *
 * @throws when no row is found, so a reshaped atlas cannot pass vacuously.
 */
export function parseAtlasKeywords(markdown: string): AtlasKeyword[] {
    const out: AtlasKeyword[] = [];
    let kind: AtlasKeywordKind | null = null;
    for (const line of markdown.split(/\r?\n/)) {
        const h2 = /^## (.+)$/.exec(line);
        if (h2) {
            const title = h2[1].toLowerCase();
            kind = title.startsWith('card keywords') ? 'card'
                : title.startsWith('rule keywords') ? 'rule'
                : title.startsWith('system terms') ? 'system'
                : title.startsWith('enemy keywords') ? 'enemy'
                : null;
            continue;
        }
        if (!kind || !line.trim().startsWith('|')) continue;
        const first = line.split('|')[1]?.trim() ?? '';
        if (!first || /^:?-+:?$/.test(first) || /^(keyword|term)$/i.test(first)) continue;
        const word = first.replace(/[`*]/g, '').trim().split(/[^A-Za-z]+/).filter(Boolean)[0]?.toUpperCase();
        if (word) out.push({ word, kind });
    }
    if (out.length === 0) throw new Error('parseAtlasKeywords: no atlas rows found; the atlas changed shape');
    return out;
}

/**
 * The complexity budget by rank. A card breaks it when it prints more
 * budgeted keywords (atlas Card keywords other than DEAL and GUARD) or more
 * conditions than its rank allows.
 *
 * @param cardKeywords - The atlas's Card keywords (`parseAtlasKeywords`, kind `card`).
 */
export function checkComplexityBudget(cards: readonly Card[], cardKeywords: ReadonlySet<string>): CardRuleViolation[] {
    const out: CardRuleViolation[] = [];
    for (const card of cards) {
        const band = COMPLEXITY_BUDGET[card.rank];
        if (!band) continue;
        const kws = printedKeywords(card).filter(w => cardKeywords.has(w) && !BUDGET_FREE_VERBS.has(w));
        const conds = cardConditions(card);
        const over: string[] = [];
        if (kws.length > band.keywords) over.push(`${kws.length} keywords (${kws.join(', ')}), max ${band.keywords}`);
        if (conds.length > band.conditions) over.push(`${conds.length} conditions (${conds.join('; ')}), max ${band.conditions}`);
        if (over.length) out.push({ rule: 'complexity-budget', id: card.id, detail: `rank ${card.rank}: ${over.join('; ')}` });
    }
    return out;
}

/** One verb call a line made, for the scrap-floor probe. */
interface VerbCall { readonly verb: string; readonly args: readonly unknown[] }

/** Runs `fn` against a recording context and returns the verbs it called. */
function recordVerbs(fn: (c: ProgramCtx) => void, q: ProgramQuery): VerbCall[] {
    const calls: VerbCall[] = [];
    const ctx = new Proxy({ q } as unknown as ProgramCtx, {
        get(target, prop) {
            if (prop === 'q') return target.q;
            return (...args: unknown[]) => {
                calls.push({ verb: String(prop), args });
                // Verbs that return an amount: give back the largest the line allows.
                return typeof args[0] === 'number' ? args[0] : 0;
            };
        },
    });
    fn(ctx);
    return calls;
}

/** Two fight states a line may branch on: healthy, and at half VITAE after damage. */
const PROBE_QUERIES: readonly ProgramQuery[] = [
    { vitae: 100, maxVitae: 100, missing: 0, atHalf: false, takenLastTurn: 0, lostThisCombat: 0, lostThisRound: 0, cursesInHand: 0, cursesInDiscard: 0, foeInferno: 0, yourInferno: 0, blizzard: 0, storm: 0, frozen: false, elementsOnFoe: 0, handSize: 4, thorns: 0, reflect: 0, guard: 0, dealtThisTurn: 0 },
    { vitae: 40, maxVitae: 100, missing: 60, atHalf: true, takenLastTurn: 10, lostThisCombat: 60, lostThisRound: 10, cursesInHand: 1, cursesInDiscard: 1, foeInferno: 6, yourInferno: 3, blizzard: 4, storm: 3, frozen: true, elementsOnFoe: 3, handSize: 4, thorns: 3, reflect: 50, guard: 6, dealtThisTurn: 5 },
];

const onlyOneConviction = (calls: readonly VerbCall[]): boolean =>
    calls.length === 1 && calls[0].verb === 'conviction' && calls[0].args[0] === 1;

/**
 * The scrap floor (T, 2026-09-30): scrapping a card gives 1 Conviction, so
 * no line may give only that. A line breaks it when, in some probed fight
 * state, its whole effect is one "gain 1 Conviction". Plain (grey) lines
 * have no Conviction verb and always pass.
 */
export function checkScrapFloor(cards: readonly Card[]): CardRuleViolation[] {
    const out: CardRuleViolation[] = [];
    for (const card of cards) {
        const p = card.program;
        if (!p) continue;
        const lines: [string, (c: ProgramCtx) => void][] = [];
        if (p.free) lines.push(['FREE', p.free.run]);
        if (p.paid) lines.push(['PAID', p.paid.run]);
        if (p.global) {
            const g = p.global;
            lines.push(['FREE', c => g.free(c, 2)], ['PAID', c => g.paid(c, 2)]);
        }
        const dead = lines
            .filter(([, run]) => PROBE_QUERIES.some(q => onlyOneConviction(recordVerbs(run, q))))
            .map(([name]) => name);
        if (dead.length) out.push({ rule: 'scrap-floor', id: card.id, detail: `${dead.join(' and ')} only gains 1 Conviction` });
    }
    return out;
}

/**
 * The random discard is a PAID cost (T, 2026-10-26, the Defender): "Discard n
 * cards at random" sits only on a PAID line, and as the line's first verb so
 * it is paid before the effects. A FREE line or a Global body that discards
 * breaks the rule, as does a PAID line that discards after another verb.
 * "Discard your hand" is the same cost.
 */
const DISCARD_VERBS: ReadonlySet<string> = new Set(['discardRandom', 'discardHand']);

export function checkDiscardCost(cards: readonly Card[]): CardRuleViolation[] {
    const out: CardRuleViolation[] = [];
    for (const card of cards) {
        const p = card.program;
        if (!p) continue;
        const free: (c: ProgramCtx) => void = p.free?.run ?? (p.global ? c => p.global!.free(c, 2) : () => {});
        const paid: (c: ProgramCtx) => void = p.paid?.run ?? (p.global ? c => p.global!.paid(c, 2) : () => {});
        const bad: string[] = [];
        for (const q of PROBE_QUERIES) {
            if (recordVerbs(free, q).some(v => DISCARD_VERBS.has(v.verb))) bad.push('FREE discards');
            const calls = recordVerbs(paid, q);
            const at = calls.findIndex(v => DISCARD_VERBS.has(v.verb));
            if (p.global && at >= 0) bad.push('a Global discards');
            else if (at > 0) bad.push('PAID discards after another verb');
        }
        const unique = [...new Set(bad)];
        if (unique.length) out.push({ rule: 'discard-cost', id: card.id, detail: unique.join('; ') });
    }
    return out;
}

/** A printed duration: "3 turns", "in play", "rest of combat", the badges. */
const DURATION_RE = /\b\d+\s+turns?\b|\bin play\b|\brest of (the )?combat\b|⏳|∞/i;

/** The closed trigger openers without their glyphs ("Start of your turn:"). */
const TRIGGER_OPENERS: readonly string[] = Object.values(GLOBAL_TRIGGER_TEXT).map(t => t.replace(/^[^A-Za-z]+/, ''));

/**
 * The Global text template (T, 2026-09-30). A Global card:
 *   - is a `global` program with one trigger from the closed set, and its
 *     printed lines open with that trigger (after the badge glyph);
 *   - prints no duration in its rules text (the FREE ⏳3 / PAID ∞ badges
 *     carry it; the authored body and PAID change are checked, not the
 *     face projection's "In play 3 turns." stand-in);
 *   - prints a PAID change only when it differs from the FREE body.
 * A non-Global card must not carry a Global program.
 */
export function checkGlobalTemplate(cards: readonly Card[]): CardRuleViolation[] {
    const out: CardRuleViolation[] = [];
    for (const card of cards) {
        const g = card.program?.global;
        const issues: string[] = [];
        if (card.cardType !== 'global') {
            if (g) issues.push('a Global program on a card that is not a Global');
        } else if (!g) {
            issues.push('a Global with no trigger');
        } else {
            const face = programFaceText(card);
            for (const [name, text] of [['FREE', face.free], ['PAID', face.paid]] as const) {
                const body = text.replace(/^[^A-Za-z]+/, '');
                if (!TRIGGER_OPENERS.some(o => body.startsWith(o))) issues.push(`${name} does not open with a closed-set trigger`);
            }
            if (DURATION_RE.test(g.text)) issues.push(`the body prints a duration ("${g.text}")`);
            if (g.paidDelta !== undefined) {
                if (DURATION_RE.test(g.paidDelta)) issues.push(`the PAID change prints a duration ("${g.paidDelta}")`);
                if (g.paidDelta.trim() === '' || g.paidDelta.trim() === g.text.trim()) issues.push('a PAID line that changes nothing');
            }
        }
        if (issues.length) out.push({ rule: 'global-template', id: card.id, detail: issues.join('; ') });
    }
    return out;
}

/** What the carrier rule reads. */
export interface CarrierRuleInput {
    readonly cards: readonly Card[];
    readonly atlas: readonly AtlasKeyword[];
    /** Words carried outside the card library (the carrier rule's list: an enemy deck or
     *  ability, a signature, an item, the dice and blacksmith systems),
     *  each with what carries it. The caller verifies the carrier exists. */
    readonly nonCardCarriers: ReadonlyMap<string, string>;
    /** How many enemies carry each word (`EnemyKeyword = never` today). */
    readonly enemyCarriers?: ReadonlyMap<string, number>;
    /** System words the admission bar does not apply to (ballot §8). */
    readonly barExempt: ReadonlySet<string>;
}

/** Cards and enemies a Card keyword needs to keep its row (ballot §8). */
export const ADMISSION_BAR = 2;

/**
 * The carrier rule and its admission bar (ballot §8):
 *   - every atlas row is carried by a library card or a listed non-card
 *     carrier (a word inside another keyword's reminder text is not one);
 *   - every Card keyword not exempt is printed by at least 2 cards or
 *     carried by at least 2 enemies;
 *   - every word a card prints has an atlas row (id `cardId:WORD`).
 */
export function checkCarrierRule(input: CarrierRuleInput): CardRuleViolation[] {
    const out: CardRuleViolation[] = [];
    const printers = new Map<string, string[]>();
    for (const card of input.cards) {
        for (const w of printedKeywords(card)) printers.set(w, [...(printers.get(w) ?? []), card.id]);
    }
    const atlasWords = new Set(input.atlas.map(a => a.word));
    for (const { word, kind } of input.atlas) {
        const cards = printers.get(word) ?? [];
        const other = input.nonCardCarriers.get(word);
        const enemies = input.enemyCarriers?.get(word) ?? 0;
        if (cards.length === 0 && !other && enemies === 0) {
            out.push({ rule: 'carrier-rule', id: word, detail: `${kind} row with no carrier` });
            continue;
        }
        if (kind === 'card' && !input.barExempt.has(word) && cards.length < ADMISSION_BAR && enemies < ADMISSION_BAR) {
            const by = cards.length ? cards.join(', ') : other ?? 'nothing on a card';
            out.push({ rule: 'carrier-rule', id: word, detail: `admission bar: ${cards.length} card(s) and ${enemies} enemies, needs ${ADMISSION_BAR} (carried by ${by})` });
        }
    }
    for (const [word, ids] of printers) {
        if (atlasWords.has(word)) continue;
        for (const id of ids) out.push({ rule: 'carrier-rule', id: `${id}:${word}`, detail: `prints ${word}, which has no atlas row` });
    }
    return out;
}

// ── The Spell law (T, 2026-10-24) ───────────────────────────────────────────

/** The one fight state the Spell law measures PAID payoffs at: mid-fight, at
 *  half VITAE, the weather at 4 on every element, so a line that reads the
 *  fight applies a number well past the scale's +2 floor. */
export const SPELL_LAW_PROBE: ProgramQuery = Object.freeze({
    vitae: 40, maxVitae: 100, missing: 60, atHalf: true, takenLastTurn: 30, lostThisCombat: 60,
    lostThisRound: 10, cursesInHand: 0, cursesInDiscard: 0,
    foeInferno: 4, yourInferno: 4, blizzard: 4, storm: 4, frozen: false, elementsOnFoe: 3, handSize: 4,
    thorns: 0, reflect: 0, guard: 0, dealtThisTurn: 0,
});

/** The payoff verbs the law raises by a MAGNITUDE step (+40%, at least +2).
 *  `stormTick` is a triggered STORM (the foe loses its STORM); `sacrificeX` is
 *  the cap on an X SACRIFICE, the number a TETHER's damage is read from. */
const SPELL_MAGNITUDE_VERBS: ReadonlySet<string> = new Set([
    'deal', 'guard', 'heal', 'vulnerable', 'foeLoses', 'healNextTurn', 'drain',
    'inferno', 'blizzard', 'storm', 'stormTick', 'sacrificeX',
]);
/** The payoff verbs the law raises by an INTENSITY step (+1). */
const SPELL_INTENSITY_VERBS: ReadonlySet<string> = new Set(['leech', 'conviction', 'draw']);

/** Verbs that read the fight and hand the number back, as the probe has it. */
const PROBE_RETURNS: Readonly<Record<string, (q: ProgramQuery) => number>> = {
    removeYourInferno: q => q.yourInferno,
    moveYourInferno: q => q.yourInferno,
    spendBlizzard: q => q.blizzard,
};

/** Sum per verb of what `run` applies at the probe. */
function probePayoffs(run: (c: ProgramCtx) => void, q: ProgramQuery): Record<string, number> {
    const out: Record<string, number> = {};
    const add = (verb: string, n: number): void => { out[verb] = (out[verb] ?? 0) + n; };
    const ctx = new Proxy({ q } as unknown as ProgramCtx, {
        get(target, prop) {
            if (prop === 'q') return target.q;
            const verb = String(prop);
            return (...args: unknown[]) => {
                if (verb === 'triggerStorm') { add('stormTick', q.storm); return 0; }
                if (PROBE_RETURNS[verb]) return PROBE_RETURNS[verb](q);
                const n = typeof args[0] === 'number' ? args[0] : 0;
                const plus = (args[1] as { plus?: number } | undefined)?.plus ?? 0;
                if (SPELL_MAGNITUDE_VERBS.has(verb) || SPELL_INTENSITY_VERBS.has(verb)) add(verb, n + plus);
                return n + plus;
            };
        },
    });
    run(ctx);
    return out;
}

/**
 * A Spell's PAID payoffs, verb to amount: a program card's PAID line run at
 * {@link SPELL_LAW_PROBE}, or a plain card's PAID mechanics and statuses
 * (VULNERABLE by its percent). Unscaled by stats.
 */
export function spellPaidPayoffs(card: Card): Record<string, number> {
    if (card.program?.paid) return probePayoffs(card.program.paid.run, SPELL_LAW_PROBE);
    const out: Record<string, number> = {};
    for (const m of card.specialMechanics ?? []) out[m.kind] = (out[m.kind] ?? 0) + m.amount;
    for (const e of card.combatEffects ?? []) {
        const verb = effectWord(e.effectId).toLowerCase();
        out[verb] = (out[verb] ?? 0) + (e.intensity ?? 0);
    }
    return out;
}

/** The least a Spell's PAID payoff may be, one step past its pre-law number. */
export function spellLawFloor(verb: string, before: number): number {
    if (SPELL_INTENSITY_VERBS.has(verb)) return before + UPGRADE_INTENSITY_STEP;
    return magnitudeStep(before);
}

/**
 * The Spell law (T, 2026-10-24): every Spell, in every lane,
 *   - EXILEs on its PAID line (a program line's `exile`, a plain card's
 *     `paidExile`), and never on its FREE line;
 *   - carries `spellLawBaseline`, its PAID payoffs as a plain discard card,
 *     and its PAID line applies at least one upgrade step past each of them
 *     (MAGNITUDE +40% at least +2; LEECH, Conviction and DRAW +1). A payoff
 *     the line adds on top is not judged. Costs are not payoffs.
 */
export function checkSpellLaw(cards: readonly Card[]): CardRuleViolation[] {
    const out: CardRuleViolation[] = [];
    for (const card of cards) {
        if (card.cardType !== 'spell') continue;
        const issues: string[] = [];
        const p = card.program;
        if (p?.global) issues.push('a Global program on a Spell');
        const paidExiles = p ? !!p.paid?.exile : !!card.paidExile;
        if (!paidExiles) issues.push('PAID does not EXILE');
        if (p?.free?.exile) issues.push('FREE EXILEs');
        const base = card.spellLawBaseline;
        if (!base) {
            issues.push('no spellLawBaseline: record its PAID payoffs as a plain discard card');
        } else {
            const now = spellPaidPayoffs(card);
            for (const [verb, before] of Object.entries(base)) {
                const floor = spellLawFloor(verb, before);
                if ((now[verb] ?? 0) < floor) issues.push(`PAID ${verb} ${now[verb] ?? 0}, needs at least ${floor} (was ${before})`);
            }
            if (Object.keys(base).length === 0) issues.push('an empty spellLawBaseline: a Spell must have a PAID payoff to raise');
        }
        if (issues.length) out.push({ rule: 'spell-law', id: card.id, detail: issues.join('; ') });
    }
    return out;
}
