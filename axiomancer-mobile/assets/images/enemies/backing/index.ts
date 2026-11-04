/**
 * Enemy BACKINGS: one soft dark shape per foe, drawn directly under it.
 *
 * A foe's art was alpha-matted by keying black out of a painting, so its dark
 * strokes are holes and an arena plate would read straight through them. The
 * backing fills them. `scripts/bake-backings.mjs` cuts each matte from every
 * cell the foe animates through, overlaid into one shape, so one file serves
 * every frame. It bakes black; the pane tints it to the theme's `AXM.deepBg`.
 *
 * `scripts/enemy-backings.test.mjs` fails when a foe that draws transparent art
 * has no entry here, judged by the alpha values on disk.
 */
import type { ImageSourcePropType } from 'react-native';

export const ENEMY_BACKINGS: Readonly<Record<string, ImageSourcePropType>> = {
    'brine-widow':       require('./brine-widow.backing.webp'),
    'cave-choir':        require('./cave-choir.backing.webp'),
    'crane-hook':        require('./crane-hook.backing.webp'),
    'curfew-ringer':     require('./curfew-ringer.backing.webp'),
    'death-beholder':    require('./death-beholder.backing.webp'),
    'float-eye':         require('./float-eye.backing.webp'),
    'gallows-crow':      require('./gallows-crow.backing.webp'),
    'green-jelly':       require('./green-jelly.backing.webp'),
    'lamplighter':       require('./lamplighter.backing.webp'),
    'lamprey-knot':      require('./lamprey-knot.backing.webp'),
    'net-mender':        require('./net-mender.backing.webp'),
    'smokehouse-gutter': require('./smokehouse-gutter.backing.webp'),
    'tide-gate':         require('./tide-gate.backing.webp'),
    'tithe-collector':   require('./tithe-collector.backing.webp'),
    'toll-keeper':       require('./toll-keeper.backing.webp'),
    'wreck-picker':      require('./wreck-picker.backing.webp'),
    'wrecker':           require('./wrecker.backing.webp'),
};

/** The foe's backing, or null for a key with none (an unknown or synthetic foe). */
export function getEnemyBacking(artKey: string | null | undefined): ImageSourcePropType | null {
    if (!artKey || !Object.prototype.hasOwnProperty.call(ENEMY_BACKINGS, artKey)) return null;
    return ENEMY_BACKINGS[artKey];
}
