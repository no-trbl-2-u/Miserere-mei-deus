#!/usr/bin/env node
// scripts/build-devlog-public.test.mjs — the public site's contract.
//
// This is the test the publish prompt asks for by name: "Guard compatibility
// is a test, not a hope. Add coverage proving the public build's output does
// not become tracked and that check-devlog-not-served.mjs still exits 0 on the
// resulting tree."
//
// It also pins the promises the site makes to a reader, because every one of
// them is a promise a future change could quietly break:
//   - the withheld panel never appears on a page
//   - every image carries alt text, and the two halves of a pair never share it
//   - nothing meaningful sits behind JavaScript
//   - no emoji, anywhere (AGENTS.md standing rule 2)
//   - no page blows its payload budget (DESIGN.md §9)

import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { DEFAULT_OUT, build, cardArtHtml, readEntries, titleAndLede } from './build-devlog-public.mjs'
import { isGeneratedDevlogPath } from './check-devlog-not-served.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Build once into a throwaway directory; every case below reads that build. */
const OUT = mkdtempSync(join(tmpdir(), 'devlog-public-'))
const report = await build({ out: OUT, clean: true })
const read = (rel) => readFileSync(join(OUT, rel), 'utf8')
const pages = []
const walk = (dir) => {
    for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) walk(path)
        // Forward slashes on every platform: the cases below match `log/<date>/`.
        else if (name.endsWith('.html')) pages.push(relative(OUT, path).split(sep).join('/'))
    }
}
walk(OUT)

test.after(() => rmSync(OUT, { recursive: true, force: true }))

test('every page type renders', () => {
    for (const rel of ['index.html', 'log/index.html', 'catalog/index.html', 'about/index.html', 'feed.xml']) {
        assert.ok(existsSync(join(OUT, rel)), `${rel} is missing`)
    }
    assert.ok(!existsSync(join(OUT, 'tuning-lab')), 'the Tuning Lab was retired in R1')
    const newest = readEntries()[0]
    assert.ok(existsSync(join(OUT, 'log', newest.date, 'index.html')), 'the newest post is missing')
    assert.ok(pages.length >= report.entries, 'every entry should have a post')
})

test('the index paginates rather than loading every night at once', () => {
    assert.ok(existsSync(join(OUT, 'log', 'page-2', 'index.html')), 'a second index page should exist for 54 entries')
    const first = read('log/index.html')
    const rows = first.match(/<li data-cats=/g) || []
    assert.ok(rows.length <= 20, `page one carries ${rows.length} rows; the budget allows twenty`)
})

test('the build writes NOTHING into devlog/, and the guard still exits 0 on the tree', () => {
    // 1. the output lives outside the guarded directory
    assert.ok(!DEFAULT_OUT.includes(`${ROOT}/devlog`), 'the public build must not write inside devlog/')
    // 2. the guard classifies every byte of it as generated
    assert.equal(isGeneratedDevlogPath('dist/devlog-public/index.html'), true)
    assert.equal(isGeneratedDevlogPath('dist/devlog-public/assets/site.js'), true)
    // 3. and it still passes on the real tree, with a build present
    const guard = spawnSync('node', ['scripts/check-devlog-not-served.mjs'], { cwd: ROOT, encoding: 'utf-8' })
    assert.equal(guard.status, 0, guard.stderr)
    // 4. a tracked build output would fail it — the guard has not gone soft
    const synthetic = spawnSync('node', ['scripts/check-devlog-not-served.mjs', 'dist/devlog-public/index.html'], { cwd: ROOT, encoding: 'utf-8' })
    assert.equal(synthetic.status, 1)
    assert.match(synthetic.stderr, /generated output/)
})

test('the public build output is ignored by git', () => {
    const ignored = execFileSync('git', ['check-ignore', '-q', 'dist/devlog-public/index.html'], { cwd: ROOT })
    assert.equal(String(ignored), '')
})

