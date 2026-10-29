#!/usr/bin/env node
// scripts/build-devlog-public.mjs — BUILD THE PUBLIC DEVLOG.
//
//   node scripts/build-devlog-public.mjs [--out <dir>] [--strict]
//   npm run devlog:public
//
// WHAT THIS IS, AND WHY IT IS A SECOND BUILDER
// --------------------------------------------
// `scripts/build-devlog.mjs` renders the PRIVATE local index — an internal
// tool, opened from the filesystem, unchanged by this file. This builder
// renders the PUBLIC site: the same entries, read by strangers, in the woodcut
// chrome `devlog/DESIGN.md` specifies.
//
// It writes OUTSIDE `devlog/` on purpose. Phase 57 untracked the private
// site's generated HTML because Cloudflare Pages serves whatever `main`'s tree
// contains, and the generated pages said "A private index…" on their own
// header. That guard stays exactly as it was. Publication now happens at
// DEPLOY time, from a build directory that is never committed — which is what
// makes it deliberate rather than accidental, phase 57's actual complaint.
// `scripts/check-devlog-not-served.mjs` knows about this directory too, and
// `scripts/build-devlog-public.test.mjs` proves the guard still exits 0.
//
// PIPELINE
//   1. read every devlog/entries/DIGEST_<date>.md through the SHARED grammar
//      (scripts/devlog-entry.mjs — one grammar, two sites)
//   2. emit the token stylesheet from the app's palette.ts, the site CSS and
//      the enhancement script
//   3. derive web media: WebP captures at 2x the rendered box, 320px index
//      thumbnails, licence-gated catalog art
//   4. render landing / index (paginated) / post / catalog / about, plus an
//      Atom feed
//   5. report the payload budget per page type and, with --strict, fail on a
//      page that blows it
//
// Zero runtime dependencies. `sharp` is used for the image derivatives only —
// it is already in the tree (axiomancer-mobile's art pipeline) and only ever
// runs at build time. If it is unavailable the build still completes, copying
// originals and saying so, because a missing thumbnailer must not stop the
// night's publication.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, copyFileSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { CATEGORIES, CAT_LABEL, EVIDENCE_KINDS, categoryCounts, escapeHtml, extractFields, inline, mdToHtml, parseEntry } from './devlog-entry.mjs'
import { DEFAULT_THEME, THEME_IDS, stylesheet } from './devlog-tokens.mjs'
import { readProvenance, verdictFor } from './devlog-art-licence.mjs'
import { formatSize, latestAndroid, readBuilds } from './devlog-builds.mjs'
import {
    MARKS, altText, beforeAfter, beforeAfterText, chip, dateStamp, eyebrow,
    firstClause, noCapture, page, panel, roman, romanDate, SITE_CSS, shortDate,
} from './devlog-public-shell.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DEVLOG = join(ROOT, 'devlog')
const ENTRIES = join(DEVLOG, 'entries')
const CAPTURES = join(DEVLOG, 'assets')
const DATA = join(DEVLOG, 'data')
const ART = join(ROOT, 'axiomancer-mobile', 'assets', 'images')

/** The default build directory. Never committed; see .gitignore and the guard. */
export const DEFAULT_OUT = join(ROOT, 'dist', 'devlog-public')

const ENTRY_RE = /^DIGEST_(\d{4}-\d{2}-\d{2})\.md$/

/** Entries per index page (DESIGN.md §9: fifty-four entries never load at once). */
const PAGE_SIZE = 20

/** Rendered box widths, in CSS pixels. Media is served at 2x these and no larger. */
const BOX = { pair: 360, thumb: 160, portrait: 240, card: 168 }

/** The four families, one weight each, subset to Latin — the site's one fixed cost. */
const FONT_BUDGET_BYTES = 120 * 1024

/** DESIGN.md §9, in bytes. A page's weight is HTML + CSS + JS + fonts + every
 *  image it references — the whole page a reader who scrolls it all pays for. */
const BUDGETS = {
    landing: 900 * 1024,
    index: 400 * 1024,
    post: 1.4 * 1024 * 1024,
    catalog: 1.1 * 1024 * 1024,
    about: 200 * 1024,
}

/**
 * The panel ruling (DESIGN.md §8).
 *
 * Panels are PUBLIC BY DEFAULT — an entry's panels describe the day's work and
 * the site exists to publish the day's work. Three are retitled for a reader
 * who is not the maintainer. Exactly one is held back: `Needs you` is
 * correspondence between the maintainer and his tooling (permission grants,
 * rulings, open threads), addressed to one person and reading as such. Its
 * player-facing half is promoted by `/digest` into `Queues now`, so nothing
 * about the game's real state is hidden; only the correspondence is. Every
 * post says so at its foot.
 */
const PANEL_TITLES = {
    'while you were out': "The night's watch — what ran while nobody looked",
    'tuning proposals': 'The measure — did the fighting change?',
    'queues now': 'What is still unfinished',
}
const PANELS_WITHHELD = ['needs you']

const WITHHOLD_NOTE =
    'The nightly entry also carries a panel addressed to the maintainer — open questions, '
    + 'permission grants, things only he can rule on. It is held back from this page: it is '
    + 'correspondence, not a report. The unfinished work it tracks is published above, in plain words.'

// ---------------------------------------------------------------------------
// small utilities
// ---------------------------------------------------------------------------
const write = (path, contents) => {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, contents)
    return Buffer.byteLength(contents)
}

const bytesOf = (path) => (existsSync(path) ? statSync(path).size : 0)

/**
 * What a day's captures know about themselves.
 *
 * `devlog-shots.mjs` (and the catalog/plate pipelines) write a manifest beside
 * the captures naming the ref the "before" side came from. Where it exists the
 * site labels the older plate with that date; where it does not, the plate
 * carries no date at all. A guessed date on a piece of evidence is worse than
 * no date.
 */
