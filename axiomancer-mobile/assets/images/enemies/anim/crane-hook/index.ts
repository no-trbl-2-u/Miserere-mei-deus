/**
 * Crane-Hook's 24 cells, in sheet order (phase AN5b).
 *
 * Same shape as `../gallows-crow/index.ts`: one file per frame, ROW-MAJOR
 * because `sheetIndexFor` computes `row * columns + col`, literals spelled
 * out because Metro resolves `require()` statically. This directory's
 * `provenance.json` records the cleanup, the split, the ungraded ingest, the
 * measured cost and the hash of the portrait the sheet was drawn from.
 */
import type { ImageSourcePropType } from 'react-native';

export const CRANE_HOOK_CELLS: readonly ImageSourcePropType[] = [
    require('./crane-hook-00.webp'),
    require('./crane-hook-01.webp'),
    require('./crane-hook-02.webp'),
    require('./crane-hook-03.webp'),
    require('./crane-hook-04.webp'),
    require('./crane-hook-05.webp'),
    require('./crane-hook-06.webp'),
    require('./crane-hook-07.webp'),
    require('./crane-hook-08.webp'),
    require('./crane-hook-09.webp'),
    require('./crane-hook-10.webp'),
    require('./crane-hook-11.webp'),
    require('./crane-hook-12.webp'),
    require('./crane-hook-13.webp'),
    require('./crane-hook-14.webp'),
    require('./crane-hook-15.webp'),
    require('./crane-hook-16.webp'),
    require('./crane-hook-17.webp'),
    require('./crane-hook-18.webp'),
    require('./crane-hook-19.webp'),
    require('./crane-hook-20.webp'),
    require('./crane-hook-21.webp'),
    require('./crane-hook-22.webp'),
    require('./crane-hook-23.webp'),
];

export default CRANE_HOOK_CELLS;
