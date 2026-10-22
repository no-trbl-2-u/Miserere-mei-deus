/**
 * The death-beholder's 24 cells, in sheet order (phase AN4b).
 *
 * Same shape as `../float-eye/index.ts`, and for the same reasons: one file
 * per frame because the sheet master may not be resolved from here and React
 * Native cannot crop a sheet cheaply; ROW-MAJOR because `sheetIndexFor`
 * computes `row * columns + col`; literals spelled out because Metro resolves
 * `require()` statically. This directory's `provenance.json` records the rig,
 * the split, the ungraded ingest and the measured cost.
 */
import type { ImageSourcePropType } from 'react-native';

export const DEATH_BEHOLDER_CELLS: readonly ImageSourcePropType[] = [
    require('./death-beholder-00.webp'),
    require('./death-beholder-01.webp'),
    require('./death-beholder-02.webp'),
    require('./death-beholder-03.webp'),
    require('./death-beholder-04.webp'),
    require('./death-beholder-05.webp'),
    require('./death-beholder-06.webp'),
    require('./death-beholder-07.webp'),
    require('./death-beholder-08.webp'),
    require('./death-beholder-09.webp'),
    require('./death-beholder-10.webp'),
    require('./death-beholder-11.webp'),
    require('./death-beholder-12.webp'),
    require('./death-beholder-13.webp'),
    require('./death-beholder-14.webp'),
    require('./death-beholder-15.webp'),
    require('./death-beholder-16.webp'),
    require('./death-beholder-17.webp'),
    require('./death-beholder-18.webp'),
    require('./death-beholder-19.webp'),
    require('./death-beholder-20.webp'),
    require('./death-beholder-21.webp'),
    require('./death-beholder-22.webp'),
    require('./death-beholder-23.webp'),
];

export default DEATH_BEHOLDER_CELLS;
