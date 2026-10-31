/**
 * Tithe-Collector's 24 cells, in sheet order (phase AN5c).
 *
 * Same shape as `../gallows-crow/index.ts`: one file per frame, ROW-MAJOR
 * because `sheetIndexFor` computes `row * columns + col`, literals spelled
 * out because Metro resolves `require()` statically. This directory's
 * `provenance.json` records the cleanup, the split, the ungraded ingest, the
 * measured cost and the hash of the portrait the sheet was drawn from.
 */
import type { ImageSourcePropType } from 'react-native';

export const TITHE_COLLECTOR_CELLS: readonly ImageSourcePropType[] = [
    require('./tithe-collector-00.webp'),
    require('./tithe-collector-01.webp'),
    require('./tithe-collector-02.webp'),
    require('./tithe-collector-03.webp'),
    require('./tithe-collector-04.webp'),
    require('./tithe-collector-05.webp'),
    require('./tithe-collector-06.webp'),
    require('./tithe-collector-07.webp'),
    require('./tithe-collector-08.webp'),
    require('./tithe-collector-09.webp'),
    require('./tithe-collector-10.webp'),
    require('./tithe-collector-11.webp'),
    require('./tithe-collector-12.webp'),
    require('./tithe-collector-13.webp'),
    require('./tithe-collector-14.webp'),
    require('./tithe-collector-15.webp'),
    require('./tithe-collector-16.webp'),
    require('./tithe-collector-17.webp'),
    require('./tithe-collector-18.webp'),
    require('./tithe-collector-19.webp'),
    require('./tithe-collector-20.webp'),
    require('./tithe-collector-21.webp'),
    require('./tithe-collector-22.webp'),
    require('./tithe-collector-23.webp'),
];

export default TITHE_COLLECTOR_CELLS;
