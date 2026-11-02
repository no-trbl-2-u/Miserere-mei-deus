/**
 * GUARD — no library card may render the ambiguous PAID fallback.
 *
 * The card face prints its PAID side as `KEYWORD · value`. A card whose driving
 * `specialMechanics` verb (or rider) is not wired into the presenter would fall
 * through to a contradictory placeholder: keyword "DEBUFF" with the body
 * "buff yourself". The generic mechanic-led face (`kind: 'mechanic'`) closes
 * that gap.
 *
 * This guard sweeps the ENTIRE live library through the real presenter and
 * fails if any card is still ambiguous — so a new card or a new mechanic kind
 * that lacks a headline can never ship the placeholder again. When it fires,
 * the fix is to add the mechanic to `MECHANIC_KEYWORD` (keywords.ts) +
 * `mechanicHeadline` (combat-encounter.engine.ts), not to silence this test.
 */

import { describe, it, expect } from '@jest/globals';
import { getCard, getCardById, cardLibrary, lookupEffect } from '@mechanics';
import { faceStats, detailStats } from '@/state/presenters/combat-encounter.engine';
import { keywordsInText, keywordForEffect, keywordForVerb, keywordGloss } from '@/state/combat/keywords';
import { glyphShapeFor } from '@/components/combat/glyphShapes';

