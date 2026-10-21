/**
 * The float-eye's 24 cells, in sheet order.
 *
 * ONE FILE PER FRAME, and the sheet master is not here: nothing in the
 * repository may resolve a path into `art-department/`, where the 2048x768
 * master lives, and React Native cannot crop a sheet cheaply anyway. The
 * splitter runs over there and the ingest writes here; see this directory's
 * `provenance.json` for the two commands and the measured cost.
 *
 * The order is ROW-MAJOR and it is load-bearing: cell `row * columns + col`,
 * which is exactly what `sheetIndexFor` computes from the manifest. Getting it
 * wrong does not crash anything — it makes the enemy flinch on the beat it
 * meant to swing. `frames.ts` validates the count against the manifest's grid,
 * and `scripts/frame-cells.test.mjs` pins the byte ceiling.
 *
 * The literals are spelled out rather than built in a loop because Metro
 * resolves `require()` statically: a generated path is a missing asset at
 * runtime, and `asset-provenance.test.mjs` reads this file's text to prove
 * every cell on disk is reached by a registry.
 */
import type { ImageSourcePropType } from 'react-native';

export const FLOAT_EYE_CELLS: readonly ImageSourcePropType[] = [
    require('./float-eye-00.webp'),
    require('./float-eye-01.webp'),
    require('./float-eye-02.webp'),
    require('./float-eye-03.webp'),
    require('./float-eye-04.webp'),
    require('./float-eye-05.webp'),
    require('./float-eye-06.webp'),
    require('./float-eye-07.webp'),
    require('./float-eye-08.webp'),
    require('./float-eye-09.webp'),
    require('./float-eye-10.webp'),
    require('./float-eye-11.webp'),
    require('./float-eye-12.webp'),
    require('./float-eye-13.webp'),
    require('./float-eye-14.webp'),
    require('./float-eye-15.webp'),
    require('./float-eye-16.webp'),
    require('./float-eye-17.webp'),
    require('./float-eye-18.webp'),
    require('./float-eye-19.webp'),
    require('./float-eye-20.webp'),
    require('./float-eye-21.webp'),
    require('./float-eye-22.webp'),
    require('./float-eye-23.webp'),
];

export default FLOAT_EYE_CELLS;
