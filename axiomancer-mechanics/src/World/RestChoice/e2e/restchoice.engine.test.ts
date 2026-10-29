/**
 * Rest-choice engine ("rest" / "upgrade") — hermetic unit suite.
 *
 * No RNG stub needed: every transition here is deterministic by
 * construction. Driven through the PUBLIC BARREL (`../../../index`), the
 * same module path the mobile screen imports.
 */

import { describe, it, expect } from 'vitest';

import {
    createRestChoiceSession,
    chooseRestChoiceOffer,
    previewRestChoiceHeal,
    pickRestChoiceUpgrade,
    claimRestChoiceOutcome,
    RESTCHOICE_TUNING,
    createCharacter,
    buildCombatDeck,
    replaceCard,
    getCardById,
    cardLibrary,
    upgradeLimit,
} from '../../../index';
import type { RestChoiceSession, Character } from '../../../index';

const DECK = [
    'spoiled-poultice', 'chilblain-watch', 'petty-indictment', 'first-spadeful',
    'grandmothers-psalter', 'thumbprick-oath', 'thin-hymn', 'threadbare-cope',
    'unction-of-boils', 'the-sextons-bell',
] as const;

function offerSession(overrides: Partial<Parameters<typeof createRestChoiceSession>[1]> = {}): RestChoiceSession {
    return createRestChoiceSession(1, {
        shelter: 'camp',
        maxHealth: 100,
        health: 50,
        currency: 100,
        deckCardIds: [...DECK, 'the-vig'],
        ...overrides,
    });
}

describe('rest-choice — offer phase + lifecycle', () => {
    it('opens with two offers, `rest` always free and enabled; card removal is the village\'s', () => {
        const s = offerSession();
        expect(s.phase).toBe('offer');
        expect(s.offers.map(o => o.id)).toEqual(['rest', 'upgrade']);
        const rest = s.offers.find(o => o.id === 'rest')!;
        expect(rest.cost).toBe(0);
        expect(rest.disabledReason).toBeUndefined();
    });

    it('a broke player still has `rest` — never dead-ended', () => {
        const s = offerSession({ currency: 0, deckCardIds: [...DECK] });
        expect(s.offers.find(o => o.id === 'rest')!.disabledReason).toBeUndefined();
        expect(chooseRestChoiceOffer(s, 'rest').phase).toBe('outcome');
    });

    it('committing one offer locks the other; re-committing is a no-op', () => {
        const committed = chooseRestChoiceOffer(offerSession(), 'rest');
        expect(committed.phase).toBe('outcome');
        expect(chooseRestChoiceOffer(committed, 'upgrade')).toBe(committed);
        expect(chooseRestChoiceOffer(committed, 'rest')).toBe(committed);
    });

    it('outcome → done only via claimRestChoiceOutcome; invalid calls are no-ops', () => {
        const s = offerSession();
        expect(claimRestChoiceOutcome(s)).toBe(s); // still 'offer' — no outcome yet
        const committed = chooseRestChoiceOffer(s, 'rest');
        const done = claimRestChoiceOutcome(committed);
        expect(done.phase).toBe('done');
        expect(claimRestChoiceOutcome(done)).toBe(done);
    });
});

describe('rest-choice — `rest` offer', () => {
    it('heals exactly 25% of MAX vitae at several max-vitae values, regardless of shelter', () => {
        for (const shelter of ['camp', 'inn'] as const) {
            for (const maxHealth of [50, 77, 100, 240]) {
                const s = offerSession({ shelter, maxHealth, health: 1 });
                const o = chooseRestChoiceOffer(s, 'rest').outcome!;
                expect(o.healed).toBe(Math.round(maxHealth * RESTCHOICE_TUNING.restHealFraction));
            }
        }
    });

    it('never overheals past maxHealth', () => {
        const s = offerSession({ maxHealth: 100, health: 95 });
        const o = chooseRestChoiceOffer(s, 'rest').outcome!;
        expect(o.healed).toBe(5);
    });

    it('seals the heal alone: no card named', () => {
        const o = chooseRestChoiceOffer(offerSession(), 'rest').outcome!;
        expect(o.upgradedCardId).toBeNull();
        expect(o.upgradedToCardId).toBeNull();
    });
});

describe('rest-choice — description passthrough (Phase 59)', () => {
    it('trims and carries the authored one-liner', () => {
        const s = offerSession({ description: '  A cold hearth, but a hearth. ' });
        expect(s.description).toBe('A cold hearth, but a hearth.');
    });

    it('falls back to null when unauthored or blank', () => {
        expect(offerSession().description).toBeNull();
        expect(offerSession({ description: '   ' }).description).toBeNull();
    });
});

describe('rest-choice — never reads GameState', () => {
    it('the same authored payload always produces the same offers, independent of call order', () => {
        const a = offerSession();
        const b = offerSession();
        expect(a.offers).toEqual(b.offers);
    });
});

