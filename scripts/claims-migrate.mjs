#!/usr/bin/env node
// scripts/claims-migrate.mjs: rewrite origin's `claims` branch from the v1 record to the kit's v2 format (NX1f).
//
// v1 (scripts/claims.mjs before NX1f): { "<row>": { "owner", "at", "renewed", "ttlHours" } }.
// v2 (the kit's, scripts/claims-codec.mjs): { "<chunk>": "<who>|<ip>|<host>|<ISO time>|s:<session>…" }.
// Each v1 entry moves under the chunk its row id is the alias of (scripts/claims-local.mjs) and expires when it
// did. A run owner `heads-down:<id>` or `pilot:<id>` becomes the session `s:<id>` under this checkout's git name
// ("<who>|-|-|<expiry less 24 h>|s:<id>"), so `--owner`, CLAIM_OWNER and a plain call with NEXUS_SESSION=<id>
// all still hold it; any other owner stays its own who and session. Run it on the machine whose runs made them.
// Nothing is dropped: an expired entry is converted too, and the kit's prune and audit decide what goes.
//
// v2's claims.mjs reads a v1 entry this way on every fetch, so its first write migrates the branch anyway; this
// makes that write on purpose, once, right after the PR that brings v2's claims.mjs merges. A pre-NX1f
// claims.mjs reads v2 entries as expired and its next write drops them: run every claims call from a checkout
// of main after the merge.
//
//   node scripts/claims-migrate.mjs [--dry-run] [--remote <name>]
//       prints the map before and after; writes only when it changes (a compare-and-swap, like any claim).
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { BRANCH, FILE, readMap, serialize } from './claims-codec.mjs';
import { fetchClaims, update } from './claims.mjs';

const raw = (cwd, remote) => {
  try {
    return readMap(execFileSync('git', ['show', `refs/remotes/${remote}/${BRANCH}:${FILE}`], { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }));
  } catch {
    return {};
  }
};

/** Migrate the branch. Returns { before, after, written }. */
export function migrate(cwd = process.cwd(), { remote = 'origin', dryRun = false } = {}) {
  if (dryRun) {
    const { map } = fetchClaims(cwd, remote);
    const before = raw(cwd, remote);
    return { before, after: map, written: false, changed: serialize(before) !== serialize(map) };
  }
  let before = {};
  let after = {};
  const res = update(
    cwd,
    (map) => {
      before = raw(cwd, remote);
      after = map;
      return serialize(before) === serialize(map) ? null : { map, message: 'migrate claims.json to the v2 format (NX1f)' };
    },
    { remote },
  );
  return { before, after, written: res.written, changed: res.written };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--remote');
  try {
    const r = migrate(process.cwd(), { remote: i >= 0 ? argv[i + 1] : 'origin', dryRun: argv.includes('--dry-run') });
    console.log(`before:\n${serialize(r.before)}after:\n${serialize(r.after)}${r.written ? 'migrated' : r.changed ? 'would migrate (dry run)' : 'nothing to migrate'}`);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
