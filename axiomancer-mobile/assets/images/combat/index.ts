/**
 * Combat arena backdrops (the Woodcut Codex). No live region has a plate of
 * its own yet. The count is pinned by this module's test against the map
 * registry, never restated here.
 *
 * `CombatCombatantPane`'s full-bleed battlefield scene, region-keyed the same
 * way `assets/images/maps/index.ts` keys the exploration-map backdrop: an
 * ordered list of rules, first match wins, unmatched falls back to the arena
 * that already shipped.
 *
 * ## One table, not two
 *
 * A plate and its screen-reader description are ONE record. You cannot add the
 * image without writing the words, because they are the same object. Kept
 * apart, a plate could ship without its description and a screen-reader user
 * would be told they are looking at some other plate's scene. The provenance
 * gate checks that art is *reachable*, not that it is *described*.
 *
 * ## The register
 *
 * Every plate is a 19th-century engraving in the public domain, acquired and
 * licence-proven by `scripts/acquire-art.mjs` (which reads Commons' own
 * `imageinfo` extmetadata and refuses anything it cannot prove is PD/CC0), then
 * graded toward the void by the shared recipe in `scripts/ingest-art.mjs`. See
 * `provenance.json` beside this file for the per-plate record.
 *
 * ## The fallback
 *
 * Because it is the fallback it is the most-seen arena in the game, so it must
 * be licence-proven like every other plate. It is Doré's "The New Zealander"
 * (1873), chosen because a fallback must stay coherent behind regions it was
 * not drawn for:
 * heavy dark mass at the edges, a lit band across the middle where the foe
 * composites, and a subject — ruin outliving the city that made it — general
 * enough not to contradict an unmapped region.
 */

const ARENA_DESOLATION = require('./arena-desolation.webp');
const ARENA_COASTAL_VILLAGE = require('./coastal-village.webp');

/**
 * The twelve arena plates kept by plan 146 (chunk 146.1), by file. Not yet
 * resolved by any region rule: 146.2 turns this into the plate library and the
 * region defaults, 146.3 lets a map node name one. It exists here only so the
 * provenance gate's "reachable from a registry" check sees the files.
 */
export const KEPT_ARENA_PLATE_ART = {
    'arena-breakwater-northern-sea': require('./arena-breakwater-northern-sea.webp'),
    'arena-breakwater-kuste-bei-mondschein': require('./arena-breakwater-kuste-bei-mondschein.webp'),
    'arena-breakwater-mondscheinnacht-ruegen': require('./arena-breakwater-mondscheinnacht-ruegen.webp'),
    'arena-charcoal-wood-sacred-grove': require('./arena-charcoal-wood-sacred-grove.webp'),
    'arena-charcoal-wood-pheasantry': require('./arena-charcoal-wood-pheasantry.webp'),
    'arena-charcoal-wood-eldena': require('./arena-charcoal-wood-eldena.webp'),
    'arena-beacon-crags-storm-mountains': require('./arena-beacon-crags-storm-mountains.webp'),
    'arena-beacon-crags-rocky-mountains-storm': require('./arena-beacon-crags-rocky-mountains-storm.webp'),
    'arena-beacon-crags-riesengebirge': require('./arena-beacon-crags-riesengebirge.webp'),
    'arena-lantern-deep-toteninsel': require('./arena-lantern-deep-toteninsel.webp'),
    'arena-lantern-deep-pandemonium': require('./arena-lantern-deep-pandemonium.webp'),
    'arena-lantern-deep-great-day-of-wrath': require('./arena-lantern-deep-great-day-of-wrath.webp'),
} as const;

/**
 * One arena: the region it answers, the plate, and what a screen-reader user is
 * told they are looking at.
 *
 * @property pattern - matched case-insensitively against the region's live
 *   display string (e.g. `'the Drowned Parish'`). Deliberately narrow — see the
 *   ordering note on {@link REGION_ARENAS}.
 * @property art     - the `require()`d asset module id.
 * @property alt     - what is actually IN the plate. Not the region's name: a
 *   user who cannot see the image gains nothing from being told the name of the
 *   place they already know they are standing in.
 */
interface ArenaPlate {
    readonly pattern: RegExp;
    readonly art: number;
    readonly alt: string;
}

/**
 * Ordered: the FIRST pattern that matches wins.
 *
 * Every pattern is narrow and names its own region rather than a generic
 * family like `village|town` or `city|capital`: a generic rule stops matching
 * SILENTLY when a region is renamed, and collapses distinct places onto one
 * plate.
 *
 * Because the patterns are disjoint, order is not currently load-bearing — but
 * it is still first-match-wins, so a future broad rule must be appended AFTER
 * the narrow ones, never before.
 */
const REGION_ARENAS: readonly ArenaPlate[] = [
    // The coastal village (the Drowned Parish). No live map names this region.
    {
        pattern: /drowned parish/i,
        art: ARENA_COASTAL_VILLAGE,
        alt: 'Fishermen crowd a moored boat’s rigging, masts forested against a backlit dockside sky',
    },
];

/**
 * The arena shown wherever no rule matches.
 *
 * Kept OUT of the table on purpose: it is not a region rule, it is the absence
 * of one.
 */
const FALLBACK_ARENA: Omit<ArenaPlate, 'pattern'> = {
    art: ARENA_DESOLATION,
    alt: 'A cloaked figure sits on a broken wharf sketching the ruins of a dead city across black water under a clouded moon',
};

/**
 * Whether combat shows its arena plates at all.
 *
 * While this is off, `CombatCombatantPane` paints the scene band plain black
 * for every region and never draws a plate. The plates, their descriptions and
 * the resolver below stay as they are (and stay tested), so turning combat art
 * back on is this one line.
 */
export const ARENA_PLATES_SHOWN = false;

/** The screen-reader label for the plain black scene while plates are off. */
export const BLACK_ARENA_ALT = 'A plain black backdrop behind the foe';

/** The matching plate for a region display string, or the fallback. */
function plateFor(region: string | undefined): Omit<ArenaPlate, 'pattern'> {
    if (region) {
        for (const plate of REGION_ARENAS) {
            if (plate.pattern.test(region)) return plate;
        }
    }
    return FALLBACK_ARENA;
}

/** Resolve the arena backdrop for a region display string. */
export function arenaBackdropFor(region: string | undefined): number {
    return plateFor(region).art;
}

/**
 * The scene's accessibility label, kept in step with the plate BY CONSTRUCTION —
 * both read the same record, so a plate cannot ship with another plate's words.
 */
export function arenaAltTextFor(region: string | undefined): string {
    return plateFor(region).alt;
}
