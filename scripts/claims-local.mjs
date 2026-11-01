// scripts/claims-local.mjs: Miserere's layer on the kit's claims (scripts/claims.mjs, scripts/claims-codec.mjs).
//
// The kit's files stay kit text, so the weekly nexus sync's three-way merge stays clean; claims.mjs carries only
// a handful of marked `Miserere:` lines that call in here. Nothing here is the kit's: the sync never touches it.
//
// What it adds (phase NX1f, docs/nexus-deviations.md "claims.mjs"):
//   - A claim owner: `--owner <o>`, else CLAIM_OWNER, names one claimant across sessions and machines. A
//     `/heads-down` run claims a wave as `heads-down:<session id>` and each worker renews and releases its own row
//     under the same owner. The owner is the claim's `who` and its session, so every process that names it holds
//     the claim, and a claim it makes for several ids at once is a package (all or nothing).
//   - Row aliases: a v1 row id (`NX1f`) is claimed, renewed and released as the chunk that carries it as its
//     `alias:` (`133.6`), from the spec's chunk line or, once closed, its plan/ARCHIVE.md line.
//   - The v1 record: a v1 claims.json entry ({ owner, at, renewed, ttlHours } under a row id) reads as the v2
//     entry it means ("<owner>|-|-|<at>|s:<owner>" under its chunk id, the same expiry), so the first v2 write
//     migrates the branch with no claim lost. scripts/claims-migrate.mjs makes that write on purpose.
//
// Plain functions, no git: claims.mjs and claims-migrate.mjs do the I/O.
import fs from 'node:fs';
import path from 'node:path';
import { CHUNK_ID, TTL_MS, format } from './claims-codec.mjs';

/** The claim owner for this call: --owner, else CLAIM_OWNER, else '' (the kit's own identity). */
export function claimOwner(flag, env = process.env) {
  return String(flag || env.CLAIM_OWNER || '').trim();
}

/** `me` as the named owner: its who and its session, no star (a heads-down owner keeps no ledger star). */
export function asOwner(me, owner) {
  return owner ? Object.assign(me, { who: owner, session: owner, star: '' }) : me;
}

const CHUNK_LINE = /\*\*(\d{2,}\.\d+[a-z0-9]*)\*\*[^\n]*·\s*alias:\s*([A-Za-z][\w-]*)/g;
const ARCHIVE_LINE = /(\d{2,}\.\d+[a-z0-9]*) \(alias: ([A-Za-z][\w-]*)\)/g;

/** alias → chunk id, from spec texts and the archive's text (an open chunk's line wins over a closed one's). */
export function aliasTable(specs, archive = '') {
  const table = new Map();
  for (const m of String(archive).matchAll(ARCHIVE_LINE)) table.set(m[2], m[1]);
  for (const text of specs) for (const m of String(text).matchAll(CHUNK_LINE)) table.set(m[2], m[1]);
  return table;
}

/** The alias table of the checkout holding `cwd`, read from its plan/ (empty when there is none). */
export function aliasesAt(cwd) {
  let dir = path.resolve(cwd);
  while (!fs.existsSync(path.join(dir, 'plan'))) {
    const up = path.dirname(dir);
    // The checkout's root (.git, a folder or a worktree's file) bounds the walk.
    if (up === dir || fs.existsSync(path.join(dir, '.git'))) return new Map();
    dir = up;
  }
  const plan = path.join(dir, 'plan');
  const read = (f) => {
    try {
      return fs.readFileSync(path.join(plan, f), 'utf8');
    } catch {
      return '';
    }
  };
  let names = [];
  try {
    names = fs.readdirSync(plan).filter((n) => /^\d{2,}-.*\.md$/.test(n));
  } catch {}
  return aliasTable(names.map(read), read('ARCHIVE.md'));
}

/** An id as the claims branch keys it: a chunk id stays, an alias becomes its chunk, anything else stays. */
export function resolveId(id, table) {
  return CHUNK_ID.test(id) ? id : (table.get(id) ?? id);
}

/** A v1 entry: { owner, at, renewed?, ttlHours? }. */
export const isV1 = (v) => Boolean(v) && typeof v === 'object' && typeof v.owner === 'string';

/** A v1 entry as the v2 string with the same expiry: `at` is its expiry less the kit's 24 h. */
export function v1Value(v) {
  const renewed = Date.parse(v.renewed ?? v.at ?? '');
  const ttl = Number(v.ttlHours ?? 24);
  const at = Number.isFinite(renewed) && Number.isFinite(ttl) ? new Date(renewed + ttl * 3600e3 - TTL_MS).toISOString() : String(v.at ?? '');
  return format({ who: v.owner, ip: '-', host: '-', at, session: v.owner });
}

/**
 * A claims map with every v1 entry read as v2 and every alias key moved to its chunk. A key that resolves to a
 * chunk already present keeps the newer claim of the two. `table` is a Map or a function returning one (read only
 * when a key needs it). Returns the map unchanged (the same object) when nothing is v1.
 */
export function fromV1(map, table) {
  const keys = Object.keys(map);
  if (!keys.some((k) => isV1(map[k]) || !CHUNK_ID.test(k))) return map;
  let t = null;
  const lookup = () => (t ??= typeof table === 'function' ? table() : (table ?? new Map()));
  const out = {};
  const atOf = (v) => Date.parse(String(v).split('|')[3] ?? '') || 0;
  for (const k of keys) {
    const value = isV1(map[k]) ? v1Value(map[k]) : map[k];
    const id = CHUNK_ID.test(k) ? k : resolveId(k, lookup());
    if (out[id] === undefined || atOf(value) > atOf(out[id])) out[id] = value;
  }
  return out;
}
