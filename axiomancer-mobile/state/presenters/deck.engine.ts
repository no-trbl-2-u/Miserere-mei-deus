/**
 * The DECK screen presenter.
 *
 * Maps the run's real combat deck onto a render-ready view-model for
 * `app/(tabs)/deck/index.tsx`. (`components/DebugCombatDeck.tsx` is a dev
 * tool that swaps presets, not a player-facing view.)
 *
 * ## Shape
 *
 * A durable, out-of-encounter deck listing with tallies: group + count
 * distinct ids, tally the axes, sort for display, hand the screen a frozen VM.
 *
 * ## Where every word on the screen comes from
 *
 * Nothing here derives card text: text hand-assembled beside the data instead
 * of generated from it drifts from the actual card. So:
 *
 * - the DECK LIST is `buildCombatDeck(player, flags)`, the engine function the
 *   fight itself deals from — loadout-aware, copies preserved;
 * - every printed LINE is the engine's own card projection, `toCombatCard`
 *   (`axiomancer-mechanics/src/Combat/combat.cards.ts`);
 * - the ◇ NO DIE / ◆ +DIE shorthand and the KEYWORD ledger come from
 *   `detailStats` in `combat-encounter.engine.ts` — the SAME presenter call
 *   the combat detail overlay makes, so the two panels cannot disagree. That
 *   call bottoms out in `axiomancer-mechanics/src/Combat/combat.card-text.ts`
 *   (`paidClauses`), the engine-side clause list;
 * - RARITY comes from `card-rarity.engine.ts`, never re-banded here;
 * - FLAVOR is `Card.description`, read straight off the authored row. Flavor
 *   shows here rather than in the combat overlay: out of a fight, prose is
 *   the point rather than the noise.
 *
 * Pure: no store writes, no rule decisions, no text generation.
 */

import {
    buildCombatDeck,
    getCardById,
    lookupEffect,
    toCombatCard,
    type Card,
    type CardAspect,
    type CardRarity,
    type CardType,
    type CombatCard,
    type GameState,
} from '@mechanics';

import { cardArtFor } from '@/assets/images/cards';
import {
    RARITY_COLOR,
    RARITY_LABEL,
    RARITY_PIPS,
    rarityFor,
} from '@/state/presenters/card-rarity.engine';
import { keywordGloss, keywordsInText } from '@/state/combat/keywords';
import { detailStats, STANCE_COLORS } from '@/state/presenters/combat-encounter.engine';
import { freezeViewModel } from '@/state/presenters/freeze';
import type { AppStoreState } from '@/state/store';

// ---------------------------------------------------------------------------
// VM shapes
// ---------------------------------------------------------------------------

/** The rarity signal, all three legs at once (label + pips + colour). */
export interface DeckRarityVM {
    band: CardRarity;
    /** 'Common' | 'Uncommon' | 'Rare'. */
    label: string;
    /** Pip COUNT — the leg that survives greyscale. */
    pips: number;
    /** Frame hue. NEVER rendered as the only cue. */
    color: string;
}

/**
 * One piece of a printed line: plain text, or a keyword the line prints. A
 * keyword run carries the printed word, its registry name (the tooltip id),
 * its gloss, and whether the card's own ledger entry calls it minor. The
 * component renders runs in order and assembles no card text.
 */
export type DeckRunVM =
    | { kind: 'text'; text: string }
    | { kind: 'keyword'; word: string; keyword: string; gloss: string; minor: boolean };

/** One printed line of the open card: an optional shorthand label, then runs. */
export interface DeckLineVM {
    /** '◇ NO DIE' / '◆ +DIE'; null on the outcome line. */
    label: string | null;
    runs: DeckRunVM[];
}

