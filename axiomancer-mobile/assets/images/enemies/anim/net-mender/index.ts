/**
 * Net-Mender's 24 cells, in sheet order (phase AN5b).
 *
 * Same shape as `../gallows-crow/index.ts`: one file per frame, ROW-MAJOR
 * because `sheetIndexFor` computes `row * columns + col`, literals spelled
 * out because Metro resolves `require()` statically. This directory's
 * `provenance.json` records the cleanup, the split, the ungraded ingest, the
 * measured cost and the hash of the portrait the sheet was drawn from.
 */
import type { ImageSourcePropType } from 'react-native';

export const NET_MENDER_CELLS: readonly ImageSourcePropType[] = [
    require('./net-mender-00.webp'),
    require('./net-mender-01.webp'),
    require('./net-mender-02.webp'),
    require('./net-mender-03.webp'),
    require('./net-mender-04.webp'),
    require('./net-mender-05.webp'),
    require('./net-mender-06.webp'),
    require('./net-mender-07.webp'),
    require('./net-mender-08.webp'),
    require('./net-mender-09.webp'),
    require('./net-mender-10.webp'),
    require('./net-mender-11.webp'),
    require('./net-mender-12.webp'),
    require('./net-mender-13.webp'),
    require('./net-mender-14.webp'),
    require('./net-mender-15.webp'),
    require('./net-mender-16.webp'),
    require('./net-mender-17.webp'),
    require('./net-mender-18.webp'),
    require('./net-mender-19.webp'),
    require('./net-mender-20.webp'),
    require('./net-mender-21.webp'),
    require('./net-mender-22.webp'),
    require('./net-mender-23.webp'),
];

export default NET_MENDER_CELLS;
