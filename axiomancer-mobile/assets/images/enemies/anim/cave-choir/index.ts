/**
 * Cave-Choir's 24 cells, in sheet order (phase AN5d).
 *
 * Same shape as `../gallows-crow/index.ts`: one file per frame, ROW-MAJOR
 * because `sheetIndexFor` computes `row * columns + col`, literals spelled
 * out because Metro resolves `require()` statically. This directory's
 * `provenance.json` records the cleanup, the split, the ungraded ingest, the
 * measured cost and the hash of the portrait the sheet was drawn from.
 */
import type { ImageSourcePropType } from 'react-native';

export const CAVE_CHOIR_CELLS: readonly ImageSourcePropType[] = [
    require('./cave-choir-00.webp'),
    require('./cave-choir-01.webp'),
    require('./cave-choir-02.webp'),
    require('./cave-choir-03.webp'),
    require('./cave-choir-04.webp'),
    require('./cave-choir-05.webp'),
    require('./cave-choir-06.webp'),
    require('./cave-choir-07.webp'),
    require('./cave-choir-08.webp'),
    require('./cave-choir-09.webp'),
    require('./cave-choir-10.webp'),
    require('./cave-choir-11.webp'),
    require('./cave-choir-12.webp'),
    require('./cave-choir-13.webp'),
    require('./cave-choir-14.webp'),
    require('./cave-choir-15.webp'),
    require('./cave-choir-16.webp'),
    require('./cave-choir-17.webp'),
    require('./cave-choir-18.webp'),
    require('./cave-choir-19.webp'),
    require('./cave-choir-20.webp'),
    require('./cave-choir-21.webp'),
    require('./cave-choir-22.webp'),
    require('./cave-choir-23.webp'),
];

export default CAVE_CHOIR_CELLS;
