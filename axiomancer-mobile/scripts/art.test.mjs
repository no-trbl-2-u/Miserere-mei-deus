// axiomancer-mobile/scripts/art.test.mjs — the generation pipeline, proven
// without a key and without a network call (phase 73).
//
//   node --test axiomancer-mobile/scripts/art.test.mjs
//
// The hosted backend is UNEXERCISED by design (no key in this checkout, and
// spending against a paid API is not the loop's call). Everything else — the
// compiler, the backend selection rule, the post-process, the provenance
// record — runs here against an injected fake, so the only untested surface is
// the thirty lines that actually speak HTTP.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

import { BACKEND_NAMES, generate, generationProvenance, selectBackendName, selectionReason } from './art/adapter.mjs'
import { compile, validateSpec } from './art/prompt.mjs'
import { PALETTE, PREAMBLE, STYLE_VERSION, CATEGORIES } from './art/style.mjs'
import { paletteDistance, summarize } from './art/qa.mjs'
import { postProcess } from './generate-art.mjs'
import { licenceProblem, provenanceEntry } from './ingest-art.mjs'
import { ACCEPTED_LICENCES, buildPlatePage, buildSilhouette, detectPlateBox, loadSources, verifyLicence } from './acquire-art.mjs'

const spec = {
  slug: 'tallow-bailiff',
  category: 'enemies',
  subject: 'A parish bailiff rendered down to tallow and duty',
  detail: 'a ledger chained at the wrist',
}

// ── the prompt compiler ──────────────────────────────────────────────────────

test('a valid spec compiles to style + composition + subject + negatives', () => {
  const req = compile(spec)
  assert.ok(req.prompt.startsWith(PREAMBLE))
  assert.match(req.prompt, /three-quarter-view figure/)
  assert.match(req.prompt, /Subject: A parish bailiff/)
  assert.match(req.prompt, /Detail: a ledger chained/)
  assert.match(req.prompt, /Avoid: .*no watermark/)
  assert.equal(req.styleVersion, STYLE_VERSION)
  assert.equal(req.slug, 'tallow-bailiff')
})

test('compilation is deterministic — the record would otherwise be a lie', () => {
  assert.equal(compile(spec).prompt, compile(spec).prompt)
  assert.equal(compile(spec).promptHash, compile(spec).promptHash)
})

test('a changed spec changes the hash', () => {
  assert.notEqual(compile(spec).promptHash, compile({ ...spec, detail: 'no ledger' }).promptHash)
})

test('subject-specific negatives are appended to the standing ones', () => {
  const req = compile({ ...spec, avoid: ['no candles'] })
  assert.match(req.prompt, /no lens flare, no candles\.$/)
})

test('an invalid spec fails at compile time, before any spend', () => {
  assert.deepEqual(validateSpec({ ...spec, slug: 'Tallow Bailiff' }).length, 1)
  assert.throws(() => compile({ ...spec, category: 'nonesuch' }), /has no composition rule/)
  assert.throws(() => compile({ ...spec, subject: 'short' }), /subject must say/)
})

test('every category with a composition rule is one the ingest leg can target', () => {
  // A prompt for a category with nowhere to put the result is a wasted call.
  for (const c of CATEGORIES) assert.match(c, /^[a-z]+$/)
  assert.ok(CATEGORIES.includes('enemies') && CATEGORIES.includes('cards'))
})

// ── backend selection ────────────────────────────────────────────────────────

test('no key means the inert backend, whatever ART_BACKEND asks for', () => {
  // A run that thinks it is generating and silently is not would write a
  // provenance record for an image that does not exist.
  assert.equal(selectBackendName({}), 'null')
  assert.equal(selectBackendName({ ART_BACKEND: 'openai' }), 'null')
  assert.match(selectionReason({}), /inert/)
})

test('a key selects the requested backend', () => {
  assert.equal(selectBackendName({ OPENAI_API_KEY: 'sk-test', ART_BACKEND: 'openai' }), 'openai')
})

test('ART_BACKEND=null is honoured even with a key present', () => {
  assert.equal(selectBackendName({ OPENAI_API_KEY: 'sk-test', ART_BACKEND: 'null' }), 'null')
})