describe('rest-choice — `previewRestChoiceHeal` prints what the commit pays (audit 2026-09-12)', () => {
    it('equals the sealed heal for a hurt pilgrim', () => {
        const s = offerSession({ maxHealth: 175, health: 20 });
        const sealed = chooseRestChoiceOffer(s, 'rest');
        expect(previewRestChoiceHeal(s)).toBe(Math.round(175 * RESTCHOICE_TUNING.restHealFraction));
        expect(previewRestChoiceHeal(s)).toBe(sealed.outcome?.healed);
    });

    it('caps at the missing VITAE when the pilgrim is nearly full', () => {
        const s = offerSession({ maxHealth: 175, health: 170 });
        expect(previewRestChoiceHeal(s)).toBe(5);
        expect(chooseRestChoiceOffer(s, 'rest').outcome?.healed).toBe(5);
    });

    it('is zero at full VITAE and never negative past it', () => {
        expect(previewRestChoiceHeal({ maxHealth: 175, health: 175 })).toBe(0);
        expect(previewRestChoiceHeal({ maxHealth: 175, health: 180 })).toBe(0);
    });
});

describe('rest-choice — `upgrade` offer (Phase UP1d: names a card; the host upgrades it)', () => {
    // The library's rare (three upgrades), found by its limit rather than named.
    const RARE = cardLibrary.find(c => upgradeLimit(c) === 3)!.id;
    // The grey office's starting shape plus the rare and one already-upgraded
    // common that has no upgrade left.
    const GREY_DECK = [
        'grey-strike', 'grey-strike', 'grey-strike', 'grey-ward', 'grey-ward',
        'grey-word', RARE, 'grey-word+',
    ];
    const upgradeSession = (overrides: Partial<Parameters<typeof createRestChoiceSession>[1]> = {}) =>
        offerSession({ deckCardIds: [...GREY_DECK], ...overrides });

    it('is free, and lists each upgradable deck card once, in deck order', () => {
        const s = upgradeSession();
        const offer = s.offers.find(o => o.id === 'upgrade')!;
        expect(offer.cost).toBe(0);
        expect(offer.disabledReason).toBeUndefined();
        // `grey-word+` is a common at its limit of one, so it is not listed.
        expect(s.upgradableCardIds).toEqual(['grey-strike', 'grey-ward', 'grey-word', RARE]);
    });

    it('is disabled, with a reason, when no deck card can take another upgrade', () => {
        const s = upgradeSession({ deckCardIds: ['grey-strike+', 'grey-ward+', 'no-such-card'] });
        const offer = s.offers.find(o => o.id === 'upgrade')!;
        expect(offer.disabledReason).toMatch(/upgrade/i);
        expect(chooseRestChoiceOffer(s, 'upgrade')).toBe(s);
    });

    it('opens the picker and seals the card and the id it becomes, healing nothing', () => {
        const s = chooseRestChoiceOffer(upgradeSession({ health: 40 }), 'upgrade');
        expect(s.phase).toBe('upgrade-pick');
        const o = pickRestChoiceUpgrade(s, 'grey-strike').outcome!;
        expect(o).toEqual({
            chosen: 'upgrade',
            healed: 0,
            upgradedCardId: 'grey-strike',
            upgradedToCardId: 'grey-strike+',
        });
    });

    it('a rare already upgraded once becomes its second upgrade', () => {
        const s = chooseRestChoiceOffer(upgradeSession({ deckCardIds: [...DECK, `${RARE}+`] }), 'upgrade');
        expect(pickRestChoiceUpgrade(s, `${RARE}+`).outcome?.upgradedToCardId).toBe(`${RARE}++`);
    });

    it('a card not on offer, or a pick outside upgrade-pick, is a silent no-op', () => {
        const s = chooseRestChoiceOffer(upgradeSession(), 'upgrade');
        expect(pickRestChoiceUpgrade(s, 'grey-word+')).toBe(s);
        expect(pickRestChoiceUpgrade(s, 'no-such-card')).toBe(s);
        const offer = upgradeSession();
        expect(pickRestChoiceUpgrade(offer, 'grey-strike')).toBe(offer);
    });

    it('committing the upgrade locks rest', () => {
        const picked = pickRestChoiceUpgrade(chooseRestChoiceOffer(upgradeSession(), 'upgrade'), 'grey-ward');
        expect(chooseRestChoiceOffer(picked, 'rest')).toBe(picked);
        expect(claimRestChoiceOutcome(picked).phase).toBe('done');
    });

    it('the named pair is a valid replaceCard input: one copy changes and the deck holds the upgrade', () => {
        const player: Character = {
            ...createCharacter({ name: 'Rest Fixture', level: 1, baseStats: { heart: 5, body: 5, mind: 5 } }),
            knownCards: ['grey-strike', 'grey-strike', 'grey-strike', 'grey-ward', 'grey-word'],
            combatRewardCards: [RARE],
        };
        const s = chooseRestChoiceOffer(upgradeSession({ deckCardIds: buildCombatDeck(player) }), 'upgrade');
        const o = pickRestChoiceUpgrade(s, 'grey-strike').outcome!;
        const next = replaceCard(player, o.upgradedCardId!, o.upgradedToCardId!);
        const deck = buildCombatDeck(next);
        expect(deck.filter(id => id === 'grey-strike')).toHaveLength(2);
        expect(deck.filter(id => id === 'grey-strike+')).toHaveLength(1);
        expect(deck).toHaveLength(buildCombatDeck(player).length);
        expect(getCardById('grey-strike+')).toBeDefined();
    });
});
