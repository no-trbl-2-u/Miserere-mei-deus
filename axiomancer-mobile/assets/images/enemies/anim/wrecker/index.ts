/**
 * Wrecker's 24 cells, in sheet order (phase AN5d).
 *
 * Same shape as `../gallows-crow/index.ts`: one file per frame, ROW-MAJOR
 * because `sheetIndexFor` computes `row * columns + col`, literals spelled
 * out because Metro resolves `require()` statically. This directory's
 * `provenance.json` records the cleanup, the split, the ungraded ingest, the
 * measured cost and the hash of the portrait the sheet was drawn from.
 */
import type { ImageSourcePropType } from 'react-native';

export const WRECKER_CELLS: readonly ImageSourcePropType[] = [
    require('./wrecker-00.webp'),
    require('./wrecker-01.webp'),
    require('./wrecker-02.webp'),
    require('./wrecker-03.webp'),
    require('./wrecker-04.webp'),
    require('./wrecker-05.webp'),
    require('./wrecker-06.webp'),
    require('./wrecker-07.webp'),
    require('./wrecker-08.webp'),
    require('./wrecker-09.webp'),
    require('./wrecker-10.webp'),
    require('./wrecker-11.webp'),
    require('./wrecker-12.webp'),
    require('./wrecker-13.webp'),
    require('./wrecker-14.webp'),
    require('./wrecker-15.webp'),
    require('./wrecker-16.webp'),
    require('./wrecker-17.webp'),
    require('./wrecker-18.webp'),
    require('./wrecker-19.webp'),
    require('./wrecker-20.webp'),
    require('./wrecker-21.webp'),
    require('./wrecker-22.webp'),
    require('./wrecker-23.webp'),
];

export default WRECKER_CELLS;