export function captureManifest(date) {
    const path = join(CAPTURES, date, 'manifest.json')
    if (!existsSync(path)) return null
    try {
        return JSON.parse(readFileSync(path, 'utf8'))
    } catch {
        return null
    }
}

/** "../../" for a page two directories down from the site root. */
const rootFor = (depth) => '../'.repeat(depth)

/**
 * A day's title and lede, from the authored entry.
 *
 * The grammar's heading line may carry a title (`# 2026-09-20 — A governance
 * rewrite`); `/digest` authors one from tonight. The fifty-four entries that
 * predate the public site do not have one, so a title is derived from the
 * headline's first clause and the remainder becomes the lede. Derived, never
 * invented: every word on the page is the author's own.
 */
export function titleAndLede(md, headline, date) {
    const explicit = md.match(/^#\s*\d{4}-\d{2}-\d{2}\s*(?:—|-{1,2})\s*(.+)$/m)
    if (explicit) return { title: explicit[1].trim(), lede: headline, derived: false }

    const flat = String(headline || '').replace(/\s+/g, ' ').trim()
    if (!flat) return { title: romanDate(date), lede: '', derived: true }

    const clause = firstClause(flat)
    if (clause && clause.length >= 24 && clause.length <= 96 && clause.length < flat.length) {
        const rest = flat.slice(clause.length).replace(/^[\s,;:.—-]+/, '')
        return { title: clause, lede: rest || flat, derived: true }
    }
    // No clause the right length: cut the opening on a word boundary. Still the
    // author's own words — a derived title never invents a phrase the entry
    // does not contain. `/digest` authors a real title from tonight.
    if (flat.length > 96) {
        const cut = flat.slice(0, flat.lastIndexOf(' ', 72))
        if (cut.length >= 24) return { title: `${cut}…`, lede: flat, derived: true }
    }
    return { title: flat || romanDate(date), lede: flat === clause ? '' : flat, derived: true }
}

/**
 * Drop a leading repeat of the title from a lede.
 *
 * A title derived by truncating the headline is a prefix of the lede, and an
 * index row that prints "A quiet window: …" twice reads as a bug. The post
 * page keeps both (title, then the full standfirst); the index does not.
 */
function withoutTitle(lede, title) {
    const stem = String(title || '').replace(/…$/, '').trim()
    const flat = String(lede || '').trim()
    if (stem && flat.startsWith(stem)) return flat.slice(stem.length).replace(/^[\s,;:.—-]+/, '') || flat
    return flat
}

/** The index's one-line summary — the lede, trimmed on a word boundary. */
function summarise(text, max = 170) {
    const flat = String(text || '').replace(/\s+/g, ' ').trim()
    if (flat.length <= max) return flat
    return flat.slice(0, flat.lastIndexOf(' ', max)).replace(/[,;:—-]$/, '') + '…'
}

// ---------------------------------------------------------------------------
// media
// ---------------------------------------------------------------------------
/**
 * The image pipeline.
 *
 * Every published image is a DERIVATIVE: the committed PNG captures are the
 * source of truth and are never served as-is (a 70 KB phone capture served at
 * a 150px box is how an index blows its budget by an order of magnitude —
 * DESIGN.md §10 residue item 3). Each derivative is produced once and reused.
 */
async function makeMedia() {
    let sharp = null
    try {
        sharp = (await import('sharp')).default
    } catch {
        // Degrade, loudly: the night still publishes, at original weight.
        console.warn('devlog-public: sharp unavailable — copying originals instead of deriving WebP')
    }

    const made = new Map() // source path -> { rel, width, height, bytes }

    /**
     * @param {string} src        absolute path of the source image
     * @param {string} outRel     path under the build dir, without extension
     * @param {number} boxWidth   the CSS box this image renders into
     * @returns {{rel:string,width:number,height:number,bytes:number}}
     */
    const derive = async (src, outRel, boxWidth, out) => {
        const key = `${src}|${outRel}`
        if (made.has(key)) return made.get(key)
        const target = join(out, `${outRel}.webp`)
        mkdirSync(dirname(target), { recursive: true })

        let width = 0
        let height = 0
        if (sharp) {
            const image = sharp(src)
            const meta = await image.metadata()
            // Serve at 2x the rendered box and no larger — never upscale.
            const targetWidth = Math.min(meta.width || boxWidth * 2, boxWidth * 2)
            const resized = await image.resize({ width: targetWidth, withoutEnlargement: true })
                .webp({ quality: 72 }).toBuffer({ resolveWithObject: true })
            // Re-encoding an already-lossy WebP that is ALREADY inside the box
            // costs bytes and quality at once (the plates are dense engravings:
            // a 307 KB source came back 357 KB). Where that happens, ship the
            // file the game ships.
            const sourceIsSmallerWebp = /\.webp$/i.test(src)
                && (meta.width || 0) <= targetWidth
                && bytesOf(src) <= resized.data.length
            if (sourceIsSmallerWebp) {
                copyFileSync(src, target)
                width = meta.width || 0
                height = meta.height || 0
            } else {
                writeFileSync(target, resized.data)
                width = resized.info.width
                height = resized.info.height
            }
        } else {
            copyFileSync(src, target)
        }
        const value = { rel: `${outRel}.webp`, width, height, bytes: bytesOf(target) }
        made.set(key, value)
        return value
    }

    return { derive, hasSharp: Boolean(sharp) }
}

// ---------------------------------------------------------------------------
// evidence — the before/after pairs a work item carries
// ---------------------------------------------------------------------------
/**
 * Render every piece of evidence on one work item.
 *
 * Three outcomes, and only three:
 *   - a pair exists              -> the labelled pair, with per-image alt text
 *   - the item states no capture -> that sentence, in the author's own words
 *   - neither                    -> nothing at all; the item is text and commits
 *
 * An "after" is never shown twice, a neighbouring day's capture is never
 * reused, and an image whose work item has no usable what-line does not
 * publish (DESIGN.md §7's alt-text rule is a publication gate, not a label).
 */
async function renderEvidence(item, entry, media, out, ctx) {
    const parts = []
    const { fields } = item
    const captureDir = join(CAPTURES, entry.date)

    // 1. UI screens — devlog-shots.mjs trios (before / after / diff). The diff
    //    is NEVER published: it is a magenta noise field that reads as
    //    corruption to a stranger, and most of its area is text reflow. It
    //    stays internal, where it does its real job as the 2% gate.
    for (const shot of fields.shots) {
        const before = join(captureDir, `${shot.screen}.before.png`)
        const after = join(captureDir, `${shot.screen}.after.png`)
        if (!existsSync(after)) continue

        const altAfter = altText(shot.screen, 'after', fields.what)
        const altBefore = altText(shot.screen, 'before', fields.what)
        if (!altAfter) {
            ctx.unlabelled.push(`${entry.date} ${shot.screen}`)
            continue
        }
        const afterImg = await media.derive(after, `assets/captures/${entry.date}/${shot.screen}.after`, BOX.pair, out)
        const beforeImg = existsSync(before)
            ? await media.derive(before, `assets/captures/${entry.date}/${shot.screen}.before`, BOX.pair, out)
            : null
        ctx.pageBytes += afterImg.bytes + (beforeImg ? beforeImg.bytes : 0)
        parts.push(beforeAfter({
            shape: 'phone',
            before: beforeImg && { ...beforeImg, src: ctx.root + beforeImg.rel, alt: altBefore, date: entry.sinceDate },
            after: { ...afterImg, src: ctx.root + afterImg.rel, alt: altAfter, date: entry.date },
            caption: shot.caption ? `${shot.screen} — ${shot.caption}` : shot.screen,
        }))
    }

    // 2. Everything that is not a screen: card and foe plates (SVG, drawn the
    //    way the game draws them), world plates (the engraving itself), and
    //    afflictions (a rules-text pair — an image would be invented).
    for (const ev of fields.evidence) {
        const kind = EVIDENCE_KINDS[ev.kind]
        if (!kind) continue
        const stem = `${kind.prefix}-${ev.id}`
        const afterPath = join(captureDir, `${stem}.after.${kind.ext}`)
        const beforePath = join(captureDir, `${stem}.before.${kind.ext}`)
        if (!existsSync(afterPath)) continue

        if (kind.shape === 'text') {
            // { before, after } rules text, captured at the two refs.
            const pair = JSON.parse(readFileSync(afterPath, 'utf8'))
            parts.push(beforeAfterText({
                before: pair.before || '',
                after: pair.after || '',
                label: ev.id.replace(/[-_]+/g, ' '),
                caption: ev.caption,
            }))
            continue
        }

        const alt = (role) => altText(ev.id, role, fields.what, kind.noun)
        if (!alt('after')) {
            ctx.unlabelled.push(`${entry.date} ${stem}`)
            continue
        }

        // SVG plates are copied (already small and resolution-free); raster
        // plates go through the same derivative path as a capture.
        let afterImg
        let beforeImg = null
        if (kind.ext === 'svg') {
            const rel = `assets/captures/${entry.date}/${stem}.after.svg`
            ctx.pageBytes += write(join(out, rel), readFileSync(afterPath))
            afterImg = { rel }
            if (existsSync(beforePath)) {
                const beforeRel = `assets/captures/${entry.date}/${stem}.before.svg`
                ctx.pageBytes += write(join(out, beforeRel), readFileSync(beforePath))
                beforeImg = { rel: beforeRel }
            }
        } else {
            afterImg = await media.derive(afterPath, `assets/captures/${entry.date}/${stem}.after`, BOX.pair, out)
            ctx.pageBytes += afterImg.bytes
            if (existsSync(beforePath)) {
                beforeImg = await media.derive(beforePath, `assets/captures/${entry.date}/${stem}.before`, BOX.pair, out)
                ctx.pageBytes += beforeImg.bytes
            }
        }

        parts.push(beforeAfter({
            shape: kind.shape,
            before: beforeImg && { ...beforeImg, src: ctx.root + beforeImg.rel, alt: alt('before') },
            after: { ...afterImg, src: ctx.root + afterImg.rel, alt: alt('after'), date: entry.date },
            caption: ev.caption ? `${ev.id} — ${ev.caption}` : ev.id,
        }))
    }

    // 3. No picture, stated. Never faked, never a neighbour's capture.
    if (fields.noCapture) parts.push(noCapture(fields.noCapture))

    return parts.join('\n')
}

// ---------------------------------------------------------------------------
// pages
// ---------------------------------------------------------------------------
/** Where a card painting is served from: the derived file's path under the site root. */
export const cardArtRel = (file) => `assets/cards/${file.replace(/\.\w+$/, '')}.webp`

/**
 * The card plate's art box: the painting where the gate publishes it, and the
 * REASON where it does not (a file whose record names no licence).
 *
 * Exported because this is the one place the licence ruling becomes pixels,
 * and a test that can only reach it through a full build is a test that stops
 * running the day the catalog export is unavailable. `records` lets a test
 * hand the gate a fixture record instead of the tree's.
 */
export function cardArtHtml(card, root = '', records = undefined) {
    const file = card.image ? basename(card.image) : ''
    const verdict = file ? verdictFor('cards', file, records) : null
    if (verdict?.publish) {
        return `<div><img loading="lazy" decoding="async" src="${root}${cardArtRel(file)}" alt="${escapeHtml(card.name)} — the card's plate."></div>`
    }
    return '<div class="withheld"><span>painting withheld<br>no licence on record</span></div>'
}

/** One work-item card: the category, the what, the WHY, the pair, the commits. */
async function renderItem(section, entry, media, out, ctx) {
    const { fields, body } = extractFields(section.bodyLines)
    const evidence = await renderEvidence({ fields }, entry, media, out, ctx)
    const parts = [
        `<div class="item-head">${chip(section.category)}</div>`,
        `<h2>${inline(section.title)}</h2>`,
    ]
    if (fields.what) {
        parts.push(`<div class="field field-what"><p class="field-label">What changed</p><p>${inline(fields.what)}</p></div>`)
    }
    // The why is the headline field on this page, never the commits. A post
    // that cannot say why is a post that has not earned a reader's attention.
    if (fields.why) {
        parts.push(`<div class="field field-why"><p class="field-label">Why it changed</p><p>${inline(fields.why)}</p></div>`)
    }
    if (body) parts.push(`<div class="field">${mdToHtml(body)}</div>`)
    if (evidence) parts.push(evidence)
    if (fields.commits.length) {
        const links = fields.commits
            .map((c) => {
                const sha = c.replace(/[^0-9a-f]/gi, '')
                return sha ? `<a href="https://github.com/no-trbl-2-u/Miserere-mei-deus/commit/${sha}">${escapeHtml(sha.slice(0, 8))}</a>` : escapeHtml(c)
            })
            .join(` ${MARKS.dot} `)
        parts.push(`<p class="commits">${fields.commits.length === 1 ? 'commit' : 'commits'} ${links}</p>`)
    }
    return `<article class="item">${parts.join('\n')}</article>`
}

/** One post: the whole day, in the chronicle's chrome. */
async function renderPost(entry, entries, media, out, warnings) {
    const root = rootFor(2)
    const ctx = { root, pageBytes: 0, unlabelled: warnings.unlabelled }
    const items = []
    const panels = []

    for (const section of entry.sections) {
        if (section.kind === 'card') {
            items.push(await renderItem(section, entry, media, out, ctx))
            continue
        }
        const key = section.title.trim().toLowerCase()
        if (PANELS_WITHHELD.includes(key)) continue
        if (!PANEL_TITLES[key]) warnings.unknownPanels.add(section.title.trim())
        panels.push(panel(PANEL_TITLES[key] || section.title, mdToHtml(section.bodyLines.join('\n'))))
    }

    const index = entries.length - entries.indexOf(entry)
    const body = `<div class="band band-read">
  <p class="mono" style="display:flex;justify-content:space-between">
    <span style="color:var(--blood)">${MARKS.dagger} ENTRY ${roman(index).toUpperCase()}</span>
    ${dateStamp(entry.date)}
  </p>
  <hr class="rule">
  <h1>${escapeHtml(entry.title)}</h1>
  ${entry.lede ? `<p class="lede">${inline(entry.lede)}</p>` : ''}
  ${items.join('\n')}
  <section class="marginalia">
    ${eyebrow('The marginalia')}
    ${panels.join('\n')}
    <p class="mono" style="margin-top:14px">${escapeHtml(WITHHOLD_NOTE)}</p>
  </section>
  <nav class="pager">
    ${entry.newer ? `<a href="${root}log/${entry.newer}/">&larr; Newer</a>` : ''}
    <a href="${root}log/">All entries</a>
    ${entry.older ? `<a href="${root}log/${entry.older}/">Older &rarr;</a>` : ''}
  </nav>
</div>`

    const html = page({
        title: `${entry.title} — Miserere Mei, Deus`,
        description: summarise(entry.lede || entry.title),
        body, current: 'log', root, themes: THEME_IDS, date: entry.date,
    })
    const bytes = write(join(out, 'log', entry.date, 'index.html'), html)
    return { page: `log/${entry.date}/`, type: 'post', bytes: bytes + ctx.pageBytes }
}

/** The post index: chronological, filterable, one thumbnail per row. */
async function renderIndex(entries, media, out, pageNumber, pages) {
    const depth = pageNumber === 1 ? 1 : 2
    const root = rootFor(depth)
    const slice = entries.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE)
    let imageBytes = 0

    const rows = []
    for (const entry of slice) {
        const counts = entry.counts
        const chips = CATEGORIES.filter((c) => counts[c]).map((c) => chip(c, counts[c])).join('')
        let thumb = ''
        if (entry.thumbSource) {
            // Capped at 320px and lazy — the index never loads a full capture.
            const img = await media.derive(entry.thumbSource, `assets/thumbs/${entry.date}`, BOX.thumb, out)
            imageBytes += img.bytes
            thumb = `<img loading="lazy" decoding="async" src="${root}${img.rel}"${img.width ? ` width="${img.width}" height="${img.height}"` : ''} alt="${escapeHtml(entry.thumbAlt)}">`
        }
        rows.push(`<li data-cats="${escapeHtml(Object.keys(counts).join(' '))}">
      <div class="entry-row">
        <div>
          ${dateStamp(entry.date)}
          <h3><a href="${root}log/${entry.date}/">${escapeHtml(entry.title)}</a></h3>
          <p class="dim">${escapeHtml(summarise(withoutTitle(entry.lede, entry.title)))}</p>
          <div class="entry-chips">${chips}</div>
        </div>
        ${thumb}
      </div>
    </li>`)
    }

    const filters = ['all', ...CATEGORIES].map((c) =>
        `<button type="button" data-filter="${c}" aria-pressed="${c === 'all'}">${c.toUpperCase()}</button>`).join('')

    const pager = []
    if (pageNumber > 1) pager.push(`<a href="${pageNumber === 2 ? `${root}log/` : `${root}log/page-${pageNumber - 1}/`}">&larr; Newer</a>`)
    if (pageNumber < pages) pager.push(`<a href="${root}log/page-${pageNumber + 1}/">Older &rarr;</a>`)

    const body = `<div class="band band-wide">
  ${eyebrow('The log')}
  <h1>${escapeHtml(entries.length === 1 ? 'One night' : `${entries.length} nights`)}</h1>
  <p class="dim">One entry per working day, newest first. Filter by the kind of work; every entry carries its own pictures.</p>
  <div class="filters" data-filters hidden>${filters}</div>
  <ul class="entries">
    ${rows.join('\n')}
    <li data-empty hidden class="mono">No entries of that kind on this page.</li>
  </ul>
  <nav class="pager">${pager.join('')}</nav>
  <p class="mono">Page ${pageNumber} of ${pages}</p>
</div>`

    const html = page({
        title: pageNumber === 1 ? 'The log — Miserere Mei, Deus' : `The log, page ${pageNumber} — Miserere Mei, Deus`,
        description: 'Every night of work on Miserere Mei, Deus: what changed, what it looks like now, and why it was worth changing.',
        body, current: 'log', root, themes: THEME_IDS,
    })
    const rel = pageNumber === 1 ? join('log', 'index.html') : join('log', `page-${pageNumber}`, 'index.html')
    const bytes = write(join(out, rel), html)
    return { page: pageNumber === 1 ? 'log/' : `log/page-${pageNumber}/`, type: 'index', bytes: bytes + imageBytes }
}

