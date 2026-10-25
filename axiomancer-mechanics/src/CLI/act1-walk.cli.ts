/**
 * Act 1 walk plan CLI — prints `planAct1Walk()` (Phase AW1a).
 *
 * The browser walk (`axiomancer-mobile/scripts/act1-walk-e2e.mjs`) runs this
 * with `--json` and follows the path it prints, so the walk's route is always
 * the engine's. Reads only.
 *
 * Usage:
 *   npm run act1-walk                # one line per region: kinds and path
 *   npm run act1-walk -- --json      # the plan object and nothing else
 */

import { planAct1Walk } from '../World/act1-walk';

if (require.main === module) {
    const plan = planAct1Walk();
    if (process.argv.includes('--json')) {
        process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    } else {
        for (const r of plan.regions) {
            process.stdout.write(`\n${r.map} (${r.continent}): door ${r.door}, exit ${r.exit}\n`);
            process.stdout.write(`  carries: ${r.carried.join(', ')}\n`);
            process.stdout.write(`  path:    ${r.steps.map(s => `${s.nodeId}:${s.kind}`).join(' > ')}\n`);
        }
        process.stdout.write(`\nAct 1 carries: ${plan.carried.join(', ')}\n`);
    }
}
