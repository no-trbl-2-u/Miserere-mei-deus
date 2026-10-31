/**
 * The run driver's own jest config (phase SM1e): the app's preset, setup,
 * transforms and module mapping, so the driver runs the app's real store
 * code, matched to the `npm run sim:run` entry only. The driver's tests run
 * under the app's default config with every other suite.
 *
 * @type {import('jest').Config}
 */
const base = require('../jest.config.js');

module.exports = {
    ...base,
    rootDir: '..',
    roots: ['<rootDir>/sim'],
    testMatch: ['<rootDir>/sim/sim-run.entry.ts'],
    testTimeout: 30 * 60 * 1000,
};