/** The landing page: a plate, a title, what this is, and the newest entry. */
/**
 * The "Play the latest build" band on the landing page.
 *
 * Pure: takes the newest valid record from devlog/builds.json (see
 * scripts/devlog-builds.mjs) and returns HTML, or '' when there is no build to
 * offer, so a missing or malformed ledger never breaks the page.
 *
 * It links Expo's artifact URL directly. That URL serves the APK without a
 * login, and the APK (~100 MiB) is too large to host on Pages (25 MiB per
 * file). Expo's build page is deliberately NOT linked: it may require an
 * Expo login, and a public page must not send a stranger to a sign-in wall.
 *
 * @param {object | null} build - a ledger record, or null
 * @returns {string} an HTML band, or ''
 */
export function playBandHtml(build) {
    if (!build) return ''
    const size = formatSize(build.sizeBytes)
    const label = size ? `Download for Android (${size})` : 'Download for Android'
    const commit = build.commit ? ` from commit <code>${escapeHtml(build.commit)}</code>` : ''
    return `<div class="band band-read" id="play">
  ${eyebrow('Play the latest build')}
  ${dateStamp(build.date)}
  <p>The newest preview build of the game, built${commit}. It is unfinished and changes often.</p>
  <nav class="pager">
    <a href="${escapeHtml(build.apkUrl)}" rel="nofollow" download>${escapeHtml(label)}</a>
  </nav>
  <p class="dim">Android only. The file is an APK installed outside the Play Store, so your phone will ask you to allow installs from this source. There is no iPhone build yet.</p>
</div>`
}

