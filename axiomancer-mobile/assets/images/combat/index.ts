/**
 * Combat arena backdrops (the Woodcut Codex): a library of plates by stable id,
 * and a default plate per Act 1 region. Which live regions have a default is
 * pinned by this module's test against the map registry, never restated here.
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
 * Every plate is a 19th-century painting or engraving in the public domain, acquired and
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
 * One arena plate in the library: what a screen-reader user is told they are
 * looking at, and the art. The id is the record's key in {@link ARENA_PLATES}
 * and is stable: plan 146.3 lets a map node name a plate by it.
 *
 * @property art - the `require()`d asset module id.
 * @property alt - what is actually IN the plate (looked at, not inferred from
 *   its title). Not the region's name: a user who cannot see the image gains
 *   nothing from being told the name of the place they already know they are
 *   standing in.
 */
interface ArenaPlateRecord {
    readonly art: number;
    readonly alt: string;
}

/**
 * The twelve arena plates kept by plan 146 (T's picks): one library, every plate
 * kept whether or not a region defaults to it, because some suit a foe better
 * than the region's pick. Keys are `arena-<region>-<subject>`; the first of each
 * region's three is T's default for it (see {@link REGION_ARENAS}).
 *
 * The plates are graded toward the void, so most of each is dark; the alt text
 * names what a player can pick out in it.
 */
export const ARENA_PLATES = {
    'arena-breakwater-northern-sea': {
        art: require('./arena-breakwater-northern-sea.webp'),
        alt: 'A moonlit northern sea under torn, churning clouds, a dark headland with a ruined tower on the right and a lone ship’s mast leaning in the black shallows below',
    },
    'arena-breakwater-kuste-bei-mondschein': {
        art: require('./arena-breakwater-kuste-bei-mondschein.webp'),
        alt: 'A flat tidal shore at night under heavy banked clouds, two tall dark stones standing against a thin bright line of horizon, moonlight glinting on a wet channel between them',
    },
    'arena-breakwater-mondscheinnacht-ruegen': {
        art: require('./arena-breakwater-mondscheinnacht-ruegen.webp'),
        alt: 'A full moon in a streaked sky above a wide flat-topped cliff across the water, wind-bent trees on a dark grassy slope at left and boulders strewn along the shore',
    },
    'arena-charcoal-wood-sacred-grove': {
        art: require('./arena-charcoal-wood-sacred-grove.webp'),
        alt: 'A still pool before a dark grove, two figures bowed at a small altar with a flame, a file of pale robed figures standing among the tree trunks behind them, white birches at the left',
    },
    'arena-charcoal-wood-pheasantry': {
        art: require('./arena-charcoal-wood-pheasantry.webp'),
        alt: 'The inside of a thick forest, huge gnarled trunks leaning together around a small glade where sunlight falls in dappled patches on the ground, a fence just visible at the right',
    },
    'arena-charcoal-wood-eldena': {
        art: require('./arena-charcoal-wood-eldena.webp'),
        alt: 'The roofless ruin of an abbey church, a tall pointed arch and broken walls rising through overgrown trees, a small cottage built into its base and a pale sky behind',
    },
    'arena-beacon-crags-storm-mountains': {
        art: require('./arena-beacon-crags-storm-mountains.webp'),
        alt: 'A mountain gorge in a storm, mist hanging between steep rock walls, a small fire or lightning-lit glow burning in the middle distance behind a dead, bare tree and leafy undergrowth in the foreground',
    },
    'arena-beacon-crags-rocky-mountains-storm': {
        art: require('./arena-beacon-crags-rocky-mountains-storm.webp'),
        alt: 'A great storm cloud boiling over a mountain valley, light breaking through its edges onto distant peaks, a dark cliff wall at the right and a few small trees by a lake in the shadowed centre',
    },
    'arena-beacon-crags-riesengebirge': {
        art: require('./arena-beacon-crags-riesengebirge.webp'),
        alt: 'A wide, pale, nearly empty sky of faint streaked cloud over layers of soft grey mountain ridges fading into haze, with a darker foreground slope rising in the lower right corner',
    },
    'arena-lantern-deep-toteninsel': {
        art: require('./arena-lantern-deep-toteninsel.webp'),
        alt: 'A small island of tall sheer rock faces with tomb openings carved in them, a dense black stand of cypress trees between them, and a small boat with a white-robed figure rowing toward the water gate over dark still water',
    },
    'arena-lantern-deep-pandemonium': {
        art: require('./arena-lantern-deep-pandemonium.webp'),
        alt: 'A vast colonnaded palace blazing with rows of lights across a black, stormy lake, fire breaking through the rocks in the foreground and a helmeted figure with a round shield standing on a crag at the right',
    },
    'arena-lantern-deep-great-day-of-wrath': {
        art: require('./arena-lantern-deep-great-day-of-wrath.webp'),
        alt: 'A cataclysm: mountains and enormous boulders torn apart and falling around a blinding bright gap in the sky, a dark chasm below, and tiny figures struggling on the rocks at the bottom right',
    },
} as const satisfies Record<string, ArenaPlateRecord>;

/** A stable plate id: the key of a plate in {@link ARENA_PLATES}. */
export type ArenaPlateId = keyof typeof ARENA_PLATES;

/** Every plate id, in library order. */
export const ARENA_PLATE_IDS = Object.keys(ARENA_PLATES) as ArenaPlateId[];

/**
 * One region rule: the region it answers and the plate that region defaults to.
 *
 * @property pattern - matched case-insensitively against the region's live
 *   display string (e.g. `'the Drowned Parish'`). Deliberately narrow — see the
 *   ordering note on {@link REGION_ARENAS}.
 * @property plate   - the id of the region's default plate in the library.
 */
interface RegionRule {
    readonly pattern: RegExp;
    readonly plate: ArenaPlateId;
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
 *
 * The four Act 1 defaults are T's picks: do not reorder or swap them.
 * The Drowned Parish is handled apart, by {@link DROWNED_PARISH_ARENA}.
 */
const REGION_ARENAS: readonly RegionRule[] = [
    { pattern: /the breakwater/i, plate: 'arena-breakwater-northern-sea' },
    { pattern: /the charcoal wood/i, plate: 'arena-charcoal-wood-sacred-grove' },
    { pattern: /the beacon crags/i, plate: 'arena-beacon-crags-storm-mountains' },
    { pattern: /the lantern deep/i, plate: 'arena-lantern-deep-toteninsel' },
];

/**
 * The coastal village (the Drowned Parish). No live map names this region. Its
 * rule is unchanged from before the library and sits outside it: it is not one
 * of the twelve plates a node may name.
 */
const DROWNED_PARISH_ARENA: ArenaPlateRecord & { readonly pattern: RegExp } = {
    pattern: /drowned parish/i,
    art: ARENA_COASTAL_VILLAGE,
    alt: 'Fishermen crowd a moored boat’s rigging, masts forested against a backlit dockside sky',
};

/**
 * The arena shown wherever no rule matches.
 *
 * Kept OUT of the table on purpose: it is not a region rule, it is the absence
 * of one.
 */
const FALLBACK_ARENA: ArenaPlateRecord = {
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
function plateFor(region: string | undefined): ArenaPlateRecord {
    if (region) {
        if (DROWNED_PARISH_ARENA.pattern.test(region)) return DROWNED_PARISH_ARENA;
        for (const rule of REGION_ARENAS) {
            if (rule.pattern.test(region)) return ARENA_PLATES[rule.plate];
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
