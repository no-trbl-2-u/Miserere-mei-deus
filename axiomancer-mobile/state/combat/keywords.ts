/**
 * Keyword registry — the player-facing combat vocabulary.
 *
 * The registry is `KEYWORD_GLOSS` below: only words a live card, item,
 * hazard or die prints. No fixed count.
 *
 * The doctrine: "every mechanic is a terse, learnable KEYWORD" over "the
 * count is exactly 30" — a mechanic without a keyword here is the bug (see
 * the card-face-honesty guard test). The engine keeps its thematic effect
 * names as lore; this module is the PRESENTATION-layer mapping the board,
 * card faces, glossary, and combat log read instead. Pure, with no
 * dependencies.
 *
 * Why mobile-side: a player-facing label is presentation (ADR-0001/0003 — the
 * engine owns truth, mobile owns how it reads). Never rename engine effect ids
 * for player text — map them here.
 *
 * Keywords are stored Title-Case; display sites uppercase where they want the
 * pop (card face, glossary header). The combat log uses Title-Case directly.
 */

/** Effect id → keyword (Title-Case). The CARD vocabulary. */
const EFFECT_KEYWORD: Record<string, string> = {
    // ── The effect-backed keywords ──
    debuff_bleed: 'Bleed',
    // Printed by the grey office's A Plain Word.
    debuff_vulnerable: 'Vulnerable',
};

/**
 * SUPPORT effect ids (items / consumables / the Cards token system — tagged
 * `support`/`non-card` in the effect libraries). NOT card keywords and NOT in
 * the keyword glossary; mapped so the combat log never prints a raw id.
 */
const SUPPORT_KEYWORD: Record<string, string> = {
    // Empty: no live support effect needs a label.
};

/** Verb class → keyword for cards whose action is the keyword itself. */
const VERB_KEYWORD: Record<string, string> = {
    defend: 'Guard',
};

/**
 * Special-mechanic kind → keyword (Title-Case). `EFFECT_KEYWORD` covers
 * effect-backed cards; this covers a card whose PAID identity is a
 * `specialMechanics` verb, so the face can print `KEYWORD · value` instead of
 * an ambiguous "DEBUFF / buff yourself" line. Currently empty.
 *
 * Kinds the face prints through their own face kind or plain rules text
 * (guard/barrier/riposte, the die verbs, `deal`, and every kind whose
 * keyword left with the card purge) are intentionally absent. The mobile
 * KW-3 lint lists each one with its reason.
 */
const MECHANIC_KEYWORD: Record<string, string> = {
    // `deal` deliberately has NO keyword row: "Deal 24" is plain English (MTG's
    // rule: keyword what compresses), and GUARD prints as its own word in the
    // paid line. Both are listed in KINDS_WITHOUT_MECHANIC_KEYWORD.
};

/**
 * Keyword → a short, general definition (the glossary rule). The card's own
 * numbers live on the face/preview; this explains the keyword.
 *
 * The table holds only words something live prints: the grey office
 * (GUARD/VULNERABLE), the Blood Price trial cards (SACRIFICE, WAIVE, EXILE,
 * HEAL, TETHER, LEECH), the Elementalist's weather (INFERNO, BLIZZARD, FROZEN,
 * STORM, DRAW), the healing potions (HEAL), a map hazard (BLEED) and the dice
 * system (PIP, BOON, HONE, TEMPER).
 *
 * TERSE GLOSSES: every gloss is ONE short
 * sentence in the Dawncaster register ("Cards with Lifedrain restore health
 * equal to the damage they deal."), with a second short sentence only where
 * a rule genuinely needs it. Load-bearing numbers stay; edge-case prose,
 * parentheticals, and cross-references go. Shorter must never become wrong.
 */
const KEYWORD_GLOSS: Record<string, string> = {
    // ── Utility ──
    Guard:
        'Blocks that much incoming attack damage during the next threat phase. '
        + 'Unused Guard is lost.',
    Heal: 'Restores that much VITAE, up to your maximum.',
    // ── The cost and its handling ──
    Sacrifice: 'Lose that much VITAE as a cost. It never takes you below 1, so a line you cannot pay cannot be played.',
    Waive: 'Your next SACRIFICE this turn costs no VITAE but still counts.',
    Exile: 'The card leaves combat instead of going to your discard.',
    // ── Affliction ──
    Bleed: 'Each hit the bearer takes deals 3 more VITAE per Bleed stack, then removes a stack.',
    Vulnerable:
        'The foe takes that much more damage from every hit. Adding more stacks it and refreshes the turns.',
    Tether: 'For that many turns, each SACRIFICE makes the foe take damage equal to the VITAE it paid.',
    Leech: 'Each LEECH adds 3 turns and its number to the potency. At the start of its turn the foe loses the potency in VITAE and you heal what it lost.',
    // ── The weather (the Elementalist trial set) ──
    Inferno:
        'Both sides burn: the foe loses that much VITAE at the start of its turn, and you lose half, rounded down, at the start of yours. '
        + 'It drops by 1 each round, and yours can kill you.',
    Blizzard: "Each of the foe's attacks deals that much less. It drops by 1 each round.",
    Frozen: "When the BLIZZARD is at least the foe's attack, the foe is FROZEN: the next DEAL it takes is doubled, then FROZEN ends.",
    Storm: 'At the start of its turn the foe loses that much VITAE, then the STORM grows by 1. It lasts the whole combat.',
    Draw: 'Draw that many cards now. An empty draw pile shuffles your discard back in.',
    // ── Dice ──
    Pip:
        'Each threat phase a Reserve die survives, it gains one pip, capped at 2. '
        + 'Each pip spent adds +2 intensity, or +5 Guard on a defend card.',
    // ── Die gear — BOON is the face payload; HONE/TEMPER are the blacksmith
    // upgrade verbs. ──
    Boon: "A die's BOON face powers a card of its color and grants Conviction. Its equipped gear sets how much (2 by default).",
    Hone: "A blacksmith upgrade: adds a mana face to a die's gear, so more of its rolls power a card.",
    Temper: "A blacksmith upgrade: turns a mana face into a BOON face. A colored die caps at 2 boon and 1 miss, gold at 1.",
};

