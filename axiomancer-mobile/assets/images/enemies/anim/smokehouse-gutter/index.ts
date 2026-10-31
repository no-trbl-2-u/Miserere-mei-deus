/**
 * Smokehouse Gutter's 24 cells, in sheet order (phase AN5e).
 *
 * Same shape as `../gallows-crow/index.ts`: one file per frame, ROW-MAJOR
 * because `sheetIndexFor` computes `row * columns + col`, literals spelled
 * out because Metro resolves `require()` statically. This directory's
 * `provenance.json` records the cleanup, the split, the ungraded ingest, the
 * measured cost and the hash of the portrait the sheet was drawn from.
 */
import type { ImageSourcePropType } from 'react-native';

export const SMOKEHOUSE_GUTTER_CELLS: readonly ImageSourcePropType[] = [
    require('./smokehouse-gutter-00.webp'),
    require('./smokehouse-gutter-01.webp'),
    require('./smokehouse-gutter-02.webp'),
    require('./smokehouse-gutter-03.webp'),
    require('./smokehouse-gutter-04.webp'),
    require('./smokehouse-gutter-05.webp'),
    require('./smokehouse-gutter-06.webp'),
    require('./smokehouse-gutter-07.webp'),
    require('./smokehouse-gutter-08.webp'),
    require('./smokehouse-gutter-09.webp'),
    require('./smokehouse-gutter-10.webp'),
    require('./smokehouse-gutter-11.webp'),
    require('./smokehouse-gutter-12.webp'),
    require('./smokehouse-gutter-13.webp'),
    require('./smokehouse-gutter-14.webp'),
    require('./smokehouse-gutter-15.webp'),
    require('./smokehouse-gutter-16.webp'),
    require('./smokehouse-gutter-17.webp'),
    require('./smokehouse-gutter-18.webp'),
    require('./smokehouse-gutter-19.webp'),
    require('./smokehouse-gutter-20.webp'),
    require('./smokehouse-gutter-21.webp'),
    require('./smokehouse-gutter-22.webp'),
    require('./smokehouse-gutter-23.webp'),
];

export default SMOKEHOUSE_GUTTER_CELLS;
