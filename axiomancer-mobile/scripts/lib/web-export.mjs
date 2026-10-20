// scripts/lib/web-export.mjs
//
// The one web export every visual and e2e script shares. `ensureWebExport`
// hashes the export's inputs into a stamp, reuses the export dir when its
// `.axm-export-stamp` matches, and otherwise runs `expo export --platform web`
// and writes the stamp. A deleted dir is a miss (the stamp lives inside it);
// outside a git checkout every call exports. `AXM_FORCE_EXPORT=1` (or
// `force: true`) always exports.
//
// The pure helpers (stamp hash, reuse decision, spawn spec) are exported so
// `scripts/web-export.test.mjs` pins them without spawning Expo.

import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MOBILE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const DEFAULT_EXPORT_DIR = resolve(MOBILE_ROOT, '.smoke-dist')
export const STAMP_FILE = '.axm-export-stamp'
export const DEFAULT_TIMEOUT_MS = 8 * 60 * 1000

// Paths relative to the monorepo root whose contents reach the web bundle.
export const STAMP_INPUTS = [
    'axiomancer-mobile/app',
    'axiomancer-mobile/components',
    'axiomancer-mobile/state',
    'axiomancer-mobile/lib',
    'axiomancer-mobile/hooks',
    'axiomancer-mobile/assets',
    'axiomancer-mobile/theme',
    'axiomancer-mobile/metro-stubs',
    'axiomancer-mobile/index.ts',
    'axiomancer-mobile/app.json',
    'axiomancer-mobile/app.config.ts',
    'axiomancer-mobile/package.json',
    'axiomancer-mobile/babel.config.js',
    'axiomancer-mobile/metro.config.js',
    'axiomancer-mobile/tsconfig.json',
    'axiomancer-mechanics/src',
    'axiomancer-mechanics/content',
    'package-lock.json',
]

/**
 * Hash the export inputs. `tracked` is `git ls-files -s` parsed to
 * `{ path, blob }`; `dirty` maps a modified or untracked path to the git blob
 * id of its current contents (or `null` when it was deleted), and wins over
 * the tracked blob id, so committing an edit leaves the stamp unchanged.
 * Order of either input does not change the hash.
 * @example computeStampHash({ tracked: [{ path: 'a', blob: '1' }], dirty: {}, expo: '54.0.0' }) // '3f…'
 */
export function computeStampHash({ tracked, dirty, expo }) {
    const ids = new Map()
    for (const { path, blob } of tracked) ids.set(path, blob)
    for (const [path, sha] of Object.entries(dirty)) {
        if (sha === null) ids.delete(path)
        else ids.set(path, sha)
    }
    const h = createHash('sha256')
    h.update(`expo ${expo ?? 'unknown'}\n`)
    for (const path of [...ids.keys()].sort()) h.update(`${ids.get(path)} ${path}\n`)
    return h.digest('hex')
}

/**
 * Parse `git ls-files -s -z` output: `<mode> <blob> <stage>\t<path>` records.
 * @example parseLsFiles('100644 abc 0\tapp/x.tsx\0') // [{ path: 'app/x.tsx', blob: 'abc' }]
 */
export function parseLsFiles(out) {
    const rows = []
    for (const rec of out.split('\0')) {
        if (!rec) continue
        const tab = rec.indexOf('\t')
        const [, blob] = rec.slice(0, tab).split(' ')
        rows.push({ path: rec.slice(tab + 1), blob })
    }
    return rows
}

/**
 * Parse `git status --porcelain -z --untracked-files=all` into the paths whose
 * working copy differs from the index (renames report the new path).
 * @example parseStatus(' M app/x.tsx\0?? app/y.tsx\0') // ['app/x.tsx', 'app/y.tsx']
 */
export function parseStatus(out) {
    const paths = []
    const recs = out.split('\0')
    for (let i = 0; i < recs.length; i++) {
        const rec = recs[i]
        if (!rec) continue
        paths.push(rec.slice(3))
        if (rec[0] === 'R' || rec[0] === 'C') i++
    }
    return paths
}

/**
 * Decide whether an export dir can be reused.
 * @example decideExport({ hash: 'h', stamp: { hash: 'h' }, hasIndex: true }) // { reuse: true, reason: 'stamp hit' }
 */
export function decideExport({ hash, stamp, hasIndex, force = false, env = {} }) {
    if (force || env.AXM_FORCE_EXPORT === '1') return { reuse: false, reason: 'forced' }
    if (!hash) return { reuse: false, reason: 'no stamp (not a git checkout)' }
    if (!hasIndex) return { reuse: false, reason: 'no export' }
    if (!stamp) return { reuse: false, reason: 'no stamp file' }
    if (stamp.hash !== hash) return { reuse: false, reason: 'stamp miss' }
    return { reuse: true, reason: 'stamp hit' }
}

