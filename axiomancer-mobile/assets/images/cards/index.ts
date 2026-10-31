/**
 * Per-card art registry. Metro needs static require literals, so this map is
 * the one place a card id meets a file path; the mechanics package stays
 * art-free.
 *
 * The three grey starters borrow paintings from the pool as placeholders
 * until the card art revamp (B8) decides art per card type. The other
 * paintings in this folder stay as that pool (`CARD_ART_POOL`,
 * `provenance.json`). The 30 Blood Price cards each have their own torio
 * painting (`bp-*.webp`), and the 30 Defender cards each have their own
 * painting (`df-*.webp`, T's sheets). Unmapped ids (sandbox and fixture cards) fall back
 * to the circe placeholder.
 */

const godEye = require('./god-eye-silver.webp');
const iceSword = require('./ice-sword.webp');
const guardTorso = require('./guard-1.webp');

/** Every painting in the folder, mapped or not: the pool B8 draws from. */
export const CARD_ART_POOL: readonly number[] = [
    require('./blue-light.webp'),
    require('./bright-sphere-yellow.webp'),
    require('./devil-book.webp'),
    require('./dream-flutter.webp'),
    godEye,
    iceSword,
    require('./light-ring.webp'),
    require('./meat-pecker.webp'),
    require('./spark.webp'),
    require('./will-o-wisp.webp'),
    require('./yggdrasil.webp'),
    require('./bleed.webp'),
    require('./burn.webp'),
    require('./confuse.webp'),
    require('./freeze.webp'),
    guardTorso,
    require('./guard-2.webp'),
    require('./guard-3.webp'),
];

export const FALLBACK_CARD_ART = require('./circe-placeholder.jpg');

const CARD_ART_BY_ID: Record<string, number> = {
    'grey-strike': iceSword,
    'grey-ward': guardTorso,
    'grey-word': godEye,
    // Blood Price lane: torio paintings (provenance.json), one per card.
    'bp-e-01n': require('./bp-e-01n.webp'),
    'bp-e-02d': require('./bp-e-02d.webp'),
    'bp-e-03d': require('./bp-e-03d.webp'),
    'bp-e-04c': require('./bp-e-04c.webp'),
    'bp-e-05n': require('./bp-e-05n.webp'),
    'bp-e-06b': require('./bp-e-06b.webp'),
    'bp-e-07b': require('./bp-e-07b.webp'),
    'bp-e-08n': require('./bp-e-08n.webp'),
    'bp-e-09n': require('./bp-e-09n.webp'),
    'bp-e-10d': require('./bp-e-10d.webp'),
    'bp-m-01d': require('./bp-m-01d.webp'),
    'bp-m-02b': require('./bp-m-02b.webp'),
    'bp-m-03d': require('./bp-m-03d.webp'),
    'bp-m-04n': require('./bp-m-04n.webp'),
    'bp-m-05b': require('./bp-m-05b.webp'),
    'bp-m-06c': require('./bp-m-06c.webp'),
    'bp-m-07a': require('./bp-m-07a.webp'),
    'bp-m-08d': require('./bp-m-08d.webp'),
    'bp-m-09a': require('./bp-m-09a.webp'),
    'bp-m-10a': require('./bp-m-10a.webp'),
    'bp-p-01a': require('./bp-p-01a.webp'),
    'bp-p-02a': require('./bp-p-02a.webp'),
    'bp-p-03a': require('./bp-p-03a.webp'),
    'bp-p-04c': require('./bp-p-04c.webp'),
    'bp-p-05b': require('./bp-p-05b.webp'),
    'bp-p-06d': require('./bp-p-06d.webp'),
    'bp-p-07b': require('./bp-p-07b.webp'),
    'bp-p-08d': require('./bp-p-08d.webp'),
    'bp-p-09b': require('./bp-p-09b.webp'),
    'bp-p-10c': require('./bp-p-10c.webp'),
    // Defender lane: T's paintings (provenance.json), one per card.
    'df-p-01a': require('./df-p-01a.webp'),
    'df-p-02b': require('./df-p-02b.webp'),
    'df-p-03c': require('./df-p-03c.webp'),
    'df-p-04a': require('./df-p-04a.webp'),
    'df-p-05c': require('./df-p-05c.webp'),
    'df-p-06c': require('./df-p-06c.webp'),
    'df-p-07c': require('./df-p-07c.webp'),
    'df-p-08b': require('./df-p-08b.webp'),
    'df-p-09b': require('./df-p-09b.webp'),
    'df-p-10b': require('./df-p-10b.webp'),
    'df-e-01c': require('./df-e-01c.webp'),
    'df-e-02b': require('./df-e-02b.webp'),
    'df-e-03b': require('./df-e-03b.webp'),
    'df-e-04a': require('./df-e-04a.webp'),
    'df-e-05c': require('./df-e-05c.webp'),
    'df-e-06c': require('./df-e-06c.webp'),
    'df-e-07c': require('./df-e-07c.webp'),
    'df-e-08b': require('./df-e-08b.webp'),
    'df-e-09c': require('./df-e-09c.webp'),
    'df-e-10c': require('./df-e-10c.webp'),
    'df-m-01b': require('./df-m-01b.webp'),
    'df-m-02b': require('./df-m-02b.webp'),
    'df-m-03b': require('./df-m-03b.webp'),
    'df-m-04b': require('./df-m-04b.webp'),
    'df-m-05c': require('./df-m-05c.webp'),
    'df-m-06b': require('./df-m-06b.webp'),
    'df-m-07c': require('./df-m-07c.webp'),
    'df-m-08c': require('./df-m-08c.webp'),
    'df-m-09a': require('./df-m-09a.webp'),
    'df-m-10n': require('./df-m-10n.webp'),
};

export function getCardArt(cardId: string): number {
    return CARD_ART_BY_ID[cardId] ?? FALLBACK_CARD_ART;
}
