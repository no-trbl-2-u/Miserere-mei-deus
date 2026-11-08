/**
 * Hermetic tests for the DECK screen presenter.
 *
 * Fixtures are LIVE library cards, read out of the sibling engine, because the
 * thing most worth pinning here is agreement: the deck screen must print the
 * same rarity the shared rarity module derives, the same lines the combat
 * detail prints, and the same prose the card actually authors. A hand-written
 * card fixture could agree with a hand-written expectation while both
 * disagreed with the shipped data.
 *
 *   grey-strike   A Plain Blow  rank 1 'any' attack
 *   grey-ward     A Plain Ward  rank 1 'any' skill
 *   grey-word     A Plain Word  rank 1 'any' spell
 *
 * The grey office is the whole library: one card per type and one rarity
 * band (common). Rank-ordering and multi-band tests return when guided
 * sessions add higher-rank cards.
 *
 * Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md for the full standard.
 */

import { describe, expect, it } from '@jest/globals';
import { FALLBACK_CARD_ART } from '@/assets/images/cards';
import {
    CARD_LANES,
    buildCombatDeck,
    createNewGameState,
    getCardById,
    lookupEffect,
    toCombatCard,
    type Character,
} from '@mechanics';

import { keywordGloss } from '@/state/combat/keywords';
import { rarityFor } from '@/state/presenters/card-rarity.engine';
import { detailStats } from '@/state/presenters/combat-encounter.engine';
import {
    DECK_SOURCE_NOTE,
    runsFor,
    capitaliseKeywords,
    selectDeckViewModel,
    type DeckCardVM,
} from '@/state/presenters/deck.engine';

const BLOW = 'grey-strike';
const WARD = 'grey-ward';
const WORD = 'grey-word';

/** A run state carrying exactly this deck. `flags` stays empty so
 *  `buildCombatDeck` reads `knownCards` rather than a curated loadout. */
function runWith(
    knownCards: readonly string[],
    combatRewardCards: readonly string[] = [],
    flags: readonly string[] = [],
) {
    const player = createNewGameState().player as Character;
    return {
        player: { ...player, knownCards: [...knownCards], combatRewardCards: [...combatRewardCards] },
        flags: [...flags],
    } as never;
}

function findCard(vm: ReturnType<typeof selectDeckViewModel>, cardId: string): DeckCardVM {
    const found = vm.groups.flatMap((g) => g.cards).find((c) => c.cardId === cardId);
    if (!found) throw new Error(`card ${cardId} missing from the deck VM`);
    return found;
}

// ---------------------------------------------------------------------------
// The list itself
// ---------------------------------------------------------------------------

