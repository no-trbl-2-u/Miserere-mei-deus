/**
 * Hermetic unit tests for the honest card view-model helpers
 * (engineHonestKind / resolvePrimary / faceStats / detailStats / armedValue).
 *
 * Fixtures are live library cards, read live from the sibling engine so the
 * assertions stay true to real data. The library is the grey office:
 *   - grey-strike   A Plain Blow   FREE Deal 2 · PAID DEAL 5       → a mechanic face, no read
 *   - grey-ward     A Plain Ward   FREE Guard 2 · PAID GUARD 5     → the read-scaled Guard face
 *   - grey-word     A Plain Word   FREE VULN 10% 1t · PAID 25% 2t  → the status face
 *   - fx-ember (synthetic)         round-clock kindling ember      → the "N over M turns" face
 *
 * Presenter branches for faces no live card prints have no coverage here.
 *
 * Core invariant under test: real-units-or-no-number (never a fabricated
 * value), and face↔detail numbers agree.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
    getCard, getCardById, scaleCardForStats, scaleRider, CARD_LANES,
    registerSandboxCards, clearSandboxCards, effectsLibrary,
} from '@mechanics';
import type { Card, Effect } from '@mechanics';
import {
    faceStats, detailStats, engineHonestKind, resolvePrimary, armedValue,
} from '@/state/presenters/combat-encounter.engine';
import { programLinesFor } from '@/state/presenters/card-program.engine';
import { glyphShapeFor } from '@/components/combat/glyphShapes';

/**
 * The Profane Canon prints no plain round-clock DoT: POISON ticks per card
 * played, BLEED per hit taken, DOOM grows per enemy action. The "N over M
 * turns" face is still a live presenter branch, so a test-local ember effect
 * and card exercise it.
 */
const FX_EMBER_EFFECT: Effect = {
    id: 'fx_ember', name: 'Kindling Ember', description: 'Test effect: a round-clock DoT.',
    type: 'debuff', category: 'damage', duration: 3, stacking: 'intensity', tier: 1,
    payload: { damageOverTime: { damagePerRound: 1, damageType: 'mind' } },
};
const FX_EMBER: Card = {
    id: 'fx-ember',
    name: 'Ember (fixture)',
    color: 'mind',
    description: 'Test carrier: a genuine round-clock DoT.',
    tier: 1, rank: 2, cardType: 'spell',
    targetType: 'enemy',
    paidSummary: 'Inflict KINDLING EMBER 1 for 3 turns.',
    free: { guard: 1 },
    combatEffects: [{ effectId: 'fx_ember', appliedTo: 'opponent', intensity: 1, duration: 3 }],
    addedIn: '2026-08-08',
    tags: ['rot'],
};
beforeAll(() => {
    effectsLibrary.registry.set(FX_EMBER_EFFECT.id, FX_EMBER_EFFECT);
    registerSandboxCards([FX_EMBER]);
});
afterAll(() => {
    clearSandboxCards();
    effectsLibrary.registry.delete(FX_EMBER_EFFECT.id);
});

const cardOf = (id: string) => {
    const card = getCard(id);
    if (!card) throw new Error(`fixture card missing: ${id}`);
    const sourceCard = getCardById(card.id);
    return { card, sourceCard };
};

describe('engineHonestKind — the honesty gate', () => {
    it('classifies the spec 32 v3 keyword effects', () => {
        expect(engineHonestKind('debuff_poison')).toBe('dot');
        expect(engineHonestKind('debuff_bleed')).toBe('dot');
        expect(engineHonestKind('debuff_mark')).toBe('mark');           // tickAmplifyFlat
        expect(engineHonestKind('debuff_quarter')).toBe('weaken');      // outgoingDamageMulPct < 0
        expect(engineHonestKind(null)).toBeNull();
    });
});