/**
 * The `expo export` spawn: Windows runs `npx.cmd`, which Node refuses to spawn
 * without a shell. The shared export is always a preview build, because the
 * e2e drivers need the dev tools `app.config.ts` bakes in for any
 * non-production BUILD_PROFILE. Expo's output goes to stderr so a caller's
 * stdout (perf-web's JSON result) stays clean.
 * @example exportSpawnSpec({ outDir: '/x', platform: 'win32' }).command // 'npx.cmd'
 */
export function exportSpawnSpec({ outDir, platform = process.platform, cwd = MOBILE_ROOT, env = process.env }) {
    const isWin = platform === 'win32'
    return {
        command: isWin ? 'npx.cmd' : 'npx',
        args: ['expo', 'export', '--platform', 'web', '--output-dir', outDir],
        options: { cwd, env: { ...env, BUILD_PROFILE: 'preview' }, shell: isWin, stdio: ['ignore', 2, 2] },
    }
}

/** Read a stamp file; `null` when absent or unreadable. */
export function readStamp(outDir) {
    try { return JSON.parse(readFileSync(join(outDir, STAMP_FILE), 'utf8')) } catch { return null }
}

/**
 * The git blob id of some contents (what `git hash-object` prints).
 * @example gitBlobId(Buffer.from('hi\n')) // '45b983be36b73c0788dc9cbcb76cbb80fc7bb057'
 */
export function gitBlobId(buf) {
    return createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex')
}

function git(repoRoot, args) {
    const r = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    return r.status === 0 ? r.stdout : null
}

function expoVersion() {
    try { return createRequire(join(MOBILE_ROOT, 'package.json'))('expo/package.json').version } catch { return null }
}

/**
 * The stamp for the current tree, or `null` outside a git checkout.
 * @example computeStamp() // { hash: '3f…', expo: '54.0.0' }
 */
export function computeStamp({ repoRoot = resolve(MOBILE_ROOT, '..') } = {}) {
    const ls = git(repoRoot, ['ls-files', '-s', '-z', '--', ...STAMP_INPUTS])
    const status = git(repoRoot, ['status', '--porcelain', '-z', '--untracked-files=all', '--', ...STAMP_INPUTS])
    if (ls === null || status === null) return null
    const dirty = {}
    for (const path of parseStatus(status)) {
        const abs = join(repoRoot, path)
        dirty[path] = existsSync(abs) ? gitBlobId(readFileSync(abs)) : null
    }
    const expo = expoVersion()
    return { hash: computeStampHash({ tracked: parseLsFiles(ls), dirty, expo }), expo }
}

function runExport(spec, timeoutMs) {
    return new Promise((done) => {
        const child = spawn(spec.command, spec.args, spec.options)
        let timedOut = false
        const timer = setTimeout(() => {
            timedOut = true
            child.kill('SIGTERM')
            setTimeout(() => child.kill('SIGKILL'), 5000).unref()
        }, timeoutMs)
        child.on('exit', (code) => { clearTimeout(timer); done({ exitCode: code ?? 1, timedOut }) })
        child.on('error', (err) => {
            clearTimeout(timer)
            console.error(`web-export: could not spawn expo export: ${err.message}`)
            done({ exitCode: 1, timedOut: false })
        })
    })
}

/**
 * Make sure `outDir` holds a preview web export of the current tree.
 * Resolves `{ ok, reused, hash, exitCode, timedOut }`; never exits the process.
 * @example const r = await ensureWebExport({ log: (m) => console.log(`fixture-e2e: ${m}`) })
 */
export async function ensureWebExport({
    outDir = DEFAULT_EXPORT_DIR,
    force = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    log = (m) => console.log(`web-export: ${m}`),
} = {}) {
    const dir = resolve(outDir)
    const name = relative(MOBILE_ROOT, dir) || dir
    const stamp = computeStamp()
    const hash = stamp?.hash ?? null
    const decision = decideExport({
        hash,
        stamp: readStamp(dir),
        hasIndex: existsSync(join(dir, 'index.html')),
        force,
        env: process.env,
    })
    if (decision.reuse) {
        log(`reusing ${name} (stamp ${hash.slice(0, 12)})`)
        return { ok: true, reused: true, hash, exitCode: 0, timedOut: false }
    }
    log(`running \`expo export --platform web\` -> ${name} (${decision.reason}) ...`)
    const { exitCode, timedOut } = await runExport(exportSpawnSpec({ outDir: dir }), timeoutMs)
    const ok = exitCode === 0 && !timedOut && existsSync(join(dir, 'index.html'))
    if (ok && hash) {
        writeFileSync(join(dir, STAMP_FILE), JSON.stringify({
            hash, at: new Date().toISOString(), expo: stamp.expo, node: process.version,
        }, null, 2) + '\n')
    }
    return { ok, reused: false, hash, exitCode, timedOut }
}