describe('selectDeckViewModel: the deck it shows', () => {
    it('lists the cards the run actually carries', () => {
        const vm = selectDeckViewModel(runWith([BLOW, WARD, WORD]));

        expect(vm.empty).toBe(false);
        expect(vm.distinctCards).toBe(3);
        expect(vm.totalCards).toBe(3);
        expect(vm.groups.flatMap((g) => g.cards).map((c) => c.cardId).sort()).toEqual(
            [BLOW, WORD, WARD].sort(),
        );
    });

    it('counts COPIES rather than de-duplicating them', () => {
        // A deckbuilder's copy counts are load-bearing — `buildCombatDeck`
        // preserves them deliberately. A deck screen that collapsed them would lie
        // about the deck the next fight deals.
        const vm = selectDeckViewModel(runWith([BLOW, BLOW, BLOW, WARD]));

        expect(vm.totalCards).toBe(4);
        expect(vm.distinctCards).toBe(2);
        expect(findCard(vm, BLOW).count).toBe(3);
        expect(findCard(vm, WARD).count).toBe(1);
    });

    it('includes reward cards, which stack on top of the known-card base', () => {
        const vm = selectDeckViewModel(runWith([BLOW], [BLOW, WORD]));

        expect(vm.totalCards).toBe(3);
        expect(findCard(vm, BLOW).count).toBe(2);
        expect(findCard(vm, WORD).count).toBe(1);
    });

    it('shows exactly what buildCombatDeck would deal', () => {
        // The one invariant that makes this screen trustworthy: its total is
        // the engine's deck length, not a recount of something adjacent.
        const state = runWith([BLOW, BLOW, WARD, WORD], [WORD]);
        const player = (state as unknown as { player: Character }).player;

        expect(selectDeckViewModel(state).totalCards).toBe(buildCombatDeck(player, []).length);
    });

    it('drops an id the card library no longer knows instead of rendering a blank row', () => {
        const vm = selectDeckViewModel(runWith([BLOW, 'card-that-was-retired']));

        expect(vm.distinctCards).toBe(1);
        expect(vm.totalCards).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// Grouping + ordering
// ---------------------------------------------------------------------------

describe('selectDeckViewModel: grouping by card type', () => {
    it('sorts a card into the group its engine card type names', () => {
        const vm = selectDeckViewModel(runWith([BLOW, WARD, WORD]));

        expect(vm.groups.map((g) => g.key)).toEqual(['attack', 'skill', 'spell']);
        expect(vm.groups.map((g) => g.label)).toEqual(['ATTACKS', 'SKILLS', 'SPELLS']);
        for (const group of vm.groups) {
            for (const card of group.cards) {
                expect(card.cardType).toBe(group.key);
                expect(getCardById(card.cardId)?.cardType).toBe(group.key);
            }
        }
    });

    it('counts group totals in COPIES, not rows', () => {
        const vm = selectDeckViewModel(runWith([BLOW, BLOW, WORD]));
        const attacks = vm.groups.find((g) => g.key === 'attack');

        expect(attacks?.cards).toHaveLength(1);
        expect(attacks?.count).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// Rarity comes from the shared module, never re-derived here
// ---------------------------------------------------------------------------

describe('selectDeckViewModel: rarity (D4)', () => {
    it('agrees with the shared rarity module for every card in the deck', () => {
        const ids = [BLOW, WARD, WORD];
        const vm = selectDeckViewModel(runWith(ids));

        for (const id of ids) {
            const card = findCard(vm, id);
            expect(card.rarity.band).toBe(rarityFor(getCardById(id)));
        }
    });

    it('carries all three legs of the signal, so colour is never alone', () => {
        const vm = selectDeckViewModel(runWith([BLOW, WARD, WORD]));

        for (const card of vm.groups.flatMap((g) => g.cards)) {
            expect(card.rarity.label.length).toBeGreaterThan(0);
            expect(card.rarity.pips).toBeGreaterThan(0);
            expect(card.rarity.color).toMatch(/^#[0-9a-f]{6}$/i);
            // The a11y sentence names the band in words — the screen reader
            // sees neither pips nor hue.
            expect(card.a11yLabel).toContain(card.rarity.label);
        }
    });

    it('tallies rarity and accounts for every copy', () => {
        const vm = selectDeckViewModel(runWith([BLOW, BLOW, WARD, WORD]));

        expect(vm.rarityTally.map((r) => r.band)).toEqual(['common']);
        expect(vm.rarityTally.reduce((sum, r) => sum + r.count, 0)).toBe(vm.totalCards);
        expect(vm.rareCards).toBe(0);
    });

    it('omits a band the deck carries none of', () => {
        const vm = selectDeckViewModel(runWith([BLOW]));
        // The grey office is all rank 1: only the common band may appear.

        expect(vm.rarityTally.map((r) => r.band)).toEqual(['common']);
    });
});

// ---------------------------------------------------------------------------
// Finding 4 — the printed lines are the engine's, not a second derivation
// ---------------------------------------------------------------------------

describe('selectDeckViewModel: printed text is shared, not forked', () => {
    it('prints exactly what the combat detail presenter prints for the same card', () => {
        const ids = [BLOW, WARD, WORD];
        const vm = selectDeckViewModel(runWith(ids));

        for (const id of ids) {
            const source = getCardById(id);
            const projected = toCombatCard(id, getCardById, lookupEffect);
            const detail = detailStats(projected!, source);
            const card = findCard(vm, id);

            expect(card.name).toBe(projected!.name);
            expect(card).not.toHaveProperty('metaChip');
            expect(card.outcomeLine).toBe(detail.outcomeLine);
            expect(card.freeText).toBe(detail.freePill);
            expect(card.paidText).toBe(detail.diePaidLine);
            expect(card.keywords).toEqual(detail.keywords);
        }
    });

    it('never invents a number — every printed line is non-empty or absent', () => {
        const vm = selectDeckViewModel(runWith([BLOW, WARD, WORD, WORD]));

        for (const card of vm.groups.flatMap((g) => g.cards)) {
            expect(card.freeText.length).toBeGreaterThan(0);
            expect(card.outcomeLine.length).toBeGreaterThan(0);
            if (card.paidText !== null) expect(card.paidText.length).toBeGreaterThan(0);
        }
    });
});

// ---------------------------------------------------------------------------
// Finding 6/7 — flavor's new home
// ---------------------------------------------------------------------------

describe('selectDeckViewModel: flavor', () => {
    it("carries the card's authored prose verbatim", () => {
        const ids = [BLOW, WARD, WORD];
        const vm = selectDeckViewModel(runWith(ids));

        for (const id of ids) {
            const card = findCard(vm, id);
            expect(card.flavor).toBe(getCardById(id)!.description);
            expect(card.flavor!.length).toBeGreaterThan(0);
        }
    });

    it('keeps flavor separate from the mechanical lines', () => {
        // The reason finding 6 could take prose out of combat at all: it is a
        // distinct field, not spliced into the text the player reads to act.
        const card = findCard(selectDeckViewModel(runWith([BLOW])), BLOW);

        expect(card.outcomeLine).not.toBe(card.flavor);
        expect(card.freeText).not.toContain(card.flavor);
    });
});

// ---------------------------------------------------------------------------
// Colour tally
// ---------------------------------------------------------------------------

describe('selectDeckViewModel: colour tally', () => {
    it('counts every copy and orders most-carried first', () => {
        const vm = selectDeckViewModel(
            runWith([BLOW, BLOW, WARD, WORD]),
        );
        const counts = vm.stanceTally.map((s) => s.count);

        expect(counts.reduce((a, b) => a + b, 0)).toBe(vm.totalCards);
        expect([...counts].sort((a, b) => b - a)).toEqual(counts);
        for (const row of vm.stanceTally) {
            expect(row.label).toBe(row.label.toUpperCase());
            expect(row.color.length).toBeGreaterThan(0);
        }
    });
});

// ---------------------------------------------------------------------------
// Empty + purity
// ---------------------------------------------------------------------------

describe('selectDeckViewModel: empty and edge states', () => {
    it('returns the empty VM with a reason when the run carries no deck', () => {
        const vm = selectDeckViewModel(runWith([]));

        expect(vm.empty).toBe(true);
        expect(vm.groups).toEqual([]);
        expect(vm.totalCards).toBe(0);
        expect(vm.emptyReason.length).toBeGreaterThan(0);
    });

    it('returns the empty VM rather than throwing when there is no player', () => {
        expect(selectDeckViewModel({ player: undefined } as never).empty).toBe(true);
    });

    it('returns the empty VM when every id in the deck is unknown', () => {
        expect(selectDeckViewModel(runWith(['nope-one', 'nope-two'])).empty).toBe(true);
    });

    it('always states what the screen is showing — the full run deck', () => {
        expect(selectDeckViewModel(runWith([])).sourceNote).toBe(DECK_SOURCE_NOTE);
        expect(selectDeckViewModel(runWith([BLOW])).sourceNote).toBe(DECK_SOURCE_NOTE);
    });
});

describe('selectDeckViewModel: purity', () => {
    it('returns a deep-equal VM for the same input twice', () => {
        const state = runWith([BLOW, WARD, WORD]);

        expect(selectDeckViewModel(state)).toEqual(selectDeckViewModel(state));
    });

    it('does not mutate the state it was handed', () => {
        const state = runWith([BLOW, BLOW, WARD]);
        const snapshot = JSON.stringify(state);

        selectDeckViewModel(state);

        expect(JSON.stringify(state)).toBe(snapshot);
    });
});

describe('selectDeckViewModel: the open card (155.1)', () => {
    it('resolves a painting for every card of every lane deck, never the fallback', () => {
        for (const lane of CARD_LANES) {
            const vm = selectDeckViewModel(runWith(lane.testDeck));
            for (const card of vm.groups.flatMap((g) => g.cards)) {
                expect(card.art).toBeTruthy();
                if (lane.id !== 'grey') expect(card.art).not.toBe(FALLBACK_CARD_ART);
            }
        }
    });

    it('hands the two play lines only, each with its label as the first run', () => {
        const card = findCard(selectDeckViewModel(runWith([BLOW])), BLOW);
        const detail = detailStats(toCombatCard(BLOW, getCardById, lookupEffect)!, getCardById(BLOW)!);

        const joined = (i: number) =>
            card.lines[i].runs.map((r) => (r.kind === 'keyword' ? r.word : r.text)).join('');
        expect(card.lines[0].label).toBe('◇ No die');
        expect(card.lines[0].runs[0]).toEqual({ kind: 'label', text: '◇ No die' });
        expect(joined(0)).toBe(`◇ No die · ${capitaliseKeywords(detail.freePill)}`);
        expect(card.lines.length).toBe(detail.diePaidLine === null ? 1 : 2);
        // The outcome summary is not a line on this screen.
        expect(card.lines.some((_, i) => joined(i) === detail.outcomeLine)).toBe(false);
    });

    it('presses the same keyword in the free and the paid line of A Plain Word', () => {
        const card = findCard(selectDeckViewModel(runWith([WORD])), WORD);
        const kwRuns = (i: number) => card.lines[i].runs.filter((r) => r.kind === 'keyword');
        expect(card.lines.length).toBe(2);
        expect(card.lines[1].label).toBe('◆ +Die');
        expect(kwRuns(0).length).toBeGreaterThan(0);
        expect(kwRuns(0).map((r) => (r as { word: string }).word)).toEqual(kwRuns(1).map((r) => (r as { word: string }).word));
    });
});

describe('runsFor: keywords in a printed line', () => {
    it('splits a line with two keywords into ordered text and keyword runs', () => {
        const runs = runsFor('Gain GUARD, then a BOON face.', []);
        expect(runs).toEqual([
            { kind: 'text', text: 'Gain ' },
            { kind: 'keyword', word: 'GUARD', keyword: 'Guard', gloss: keywordGloss('Guard'), minor: false },
            { kind: 'text', text: ', then a ' },
            { kind: 'keyword', word: 'BOON', keyword: 'Boon', gloss: keywordGloss('Boon'), minor: false },
            { kind: 'text', text: ' face.' },
        ]);
    });

    it('returns one text run for a line with no keyword', () => {
        expect(runsFor('Deal 5 VITAE.', [])).toEqual([{ kind: 'text', text: 'Deal 5 VITAE.' }]);
    });

    it("prefers the card's own entry over the registry's, keeping minor", () => {
        const runs = runsFor('Gain GUARD.', [{ name: 'GUARD', def: 'Own words.', minor: true }]);
        expect(runs[1]).toEqual({ kind: 'keyword', word: 'GUARD', keyword: 'Guard', gloss: 'Own words.', minor: true });
    });
});