describe('faceStats — honest real-unit faces', () => {
    it('Sketch of a Thought (round-clock ember) keeps the honest "N over M turns" lifetime', () => {
        // A genuine round-clock DoT (kindling ember dpr 1 · i1 · 3t) still ticks
        // at the boundary, so its lifetime face stands — proving WI-2 only
        // retires the fiction for EVENT DoTs.
        const { card, sourceCard } = cardOf('fx-ember');
        const f = faceStats(card, sourceCard);
        expect(f.kind).toBe('dot');
        expect(f.heroText).toBe('3');             // 1 × 3 turns, no ramp
        expect(f.heroSub).toBe('over 3 turns');
        expect(f.verbLine).toBe('foe loses VITAE each turn');
    });
    it('A Plain Ward (Guard) → Guard 5 · the authored FREE Guard 2', () => {
        const { card, sourceCard } = cardOf('grey-ward');
        const f = faceStats(card, sourceCard);
        expect(f.kind).toBe('guard');
        expect(f.heroText).toBe('Guard 5');
        // The FREE line lays a persistent Guard brick, not a fading chip.
        expect(f.freeHeroText).toBe('Guard 2');
        expect(f.armable).toBe(true);
        expect(f.guardBase).toBe(5);
    });
    it('A Plain Blow (DEAL) → the printed number, no read — never a fabricated one', () => {
        const { card, sourceCard } = cardOf('grey-strike');
        const f = faceStats(card, sourceCard);
        expect(f.heroText).toBe('Deal 5');
        expect(f.freeHeroText).toBe('Deal 2');
        // DEAL arms nothing: the printed line IS the applied effect.
        expect(f.armable).toBe(false);
        expect(f.inert).toBe(false);
    });
    it('A Plain Word (VULNERABLE +25% 2t) → a real percentage, real turns', () => {
        const { card, sourceCard } = cardOf('grey-word');
        const f = faceStats(card, sourceCard);
        expect(f.kind).toBe('vulnerable');
        expect(f.keyword).toBe('VULNERABLE');
        expect(f.heroText).toBe('+25%');
        expect(f.heroSub).toBe('dmg taken · 2 turns');
        expect(f.armable).toBe(true);
        expect(f.statusBase).toBe(25);
        expect(f.inert).toBe(false);
    });
});

describe('Option A split rail — freeKeyword/freeValue + typeStrip (owner-picked 2026-07-09)', () => {
    it('A Plain Ward → ◇ GUARD · 2 (the authored free rider, never halved) | ANY · SKILL foot strip', () => {
        const { card, sourceCard } = cardOf('grey-ward');
        const f = faceStats(card, sourceCard);
        expect(f.freeKeyword).toBe('GUARD');
        expect(f.freeValue).toBe('2');
        expect(f.typeStrip).toBe('ANY · SKILL');
    });
    it("A Plain Word → ◇ VULNERABLE · ×10 · 1t, never the 'i10 d1' code", () => {
        // '×N · Mt', never the 'iN dM' code.
        const { card, sourceCard } = cardOf('grey-word');
        const f = faceStats(card, sourceCard);
        expect(f.freeKeyword).toBe('VULNERABLE');
        expect(f.freeValue).toBe('+10% · 1t');
        expect(f.freeHeroText).toBe('vulnerable +10% · 1 turn');
    });
});

describe('D91 FREE corner pill — a pill whenever the card has a FREE line', () => {
    it('A Plain Blow → the DEAL pill with its free damage (critique pass 85)', () => {
        // FREE "Deal 2": the face carries the DEAL glyph and value, so the
        // corner pill draws (the board renders it when freeGlyph is set).
        const { card, sourceCard } = cardOf('grey-strike');
        const f = faceStats(card, sourceCard);
        expect(sourceCard!.free?.damage).toBe(2);
        expect(f.freeGlyph).toBe('⚔');
        expect(f.freeGlyphKey).toBe('DEAL');
        expect(f.freeKeyword).toBe('DEAL');
        expect(f.freeValue).toBe('2');
        expect(glyphShapeFor(f.freeGlyphKey)).toBeTruthy();
    });

    it('A Plain Blow pill carries the stat-scaled free damage the engine deals', () => {
        const stats = { body: 10, mind: 5, heart: 5 };
        const { card, sourceCard } = cardOf('grey-strike');
        const scaled = faceStats(card, scaleCardForStats(sourceCard!, stats));
        const dealt = scaleRider(sourceCard!.free!, stats).damage!;
        expect(dealt).toBeGreaterThan(2);
        expect(scaled.freeValue).toBe(`${dealt}`);
    });

    it('every lane card: a FREE line if and only if the face shows a pill (glyph and value)', () => {
        const ids = [...new Set(CARD_LANES.flatMap(lane => lane.cardIds))];
        expect(ids.length).toBeGreaterThan(3);
        const offenders: string[] = [];
        for (const id of ids) {
            const card = getCard(id);
            const src = getCardById(id);
            if (!card || !src) { offenders.push(`${id} → not in the library`); continue; }
            // The printed FREE line: a program card's (triggers and globals
            // included), else the authored rider.
            const hasFreeLine = src.program ? programLinesFor(src).free.trim() !== '' : !!src.free;
            const f = faceStats(card, src);
            const hasPill = !!f.freeGlyph && !!f.freeValue;
            if (hasFreeLine !== hasPill) {
                offenders.push(`${id} → FREE line ${hasFreeLine}, pill ${hasPill} (glyph '${f.freeGlyph}', value ${f.freeValue})`);
            }
        }
        expect(offenders).toEqual([]);
    });
});