/** One distinct card in the run deck, with how many copies are carried. */
export interface DeckCardVM {
    /** Engine card id. */
    cardId: string;
    name: string;
    /** The card's painting (required asset id; the fallback when unmapped). */
    art: number;
    /** Outcome line, then the two play lines, as label + runs. */
    lines: DeckLineVM[];
    /** Copies of this card in the deck the next fight deals. */
    count: number;
    /** Colour identity (heart / body / mind / any). */
    stance: CardAspect;
    stanceLabel: string;
    stanceColor: string;
    /** attack / skill / spell. */
    cardType: CardType;
    /** Rank ladder position, 1 (Ash) .. 6 (Saint); null on a card with none. */
    rank: number | null;
    rarity: DeckRarityVM;
    /** One plain sentence: what playing this card does. */
    outcomeLine: string;
    /** The ◇ NO DIE value. */
    freeText: string;
    /** The ◆ +DIE value, or null when the free line already says all of it. */
    paidText: string | null;
    /** 'Stacks by intensity.' and friends; null when the card does not stack. */
    stacksText: string | null;
    /** Keyword ledger — FIRST in the detail, per finding 5. */
    keywords: { name: string; def: string; minor: boolean }[];
    /**
     * Authored prose (`Card.description`). No screen draws it since the Reader
     * (DR1); kept here so a later screen can pick it up without a data change.
     */
    flavor: string | null;
    /** Screen-reader sentence for the tile (rarity named, never colour-only). */
    a11yLabel: string;
}

/** A card-type section of the list. */
export interface DeckGroupVM {
    key: CardType;
    /** 'ATTACKS' | 'SKILLS' | 'SPELLS'. */
    label: string;
    /** Distinct cards in the group, sorted for display. */
    cards: DeckCardVM[];
    /** Total COPIES in the group (not distinct rows). */
    count: number;
}

/** A rarity-distribution row. */
export interface DeckRarityTallyVM extends DeckRarityVM {
    /** Copies at this band. */
    count: number;
}

/** A colour-distribution row. */
export interface DeckStanceTallyVM {
    stance: CardAspect;
    label: string;
    color: string;
    count: number;
}