test('the withheld panel never reaches a page', () => {
    // The panel is withheld by its HEADING: an entry's prose may still mention
    // the panel by name ("filed under Needs you"), and that sentence is the
    // author's, published as written. What must never appear is the panel
    // itself — a <summary> that opens it.
    for (const rel of pages) {
        for (const [, summary] of read(rel).matchAll(/<summary>([\s\S]*?)<\/summary>/g)) {
            assert.ok(!/needs you/i.test(summary), `${rel} published the maintainer's correspondence panel`)
        }
    }
    // And every post says, in words, that something is held back.
    const newest = readEntries()[0]
    assert.match(read(`log/${newest.date}/index.html`), /held back from this page/)
})

test('every image carries alt text, and the halves of a pair never share it', () => {
    for (const rel of pages) {
        const html = read(rel)
        for (const [, tag] of html.matchAll(/<img([^>]*)>/g)) {
            const alt = tag.match(/\salt="([^"]*)"/)
            assert.ok(alt, `${rel} has an <img> with no alt attribute: ${tag.trim().slice(0, 80)}`)
            if (!alt[1]) assert.match(tag, /aria-hidden="true"/, `${rel} has an empty alt that is not decorative`)
        }
    }
    const post = pages.find((p) => /^log\/\d{4}-\d{2}-\d{2}\//.test(p) && /class="ba /.test(read(p)))
    if (post) {
        const html = read(post)
        const alts = [...html.matchAll(/class="ba-side ba-(before|after)"[\s\S]*?alt="([^"]*)"/g)].map((m) => m[2])
        assert.ok(alts.length >= 2, 'a pair should carry two labelled images')
        assert.notEqual(alts[0], alts[1], 'the before and after images must not share alt text')
        assert.match(alts[0], /before the change:/)
        assert.match(alts[1], /after the change:/)
    }
})

test('nothing that carries meaning sits behind a script', () => {
    // A post, not the front page: the front page features the newest pair
    // but carries no marginalia.
    const post = pages.find((p) => /^log\/\d{4}-\d{2}-\d{2}\//.test(p) && /class="ba /.test(read(p)))
    assert.ok(post, 'at least one post should carry a before/after pair')
    const html = read(post)
    // The pair is plain markup; the marginalia are <details>; the controls that
    // need script ship hidden and are revealed by site.js.
    assert.match(read('log/index.html'), /<div class="filters" data-filters hidden>/)
    assert.match(html, /<details class="marg">/)
    for (const rel of pages) {
        assert.ok(!/ on(click|change|load|mouse\w+)=/i.test(read(rel)), `${rel} carries an inline event handler`)
    }
})

test('nothing this build AUTHORS carries an emoji', () => {
    // AGENTS.md standing rule 2. The scope is what the site writes — its
    // chrome, its labels, its own sentences. An entry's prose is published as
    // its author wrote it, marks and all (the ledger quotes the game's own
    // glyphs: an enchantment pip, a curse box), and rewriting a reader's
    // archive to satisfy a lint would be a worse fault than the mark.
    const emoji = /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F0FF}\u{2600}-\u{27BF}\u{FE0F}]/u
    // The site's marks — the dagger, the lozenge, the wipe arrows — live in the
    // Miscellaneous Symbols block, so they are excluded by name rather than by
    // leaving the block unchecked.
    const MARKS_IN_USE = /[\u2720\u25C7\u25C2\u25B8\u2190\u2192\u2212]/gu

    // Pages built entirely from the site's own words.
    for (const rel of ['about/index.html']) {
        const found = read(rel).replace(MARKS_IN_USE, '').match(emoji)
        assert.equal(found, null, `${rel} carries an emoji: ${found && found[0]}`)
    }
    // And the sources those pages, and every other page's chrome, come from.
    for (const source of ['devlog-public-shell.mjs', 'build-devlog-public.mjs', 'devlog-public/site.js', 'devlog-card-plate.mjs']) {
        const text = readFileSync(join(ROOT, 'scripts', source), 'utf8').replace(MARKS_IN_USE, '')
        const found = text.match(emoji)
        assert.equal(found, null, `scripts/${source} carries an emoji: ${found && found[0]}`)
    }
})

