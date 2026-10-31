/**
 * Lamplighter's 24 cells, in sheet order (phase AN5d).
 *
 * Same shape as `../gallows-crow/index.ts`: one file per frame, ROW-MAJOR
 * because `sheetIndexFor` computes `row * columns + col`, literals spelled
 * out because Metro resolves `require()` statically. This directory's
 * `provenance.json` records the cleanup, the split, the ungraded ingest, the
 * measured cost and the hash of the portrait the sheet was drawn from.
 */
import type { ImageSourcePropType } from 'react-native';

export const LAMPLIGHTER_CELLS: readonly ImageSourcePropType[] = [
    require('./lamplighter-00.webp'),
    require('./lamplighter-01.webp'),
    require('./lamplighter-02.webp'),
    require('./lamplighter-03.webp'),
    require('./lamplighter-04.webp'),
    require('./lamplighter-05.webp'),
    require('./lamplighter-06.webp'),
    require('./lamplighter-07.webp'),
    require('./lamplighter-08.webp'),
    require('./lamplighter-09.webp'),
    require('./lamplighter-10.webp'),
    require('./lamplighter-11.webp'),
    require('./lamplighter-12.webp'),
    require('./lamplighter-13.webp'),
    require('./lamplighter-14.webp'),
    require('./lamplighter-15.webp'),
    require('./lamplighter-16.webp'),
    require('./lamplighter-17.webp'),
    require('./lamplighter-18.webp'),
    require('./lamplighter-19.webp'),
    require('./lamplighter-20.webp'),
    require('./lamplighter-21.webp'),
    require('./lamplighter-22.webp'),
    require('./lamplighter-23.webp'),
];

export default LAMPLIGHTER_CELLS;
