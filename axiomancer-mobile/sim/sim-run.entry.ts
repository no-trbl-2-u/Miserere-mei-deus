/**
 * The `npm run sim:run` entry (phase SM1e): `scripts/sim-run.mjs` runs this
 * file under `sim/jest.config.js` (the app's preset and module mapping), with
 * the request in `SIM_RUN_ARGS` and a path for the answer in `SIM_RUN_OUT`.
 * It plays the runs and writes their summaries as JSON; the script prints
 * them. A stuck run is written as its error, so one stuck seed does not hide
 * the others.
 *
 * With `post` in the request (`--post`, phase SM1g) each finished run also
 * comes back with the requests the app's posters made for it, stamped `sim`;
 * the script sends them. This file sends nothing.
 */

import * as fs from 'fs';

import { playRun } from './run-driver';
import { checkTuning, expandPolicies } from './run-options';
import { playRuns, playRunsPosted, type SimRunRequest } from './sim-runs';

const raw = process.env.SIM_RUN_ARGS;
const out = process.env.SIM_RUN_OUT;

(raw && out ? it : it.skip)('plays the requested runs', async () => {
    const request = JSON.parse(raw as string) as SimRunRequest;
    // Every policy and flag is checked before a run is played.
    const policies = expandPolicies(request.policy);
    if (request.tuning) checkTuning(request.tuning);
    if (request.tuning && request.post) throw new Error('--post is refused with a tuning flag');
    if (request.post && policies.length > 1) throw new Error('--post takes one policy');
    const [first] = policies;
    const body = request.post
        ? { policy: first!.id, ...(await playRunsPosted(first!, request, request.post, playRun)) }
        : { policy: policies.map((p) => p.id).join(','), runs: policies.flatMap((p) => playRuns(p, request, playRun)) };
    // The collected request bodies are large and nobody reads them here: no indent with `post`.
    fs.writeFileSync(out as string, JSON.stringify(body, null, request.post ? 0 : 2));
});
