/**
 * Wreck-Picker's 24 cells, in sheet order (phase AN5c).
 *
 * Same shape as `../gallows-crow/index.ts`: one file per frame, ROW-MAJOR
 * because `sheetIndexFor` computes `row * columns + col`, literals spelled
 * out because Metro resolves `require()` statically. This directory's
 * `provenance.json` records the cleanup, the split, the ungraded ingest, the
 * measured cost and the hash of the portrait the sheet was drawn from.
 */
import type { ImageSourcePropType } from 'react-native';

export const WRECK_PICKER_CELLS: readonly ImageSourcePropType[] = [
    require('./wreck-picker-00.webp'),
    require('./wreck-picker-01.webp'),
    require('./wreck-picker-02.webp'),
    require('./wreck-picker-03.webp'),
    require('./wreck-picker-04.webp'),
    require('./wreck-picker-05.webp'),
    require('./wreck-picker-06.webp'),
    require('./wreck-picker-07.webp'),
    require('./wreck-picker-08.webp'),
    require('./wreck-picker-09.webp'),
    require('./wreck-picker-10.webp'),
    require('./wreck-picker-11.webp'),
    require('./wreck-picker-12.webp'),
    require('./wreck-picker-13.webp'),
    require('./wreck-picker-14.webp'),
    require('./wreck-picker-15.webp'),
    require('./wreck-picker-16.webp'),
    require('./wreck-picker-17.webp'),
    require('./wreck-picker-18.webp'),
    require('./wreck-picker-19.webp'),
    require('./wreck-picker-20.webp'),
    require('./wreck-picker-21.webp'),
    require('./wreck-picker-22.webp'),
    require('./wreck-picker-23.webp'),
];

export default WRECK_PICKER_CELLS;
