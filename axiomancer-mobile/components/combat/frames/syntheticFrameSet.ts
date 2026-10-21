/**
 * A SYNTHETIC frame set, for the dev harness and for the component tests.
 *
 * Twelve 48x48 cells in a 4x3 grid, inline as data URIs. They are deliberately
 * not art and deliberately not files. The only real sheet in this repository
 * lives under the art-department tree, and nothing here may resolve a path into
 * it; a fixture image placed under `assets/images/` would instead have to be
 * registered in that directory's own registry to satisfy the asset-provenance
 * sweep — which would mean faking an installed enemy in order to test an empty
 * registry. Inline cells belong to neither tree and answer to neither rule.
 *
 * Row 0 is `idle`: a bone bar walking left to right, looping. Row 1 is
 * `attacking`: a brighter, taller bar, one-shot. Row 2 is `struck`: a muted red
 * bar that squashes wide and springs back, one-shot. Watching the bar is how
 * you tell a running clip from a held frame at a glance, and the three rows
 * differ in hue as well as shape so a mis-selected clip is obvious rather than
 * subtle — which is the whole job of a fixture whose only reader is a person
 * deciding whether the engine picked the right state.
 */
import type { EnemyFrameSet } from '@/assets/images/enemies/frames';

const CELLS: readonly string[] = [
    // idle, frame 0
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAMAAABg3Am1AAAABlBMVEUSEhLNxqjXkx+oAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAIElEQVRIx2NgGAWjYBSMglEwCkYBmYARCYxqGDgNNAcAfjAAYbpUT2oAAAAASUVORK5CYII=',
    // idle, frame 1
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAMAAABg3Am1AAAABlBMVEUSEhLNxqjXkx+oAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAIElEQVRIx2NgGAWjYBSMglEwCkYBFQAjEhjVMHAaaAIAebAAYTI0wOsAAAAASUVORK5CYII=',
    // idle, frame 2
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAMAAABg3Am1AAAABlBMVEUSEhLNxqjXkx+oAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAIElEQVRIx2NgGAWjYBSMglEwCkYBlQEjEhjVMHAaqAYAdTAAYStdj1IAAAAASUVORK5CYII=',
    // idle, frame 3
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAMAAABg3Am1AAAABlBMVEUSEhLNxqjXkx+oAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAIElEQVRIx2NgGAWjYBSMglEwCkYBDQEjEhjVMHAaKAIAcLAAYSf4gCEAAAAASUVORK5CYII=',
    // attacking, frame 0
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAMAAABg3Am1AAAABlBMVEUeHh7ryHgL50hiAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAIElEQVRIx2NgGAWjYBSMglEwBAEjEhjVMKphpGugOQAAhj8Awc8vAtAAAAAASUVORK5CYII=',
    // attacking, frame 1
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAMAAABg3Am1AAAABlBMVEUeHh7ryHgL50hiAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAIElEQVRIx2NgGAWjYBSMglEwxAEjEhjVMKphpGugCQAAfT8AweEyAlwAAAAASUVORK5CYII=',
    // attacking, frame 2
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAMAAABg3Am1AAAABlBMVEUeHh7ryHgL50hiAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAIElEQVRIx2NgGAWjYBSMglEwjAAjEhjVMKphpGugGgAAdD8AwWH3jMkAAAAASUVORK5CYII=',
    // attacking, frame 3
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAMAAABg3Am1AAAABlBMVEUeHh7ryHgL50hiAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAIElEQVRIx2NgGAWjYBSMglEwTAEjEhjVMKphpGugCAAAaz8AwaGHxH4AAAAASUVORK5CYII=',
    // struck, frame 0
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwAQMAAABtzGvEAAAABlBMVEUSEhLJamqnQucNAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFUlEQVQY02NgGAUwwPj/fwM5FDIAAEI5E/nq0t73AAAAAElFTkSuQmCC',
    // struck, frame 1
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwAQMAAABtzGvEAAAABlBMVEUSEhLJamqnQucNAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFUlEQVQY02NgGAV4Af///x8IUMgAANFvDvJ8jBYEAAAAAElFTkSuQmCC',
    // struck, frame 2
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwAQMAAABtzGvEAAAABlBMVEUSEhLJamqnQucNAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFUlEQVQY02NgGAVogPn//wMkUcgAAN/bE0jl2l88AAAAAElFTkSuQmCC',
    // struck, frame 3
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwAQMAAABtzGvEAAAABlBMVEXJamoSEhKAdvi9AAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFUlEQVQY02P4DwYMI5RiYKAGhWQmAH7sCwRzf5D7AAAAAElFTkSuQmCC',
];

/** The key the harness registers this set under. No enemy uses it. */
export const SYNTHETIC_FRAME_KEY = 'dev-synthetic';

export const SYNTHETIC_FRAME_SET: EnemyFrameSet = {
    manifest: {
        frame: 48,
        columns: 4,
        rows: 3,
        // The fixture bar stands on the cell floor, so the standing kind is the
        // one that reads correctly here.
        anchor: { kind: 'foot-line', x: 24, y: 46, why: 'the fixture bar stands on the cell floor' },
        clips: {
            idle: { row: 0, frames: 4, fps: 6, loop: true, rest: 0 },
            attacking: { row: 1, frames: 4, fps: 10, loop: false, rest: 0 },
            // Faster and shorter-feeling than the swing: a flinch is a
            // reaction, and the two must not be mistakable for one another
            // when they land in the same resolution.
            struck: { row: 2, frames: 4, fps: 16, loop: false, rest: 3 },
        },
        // Nothing generated these through the ingest recipe, so they carry no
        // grade — and saying so is the whole point of the field.
        graded: false,
        source: 'synthetic, generated in place for the dev harness; never ingested',
        generator: 'enemy frame engine dev fixture',
    },
    frames: CELLS.map((uri) => ({ uri })),
};
