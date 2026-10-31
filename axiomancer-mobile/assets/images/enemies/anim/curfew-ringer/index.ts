/**
 * Curfew-Ringer's 24 cells, in sheet order (phase AN5b).
 *
 * Same shape as `../gallows-crow/index.ts`: one file per frame, ROW-MAJOR
 * because `sheetIndexFor` computes `row * columns + col`, literals spelled
 * out because Metro resolves `require()` statically. This directory's
 * `provenance.json` records the cleanup, the split, the ungraded ingest, the
 * measured cost and the hash of the portrait the sheet was drawn from.
 */
import type { ImageSourcePropType } from 'react-native';

export const CURFEW_RINGER_CELLS: readonly ImageSourcePropType[] = [
    require('./curfew-ringer-00.webp'),
    require('./curfew-ringer-01.webp'),
    require('./curfew-ringer-02.webp'),
    require('./curfew-ringer-03.webp'),
    require('./curfew-ringer-04.webp'),
    require('./curfew-ringer-05.webp'),
    require('./curfew-ringer-06.webp'),
    require('./curfew-ringer-07.webp'),
    require('./curfew-ringer-08.webp'),
    require('./curfew-ringer-09.webp'),
    require('./curfew-ringer-10.webp'),
    require('./curfew-ringer-11.webp'),
    require('./curfew-ringer-12.webp'),
    require('./curfew-ringer-13.webp'),
    require('./curfew-ringer-14.webp'),
    require('./curfew-ringer-15.webp'),
    require('./curfew-ringer-16.webp'),
    require('./curfew-ringer-17.webp'),
    require('./curfew-ringer-18.webp'),
    require('./curfew-ringer-19.webp'),
    require('./curfew-ringer-20.webp'),
    require('./curfew-ringer-21.webp'),
    require('./curfew-ringer-22.webp'),
    require('./curfew-ringer-23.webp'),
];

export default CURFEW_RINGER_CELLS;
