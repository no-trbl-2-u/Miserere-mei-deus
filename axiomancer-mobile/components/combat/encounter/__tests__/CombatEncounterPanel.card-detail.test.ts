/**
 * The combat card-detail overlay's SHAPE.
 *
 * That the detail agrees with the card is proved data-side by
 * `state/presenters/__tests__/card-detail-agreement.test.ts`. What is left is
 * structural, and structure is what this file pins:
 *
 * - Flavor prose does not render in the combat overlay; the testID must not
 *   exist here. The data keeps it: `CombatCardVM.flavor` carries
 *   `card.description`, and the DECK screen renders it.
 * - The keyword definitions render ABOVE the card face.
 * - The prose rows under the fork (the ▲/—/▼ legend and the Color Law
 *   hint) do not render as rows. They are VM fields for the out-of-combat DECK
 *   screen; the combat overlay folds their content into the row each one
 *   qualifies.
 * - The rarity is named on the large face; the overlay adds no meta strip, pip
 *   row or system notes under the card.
 *
 * Reading the source is deliberate. Every claim above is about what the
 * overlay's JSX contains and in what order — mounting the whole encounter
 * panel to re-discover that would test the fixture, not the overlay.
 */

import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getCard, getCardById, cardLibrary } from '@mechanics';
import { detailStats } from '@/state/presenters/combat-encounter.engine';
import { RARITY_LABEL, rarityFor } from '@/state/presenters/card-rarity.engine';

const SOURCE = readFileSync(join(__dirname, '..', 'CombatEncounterPanel.tsx'), 'utf8');

/** The card-detail overlay's JSX, from its testID to the close button. */
function detailOverlaySource(): string {
    const start = SOURCE.indexOf('testID="combat-card-detail"');
    const end = SOURCE.indexOf('testID="combat-card-detail-close"');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return SOURCE.slice(start, end);
}

function detailFor(id: string) {
    const projected = getCard(id);
    const authored = getCardById(id);
    expect(projected).toBeTruthy();
    return detailStats(projected!, authored);
}

describe('combat card detail — overlay shape', () => {
    it('renders no flavor prose (finding 6)', () => {
        expect(SOURCE).not.toContain('combat-card-detail-flavor');
        expect(SOURCE).not.toContain('detailCard.flavor');
    });

    it('keeps the flavor DATA alive for the DECK screen to render', () => {
        const id = cardLibrary.find(c => !!c.description)?.id;
        expect(id).toBeDefined();
        expect(getCardById(id!)?.description).toBeTruthy();
    });

    it('renders keyword definitions above the card face (finding 5)', () => {
        const overlay = detailOverlaySource();
        const keywords = overlay.indexOf('<CardKeywordLedger');
        const face = overlay.indexOf('<CombatCardFace');
        expect(keywords).toBeGreaterThan(-1);
        expect(face).toBeGreaterThan(-1);
        expect(keywords).toBeLessThan(face);
    });

    it('spends no row on the folded prose footers (finding 3)', () => {
        const overlay = detailOverlaySource();
        for (const field of ['detail.readLegend', 'detail.colorLawHint']) {
            expect(overlay).not.toContain(`detailCard.${field}`);
        }
        // The facts themselves still show — they ride the rows they qualify.
        expect(overlay).toContain('detailCard.detail.freeTag');
        expect(overlay).toContain('detailCard.detail.paidTag');
    });

    it('names the rarity on the large face alone: no meta strip, no pip row under the card', () => {
        const overlay = detailOverlaySource();
        // The large face prints the rarity WORD (CombatCardFace.rarity-D4.test.tsx);
        // the strip under it (stance, rank, band, type) and the pip row beside it are gone.
        expect(overlay).not.toContain('combat-card-detail-meta');
        expect(overlay).not.toContain('detail.metaChip');
        expect(overlay).not.toContain('combat-card-detail-rarity');
        expect(overlay).not.toContain('detail.rarityPips');
        expect(overlay).not.toContain('detail.rarityColor');
    });

    it('prints no system notes under the NO DIE / +DIE rows (T, 2026-11-01)', () => {
        const overlay = detailOverlaySource();
        expect(overlay).not.toContain('systemTerms');
        expect(overlay).not.toContain('systemsGlossary');
        expect(SOURCE).not.toContain('systemsGlossary');
        // The VM carries no per-card system slice either, for any card.
        for (const authored of cardLibrary) {
            expect(detailFor(authored.id)).not.toHaveProperty('systemTerms');
        }
    });

    it('renders the FULL paid line as the ◆ row', () => {
        const overlay = detailOverlaySource();
        expect(overlay).toContain('detailCard.detail.diePaidLine');
        // The `?? outcomeLine` fallback stays as a defensive tail, but it is
        // unreachable for a card that authors any payload — proved over the
        // whole library by `card-detail-agreement.test.ts`.
    });
});

describe('combat card detail — the VM behind the shape', () => {
    it('takes its rarity band from the wave-0 module, never a local re-band', () => {
        for (const authored of cardLibrary) {
            const d = detailFor(authored.id);
            const band = rarityFor(authored);
            expect(d).not.toHaveProperty('rarityPips');
            expect(d.metaChip).toContain(RARITY_LABEL[band].toUpperCase());
        }
    });

    it('folds the colour law into the ◆ tag on a spell', () => {
        // A Plain Blow is colourless: its tag names the 'any' aspect.
        const d = detailFor('grey-strike');
        expect(d.freeTag).toBe('NO DIE');
        expect(d.paidTag).toBe('+DIE · ANY/WILD');
    });
});
