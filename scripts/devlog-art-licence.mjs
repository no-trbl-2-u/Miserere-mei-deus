#!/usr/bin/env node
// scripts/devlog-art-licence.mjs — THE PUBLICATION GATE FOR ART.
//
// The public DevLog publishes the full catalog, with art. That is T's ruling
// (2026-09-20, spoiler cost stated) and it is not re-litigated here. What IS
// decided here is the one thing that ruling does not cover, because it is not
// T's to waive: whether each individual file's licence permits public
// redistribution at all.
//
// The publish prompt §1 carve-out is explicit — "a third-party asset whose
// licence forbids redistribution ... is not covered by T's ruling. Exclude it,
// and file a [loop-call] row naming exactly what and why."
//
// WHAT THE TREE ACTUALLY SAYS (audited 2026-09-20 against the seven
// per-directory provenance.json files):
//
//   maps/ combat/ splatter/   Public domain              -> publish
//   enemies/ (2 of 3)         UNRESOLVED                 -> EXCLUDE
//   enemies/ (1 of 3)         torio free material        -> EXCLUDE until T
//                             (no attribution required)     rules the terms in
//     (enemy counts re-audited at phase AN4a, 2026-10-22, which retired the
//     one CC BY silhouette; the attribution tier stays for the next CC BY file)
//   cards/ (19)               UNRESOLVED                 -> EXCLUDE
//   portraits/ (15)           UNRESOLVED                 -> EXCLUDE
//   treasure/ (4)             UNRESOLVED                 -> EXCLUDE
//
// "UNRESOLVED" is the provenance gate's own word for art that shipped before
// anyone checked: owner-supplied external illustration, no source, no licence
// traced since. Inside a private build that is a known debt. On a public page
// it would be redistribution of work nobody can show a right to. So the card
// plates on the public catalog publish their FRAME and their text and say, in
// words, that the painting is withheld. A catalog that lies about what it may
// show is worse than a catalog with fewer pictures.
//
// This module is pure and zero-dependency: it reads provenance JSON that the
// caller supplies (or from disk) and answers one question per file.

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const IMAGE_ROOT = join(ROOT, 'axiomancer-mobile', 'assets', 'images')

/**
 * Licences that permit public redistribution with NO attribution obligation.
 * Copied in spirit from `axiomancer-mobile/scripts/acquire-art.mjs`'s
 * ACCEPTED_LICENCES, which is the acquisition-side gate.
 */
export const PUBLIC_DOMAIN = [
    /^public domain/i,
    /^pd([-_\s].*)?$/i,
    /^cc0/i,
    /^no restrictions$/i,
]

/**
 * Licences that permit redistribution ONLY where attribution is rendered.
 *
 * `acquire-art.mjs` refuses these outright, and says why: "Attribution
 * licences are refused until the build has an attribution surface". The public
 * DevLog IS that surface — every published mark's artist renders on the About
 * page and beside the plate it belongs to — so a CC BY file may publish here.
 * If the attribution string is missing, the file is excluded like any other
 * unprovable one: the obligation is the price of the licence, not a nicety.
 */
export const ATTRIBUTION_REQUIRED = [/^cc[\s-]?by([\s-]|$)/i]

/**
 * Decide one file's publication status.
 *
 * @param {{license?: string, artist?: string, source?: string}|null} record
 * @returns {{publish: boolean, tier: 'public-domain'|'attribution'|'excluded',
 *            licence: string, attribution: string, why: string}}
 */
export function classify(record) {
    const licence = String(record?.license ?? '').trim()
    const artist = String(record?.artist ?? '').trim()

    if (!licence) {
        return { publish: false, tier: 'excluded', licence: '', attribution: '', why: 'no licence on record' }
    }
    if (PUBLIC_DOMAIN.some((re) => re.test(licence))) {
        return { publish: true, tier: 'public-domain', licence, attribution: artist, why: '' }
    }
    if (ATTRIBUTION_REQUIRED.some((re) => re.test(licence))) {
        if (!artist) {
            return {
                publish: false, tier: 'excluded', licence, attribution: '',
                why: `${licence} requires attribution and the provenance record names no artist`,
            }
        }
        return { publish: true, tier: 'attribution', licence, attribution: artist, why: '' }
    }
    return {
        publish: false, tier: 'excluded', licence, attribution: artist,
        why: licence.toUpperCase() === 'UNRESOLVED'
            ? 'licence UNRESOLVED — the tree cannot show a right to redistribute this file'
            : `licence ${JSON.stringify(licence)} is neither public domain/CC0 nor an attribution licence`,
    }
}

/**
 * Does a provenance record cover this filename?
 *
 * Two shapes appear in the tree:
 *   "forest-dark.webp"                                  an explicit file
 *   "seam-tick.webp (maggot.svg),prop-wight.webp (…)"   a list, each with its source
 *   "every .webp in this directory not named by a …"    a directory wildcard
 */
export function covers(record, filename) {
    const spec = String(record?.covers ?? '')
    if (!spec) return false
    if (/^every\b/i.test(spec)) return /\.(webp|png|jpg|jpeg|svg)$/i.test(filename)
    return spec.split(',').some((part) => part.trim().split(/\s+/)[0] === filename)
}

/**
 * The record that governs a file: the LAST one that covers it.
 *
 * Order matters and the tree says so — the enemies wildcard reads "every .webp
 * in this directory NOT NAMED BY A LATER ENTRY", so later, more specific
 * records win over the earlier catch-all.
 */
export function recordFor(records, filename) {
    let found = null
    for (const record of records) if (covers(record, filename)) found = record
    return found
}

/** Read one art directory's provenance records (always as an array). */
export function readProvenance(dir) {
    const path = join(IMAGE_ROOT, dir, 'provenance.json')
    if (!existsSync(path)) return []
    const parsed = JSON.parse(readFileSync(path, 'utf8'))
    return Array.isArray(parsed) ? parsed : [parsed]
}

/**
 * The gate, for one shipped art file.
 *
 * @param {string} dir       e.g. "enemies"
 * @param {string} filename  e.g. "hag.webp"
 */
export function verdictFor(dir, filename, records = readProvenance(dir)) {
    const record = recordFor(records, filename)
    if (!record) {
        return {
            publish: false, tier: 'excluded', licence: '', attribution: '',
            why: 'no provenance record covers this file',
            file: `${dir}/${filename}`,
        }
    }
    return { ...classify(record), source: record.source || '', file: `${dir}/${filename}` }
}

// ── CLI: the audit, printed ─────────────────────────────────────────────────
// `node scripts/devlog-art-licence.mjs` prints one line per art directory —
// how many files publish, how many are withheld, and why.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    process.stdout.on('error', () => {})
    const { readdirSync } = await import('node:fs')
    const dirs = ['cards', 'combat', 'enemies', 'maps', 'portraits', 'splatter', 'treasure']
    for (const dir of dirs) {
        const records = readProvenance(dir)
        const files = readdirSync(join(IMAGE_ROOT, dir)).filter((f) => /\.(webp|png|jpg)$/i.test(f))
        const verdicts = files.map((f) => verdictFor(dir, f, records))
        const publish = verdicts.filter((v) => v.publish)
        const attribution = publish.filter((v) => v.tier === 'attribution')
        const why = [...new Set(verdicts.filter((v) => !v.publish).map((v) => v.why))]
        process.stdout.write(
            `${dir.padEnd(10)} ${String(publish.length).padStart(3)}/${String(files.length).padEnd(3)} publish`
            + ` (${attribution.length} need attribution)`
            + (why.length ? ` — withheld: ${why.join('; ')}` : '')
            + '\n',
        )
    }
}
