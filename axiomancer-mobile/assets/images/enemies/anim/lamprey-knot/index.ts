/**
 * Lamprey-Knot's 24 cells, in sheet order (phase AN5b).
 *
 * Same shape as `../gallows-crow/index.ts`: one file per frame, ROW-MAJOR
 * because `sheetIndexFor` computes `row * columns + col`, literals spelled
 * out because Metro resolves `require()` statically. This directory's
 * `provenance.json` records the cleanup, the split, the ungraded ingest, the
 * measured cost and the hash of the portrait the sheet was drawn from.
 */
import type { ImageSourcePropType } from 'react-native';

export const LAMPREY_KNOT_CELLS: readonly ImageSourcePropType[] = [
    require('./lamprey-knot-00.webp'),
    require('./lamprey-knot-01.webp'),
    require('./lamprey-knot-02.webp'),
    require('./lamprey-knot-03.webp'),
    require('./lamprey-knot-04.webp'),
    require('./lamprey-knot-05.webp'),
    require('./lamprey-knot-06.webp'),
    require('./lamprey-knot-07.webp'),
    require('./lamprey-knot-08.webp'),
    require('./lamprey-knot-09.webp'),
    require('./lamprey-knot-10.webp'),
    require('./lamprey-knot-11.webp'),
    require('./lamprey-knot-12.webp'),
    require('./lamprey-knot-13.webp'),
    require('./lamprey-knot-14.webp'),
    require('./lamprey-knot-15.webp'),
    require('./lamprey-knot-16.webp'),
    require('./lamprey-knot-17.webp'),
    require('./lamprey-knot-18.webp'),
    require('./lamprey-knot-19.webp'),
    require('./lamprey-knot-20.webp'),
    require('./lamprey-knot-21.webp'),
    require('./lamprey-knot-22.webp'),
    require('./lamprey-knot-23.webp'),
];

export default LAMPREY_KNOT_CELLS;
