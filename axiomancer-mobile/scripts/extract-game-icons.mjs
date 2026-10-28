#!/usr/bin/env node
/**
 * extract-game-icons.mjs — Phase V1 (the Woodcut Codex).
 *
 * Reads the curated icon manifest below, pulls each SVG's geometry out
 * of a local copy of the game-icons.net library, and regenerates
 * `components/icons/game-icon-paths.ts` (checked in — the app never reads
 * the library at runtime, and the library is not in the repository).
 *
 * The library root is an argument, not a path this repo knows:
 *
 *   node scripts/extract-game-icons.mjs <library>/ffffff/transparent/1x1
 *
 * or set GAME_ICONS_LIBRARY to the same directory. There is deliberately
 * no default: nothing in the tree may depend on where the operator keeps
 * a 4,000-file icon archive.
 *
 * To add an icon: add a manifest row, run the script, give the icon a
 * label in `components/icons/icon-registry.ts`, and commit both.
 *
 * License: game-icons.net marks are CC BY 3.0 (some artists CC0) — the
 * record travels with the geometry in
 * `components/icons/LICENSE-game-icons.txt`, and attribution is carried
 * per-entry in the generated file.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIBRARY = process.argv[2] ?? process.env.GAME_ICONS_LIBRARY;
if (!LIBRARY) {
    console.error(
        'usage: node scripts/extract-game-icons.mjs <library>/ffffff/transparent/1x1\n' +
            '   or: GAME_ICONS_LIBRARY=<same directory> node scripts/extract-game-icons.mjs\n\n' +
            'The game-icons.net archive is not in this repository. Point this at wherever\n' +
            'you keep it; the geometry it writes is what ships.',
    );
    process.exit(2);
}
const OUT = join(HERE, '..', 'components', 'icons', 'game-icon-paths.ts');

/** registry name → library path (artist/file, no extension) */
const MANIFEST = {
    'action-sword': 'lorc/crossed-swords',
    'action-shield': 'delapouite/templar-shield',
    'action-arcane': 'lorc/magic-swirl',
    'action-bag': 'lorc/knapsack',
    'action-flee': 'lorc/wingfoot',
    'action-eye': 'lorc/semi-closed-eye',
    'action-crown': 'lorc/crown',
    'action-boss': 'lorc/crowned-skull',
    'action-chest': 'skoll/open-treasure-chest',
    'action-scroll': 'lorc/scroll-unfurled',
    'action-quill': 'delapouite/scroll-quill',
    'effect-poison': 'lorc/poison-bottle',
    'effect-bleed': 'lorc/droplets',
    'effect-stun': 'delapouite/star-struck',
    'effect-regen': 'zeromancer/heart-plus',
    'effect-burn': 'lorc/small-fire',
    'effect-buff': 'delapouite/biceps',
    'effect-debuff': 'lorc/despair',
    'effect-shield': 'lorc/bordered-shield',
    'action-rest': 'lorc/campfire',
    'action-herbs': 'delapouite/herbs-bundle',
    'action-hazard': 'delapouite/falling-rocks',
    'action-anvil': 'lorc/anvil',
    'action-coin': 'lorc/crown-coin',
    'action-tombstone': 'lorc/tombstone',
    'action-village': 'delapouite/huts-village',
    'relic-tiara': 'delapouite/tiara',
    'relic-diamond-ring': 'delapouite/diamond-ring',
    'relic-chalice-drops': 'lorc/chalice-drops',
    'relic-bolt-eye': 'lorc/bolt-eye',
    'relic-gem-pendant': 'lorc/gem-pendant',
    'relic-frostfire': 'lorc/frostfire',
};

const rows = Object.entries(MANIFEST).map(([name, source]) => {
    const svg = readFileSync(join(LIBRARY, `${source}.svg`), 'utf8');
    const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1];
    const ds = [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);
    if (!viewBox || ds.length === 0) {
        throw new Error(`no geometry extracted from ${source}`);
    }
    return { name, source, viewBox, ds };
});

const body = rows
    .map(({ name, source, viewBox, ds }) => {
        const paths = ds.map((d) => `            '${d.replace(/'/g, "\\'")}',`).join('\n');
        return `    '${name}': {\n        source: '${source}',\n        viewBox: '${viewBox}',\n        ds: [\n${paths}\n        ],\n    },`;
    })
    .join('\n');

writeFileSync(
    OUT,
    `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Curated silhouettes from the game-icons.net library, CC BY 3.0 / CC0
 * per artist — see \`components/icons/LICENSE-game-icons.txt\`, which is the
 * archive's own record kept beside this file. Regenerate with:
 *
 *   node scripts/extract-game-icons.mjs <library>/ffffff/transparent/1x1
 *
 * \`source\` is the attribution key: \`<artist>/<icon>\` on game-icons.net.
 */

export interface GameIconGeometry {
    /** game-icons.net attribution: artist/icon-name. */
    readonly source: string;
    readonly viewBox: string;
    readonly ds: readonly string[];
}

export const GAME_ICON_PATHS = {
${body}
} as const satisfies Record<string, GameIconGeometry>;

export type GameIconName = keyof typeof GAME_ICON_PATHS;
`,
);

console.log(`wrote ${rows.length} icons -> ${OUT}`);
