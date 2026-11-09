/**
 * Extra jest setup for the `sim:run` entry only: wraps the relic library so
 * `--no-relic-stats` can read a worn relic's stat lines as none. The app's own
 * suites never load this file.
 */

jest.mock('@mechanics/Items/relic.library', () => {
    const wraps = jest.requireActual('./run-wraps') as typeof import('./run-wraps');
    return wraps.wrapRelicLibrary(jest.requireActual('@mechanics/Items/relic.library'));
});
