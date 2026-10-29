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
// THE ART LICENCE QUESTION IS CLOSED (T, 2026-10-29, D115): "The images we use
// for everything are open source." Every image the game and the DevLog use is
// open source and the public DevLog publishes all of it. Nobody re-opens that.
//
// WHAT THE TREE SAYS (audited at phase AL1, 2026-10-29, against the seven
// per-directory provenance.json files):
//
//   maps/ combat/ splatter/   Public domain, plus the owner-generated
//                             Act 1 map plates                  -> publish
//   enemies/ portraits/       T's D115 ruling, and torio free
//                             material (traced grant)           -> publish
//   cards/ treasure/          T's D115 ruling, and torio free
//                             material (Blood Price art)        -> publish
//
// The gate is amended, not deleted. It still refuses a file whose record names
// no licence, says UNRESOLVED, names an attribution licence with no artist, or
// names a licence it does not recognise, so a THIRD-PARTY FILE THAT ARRIVES
// AFTER D115 still needs its own licence on record (a traced grant, or T's
// ruling written into its record by a session T runs). The `open` tier matches
// three exact forms and nothing broader: the D115 string, the torio free
// material grant, and the owner-generated record. A refused file's catalog
// plate publishes its FRAME and text and says the painting has no licence on
// record.
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
 * Licences that permit public redistribution with no attribution owed, matched
 * as three exact forms and nothing broader (phase AL1, D115):
 *   - T's ruling, written into a record by a session T runs;
 *   - torio Javardry's free-material grant (docs/licences/torio-javardry.md);
 *   - the owner-generated Act 1 map plates (T generated them; the generator's
 *     terms assign the output to the user).
 * A bare "open source" is NOT a match: the exact D115 string is.
 */
export const OPEN = [
    /^open source \(T, 2026-10-29, D115\)$/,
    /^torio Javardry free material\b.*no attribution required/i,
    /^Owner-generated for this project\b/i,
]

/**
 * Decide one file's publication status.
 *
 * @param {{license?: string, artist?: string, source?: string}|null} record
 * @returns {{publish: boolean, tier: 'public-domain'|'open'|'attribution'|'excluded',
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
    if (OPEN.some((re) => re.test(licence))) {
        return { publish: true, tier: 'open', licence, attribution: artist, why: '' }
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
            ? 'licence UNRESOLVED — no licence on record for this file'
            : `licence ${JSON.stringify(licence)} is not a licence the gate recognises (public domain/CC0, open source per D115, a traced free-material grant, or an attribution licence with an artist)`,
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
 * @param {string} filename  e.g. "float-eye.webp"
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