async function renderLanding(entries, media, out) {
    const root = ''
    const newest = entries[0]
    let imageBytes = 0

    // The hero plate is a published, public-domain engraving; the holed sheet
    // in front of it is generated (see assets/hero-sheet.svg) rather than a
    // binary of unknown provenance.
    const heroSource = join(ART, 'maps', 'forest-dark.webp')
    // The hero is the one full-bleed image on the site, so it is the one place
    // the 2x rule would overspend: 600 CSS px of plate at 2x, no larger.
    const hero = await media.derive(heroSource, 'assets/hero-plate', 600, out)
    imageBytes += hero.bytes

    let pair = ''
    if (newest.thumbSource) {
        const shot = newest.firstShot
        const after = await media.derive(shot.after, `assets/captures/${newest.date}/${shot.screen}.after`, BOX.pair, out)
        const before = shot.before ? await media.derive(shot.before, `assets/captures/${newest.date}/${shot.screen}.before`, BOX.pair, out) : null
        imageBytes += after.bytes + (before ? before.bytes : 0)
        pair = beforeAfter({
            shape: 'phone',
            before: before && { ...before, src: before.rel, alt: shot.altBefore, date: newest.sinceDate },
            after: { ...after, src: after.rel, alt: shot.altAfter, date: newest.date },
            caption: shot.caption,
        })
    }

    // The play band sits between "What this is" and the newest entry: the
    // reader has just been told what the game is, and can now try it.
    const play = playBandHtml(latestAndroid(readBuilds()))

    const body = `<section class="hero" data-hero>
  <img class="hero-plate" src="assets/hero-plate.webp" alt="" aria-hidden="true">
  <img class="hero-sheet" src="assets/hero-sheet.svg" alt="" aria-hidden="true">
  <div class="hero-vignette"></div>
  <div class="hero-title"><h1>Miserere<br>Mei, Deus</h1></div>
  <p class="hero-cue">DESCEND</p>
</section>
<div class="band band-read">
  ${eyebrow('What this is')}
  <p style="font-size:clamp(19px,2.4vw,23px);line-height:1.5">A dark fantasy deckbuilding RPG, built in the open. Every night the work of the last day is written down here — what changed, what it looks like now, and why it was worth changing.</p>
  <p class="dim">Nothing below is a mock-up. The pictures are the game's own screens, captured before the change and after it.</p>
</div>
${play}
<div class="band band-read">
  ${eyebrow('The newest entry')}
  ${dateStamp(newest.date)}
  <h2><a href="log/${newest.date}/">${escapeHtml(newest.title)}</a></h2>
  <p class="dim">${escapeHtml(summarise(withoutTitle(newest.lede, newest.title)))}</p>
  ${pair}
  <nav class="pager">
    <a href="log/${newest.date}/">Read the entry</a>
    <a href="log/">All ${entries.length} entries</a>
  </nav>
</div>`

    const html = page({
        title: 'Miserere Mei, Deus — the development log',
        description: 'A dark fantasy deckbuilding RPG, built in the open. Every night: what changed, shown before and after, and why.',
        body, current: '', root, themes: THEME_IDS,
    })
    const bytes = write(join(out, 'index.html'), html)
    return { page: '/', type: 'landing', bytes: bytes + imageBytes }
}