export interface DeckViewModel {
    /** Total card COPIES in the run deck. */
    totalCards: number;
    /** Distinct card ids. */
    distinctCards: number;
    /** Copies at the rare band — the headline "how good is this deck" number. */
    rareCards: number;
    /** Card-type sections, in engine `CardType` union order. */
    groups: DeckGroupVM[];
    /** Rarity distribution, thinnest band first. */
    rarityTally: DeckRarityTallyVM[];
    /** Colour distribution, most-carried first. */
    stanceTally: DeckStanceTallyVM[];
    /** True when the run carries no deck at all. */
    empty: boolean;
    /** What to show instead of a list when `empty`. */
    emptyReason: string;
    /** One line naming WHAT this screen is showing (see `DECK_SOURCE_NOTE`). */
    sourceNote: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Group order. This is the engine `CardType` union's own declaration order
 * (`'attack' | 'skill' | 'spell' | 'global' | 'curse'`,
 * `axiomancer-mechanics/src/Cards/types.ts`), mirrored rather than invented.
 */
const CARD_TYPE_ORDER: readonly CardType[] = ['attack', 'skill', 'spell', 'global', 'curse'];

const CARD_TYPE_LABEL: Readonly<Record<CardType, string>> = Object.freeze({
    attack: 'ATTACKS',
    skill: 'SKILLS',
    spell: 'SPELLS',
    global: 'GLOBALS',
    curse: 'CURSES',
});

const STANCE_LABEL: Readonly<Record<string, string>> = Object.freeze({
    heart: 'HEART', body: 'BODY', mind: 'MIND', any: 'ANY',
});

/**
 * This screen always shows the FULL RUN DECK, never the draw pile of a fight in progress.
 *
 * Two reasons, one of them decisive. The soft one: the deck a player reasons
 * about between fights is the durable object — a draw-pile view answers a
 * question ("what is left this fight?") that belongs beside the hand, not in
 * a tab. The decisive one: the tab bar is hard-locked while the encounter
 * modal is open (`app/(tabs)/_layout.tsx`, `lockOtherTabs`), so during a fight
 * this tab is unreachable by construction and a draw-pile mode here would be
 * dead code. A live draw-pile / discard readout belongs on the combat board
 * where the player can act on it.
 */
export const DECK_SOURCE_NOTE = 'The whole deck you carry — the cards the next fight deals from.';

/**
 * The shorthand for the two play lines. Constants rather than string literals
 * in the component so the deck detail and the combat detail can be pinned to
 * one spelling.
 */
export const FREE_LINE_LABEL = '◇ NO DIE';
export const PAID_LINE_LABEL = '◆ +DIE';

const EMPTY_REASON = 'No cards yet. Your starting deck is dealt when your run begins.';

const EMPTY_VM: DeckViewModel = Object.freeze({
    totalCards: 0,
    distinctCards: 0,
    rareCards: 0,
    groups: [],
    rarityTally: [],
    stanceTally: [],
    empty: true,
    emptyReason: EMPTY_REASON,
    sourceNote: DECK_SOURCE_NOTE,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Rarity bands, thinnest first.
 *
 * Derived from `RARITY_PIPS` rather than written out, because the pip count IS
 * the band's position on the ladder (common 1 · uncommon 2 · rare 3) and
 * `card-rarity.engine.ts` deliberately exports no `RARITY_ORDER`. Deriving the
 * order from the shared contract keeps one source of truth; hardcoding a
 * second array here would quietly become a place for the two to disagree.
 */
function rarityBandsAscending(): CardRarity[] {
    return (Object.keys(RARITY_PIPS) as CardRarity[])
        .slice()
        .sort((a, b) => RARITY_PIPS[a] - RARITY_PIPS[b]);
}

function rarityVM(band: CardRarity): DeckRarityVM {
    return {
        band,
        label: RARITY_LABEL[band],
        pips: RARITY_PIPS[band],
        color: RARITY_COLOR[band],
    };
}

function tallyInc<K extends string>(map: Map<K, number>, key: K, by = 1): void {
    map.set(key, (map.get(key) ?? 0) + by);
}

/**
 * Split one printed line into runs. A keyword run is an UPPERCASE word that
 * `keywordsInText` finds in the line; its gloss is the card's own keyword
 * entry when it has one (so `minor` is kept), else the registry's.
 */
export function runsFor(text: string, own: readonly { name: string; def: string; minor: boolean }[]): DeckRunVM[] {
    const found = new Set(keywordsInText(text));
    if (found.size === 0) return [{ kind: 'text', text }];
    const runs: DeckRunVM[] = [];
    let last = 0;
    for (const m of text.matchAll(/[A-Z]{2,}/g)) {
        const word = m[0];
        const keyword = word.charAt(0) + word.slice(1).toLowerCase();
        if (!found.has(keyword)) continue;
        const card = own.find((k) => k.name === word.toUpperCase());
        const gloss = card?.def || keywordGloss(keyword) || '';
        const at = m.index ?? 0;
        if (at > last) runs.push({ kind: 'text', text: text.slice(last, at) });
        runs.push({ kind: 'keyword', word, keyword, gloss, minor: card?.minor ?? false });
        last = at + word.length;
    }
    if (last < text.length) runs.push({ kind: 'text', text: text.slice(last) });
    return runs;
}

/**
 * Build one card's VM from the engine projection plus the SHARED combat
 * detail presenter. Returns null for an id the card library does not know
 * (e.g. a save holding a card the library lacks), so an unknown id drops out of the list
 * instead of rendering a blank row.
 */
function deckCardVM(cardId: string, count: number): DeckCardVM | null {
    const sourceCard: Card | undefined = getCardById(cardId);
    const projected: CombatCard | null = toCombatCard(cardId, getCardById, lookupEffect);
    if (!sourceCard || !projected) return null;

    // The same call the combat detail overlay makes. No enemy is in play on
    // this screen, so `enemyDifficulty` is omitted and every number falls back
    // to its un-scaled, authored value — which is the honest thing to print
    // for a card sitting in a deck rather than pointed at a foe.
    const detail = detailStats(projected, sourceCard);

    const band = rarityFor(projected);
    const rarity = rarityVM(band);
    const stance = projected.stance;
    const stanceLabel = STANCE_LABEL[stance] ?? String(stance).toUpperCase();
    const cardType = projected.cardType ?? sourceCard.cardType;
    const copies = count > 1 ? `, ${count} copies` : '';

    const own = detail.keywords;
    const lines: DeckLineVM[] = [
        { label: null, runs: runsFor(detail.outcomeLine, own) },
        { label: FREE_LINE_LABEL, runs: runsFor(detail.freePill, own) },
    ];
    if (detail.diePaidLine !== null) {
        lines.push({ label: PAID_LINE_LABEL, runs: runsFor(detail.diePaidLine, own) });
    }

    return {
        cardId,
        name: projected.name,
        art: cardArtFor(cardId),
        lines,
        count,
        stance,
        stanceLabel,
        stanceColor: STANCE_COLORS[stance] ?? STANCE_COLORS.any,
        cardType,
        rank: projected.rank ?? null,
        rarity,
        outcomeLine: detail.outcomeLine,
        freeText: detail.freePill,
        paidText: detail.diePaidLine,
        stacksText: detail.stacksText,
        keywords: detail.keywords.map((k) => ({ ...k })),
        flavor: sourceCard.description ?? null,
        a11yLabel: `${projected.name}, ${rarity.label}, ${stanceLabel} ${cardType}${copies}`,
    };
}

// ---------------------------------------------------------------------------
// Selector
// ---------------------------------------------------------------------------

/**
 * Build the DECK view-model from the run's character and flags.
 *
 * The store spreads the engine `GameState` at its root, so `flags` is read off
 * the same `AppStoreState`. `flags` matters: `buildCombatDeck` prefers a curated loadout when the
 * save carries loadout flags, and a deck screen that ignored them would show a
 * different deck than the one the next fight deals.
 */
export function selectDeckViewModel(
    state: Pick<AppStoreState, 'player'> & { flags?: readonly string[] },
): DeckViewModel {
    const player = state.player;
    if (!player) return EMPTY_VM;

    const flags = (state as unknown as GameState).flags ?? [];
    const deck = buildCombatDeck(player, flags);
    if (deck.length === 0) return EMPTY_VM;

    // Copies are real (the engine preserves them), so count them rather than
    // de-duplicating: a deckbuilder's copy counts are load-bearing and the
    // player is here to read exactly that.
    const copies = new Map<string, number>();
    for (const id of deck) tallyInc(copies, id);

    const cards: DeckCardVM[] = [];
    for (const [cardId, count] of copies) {
        const vm = deckCardVM(cardId, count);
        if (vm) cards.push(vm);
    }
    if (cards.length === 0) return EMPTY_VM;

    const rarityCounts = new Map<CardRarity, number>();
    const stanceCounts = new Map<CardAspect, number>();
    let totalCards = 0;
    for (const card of cards) {
        totalCards += card.count;
        tallyInc(rarityCounts, card.rarity.band, card.count);
        tallyInc(stanceCounts, card.stance, card.count);
    }

    const groups: DeckGroupVM[] = [];
    for (const key of CARD_TYPE_ORDER) {
        const inGroup = cards
            .filter((c) => c.cardType === key)
            // Best first. RANK descending is strictly finer than rarity
            // descending (rarity is banded FROM rank), so this orders by
            // rarity for free without inventing a rarity order. Name breaks
            // ties so the list is stable across renders and saves.
            .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0) || a.name.localeCompare(b.name));
        if (inGroup.length === 0) continue;
        groups.push({
            key,
            label: CARD_TYPE_LABEL[key],
            cards: inGroup,
            count: inGroup.reduce((sum, c) => sum + c.count, 0),
        });
    }

    const rarityTally: DeckRarityTallyVM[] = rarityBandsAscending()
        .map((band) => ({ ...rarityVM(band), count: rarityCounts.get(band) ?? 0 }))
        .filter((row) => row.count > 0);

    const stanceTally: DeckStanceTallyVM[] = [...stanceCounts.entries()]
        .map(([stance, count]) => ({
            stance,
            label: STANCE_LABEL[stance] ?? String(stance).toUpperCase(),
            color: STANCE_COLORS[stance] ?? STANCE_COLORS.any,
            count,
        }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    return freezeViewModel({
        totalCards,
        distinctCards: cards.length,
        rareCards: rarityCounts.get('rare') ?? 0,
        groups,
        rarityTally,
        stanceTally,
        empty: false,
        emptyReason: EMPTY_REASON,
        sourceNote: DECK_SOURCE_NOTE,
    });
}
