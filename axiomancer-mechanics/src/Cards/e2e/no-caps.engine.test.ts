/**
 * Phase NC1 — no caps on cards (T, 2026-10-26: "remove the "(max +n)" from
 * every card. If there should be a max, I'll call it out."). A card line
 * never prints a cap; the two SACRIFICE X caps T kept ("Sacrifice caps
 * stay") are the only exceptions; each lane's own suite pins its lines.
 */
import { describe, expect, it } from 'vitest';
import { cardLibrary } from '../cards.library';
import { upgradeCard } from '../card-upgrades';
import { cardLinesText } from '../card-rules';
import type { Card } from '../types';

/** A cap on a card line: "(max 8)", "max +12", "max 15". */
const CAP = /\(max\b|\bmax \+?\d/i;
/** The kept exception: the X cap on a "SACRIFICE X" line. */
const SACRIFICE_X_CAP = /SACRIFICE X \(max \d+\)/g;

/** Every live card and each of its upgrades. */
function everyFace(): Card[] {
    const out: Card[] = [];
    for (const card of cardLibrary) {
        for (let c: Card | null | undefined = card; c; c = upgradeCard(c)) out.push(c);
    }
    return out;
}

function lines(card: Card): string[] {
    const { free, paid } = cardLinesText(card);
    const g = card.program?.global;
    return [free, paid, g?.text ?? ''];
}

describe('no caps (Phase NC1)', () => {
    it('no live card line prints a cap, but for the kept SACRIFICE X caps', () => {
        const offenders: string[] = [];
        for (const card of everyFace()) {
            for (const line of lines(card)) {
                if (CAP.test(line.replace(SACRIFICE_X_CAP, ''))) offenders.push(`${card.id}: "${line}"`);
            }
        }
        expect(offenders).toEqual([]);
    });
});