/**
 * The catalog — every card, foe and affliction, from the engine's own export.
 *
 * Art publishes where the gate passes it (scripts/devlog-art-licence.mjs):
 * every card painting and foe portrait in the tree does (D115). A file whose
 * record names no licence still publishes its frame, name and ledger and says
 * the painting is withheld, rather than pretending the card has no face.
 */
async function renderCatalog(media, out, warnings) {
    const root = rootFor(1)
    const read = (name) => {
        const path = join(DATA, `${name}.json`)
        return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : []
    }
    const cards = read('cards')
    const enemies = read('enemies')
    const effects = read('effects')
    if (!cards.length) warnings.notes.push('catalog: devlog/data/*.json missing — run `npm run catalog:export` first')

    let imageBytes = 0
    const stanceOf = (card) => (card.chips || []).find((c) => c.k === 'Stance')?.v || ''

    const cardArt = (card) => cardArtHtml(card, root)

    // Each publishable painting is derived into the output once, so the <img>
    // cardArtHtml writes points at a file that exists.
    const attributions = new Map()
    let cardsShown = 0
    for (const file of new Set(cards.map((c) => (c.image ? basename(c.image) : '')).filter(Boolean))) {
        const verdict = verdictFor('cards', file)
        if (!verdict.publish) continue
        const source = join(ART, 'cards', file)
        if (!existsSync(source)) continue
        const img = await media.derive(source, cardArtRel(file).replace(/\.webp$/, ''), BOX.card, out)
        imageBytes += img.bytes
        cardsShown += 1
        if (verdict.tier === 'attribution' || verdict.attribution) attributions.set(file, verdict)
    }

    const cardPlates = cards.map((card) => {
        const stance = stanceOf(card)
        const free = card.face?.freeVal
            ? `<span class="plate-free">${MARKS.lozenge}${escapeHtml(card.face.freeVal)}</span>`
            : ''
        // A refused painting says so in the frame the art would fill. A silent
        // black box reads as a broken image; this reads as a policy.
        const art = cardArt(card)
        return `<article class="plate plate-${escapeHtml(stance || 'body')}" id="card-${escapeHtml(card.id)}">
      <h3 class="plate-name">${escapeHtml(card.name)}</h3>
      <div class="plate-art">${art}</div>
      <div class="plate-ledger">
        ${free}
        <span class="plate-key" style="color:var(--stance-${escapeHtml(stance || 'body')})">${escapeHtml(card.face?.freeKw || '')}</span>
      </div>
      <p class="plate-paid">${escapeHtml(card.face?.paid || '')}</p>
    </article>`
    })

    const foeCards = []
    let portraitsShown = 0
    for (const foe of enemies) {
        const file = foe.image ? basename(foe.image) : ''
        const verdict = file ? verdictFor('enemies', file) : null
        let portrait = '<div class="portrait" title="portrait withheld: no licence on record"></div>'
        if (verdict?.publish) {
            const img = await media.derive(join(ART, 'enemies', file), `assets/foes/${file.replace(/\.\w+$/, '')}`, BOX.portrait, out)
            imageBytes += img.bytes
            portrait = `<div class="portrait"><img loading="lazy" decoding="async" src="${root}${img.rel}" alt="${escapeHtml(foe.name)} — the foe's portrait.">`
                + '</div>'
            portraitsShown += 1
            if (verdict.tier === 'attribution' || verdict.attribution) attributions.set(file, verdict)
        }
        foeCards.push(`<article class="foe" id="foe-${escapeHtml(foe.id)}">
      ${portrait}
      <div class="foe-body">
        <p class="mono" style="display:flex;justify-content:space-between"><span>level ${roman(foe.level || 1)}</span><span>${escapeHtml(foe.difficulty || '')}</span></p>
        <h3>${escapeHtml(foe.name)}</h3>
        <p class="dim">${escapeHtml(foe.logicBlurb || '')}</p>
        <p class="mono">hp ${escapeHtml(String(foe.maxHealth ?? ''))}</p>
      </div>
    </article>`)
    }

    const effectCards = effects.map((eff) => `<article class="eff" id="effect-${escapeHtml(eff.id)}">
      <h3 class="eff-name" style="color:var(--${eff.type === 'buff' ? 'heal' : 'blood'})">${escapeHtml(eff.name)}</h3>
      <p class="dim">${escapeHtml(eff.kw || '')} ${escapeHtml((eff.chips || []).map((c) => `${c.k} ${c.v || ''}`).join(' · '))}</p>
    </article>`)

    const body = `<div class="band band-full">
  ${eyebrow('The catalog')}
  <h1>Everything in the book</h1>
  <p class="dim">Every card, every foe, every affliction — the same data the game runs on, nothing held back, paintings included.</p>
  <h2 id="cards">Cards</h2>
  <p class="mono">${cards.length} cards ${MARKS.dot} ${cardsShown} paintings shown</p>
  <div class="cat-grid">${cardPlates.join('\n')}</div>
  <h2 id="foes">Foes</h2>
  <p class="mono">${enemies.length} foes ${MARKS.dot} ${portraitsShown} portraits shown</p>
  <div class="foe-grid">${foeCards.join('\n')}</div>
  <h2 id="afflictions">Afflictions</h2>
  <p class="mono">${effects.length} effects</p>
  <div class="eff-grid">${effectCards.join('\n')}</div>
</div>`

    const html = page({
        title: 'The catalog — Miserere Mei, Deus',
        description: 'Every card, foe and affliction in Miserere Mei, Deus, drawn from the engine\'s own libraries.',
        body, current: 'catalog', root, themes: THEME_IDS,
    })
    const bytes = write(join(out, 'catalog', 'index.html'), html)
    return { result: { page: 'catalog/', type: 'catalog', bytes: bytes + imageBytes }, attributions }
}