/**
 * The registry keywords a printed line names in UPPERCASE. Returns
 * Title-Case registry keywords in text order, deduped; [] when nothing
 * resolves.
 */
export function keywordsInText(text: string | null | undefined): string[] {
    if (!text) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const run of text.match(/[A-Z]{2,}/g) ?? []) {
        const title = run.charAt(0) + run.slice(1).toLowerCase();
        const kw = KEYWORD_GLOSS[title] ? title : null;
        if (!kw || seen.has(kw)) continue;
        seen.add(kw);
        out.push(kw);
    }
    return out;
}

/** The keyword for an engine effect id, or null if unmapped. */
export function keywordForEffect(effectId: string | null | undefined): string | null {
    if (!effectId) return null;
    return EFFECT_KEYWORD[effectId] ?? SUPPORT_KEYWORD[effectId] ?? null;
}

/** The keyword a verb class grants directly (e.g. defend → Guard), or null. */
export function keywordForVerb(verbClass: string | null | undefined): string | null {
    if (!verbClass) return null;
    return VERB_KEYWORD[verbClass] ?? null;
}

/** The keyword a special-mechanic kind headlines, or null for kinds that
 *  carry their own face kind (guard/rupture/forge/…) or no keyword at all. */
export function keywordForMechanic(kind: string | null | undefined): string | null {
    if (!kind) return null;
    return MECHANIC_KEYWORD[kind] ?? null;
}

/**
 * Every mechanic kind that carries a keyword badge. Exported so the
 * KW-2 lint can check the REVERSE drift — a mapping row surviving the engine
 * kind it described — without keeping its own copy of this table.
 */
export function mechanicKeywordKeys(): readonly string[] {
    return Object.keys(MECHANIC_KEYWORD);
}

/** The general glossary definition for a keyword, or null. */
export function keywordGloss(keyword: string | null | undefined): string | null {
    if (!keyword) return null;
    return KEYWORD_GLOSS[keyword] ?? null;
}

/** Every registered keyword name (Title-Case). The KW-6/KW-1/KW-5 lints
 *  assert against this list — it IS the registry, not a copy of it. */
export function allRegistryKeywords(): readonly string[] {
    return Object.keys(KEYWORD_GLOSS);
}

/**
 * KW-7 — the "systems glossary": engine tokens that are systems, not card
 * keywords (Conviction, Reserve/Pips, WILD/X), but that the player still
 * reads on cards and threshold lines.
 *
 * A card's inspect overlay shows only the entries its OWN printed lines
 * reference ({@link systemTermsForCard}); the full list stays exported as the
 * single source of truth.
 */
export const SYSTEM_GLOSSARY: readonly { term: string; def: string }[] = [
    { term: 'CONVICTION ◆', def: 'A spend-anytime resource banked from unspent dice and overflow. It never decays.' },
    { term: 'RESERVE & PIPS', def: 'Up to 2 dice held between phases instead of played. Each gains +1 pip per phase it survives, spent for extra intensity or Guard.' },
    { term: 'WILD / X', def: 'A WILD die counts as any color. A dead X die powers nothing.' },
    { term: 'GLOBAL', def: 'Stays in play and fires on its trigger (⟳ your turn starts, 🩸 you SACRIFICE): 3 turns played FREE, all combat PAID. Copies stack (experimental).' },
    { term: 'CURSE', def: 'A dead card that holds a hand slot until played. It cannot be scrapped.' },
];

/** How a card's PRINTED lines reference each system term. Matched against the
 *  card's own engine text (top/bottom action lines + die lines) — never against
 *  keyword glosses, which would drag the whole dump back in. */
const SYSTEM_TERM_MATCH: Record<string, RegExp> = {
    'CONVICTION ◆': /\bconviction\b/i,
    'RESERVE & PIPS': /\breserve\b|\bpips?\b/i,
    'WILD / X': /\bwild\b|\bX die\b/,
    'GLOBAL': /\bGlobal\b/,
    'CURSE': /\bCurses?\b/,
};

/** Keyword chips whose own gloss already explains a system term — when such a
 *  chip renders on the card, the system entry is a duplicate and is skipped
 *  (each term is explained at most once per overlay). */
const SYSTEM_TERM_COVERED_BY: Record<string, readonly string[]> = {
    'RESERVE & PIPS': ['PIP'],  // the Pip gloss defines the Reserve
};

/**
 * The per-card slice of the systems glossary:
 * only the entries the card's printed text actually references, minus any
 * already explained by one of its keyword chips. `printedText` is the joined
 * engine lines; `chipNames` the UPPERCASE keyword-panel names already shown.
 */
export function systemTermsForCard(
    printedText: string,
    chipNames: readonly string[],
): { term: string; def: string }[] {
    const chips = new Set(chipNames.map(n => n.toUpperCase()));
    return SYSTEM_GLOSSARY.filter(({ term }) => {
        const rx = SYSTEM_TERM_MATCH[term];
        if (!rx || !rx.test(printedText)) return false;
        return !(SYSTEM_TERM_COVERED_BY[term] ?? []).some(kw => chips.has(kw));
    });
}
