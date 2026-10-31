/**
 * The `npm run sim:run` entry (phase SM1e): `scripts/sim-run.mjs` runs this
 * file under `sim/jest.config.js` (the app's preset and module mapping), with
 * the request in `SIM_RUN_ARGS` and a path for the answer in `SIM_RUN_OUT`.
 * It plays the runs and writes their summaries as JSON; the script prints
 * them. A stuck run is written as its error, so one stuck seed does not hide
 * the others.
 */

import * as fs from 'fs';

import { getRunPolicy, RUN_POLICY_IDS } from '@mechanics';

import { playRun } from './run-driver';
import { playRuns, type SimRunRequest } from './sim-runs';

const raw = process.env.SIM_RUN_ARGS;
const out = process.env.SIM_RUN_OUT;

(raw && out ? it : it.skip)('plays the requested runs', () => {
    const request = JSON.parse(raw as string) as SimRunRequest;
    const policy = getRunPolicy(request.policy);
    if (!policy) throw new Error(`unknown policy '${request.policy}' (known: ${RUN_POLICY_IDS.join(', ')})`);
    const runs = playRuns(policy, request, playRun);
    fs.writeFileSync(out as string, JSON.stringify({ policy: policy.id, runs }, null, 2));
});