test('an unknown backend fails loudly rather than falling back', () => {
  assert.throws(() => selectBackendName({ ART_BACKEND: 'midjourney' }), /unknown ART_BACKEND/)
  // Midjourney has no public API and automation violates its ToS — the ruling
  // names it as never-in-pipeline. A silent fallback would hide the mistake.
  assert.ok(!BACKEND_NAMES.includes('midjourney'))
})

test('the inert backend reports what it would have sent and writes nothing', async () => {
  const result = await generate(compile(spec), { env: {} })
  assert.equal(result.inert, true)
  assert.equal(result.image, null)
  assert.equal(result.extra.would_have_sent.slug, 'tallow-bailiff')
  assert.equal(result.extra.would_have_sent.style_version, STYLE_VERSION)
})

// ── the generate -> post-process -> provenance path, on a fake backend ───────

const fakeBackend = (image) => ({
  name: 'fake',
  async generate() { return { model: 'fake-model-v1', image } },
})

test('a generated buffer goes through the SAME post-process as an acquisition', async () => {
  const { default: sharp } = await import('sharp')
  // A deliberately oversized source: the recipe must bring it under the cap.
  const source = await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 12, g: 10, b: 9, alpha: 1 } },
  }).png().toBuffer()

  const out = await postProcess(sharp, source)
  const meta = await sharp(out).metadata()
  assert.equal(meta.format, 'webp')
  assert.ok(Math.max(meta.width, meta.height) <= 640, `still ${meta.width}x${meta.height}`)
})

test('the provenance record carries backend, model, prompt, style version and date', async () => {
  const request = compile(spec)
  const result = await generate(request, { backend: fakeBackend(Buffer.from('x')) })
  const entry = generationProvenance({
    request, result, date: '2026-08-27', covers: ['tallow-bailiff.webp'],
  })
  assert.equal(entry.generated_by, 'ai-generation')
  assert.equal(entry.backend, 'fake')
  assert.equal(entry.model, 'fake-model-v1')
  assert.equal(entry.prompt, request.prompt)
  assert.equal(entry.prompt_hash, request.promptHash)
  assert.equal(entry.style_version, STYLE_VERSION)
  assert.equal(entry.date, '2026-08-27')
  assert.deepEqual(entry.covers, ['tallow-bailiff.webp'])
  // Raw model output is not copyrightable; the record IS the disclosure.
  assert.match(entry.license, /not copyrightable/)
})

test('an injected backend bypasses selection entirely — the test seam', async () => {
  const result = await generate(compile(spec), { backend: fakeBackend(Buffer.from('y')), env: {} })
  assert.equal(result.backend, 'fake')
  assert.equal(result.inert, false)
})

// ── the ingest refuses an unlicensed file (phase HD1b, D115) ─────────────────

test('ingest-art refuses to run without --license, and names the flag', () => {
  assert.match(licenceProblem({}), /--license <text> is required/)
  assert.match(licenceProblem({ license: '   ' }), /is required/)
})

test('ingest-art rejects a --license of UNRESOLVED with a line citing D115', () => {
  assert.match(licenceProblem({ license: 'UNRESOLVED' }), /D115/)
  assert.match(licenceProblem({ license: 'unresolved' }), /D115/)
})

test('ingest-art accepts a named licence and records it without a note', () => {
  assert.equal(licenceProblem({ license: 'CC0 1.0' }), null)
  const entry = provenanceEntry({ license: 'CC0 1.0', quality: 44, maxEdge: 640, grade: true }, ['a.webp'])
  assert.equal(entry.license, 'CC0 1.0')
  assert.equal('license_note' in entry, false)
})

// ── the QA drift metrics ─────────────────────────────────────────────────────

