/**
 * Toll-Keeper's 24 cells, in sheet order (phase AN5d).
 *
 * Same shape as `../gallows-crow/index.ts`: one file per frame, ROW-MAJOR
 * because `sheetIndexFor` computes `row * columns + col`, literals spelled
 * out because Metro resolves `require()` statically. This directory's
 * `provenance.json` records the cleanup, the split, the ungraded ingest, the
 * measured cost and the hash of the portrait the sheet was drawn from.
 */
import type { ImageSourcePropType } from 'react-native';

export const TOLL_KEEPER_CELLS: readonly ImageSourcePropType[] = [
    require('./toll-keeper-00.webp'),
    require('./toll-keeper-01.webp'),
    require('./toll-keeper-02.webp'),
    require('./toll-keeper-03.webp'),
    require('./toll-keeper-04.webp'),
    require('./toll-keeper-05.webp'),
    require('./toll-keeper-06.webp'),
    require('./toll-keeper-07.webp'),
    require('./toll-keeper-08.webp'),
    require('./toll-keeper-09.webp'),
    require('./toll-keeper-10.webp'),
    require('./toll-keeper-11.webp'),
    require('./toll-keeper-12.webp'),
    require('./toll-keeper-13.webp'),
    require('./toll-keeper-14.webp'),
    require('./toll-keeper-15.webp'),
    require('./toll-keeper-16.webp'),
    require('./toll-keeper-17.webp'),
    require('./toll-keeper-18.webp'),
    require('./toll-keeper-19.webp'),
    require('./toll-keeper-20.webp'),
    require('./toll-keeper-21.webp'),
    require('./toll-keeper-22.webp'),
    require('./toll-keeper-23.webp'),
];

export default TOLL_KEEPER_CELLS;