/** About: what the game is, how an entry is made, what is withheld, licences. */
function renderAbout(attributions, out) {
    const root = rootFor(1)
    const marks = [...attributions.values()]
        .map((v) => `<li>${escapeHtml(basename(v.file))} — ${escapeHtml(v.attribution)}, ${escapeHtml(v.licence)}${/^https?:\/\//.test(v.source || '') ? ` (<a href="${escapeHtml(v.source)}">source</a>)` : ''}</li>`)
        .sort()

    const body = `<div class="band band-narrow">
  ${eyebrow('About')}
  <h1>What this is, and how it is made</h1>
  <p><em>Miserere Mei, Deus</em> is a dark fantasy deckbuilding RPG. You walk a ruined parish with a deck of cards, a handful of dice, and an account with something that is keeping score.</p>
  <p class="dim">It is built in the open. Nothing here is a roadmap or an announcement — it is a record of work already done, written the night it was done, with the pictures to prove it.</p>

  <h2>How an entry is made</h2>
  <ol class="dim">
    <li>The day's work lands. Screens the change touched are captured as they now stand.</li>
    <li>The captures are compared against the ones held from before. A difference under two per cent is not worth your time, and is dropped.</li>
    <li>Cards, foes and afflictions that changed get the same treatment: the plate as it was, and the plate as it is.</li>
    <li>Each piece of work is written up as what changed and why — the why is the part that has to earn its place.</li>
    <li>It publishes. There is no editor between the work and this page.</li>
  </ol>

  <h2>What is not here</h2>
  <p class="dim">${escapeHtml(WITHHOLD_NOTE)}</p>

  <h2>Attribution</h2>
  <p class="dim">The world plates are 19th-century wood engravings in the public domain, graded for the screen. The type — Pirata One, IM Fell English, Bebas Neue and JetBrains Mono — is open licence. The paintings on the cards and the foes are open-source art, published here with the rest of the catalog. The files below carry an artist's name on record, and it is credited here whether or not the licence asks for it.</p>
  <ul class="mono">${marks.join('\n') || '<li>No file in the catalog carries an artist credit.</li>'}</ul>

  <h2>How to follow it</h2>
  <p><a href="${root}feed.xml">The feed</a> ${MARKS.dot} <a href="${root}log/">The log</a> ${MARKS.dot} <a href="https://github.com/no-trbl-2-u/Miserere-mei-deus">The source</a></p>
</div>`
    const bytes = write(join(out, 'about', 'index.html'), page({
        title: 'About — Miserere Mei, Deus',
        description: 'What Miserere Mei, Deus is, how its development log is made, and what it withholds.',
        body, current: 'about', root, themes: THEME_IDS,
    }))
    return { page: 'about/', type: 'about', bytes }
}