for (const script of ['./ingest-art.mjs', './generate-art.mjs', './art/qa.mjs']) {
  test(`${script} runs when it is the entry point, on Windows paths too`, () => {
    // `import.meta.url === `file://${process.argv[1]}`` never matches when
    // argv[1] is `C:\\...`, so the script exited 0 having done nothing: the
    // ingest wrote no cells, and the generate CLI printed nothing, which
    // failed art-sheet.test.mjs on every Windows checkout. The whole failure
    // is one string comparison, so one string is what is pinned.
    const source = fs.readFileSync(new URL(script, import.meta.url), 'utf-8')
    assert.match(source, /import\.meta\.url === pathToFileURL\(process\.argv\[1\]\)\.href/)
    assert.doesNotMatch(source, /import\.meta\.url === `file:\/\//)
  })
}

test('palette distance is zero on a token and rises off it', () => {
  const [r, g, b] = [0x0b, 0x0a, 0x09] // PALETTE.bg
  assert.equal(paletteDistance(r, g, b), 0)
  assert.ok(paletteDistance(0, 255, 0) > 100, 'pure green should be far from the palette')
  assert.ok(Object.keys(PALETTE).length >= 6)
})

test('the summary rolls per-asset rows up per category', () => {
  const rows = [
    { category: 'enemies', meanLuminance: 40, paletteDistance: 20, overSized: false, hasAlpha: true, alphaCoverage: 0.5, bytes: 1024 },
    { category: 'enemies', meanLuminance: 60, paletteDistance: 30, overSized: true, hasAlpha: true, alphaCoverage: 0.6, bytes: 3072 },
    { category: 'cards', meanLuminance: 30, paletteDistance: 24, overSized: false, hasAlpha: false, alphaCoverage: 1, bytes: 2048 },
  ]
  const summary = summarize(rows)
  assert.deepEqual(summary.map((s) => s.category), ['cards', 'enemies'])
  const enemies = summary.find((s) => s.category === 'enemies')
  assert.equal(enemies.assets, 2)
  assert.equal(enemies.meanLuminance, 50)
  assert.equal(enemies.overSized, 1)
  assert.equal(enemies.alphaCutouts, 2)
})

// ── the acquisition licence gate (phase V4) ──────────────────────────────────
//
// Tested against CAPTURED metadata shapes, never the network: this must pass in
// CI, which has no reason to call Commons, and a gate that only works online is
// a gate that silently stops working.

const em = (fields) => Object.fromEntries(
  Object.entries(fields).map(([k, v]) => [k, { value: v }]),
)

test('a public-domain blob is accepted, with artist carried through', () => {
  // The exact shape returned for the shipped Doré plate.
  const verdict = verifyLicence(em({
    LicenseShortName: 'Public domain', License: 'pd',
    UsageTerms: 'Public domain', Artist: '<a href="/wiki/x">Gustave Doré</a>',
  }))
  assert.equal(verdict.ok, true)
  assert.equal(verdict.licence, 'Public domain')
  // HTML is stripped — Commons returns the artist as markup.
  assert.equal(verdict.artist, 'Gustave Doré')
})

test('CC0 is accepted', () => {
  assert.equal(verifyLicence(em({ LicenseShortName: 'CC0', License: 'cc0' })).ok, true)
})

test('an attribution licence is REFUSED, and the refusal names it', () => {
  // CC BY-SA is usable in principle, but carries obligations this build has no
  // attribution surface for. "We could comply" is not "we do".
  const verdict = verifyLicence(em({
    LicenseShortName: 'CC BY-SA 4.0', License: 'cc-by-sa-4.0',
    UsageTerms: 'Creative Commons Attribution-Share Alike 4.0',
  }))
  assert.equal(verdict.ok, false)
  assert.match(verdict.why, /CC BY-SA 4\.0/)
  assert.match(verdict.why, /attribution surface/)
})

test('a blob with no licence at all is REFUSED', () => {
  const verdict = verifyLicence(em({ Artist: 'Anon' }))
  assert.equal(verdict.ok, false)
  assert.match(verdict.why, /no licence at all/)
})

test('an empty or missing extmetadata is REFUSED, not defaulted', () => {
  assert.equal(verifyLicence(undefined).ok, false)
  assert.equal(verifyLicence({}).ok, false)
})

test('the accepted list stays short and explicit', () => {
  // If this grows, someone widened what the pipeline will ingest. That should
  // be a deliberate diff, not a drift.
  assert.equal(ACCEPTED_LICENCES.length, 4)
})

// ── the silhouette recipe (phase V7 — ink-splatter alpha mattes) ────────────

test('buildSilhouette turns a dark mark on a light field into an alpha matte', async () => {
  const { default: sharp } = await import('sharp')
  // A radial luminance gradient — dark centre fading smoothly to a light
  // field — stands in for a scanned ink wash. A hard-edged synthetic shape
  // trims to a uniformly-opaque rect and sharp's WebP encoder then drops the
  // (constant) alpha channel entirely, which a real acquisition's
  // continuously-graded edges never trigger.
  const size = 100
  const gray = Buffer.alloc(size * size * 3)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - size / 2, y - size / 2) / (size / 2)
      const lum = Math.round(20 + Math.min(1, d) * 216) // 20 (centre) -> 236 (field)
      const i = (y * size + x) * 3
      gray[i] = gray[i + 1] = gray[i + 2] = lum
    }
  }
  const source = await sharp(gray, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer()

  const webp = await buildSilhouette(sharp, source, 200)
  const meta = await sharp(webp).metadata()
  assert.equal(meta.hasAlpha, true, 'the matte must carry an alpha channel')

  const { data } = await sharp(webp).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const alphas = []
  for (let i = 3; i < data.length; i += 4) alphas.push(data[i])
  const max = Math.max(...alphas)
  const min = Math.min(...alphas)
  assert.ok(max > 200, `the mark's centre should read near-opaque, max was ${max}`)
  assert.ok(min < 60, `the field's edge should read near-transparent, min was ${min}`)
})

test('every manifest entry is a proposal with a reason, not a licence claim', () => {
  const sources = loadSources()
  assert.ok(sources.acquisitions.length > 0)
  for (const a of sources.acquisitions) {
    assert.match(a.title, /^File:/, `${a.key} is not a Commons file title`)
    assert.ok(a.category && a.why && a.why.length > 30, `${a.key} has no recorded reason`)
    // The manifest must never assert terms — the API decides.
    assert.equal(a.license, undefined, `${a.key} asserts a licence; only the source may`)
    assert.equal(a.licence, undefined, `${a.key} asserts a licence; only the source may`)
  }
})

// ── the plate-page detector (phase 103 — the plate on a scanned page) ────────

/**
 * A synthetic scanned page: cream paper (luminance 235) with blocks painted
 * on it. Each rect is `[left, top, width, height, luminance]`, luminance
 * defaulting to ink (40). Encoded to PNG so the detector decodes a real image
 * rather than reading a raw buffer this test handed it.
 */
async function platePage(sharp, W, H, rects) {
  const gray = Buffer.alloc(W * H * 3, 235)
  for (const [left, top, w, h, lum = 40] of rects) {
    for (let y = top; y < top + h; y++) {
      for (let x = left; x < left + w; x++) {
        const i = (y * W + x) * 3
        gray[i] = gray[i + 1] = gray[i + 2] = lum
      }
    }
  }
  return sharp(gray, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer()
}

test('a blank page is refused, not cropped to itself', async () => {
  const { default: sharp } = await import('sharp')
  // Nothing on this page is darker than the page's own mean, so no column and
  // no row reaches the coverage floor. The detector must say so. It used to
  // return [0,1] on both axes — the whole page, at frac 0.96 — which sails
  // past the `frac < 0.2` guard and ships the scan's margins, book edge and
  // caption band as if they were the plate.
  const page = await platePage(sharp, 1000, 1200, [])
  await assert.rejects(
    () => buildPlatePage(sharp, page, 512),
    /no plate detected/,
    'a page with no dark block must raise, not hand back the page as its own plate',
  )
})

test('a plate too small to reach the coverage floor is refused, not widened to the page', async () => {
  const { default: sharp } = await import('sharp')
  // 120x120 of ink: a column inside it is dark for 120px and needs 180
  // (0.15 x 1200); a row is dark for 120px and needs 150 (0.15 x 1000). It
  // qualifies on neither axis, so there is no block — and the answer must be
  // the same throw as the blank page, not the identical full-page fabrication.
  const page = await platePage(sharp, 1000, 1200, [[440, 540, 120, 120]])
  await assert.rejects(
    () => buildPlatePage(sharp, page, 512),
    /no plate detected/,
    'a plate below the coverage floor must raise, not widen to the page',
  )
})

test('a plate with page margins is found where it is', async () => {
  const { default: sharp } = await import('sharp')
  const page = await platePage(sharp, 1000, 1200, [[215, 270, 570, 660]])
  const box = await detectPlateBox(sharp, page)
  assert.ok(Math.abs(box.x0 - 0.215) < 0.01, `x0 was ${box.x0}`)
  assert.ok(Math.abs(box.x1 - 0.785) < 0.01, `x1 was ${box.x1}`)
  assert.ok(Math.abs(box.y0 - 0.225) < 0.01, `y0 was ${box.y0}`)
  assert.ok(Math.abs(box.y1 - 0.775) < 0.01, `y1 was ${box.y1}`)
  const built = await buildPlatePage(sharp, page, 512)
  assert.ok(built.frac > 0.2, `a real plate must clear the floor, frac was ${built.frac}`)
})

test('darkRatio lets a plate keep a sky lighter than the default cut-off', async () => {
  const { default: sharp } = await import('sharp')
  // Doré's Purgatorio I on its 1871 page (the title plate): the upper half of
  // the plate is open dawn sky, lighter than 0.82 of the page mean, so the
  // default detector cropped the plate at the horizon and dropped the sky.
  // Here the sky (150) sits over ink (40): the page mean is ~179, so 0.82
  // reads only the ink and 0.95 reads the whole plate.
  const page = await platePage(sharp, 1000, 1200, [[200, 200, 600, 400, 150], [200, 600, 600, 400]])
  const dflt = await detectPlateBox(sharp, page)
  assert.ok(Math.abs(dflt.y0 - 0.5) < 0.01, `default y0 was ${dflt.y0}`)
  const lifted = await detectPlateBox(sharp, page, { darkRatio: 0.95 })
  assert.ok(Math.abs(lifted.y0 - 200 / 1200) < 0.01, `darkRatio 0.95 y0 was ${lifted.y0}`)
  assert.ok(Math.abs(lifted.y1 - 1000 / 1200) < 0.01, `darkRatio 0.95 y1 was ${lifted.y1}`)
  const built = await buildPlatePage(sharp, page, 512, 0.01, 0.95)
  assert.equal(built.crop.darkRatio, 0.95, 'the ratio used is recorded with the crop')
})

test('a tight scan that fills its page is still accepted', async () => {
  const { default: sharp } = await import('sharp')
  // Phase 103 decision 4 put NO upper guard on the detected box on purpose: a
  // box covering nearly the whole image is the right answer for an
  // already-tight plate scan. This pins that, and it must keep holding after
  // the not-found throw exists.
  //
  // The plate carries a lit band (luminance 205, a sky) across its top third.
  // That is not decoration: a plate of UNIFORM ink drags the image's own mean
  // down onto the ink, and past ~95% coverage nothing reads as darker than
  // 0.82 x mean at all. A uniform control would then be pinning the
  // threshold's calibration rather than the pipeline's behaviour, and would
  // invert on a one-pixel change of margin. With the band, ink sits ~47
  // luminance units clear of the threshold instead of ~5.
  //
  // Only x is pinned. The lit band legitimately lifts y0 off the plate's top
  // edge — that is phase 103 decision 3's measured sky-band behaviour (a sky
  // is part of the plate but is not dark), not a defect.
  const page = await platePage(sharp, 1000, 1200, [
    [20, 24, 960, 1152],
    [20, 24, 960, 384, 205],
  ])
  const box = await detectPlateBox(sharp, page)
  assert.ok(Math.abs(box.x0 - 0.020) < 0.01, `x0 was ${box.x0}`)
  assert.ok(Math.abs(box.x1 - 0.980) < 0.01, `x1 was ${box.x1}`)
  const built = await buildPlatePage(sharp, page, 512)
  assert.ok(built.crop.width > 0 && built.crop.height > 0)
})
