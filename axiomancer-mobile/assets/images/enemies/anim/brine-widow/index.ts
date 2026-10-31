/**
 * Brine-Widow's 24 cells, in sheet order (phase AN5b).
 *
 * Same shape as `../gallows-crow/index.ts`: one file per frame, ROW-MAJOR
 * because `sheetIndexFor` computes `row * columns + col`, literals spelled
 * out because Metro resolves `require()` statically. This directory's
 * `provenance.json` records the cleanup, the split, the ungraded ingest, the
 * measured cost and the hash of the portrait the sheet was drawn from.
 */
import type { ImageSourcePropType } from 'react-native';

export const BRINE_WIDOW_CELLS: readonly ImageSourcePropType[] = [
    require('./brine-widow-00.webp'),
    require('./brine-widow-01.webp'),
    require('./brine-widow-02.webp'),
    require('./brine-widow-03.webp'),
    require('./brine-widow-04.webp'),
    require('./brine-widow-05.webp'),
    require('./brine-widow-06.webp'),
    require('./brine-widow-07.webp'),
    require('./brine-widow-08.webp'),
    require('./brine-widow-09.webp'),
    require('./brine-widow-10.webp'),
    require('./brine-widow-11.webp'),
    require('./brine-widow-12.webp'),
    require('./brine-widow-13.webp'),
    require('./brine-widow-14.webp'),
    require('./brine-widow-15.webp'),
    require('./brine-widow-16.webp'),
    require('./brine-widow-17.webp'),
    require('./brine-widow-18.webp'),
    require('./brine-widow-19.webp'),
    require('./brine-widow-20.webp'),
    require('./brine-widow-21.webp'),
    require('./brine-widow-22.webp'),
    require('./brine-widow-23.webp'),
];

export default BRINE_WIDOW_CELLS;