/** An Atom feed — the machine-readable half of DESIGN.md §10 residue item 4. */
function renderFeed(entries, out, origin) {
    const items = entries.slice(0, 20).map((e) => `  <entry>
    <title>${escapeHtml(e.title)}</title>
    <link href="${origin}/log/${e.date}/"/>
    <id>${origin}/log/${e.date}/</id>
    <updated>${e.date}T00:00:00Z</updated>
    <summary>${escapeHtml(summarise(e.lede || e.title, 400))}</summary>
  </entry>`).join('\n')

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Miserere Mei, Deus — the development log</title>
  <link href="${origin}/"/>
  <link rel="self" href="${origin}/feed.xml"/>
  <id>${origin}/</id>
  <updated>${entries[0]?.date || '1970-01-01'}T00:00:00Z</updated>
${items}
</feed>
`
    return write(join(out, 'feed.xml'), xml)
}

/**
 * The holed sheet in front of the hero plate.
 *
 * Generated, not acquired: the design prototype used a placeholder punch-out
 * of unknown provenance, and this site does not publish art it cannot account
 * for. An SVG mask is also a tenth of the weight and scales to any viewport.
 */
function heroSheet() {
    // A fixed, hand-placed set of holes — deterministic, so the build is
    // reproducible and the hero never re-rolls between nights.
    const holes = [
        [50, 42, 30, 26], [24, 22, 12, 9], [78, 30, 14, 11], [18, 66, 10, 13],
        [82, 70, 11, 9], [38, 80, 13, 8], [64, 86, 9, 7], [12, 44, 7, 6], [90, 50, 6, 8],
    ]
    const ellipses = holes
        .map(([cx, cy, rx, ry]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="black"/>`)
        .join('')
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" role="presentation">
  <defs>
    <mask id="holes">
      <rect width="100" height="100" fill="white"/>
      ${ellipses}
    </mask>
    <radialGradient id="edge" cx="50%" cy="42%" r="60%">
      <stop offset="60%" stop-color="var(--deepBg, #070509)" stop-opacity="0.82"/>
      <stop offset="100%" stop-color="var(--bg, #0b0a09)" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <rect width="100" height="100" fill="url(#edge)" mask="url(#holes)"/>