describe('card-face honesty guard', () => {
    it('no library card renders the ambiguous PAID fallback', () => {
        const offenders: string[] = [];
        for (const { id } of cardLibrary) {
            const card = getCard(id);
            if (!card) continue;
            const f = faceStats(card, getCardById(id));
            const ambiguous =
                f.inert
                || f.keyword === 'DEBUFF'
                || f.heroSub === 'buff yourself'
                || f.heroSub === 'weakens the foe';
            if (ambiguous) {
                const mechs = (getCardById(id)?.specialMechanics ?? []).map(m => m.kind).join(',') || 'none';
                offenders.push(`${id} (verbClass=${card.verbClass}, mechs=${mechs})`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it('every keyword chip renders at most once per overlay (no double-gloss), and no system notes ride the VM', () => {
        // The inspect overlay may explain each keyword at most once. The
        // per-card systems slice is gone (T, 2026-11-01): no card carries one.
        const offenders: string[] = [];
        for (const { id } of cardLibrary) {
            const card = getCard(id);
            if (!card) continue;
            const d = detailStats(card, getCardById(id));
            const names = d.keywords.map(k => k.name);
            const seen = new Set<string>();
            for (const n of names) {
                if (seen.has(n)) offenders.push(`${id} → '${n}' explained twice`);
                seen.add(n);
            }
            if ('systemTerms' in d) offenders.push(`${id} → a systems slice rides the detail VM`);
        }
        expect(offenders).toEqual([]);
    });

    it('WI-2 — every event-triggered DoT face names its trigger, never the round-clock lifetime', () => {
        // Post trigger-migration, poison ticks per card-played and bleed per
        // damage-instance — passive round-clock play deals literally 0. A face
        // that still prints "◆ POISON 10 over 4t" is the exact lie that shipped
        // the migration half-done (the old guard checked keyword glosses, not
        // the math line). This sweep fails any event DoT whose face still prints
        // a round-clock lifetime OR fails to name its real trigger.
        const offenders: string[] = [];
        for (const { id } of cardLibrary) {
            const card = getCard(id);
            const src = getCardById(id);
            if (!card || !src) continue;
            const f = faceStats(card, src);
            if (f.kind !== 'dot') continue;
            const dotCe = (src.combatEffects ?? []).find(
                ce => ce.appliedTo === 'opponent'
                    && (lookupEffect(ce.effectId)?.payload as { damageOverTime?: unknown } | undefined)?.damageOverTime,
            );
            const trigger = dotCe
                ? (lookupEffect(dotCe.effectId)?.payload as { damageOverTime?: { trigger?: string } } | undefined)?.damageOverTime?.trigger
                : undefined;
            const isEvent = trigger === 'card-played' || trigger === 'damage-instance' || trigger === 'payoff';
            if (!isEvent) continue;

            const d = detailStats(card, src);
            const faceText = `${f.heroText} ${f.heroSub ?? ''} ${f.verbLine}`;
            // 1. No round-clock "over Nt / over N turns" lifetime on the face.
            if (/over\s+\d+\s*(t\b|turns?)/i.test(faceText)) {
                offenders.push(`${id} face still prints round-clock 'over Nt' (trigger=${trigger})`);
            }
            // 2. The detail table must not headline a round-clock TOTAL/TURNS.
            const detailLabels = d.outcomeStats.map(s => s.label);
            if (detailLabels.includes('TOTAL') || detailLabels.includes('TURNS') || /over\s+\d+\s+turns/i.test(d.outcomeLine)) {
                offenders.push(`${id} detail still headlines round-clock TOTAL/TURNS (trigger=${trigger})`);
            }
            // 3. The face DOES name the real trigger.
            if (!/each card you play|each time it is struck|each payoff|per card|per hit|per payoff/i.test(faceText)) {
                offenders.push(`${id} face does not name the '${trigger}' trigger`);
            }
            // 4. HP→VITAE: no stray 'HP' copy on the DoT face.
            if (/\bHP\b/.test(faceText)) offenders.push(`${id} face still says HP (use VITAE)`);
        }
        expect(offenders).toEqual([]);
    });

    it('P2 HP→VITAE sweep — no card face or detail string says "HP" (player-facing term is VITAE)', () => {
        const offenders: string[] = [];
        const hp = /\bHP\b/;
        for (const { id } of cardLibrary) {
            const card = getCard(id);
            const src = getCardById(id);
            if (!card || !src) continue;
            const f = faceStats(card, src);
            const d = detailStats(card, src);
            const faceStrings = [f.heroText, f.heroSub ?? '', f.verbLine, f.powerRail, f.freeHeroText];
            const detailStrings = [
                d.subtitle, d.outcomeLine, d.powerLine, d.readNote, d.mathLine, d.freeLine,
                ...d.outcomeStats.map(s => `${s.label} ${s.value}`),
            ];
            for (const s of [...faceStrings, ...detailStrings]) {
                if (hp.test(s)) { offenders.push(`${id}: "${s}"`); break; }
            }
        }
        expect(offenders).toEqual([]);
    });

    it('every keyword/effect a card prints has a popup (keyword chip or system entry) — nothing unexplained', () => {
        // The inspect overlay is the popup layer.
        // Every UPPERCASE registry word on the printed lines must render a
        // keyword chip WITH a gloss; every authored status effect must resolve
        // its keyword chip.
        const offenders: string[] = [];
        for (const { id } of cardLibrary) {
            const card = getCard(id);
            const src = getCardById(id);
            if (!card || !src) continue;
            const d = detailStats(card, src);
            const chips = new Set(d.keywords.filter(k => k.def).map(k => k.name));
            const printed = [card.topActionText, card.bottomActionText].join(' ');
            for (const kw of keywordsInText(printed)) {
                if (!chips.has(kw.toUpperCase())) offenders.push(`${id} → prints ${kw.toUpperCase()} but renders no defined chip`);
            }
            for (const ce of src.combatEffects ?? []) {
                const kw = keywordForEffect(ce.effectId);
                if (kw && !chips.has(kw.toUpperCase())) offenders.push(`${id} → applies ${ce.effectId} but renders no ${kw.toUpperCase()} chip`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it('every FREE effect draws its own silhouette — no text-rune fallback on a live card (owner 2026-07-16)', () => {
        // The giant top-left glyph must be the SHAPE of the effect it causes
        // (flame=burn, flask=poison, crosshair=mark, …). A card whose free
        // rider resolves no shape falls back to an abstract text rune — the
        // exact "generic concentric circles" read this guard exists to block.
        // When it fires, add the keyword's silhouette to glyphShapes.ts (and
        // the synced copies in the editor's KwGlyph + build-catalog.mjs).
        const offenders: string[] = [];
        for (const { id } of cardLibrary) {
            const card = getCard(id);
            const src = getCardById(id);
            if (!card || !src) continue;
            const f = faceStats(card, src);
            if (!f.freeGlyph) continue; // no free line → no glyph at all
            if (!glyphShapeFor(f.freeGlyphKey)) {
                offenders.push(`${id} → freeGlyphKey=${f.freeGlyphKey ?? 'null'} (text rune '${f.freeGlyph}')`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it('spec 33 die-gear keywords (BOON/HONE/TEMPER) resolve a gloss — a gear card can never fall through', () => {
        // The blacksmith/die-gear vocabulary is registered whether or not a
        // card carries it. Pinning the glosses here means any card face that prints
        // BOON, HONE, or TEMPER resolves a keyword chip instead of the
        // ambiguous PAID fallback the rest of this file guards against.
        const missing = ['Boon', 'Hone', 'Temper'].filter(kw => !keywordGloss(kw));
        expect(missing).toEqual([]);
    });

    it('the grey office vocabulary survives the keyword audit — GUARD and VULNERABLE resolve end to end', () => {
        // The registry holds what live content prints. The three grey cards are the whole player library, so their
        // words are pinned directly: the gloss, the effect/verb mapping, and a
        // drawn silhouette for each.
        expect(keywordGloss('Guard')).toBeTruthy();
        expect(keywordGloss('Vulnerable')).toBeTruthy();
        expect(keywordForEffect('debuff_vulnerable')).toBe('Vulnerable');
        expect(keywordForVerb('defend')).toBe('Guard');
        expect(glyphShapeFor('GUARD')).toBeTruthy();
        expect(glyphShapeFor('VULNERABLE')).toBeTruthy();
    });

    it('every headlined PAID keyword has a glossary definition (the "description above the card")', () => {
        const missing: string[] = [];
        for (const { id } of cardLibrary) {
            const card = getCard(id);
            if (!card) continue;
            const kw = faceStats(card, getCardById(id)).keyword;
            if (!kw) continue; // guard/befriend etc. legitimately headline without a keyword word
            const defs = detailStats(card, getCardById(id)).keywords;
            const hit = defs.find(k => k.name === kw);
            if (!hit || !hit.def) missing.push(`${id} → ${kw}`);
        }
        expect(missing).toEqual([]);
    });
});
