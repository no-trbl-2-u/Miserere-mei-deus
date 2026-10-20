#!/usr/bin/env node
// scripts/smoke-bundler.mjs
//
// "Does the bundler still boot?" — environmental smoke that
// hermetic Jest can't see.
//
// Why this exists: Jest e2e drives presenters in isolation. It
// never spawns Metro / runs the Expo bundler / touches the
// filesystem cache. When the bundler breaks for a non-code
// reason (favicon middleware regression, cache-dir EACCES, asset
// pipeline drift, an unresolvable import in a transitively-loaded
// module), the unit suite stays green and the failure surfaces
// only at the next dev-server start or production deploy. The
// 2026-05-14 EACCES incident on `.expo/web/cache` is exactly this
// shape — caught only when a user tried to boot the app.
//
// This script invokes `expo export --platform web` (which runs the
// full bundler end-to-end and writes a static export), then
// asserts the export landed and looks like a valid web build.
// Heavier than the unit suite — runs ~30–60s on a small project
// — so it's an opt-in `npm run smoke:bundler`, not part of the
// default `pnpm verify` gate. CI can wire it as a separate job.
//
// Exit contract (mirrors deploy-check.mjs):
//
//   exit 0  →  bundler OK (export produced + sanity-checked)
//   exit 1  →  bundler errored / failed
//   exit 2  →  timeout
//   exit 3  →  config / auth / unexpected output (env var
//              missing, output dir wrong, etc.)
//
// The pure helpers (output-dir validation, exit-code mapping)
// are exported so the hermetic test in scripts/__tests__/ can
// pin the contract without spawning a real export.

import { rm, stat, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { ensureWebExport } from './lib/web-export.mjs'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const EXIT = {
    OK: 0,
    FAILED: 1,
    TIMEOUT: 2,
    CONFIG: 3,
}

// Default per-bundler-run timeout. `expo export` is bounded by
// Metro's transform pipeline; 4 minutes is enough headroom for a
// cold start on slow CI runners without hanging forever.
export const DEFAULT_TIMEOUT_MS = 4 * 60 * 1000

// Files we expect a healthy web export to produce. The list is
// intentionally tiny — Expo's exact output tree shifts between
// versions; we only assert the bare minimum that proves the
// bundler reached the write phase.
export const REQUIRED_FILES = ['index.html']

// Minimum byte count for a "real" index.html. An empty or
// near-empty file usually means the bundler died partway through
// the HTML emit but didn't propagate an error code.
export const MIN_INDEX_HTML_BYTES = 200

// ---------------------------------------------------------------------------
// Pure helpers — covered by the hermetic test
// ---------------------------------------------------------------------------

export function classifyExportResult({ exitCode, timedOut, indexHtmlBytes, missingFiles }) {
    if (timedOut) return { exit: EXIT.TIMEOUT, reason: 'expo export timed out' }
    if (exitCode !== 0) {
        return {
            exit: EXIT.FAILED,
            reason: `expo export exited ${exitCode}`,
        }
    }
    if (missingFiles && missingFiles.length > 0) {
        return {
            exit: EXIT.CONFIG,
            reason: `export produced no ${missingFiles.join(', ')}`,
        }
    }
    if (typeof indexHtmlBytes === 'number' && indexHtmlBytes < MIN_INDEX_HTML_BYTES) {
        return {
            exit: EXIT.CONFIG,
            reason: `index.html is ${indexHtmlBytes} bytes (< ${MIN_INDEX_HTML_BYTES})`,
        }
    }
    return { exit: EXIT.OK, reason: 'bundler OK' }
}

export function buildExportArgs(outputDir) {
    return [
        'expo',
        'export',
        '--platform',
        'web',
        '--output-dir',
        outputDir,
    ]
}

export function resolveOutputConfig({ configuredOutputDir, tempDir, pid, now }) {
    if (configuredOutputDir) {
        return {
            outputDir: resolve(configuredOutputDir),
            preserveOutput: true,
        }
    }
    return {
        outputDir: join(tempDir, `axm-smoke-${pid}-${now}`),
        preserveOutput: false,
    }
}

// ---------------------------------------------------------------------------
// Side-effecting runners
// ---------------------------------------------------------------------------

async function inspectExport(outputDir) {
    const missingFiles = []
    for (const name of REQUIRED_FILES) {
        if (!existsSync(join(outputDir, name))) missingFiles.push(name)
    }
    let indexHtmlBytes = null
    if (!missingFiles.includes('index.html')) {
        try {
            const buf = await readFile(join(outputDir, 'index.html'))
            indexHtmlBytes = buf.byteLength
        } catch {
            indexHtmlBytes = 0
        }
    }
    return { missingFiles, indexHtmlBytes }
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

async function main() {
    const { outputDir, preserveOutput } = resolveOutputConfig({
        configuredOutputDir: process.env.SMOKE_BUNDLER_OUTPUT_DIR,
        tempDir: tmpdir(),
        pid: process.pid,
        now: Date.now(),
    })
    const timeoutMs = Number(process.env.SMOKE_BUNDLER_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS)

    console.log(`smoke-bundler: exporting to ${outputDir} (timeout ${timeoutMs}ms)`)

    let result
    try {
        // Never accept a stale export as evidence: the bundler always runs
        // here. A configured output path is preserved only after this run
        // succeeds, and the export's stamp lets the downstream E2E scripts
        // reuse the exact bundle that the smoke check inspected.
        await rm(outputDir, { recursive: true, force: true })
        const { exitCode, timedOut } = await ensureWebExport({
            outDir: outputDir,
            force: true,
            timeoutMs,
            log: (m) => console.log(`smoke-bundler: ${m}`),
        })
        const { missingFiles, indexHtmlBytes } = await inspectExport(outputDir)
        result = classifyExportResult({ exitCode, timedOut, indexHtmlBytes, missingFiles })
    } catch (err) {
        console.error(`smoke-bundler: unexpected error: ${err?.message ?? err}`)
        result = { exit: EXIT.FAILED, reason: 'unexpected error' }
    }

    if (!preserveOutput) {
        try {
            await rm(outputDir, { recursive: true, force: true })
        } catch {
            // Cleanup is best-effort.
        }
    } else {
        console.log(`smoke-bundler: preserving verified export at ${outputDir}`)
    }

    console.log(`smoke-bundler: ${result.reason} (exit ${result.exit})`)
    process.exit(result.exit)
}

// Only execute the side-effecting main path when invoked as a
// script — keep the helpers importable for testing.
const isMain =
    import.meta.url === `file://${process.argv[1]}`
    || (process.argv[1] && process.argv[1].endsWith('smoke-bundler.mjs'))
if (isMain) {
    main().catch((err) => {
        console.error(`smoke-bundler: fatal: ${err?.message ?? err}`)
        process.exit(EXIT.FAILED)
    })
}

// Re-exports for the hermetic test (kept stable).
void stat  // eslint-disable-line @typescript-eslint/no-unused-expressions