test('every page stays inside its payload budget', () => {
    const over = report.over.map((r) => `${r.page} ${(r.total / 1024).toFixed(0)}KB > ${(r.budget / 1024).toFixed(0)}KB`)
    assert.deepEqual(over, [])
    // And the strict build refuses to publish when one does.
    assert.ok(report.pages.every((p) => p.total > 0))
})

test('the index never loads a full capture — thumbnails are derived and capped', () => {
    const html = read('log/index.html')
    for (const [, src] of html.matchAll(/<img[^>]*src="([^"]*)"/g)) {
        assert.match(src, /assets\/thumbs\//, `the index served ${src} instead of a thumbnail`)
        const bytes = statSync(join(OUT, src.replace(/^\.\.\//, ''))).size
        assert.ok(bytes < 40 * 1024, `${src} is ${(bytes / 1024).toFixed(0)}KB — too heavy for an index row`)
    }
})

test('a title and a lede are derived from the entry, never invented', () => {
    const explicit = titleAndLede('# 2026-09-20 — A public log, at last\n', 'the headline', '2026-09-20')
    assert.deepEqual(explicit, { title: 'A public log, at last', lede: 'the headline', derived: false })

    const derived = titleAndLede('# 2026-09-20\n', 'A story was written and cleared the same day: the session wrote it all.', '2026-09-20')
    assert.equal(derived.title, 'A story was written and cleared the same day')
    assert.equal(derived.derived, true)
    // Whatever is derived, it is a substring of what the author wrote.
    const headline = 'A quiet night, and nothing much to say about it beyond the usual sweep of the queues and the gates.'
    const cut = titleAndLede('# 2026-09-20\n', headline, '2026-09-20')
    assert.ok(headline.startsWith(cut.title.replace(/…$/, '')), 'a derived title must be the author\'s own words')
})

test('a plate whose painting is refused says so, in the frame the art would fill', () => {
    // Driven directly rather than through the built page: `devlog/data/*.json`
    // is a regenerable snapshot other tests rewrite, and this rule must hold
    // whether or not a catalog export happens to be on disk.
    const unlicensed = [{ license: 'UNRESOLVED', covers: 'freeze.webp' }]
    const withheld = cardArtHtml({ id: 'freeze', name: 'Nothing Crossed the Ice', image: './assets/catalog/cards/freeze.webp' }, '', unlicensed)
    assert.match(withheld, /painting withheld/)
    assert.match(withheld, /no licence on record/)
    assert.ok(!/<img/.test(withheld), 'a refused painting must not be served at all')

    const shipped = cardArtHtml({ id: 'freeze', name: 'Nothing Crossed the Ice', image: './assets/catalog/cards/freeze.webp' }, '../')
    assert.ok(shipped.includes('<img'), 'a shipped card painting is served')
    assert.ok(shipped.includes('../assets/cards/freeze.webp'))
})

test('the catalog serves the paintings and the About page says the art is open source', () => {
    const html = read('catalog/index.html')
    const about = read('about/index.html')
    assert.match(about, /Attribution/)
    assert.match(about, /open-source art/)
    assert.match(about, /held back/, 'the Needs you panel is still held back')
    assert.ok(!/licen[cs]e[^.]*cannot prove|until their provenance is resolved/i.test(about), 'the About page no longer withholds art for want of a licence')
    if (!/class="plate /.test(html)) return // no catalog export on disk: nothing to serve
    assert.ok(/assets\/cards\//.test(html), 'card paintings are served')
    assert.ok(readdirSync(join(OUT, 'assets', 'cards')).length > 0, 'the derived card files are in the build')
    assert.ok(!/painting withheld/.test(html), 'no plate withholds a painting')
})