</svg>
`
}

// ---------------------------------------------------------------------------
// the build
// ---------------------------------------------------------------------------
/** Read every entry, newest first, with everything the pages need precomputed. */
export function readEntries() {
    if (!existsSync(ENTRIES)) return []
    const files = readdirSync(ENTRIES).filter((f) => ENTRY_RE.test(f)).sort().reverse()

    const entries = files.map((file) => {
        const date = file.match(ENTRY_RE)[1]
        const md = readFileSync(join(ENTRIES, file), 'utf8')
        const { headline, sections } = parseEntry(md)
        const { title, lede } = titleAndLede(md, headline, date)
        return { date, headline, sections, title, lede, counts: categoryCounts(sections) }
    })

    // Neighbours, and the capture each entry shows on the index and the landing.
    entries.forEach((entry, i) => {
        entry.newer = i > 0 ? entries[i - 1].date : null
        entry.older = i + 1 < entries.length ? entries[i + 1].date : null
        // The only date the older plate may carry is the one its manifest proves.
        entry.sinceDate = captureManifest(entry.date)?.sinceDate || ''

        for (const section of entry.sections) {
            if (section.kind !== 'card') continue
            const { fields } = extractFields(section.bodyLines)
            for (const shot of fields.shots) {
                const after = join(CAPTURES, entry.date, `${shot.screen}.after.png`)
                const before = join(CAPTURES, entry.date, `${shot.screen}.before.png`)
                const alt = altText(shot.screen, 'after', fields.what)
                if (!existsSync(after) || !alt) continue
                entry.thumbSource = after
                entry.thumbAlt = alt
                entry.firstShot = {
                    screen: shot.screen, after, before: existsSync(before) ? before : null,
                    altAfter: alt, altBefore: altText(shot.screen, 'before', fields.what),
                    caption: shot.caption ? `${shot.screen} — ${shot.caption}` : shot.screen,
                }
                return
            }
        }
    })

    return entries
}

export async function build({ out = DEFAULT_OUT, strict = false, origin = 'https://axiomancer-devlog.pages.dev', clean = true } = {}) {
    const entries = readEntries()
    if (!entries.length) throw new Error('devlog-public: no entries found in devlog/entries')

    if (clean && existsSync(out)) rmSync(out, { recursive: true, force: true })
    mkdirSync(out, { recursive: true })

    // 1. the stylesheets and the enhancement script
    const cssBytes = write(join(out, 'assets', 'tokens.css'), stylesheet())
        + write(join(out, 'assets', 'site.css'), SITE_CSS)
    const jsBytes = write(join(out, 'assets', 'site.js'), readFileSync(join(ROOT, 'scripts', 'devlog-public', 'site.js')))
    write(join(out, 'assets', 'hero-sheet.svg'), heroSheet())
    // Pages hosts serve these headers; they cost nothing and the site is static.
    write(join(out, '_headers'), '/assets/*\n  Cache-Control: public, max-age=604800\n')

    const media = await makeMedia()
    const warnings = { unlabelled: [], unknownPanels: new Set(), notes: [] }
    const results = []

    // 2. the pages
    results.push(await renderLanding(entries, media, out))
    const pages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
    for (let p = 1; p <= pages; p++) results.push(await renderIndex(entries, media, out, p, pages))
    for (const entry of entries) results.push(await renderPost(entry, entries, media, out, warnings))
    const catalog = await renderCatalog(media, out, warnings)
    results.push(catalog.result)
    results.push(renderAbout(catalog.attributions, out))
    renderFeed(entries, out, origin.replace(/\/$/, ''))

    // 3. the payload budget (DESIGN.md §9). A page's weight is its HTML, the
    //    shared CSS/JS, the font families, and every image it references.
    const overhead = cssBytes + jsBytes + FONT_BUDGET_BYTES
    const over = []
    for (const result of results) {
        result.total = result.bytes + overhead
        result.budget = BUDGETS[result.type]
        if (result.budget && result.total > result.budget) over.push(result)
    }

    const report = { out, entries: entries.length, pages: results, over, warnings, hasSharp: media.hasSharp }
    if (strict && over.length) {
        const lines = over.map((r) => `  ${r.page} — ${(r.total / 1024).toFixed(0)} KB over a ${(r.budget / 1024).toFixed(0)} KB budget`)
        throw new Error(`devlog-public: ${over.length} page(s) blow the payload budget:\n${lines.join('\n')}`)
    }
    return report
}

// ── CLI ─────────────────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const argv = process.argv.slice(2)
    const outAt = argv.indexOf('--out')
    const report = await build({
        out: outAt >= 0 ? argv[outAt + 1] : DEFAULT_OUT,
        strict: argv.includes('--strict'),
    })
    const worst = [...report.pages].sort((a, b) => b.total - a.total).slice(0, 4)
    console.log(`devlog-public: ${report.entries} entries -> ${relative(ROOT, report.out)}`)
    for (const r of worst) console.log(`  ${r.page.padEnd(26)} ${(r.total / 1024).toFixed(0).padStart(5)} KB${r.budget ? ` / ${(r.budget / 1024).toFixed(0)} KB` : ''}`)
    if (report.over.length) console.log(`  ${report.over.length} page(s) over budget`)
    for (const note of report.warnings.notes) console.log(`  note: ${note}`)
    if (report.warnings.unlabelled.length) {
        console.log(`  ${report.warnings.unlabelled.length} capture(s) withheld for want of a what-line: ${report.warnings.unlabelled.slice(0, 5).join(', ')}`)
    }
    for (const title of report.warnings.unknownPanels) console.log(`  panel published under its own title: "${title}"`)
}
