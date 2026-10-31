/**
 * Tide-Gate's 24 cells, in sheet order (phase AN5e).
 *
 * Same shape as `../gallows-crow/index.ts`: one file per frame, ROW-MAJOR
 * because `sheetIndexFor` computes `row * columns + col`, literals spelled
 * out because Metro resolves `require()` statically. This directory's
 * `provenance.json` records the cleanup, the split, the ungraded ingest, the
 * measured cost and the hash of the portrait the sheet was drawn from.
 */
import type { ImageSourcePropType } from 'react-native';

export const TIDE_GATE_CELLS: readonly ImageSourcePropType[] = [
    require('./tide-gate-00.webp'),
    require('./tide-gate-01.webp'),
    require('./tide-gate-02.webp'),
    require('./tide-gate-03.webp'),
    require('./tide-gate-04.webp'),
    require('./tide-gate-05.webp'),
    require('./tide-gate-06.webp'),
    require('./tide-gate-07.webp'),
    require('./tide-gate-08.webp'),
    require('./tide-gate-09.webp'),
    require('./tide-gate-10.webp'),
    require('./tide-gate-11.webp'),
    require('./tide-gate-12.webp'),
    require('./tide-gate-13.webp'),
    require('./tide-gate-14.webp'),
    require('./tide-gate-15.webp'),
    require('./tide-gate-16.webp'),
    require('./tide-gate-17.webp'),
    require('./tide-gate-18.webp'),
    require('./tide-gate-19.webp'),
    require('./tide-gate-20.webp'),
    require('./tide-gate-21.webp'),
    require('./tide-gate-22.webp'),
    require('./tide-gate-23.webp'),
];

export default TIDE_GATE_CELLS;
