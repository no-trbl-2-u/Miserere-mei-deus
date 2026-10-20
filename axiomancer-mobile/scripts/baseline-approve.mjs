#!/usr/bin/env node
// scripts/baseline-approve.mjs
//
// Promote everything in screenshots/current/ to screenshots/baseline/.
// Run after eyeballing the diffs that `smoke-screens.mjs` flagged.
// Commit the resulting baseline PNGs alongside the change that
// produced them.

import { readdir, mkdir, copyFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const CURRENT = resolve(REPO_ROOT, 'screenshots/current')
const BASELINE = resolve(REPO_ROOT, 'screenshots/baseline')

async function main() {
    if (process.platform === 'win32' || process.platform === 'darwin') {
        console.warn(
            'baseline-approve: warning: the renderer of record is CI\'s Linux Playwright Chromium; '
            + 'a capture from this machine differs by renderer alone (screenshots/baseline/README.md).',
        )
    }
    if (!existsSync(CURRENT)) {
        console.error(
            'baseline-approve: no screenshots/current/ — run `npm run verify:visual` first.',
        )
        process.exit(1)
    }
    await mkdir(BASELINE, { recursive: true })
    const entries = await readdir(CURRENT)
    const pngs = entries.filter((f) => f.endsWith('.png'))
    if (pngs.length === 0) {
        console.error('baseline-approve: screenshots/current/ has no PNGs.')
        process.exit(1)
    }
    for (const file of pngs) {
        const src = join(CURRENT, file)
        const dst = join(BASELINE, file)
        await copyFile(src, dst)
        console.log(`baseline-approve: ${file}`)
    }
    console.log('')
    console.log(`baseline-approve: ${pngs.length} baseline(s) updated. Commit screenshots/baseline/.`)
}

main().catch((err) => {
    console.error('baseline-approve: failed:', err)
    process.exit(1)
})
