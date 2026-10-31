/**
 * The gallows crow's 24 cells, in sheet order (phase AN5a).
 *
 * Same shape as `../float-eye/index.ts`, and for the same reasons: one file
 * per frame because the sheet master may not be resolved from here and React
 * Native cannot crop a sheet cheaply; ROW-MAJOR because `sheetIndexFor`
 * computes `row * columns + col`; literals spelled out because Metro resolves
 * `require()` statically. The first set cut from an image-model sheet rather
 * than a rig: this directory's `provenance.json` records the cleanup that
 * made it splittable, the split, the ungraded ingest, the measured cost, and
 * the hash of the portrait it was drawn from.
 */
import type { ImageSourcePropType } from 'react-native';

export const GALLOWS_CROW_CELLS: readonly ImageSourcePropType[] = [
    require('./gallows-crow-00.webp'),
    require('./gallows-crow-01.webp'),
    require('./gallows-crow-02.webp'),
    require('./gallows-crow-03.webp'),
    require('./gallows-crow-04.webp'),
    require('./gallows-crow-05.webp'),
    require('./gallows-crow-06.webp'),
    require('./gallows-crow-07.webp'),
    require('./gallows-crow-08.webp'),
    require('./gallows-crow-09.webp'),
    require('./gallows-crow-10.webp'),
    require('./gallows-crow-11.webp'),
    require('./gallows-crow-12.webp'),
    require('./gallows-crow-13.webp'),
    require('./gallows-crow-14.webp'),
    require('./gallows-crow-15.webp'),
    require('./gallows-crow-16.webp'),
    require('./gallows-crow-17.webp'),
    require('./gallows-crow-18.webp'),
    require('./gallows-crow-19.webp'),
    require('./gallows-crow-20.webp'),
    require('./gallows-crow-21.webp'),
    require('./gallows-crow-22.webp'),
    require('./gallows-crow-23.webp'),
];

export default GALLOWS_CROW_CELLS;
