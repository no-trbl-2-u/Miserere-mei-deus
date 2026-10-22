/**
 * The green jelly's 24 cells, in sheet order (phase AN3b).
 *
 * Same shape as `../float-eye/index.ts`, and for the same reasons: one file
 * per frame because the sheet master may not be resolved from here and React
 * Native cannot crop a sheet cheaply; ROW-MAJOR because `sheetIndexFor`
 * computes `row * columns + col`; literals spelled out because Metro resolves
 * `require()` statically. This directory's `provenance.json` records the rig,
 * the split, the ungraded ingest and the measured cost.
 */
import type { ImageSourcePropType } from 'react-native';

export const GREEN_JELLY_CELLS: readonly ImageSourcePropType[] = [
    require('./green-jelly-00.webp'),
    require('./green-jelly-01.webp'),
    require('./green-jelly-02.webp'),
    require('./green-jelly-03.webp'),
    require('./green-jelly-04.webp'),
    require('./green-jelly-05.webp'),
    require('./green-jelly-06.webp'),
    require('./green-jelly-07.webp'),
    require('./green-jelly-08.webp'),
    require('./green-jelly-09.webp'),
    require('./green-jelly-10.webp'),
    require('./green-jelly-11.webp'),
    require('./green-jelly-12.webp'),
    require('./green-jelly-13.webp'),
    require('./green-jelly-14.webp'),
    require('./green-jelly-15.webp'),
    require('./green-jelly-16.webp'),
    require('./green-jelly-17.webp'),
    require('./green-jelly-18.webp'),
    require('./green-jelly-19.webp'),
    require('./green-jelly-20.webp'),
    require('./green-jelly-21.webp'),
    require('./green-jelly-22.webp'),
    require('./green-jelly-23.webp'),
];

export default GREEN_JELLY_CELLS;