describe('rank / rarity projection (spec 32 v3 §4)', () => {
    it('rank rides the card; rarity derives from it', () => {
        for (const id of ['grey-strike', 'grey-ward', 'grey-word']) {
            expect(getCard(id)!.rank).toBe(getCardById(id)!.rank);
            expect(getCard(id)!.rank).toBe(1);
            expect(getCard(id)!.rarity).toBe('common');
        }
    });
});

describe('detailStats — same numbers as the face', () => {
    it('A Plain Word detail + pill agree with the face', () => {
        const { card, sourceCard } = cardOf('grey-word');
        const d = detailStats(card, sourceCard);
        expect(d.outcomeStats.find(st => st.label === 'DMG TAKEN')?.value).toBe('+25%');
        expect(d.outcomeStats.find(st => st.label === 'TURNS')?.value).toBe('2');
        // The FREE pill is the authored free line, de-abbreviated — the face's text.
        expect(d.freePill).toBe(faceStats(card, sourceCard).freeHeroText);
        // The FREE-line rider renders its keyword panel.
        expect(d.keywords.map(k => k.name)).toContain('VULNERABLE');
        expect(d.keywords.every(k => k.def.length > 0)).toBe(true);
        // The meta chip surfaces the rank name + card type.
        expect(d.metaChip).toContain('ASH');
        expect(d.metaChip).toContain('SPELL');
    });
    it('A Plain Ward (Guard) → terse "Gain Guard 5."', () => {
        const { card, sourceCard } = cardOf('grey-ward');
        const d = detailStats(card, sourceCard);
        expect(d.outcomeLine).toBe('Gain Guard 5.');
        expect(d.stacksText).toBeNull();
    });
    it('systemTerms is the PER-CARD glossary slice, not the KW-7 dump (owner, 2026-07-12)', () => {
        // The grey office's printed lines reference no dice-system token → NO
        // entries — never the dump.
        for (const id of ['grey-strike', 'grey-ward', 'grey-word']) {
            const { card, sourceCard } = cardOf(id);
            expect(detailStats(card, sourceCard).systemTerms.map(s => s.term)).toEqual([]);
        }
    });
});

describe('card-wording audit (2026-07-12) — the +DIE row carries only what the face cannot', () => {
    it('the +DIE row prints the full paid line', () => {
        expect(detailStats(cardOf('grey-ward').card, cardOf('grey-ward').sourceCard).diePaidLine).toContain('GUARD 5');
        expect(detailStats(cardOf('grey-strike').card, cardOf('grey-strike').sourceCard).diePaidLine).toContain('DEAL 5');
    });
    it('INTENSITY and FREE never render as system terms (retired, owner 2026-07-18)', () => {
        // Both read plainly enough in context; their rows padded every inspect.
        const { card, sourceCard } = cardOf('grey-word');
        const terms = detailStats(card, sourceCard).systemTerms.map(s => s.term);
        expect(terms).not.toContain('INTENSITY');
        expect(terms).not.toContain('FREE');
    });
});

describe('resolvePrimary + armedValue', () => {
    it('resolvePrimary routes by verb-class + honesty (the v3 shapes)', () => {
        expect(resolvePrimary(getCard('grey-ward')!, getCardById('grey-ward')).kind).toBe('guard');
        expect(resolvePrimary(getCard('grey-word')!, getCardById('grey-word')).kind).toBe('vulnerable');
        expect(resolvePrimary(getCard('grey-strike')!, getCardById('grey-strike')).kind).toBe('mechanic');
    });
    it('armedValue prints Guard exactly as printed — the die adds nothing', () => {
        const guard = faceStats(getCard('grey-ward')!, getCardById('grey-ward'));
        expect(guard.guardBase).toBe(5);
        expect(armedValue(guard)).toBe(5);
    });
    it('armedValue reads a ROUND-CLOCK DoT as its ramp-aware lifetime (exact)', () => {
        // Sketch of a Thought: kindling ember dpr 1, i1, 3 turns, no ramp → 3.
        const dot = faceStats(getCard('fx-ember')!, getCardById('fx-ember'));
        expect(armedValue(dot)).toBe(3);          // 1+1+1
    });
});
