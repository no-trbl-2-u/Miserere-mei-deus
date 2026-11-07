// The experience kit's disk-level rules (spec 152, A1), in `assets:check`.
//
//   node --test axiomancer-mobile/scripts/experience-kit.test.mjs
//
// Three things no unit test can see from inside the bundle:
//
// 1. CONVERTED AGAINST DELIVERED. Every webp under `brass/` or `vellum/` is a
//    conversion of a PNG one level up, and every piece the look table names is
//    on disk as a webp. The look table and the two `index.ts` files are parsed
//    as TEXT here on purpose: this is an .mjs file and cannot import TS.
// 2. THE TITLE SCREEN DRAWS NO KIT PIECE (T, 2026-11-05: "I don't want the
//    title screen's embark changed. It already looks great."), and no combat
//    card face wears one (T, 2026-11-05).
// 3. NOBODY IMPORTS THE PNG REGISTRY ROOT. `assets/images/experience/index.ts`
//    holds 86 `require()` literals; one import pulls every one of them into
//    the Metro bundle. The app reaches the converted pieces through
//    `assets/images/experience/kit` instead.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const KIT_DIR = path.join(MOBILE, 'assets/images/experience')
const LOOKS = path.join(MOBILE, 'components/experience/looks.ts')

const SETS = ['brass', 'vellum']

const webpsIn = (set) =>
    fs.readdirSync(path.join(KIT_DIR, set))
        .filter((f) => f.endsWith('.webp'))
        .map((f) => f.replace('.webp', ''))

/** Every converted piece on disk, in either set. */
const converted = () => new Set(SETS.flatMap(webpsIn))

/** The keys of a set's `index.ts`, read as text — this file cannot import TS. */
const registered = (set) => {
    const source = fs.readFileSync(path.join(KIT_DIR, set, 'index.ts'), 'utf8')
    return [...source.matchAll(/^\s*'([^']+)': \{ source: require\('\.\/([^']+)\.webp'\)/gm)]
        .map(([, key, file]) => ({ key, file }))
}

/** Every piece name `PLACE_PIECES` names in the look table, read as text. */
const namedByTable = () => {
    const source = fs.readFileSync(LOOKS, 'utf8')
    const start = source.indexOf('export const PLACE_PIECES')
    assert.ok(start > -1, 'looks.ts has no PLACE_PIECES: point this gate at its new home')
    const end = source.indexOf('\n};', start)
    assert.ok(end > start)
    return new Set([...source.slice(start, end).matchAll(/'([a-z0-9-]+)'/g)]
        .map(([, name]) => name)
        .filter((name) => !/^[A-Z]-\d\d$/.test(name)))
}

test('the sweep found both converted sets', () => {
    // Without this, every assertion below passes vacuously the day a set moves.
    for (const set of SETS) assert.ok(webpsIn(set).length > 0, `${set}/ holds no webp`)
})

test('every converted piece has its delivered PNG one level up', () => {
    const orphans = []
    for (const set of SETS) {
        for (const name of webpsIn(set)) {
            if (!fs.existsSync(path.join(KIT_DIR, `${name}.png`))) orphans.push(`${set}/${name}.webp`)
        }
    }
    assert.deepEqual(orphans, [], 'a converted piece with no delivered source has no provenance')
})

test("every piece the look table names is a webp on disk, registered in its set", () => {
    const onDisk = converted()
    const byKey = new Map(SETS.flatMap((set) => registered(set).map(({ key, file }) => [key, file])))
    const missing = []
    for (const name of namedByTable()) {
        if (!onDisk.has(name)) missing.push(`${name}: no webp on disk`)
        else if (!byKey.has(name)) missing.push(`${name}: not registered in brass/ or vellum/ index.ts`)
        else if (byKey.get(name) !== name) missing.push(`${name}: registered against ${byKey.get(name)}.webp`)
    }
    assert.deepEqual(missing, [], 'a place draws a piece the bundle does not hold')
})

test('every converted piece is named by the look table, so nothing dead is bundled', () => {
    const named = namedByTable()
    const dead = [...converted()].filter((name) => !named.has(name)).sort()
    assert.deepEqual(dead, [], 'a converted piece no place draws is dead bundle weight')
})

test('the title screen draws no kit piece (T, 2026-11-05)', () => {
    const title = fs.readFileSync(path.join(MOBILE, 'components/TitleScreen.tsx'), 'utf8')
    assert.ok(!/<Kit[A-Z]/.test(title), 'a kit primitive is drawn on the title screen')
    assert.ok(!/\bKit(Backdrop|Image|Header|Divider)\b/.test(title), 'the title screen reaches for a kit primitive')
    assert.ok(
        !/assets\/images\/experience/.test(title),
        "the title screen imports an experience asset; T's EMBARK is never re-skinned",
    )
})

test('the combat card face wears no kit piece (T, 2026-11-05)', () => {
    const board = fs.readFileSync(path.join(MOBILE, 'components/combat/encounter/CombatBoard.tsx'), 'utf8')
    const start = board.search(/(function|const) CombatCardFace\b/)
    assert.ok(start > -1, 'CombatCardFace moved: point this guard at its new home')
    const end = board.indexOf('\n});', start)
    assert.ok(end > start)
    assert.ok(!board.slice(start, end).includes('<Kit'), 'a kit piece is drawn on the card face')
})

test('nothing imports the PNG registry root, so the 86 PNGs stay unbundled', () => {
    const roots = [path.join(MOBILE, 'app'), path.join(MOBILE, 'components')]
    const offenders = []
    const walk = (dir) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, e.name)
            if (e.isDirectory()) { walk(full); continue }
            if (!/\.tsx?$/.test(e.name)) continue
            const source = fs.readFileSync(full, 'utf8')
            // `.../experience'` and `.../experience/index'` are the PNG map.
            // `.../experience/kit'`, `/brass'` and `/vellum'` are the converted sets.
            if (/['"][^'"]*assets\/images\/experience(\/index)?['"]/.test(source)) {
                offenders.push(path.relative(MOBILE, full).replace(/\\/g, '/'))
            }
        }
    }
    for (const root of roots) walk(root)
    assert.deepEqual(offenders, [], 'importing the PNG registry pulls all 86 delivered PNGs into the bundle')
})

test("the worn-gear panel and the item cards keep today's code (UK1e: B-03 and B-06 stay Normal)", () => {
    for (const f of ['EquipmentDock.tsx', 'ItemCard.tsx']) {
        const source = fs.readFileSync(path.join(MOBILE, 'components/inventory', f), 'utf8')
        assert.doesNotMatch(source, /experience\/(KitBackdrop|looks)/, `${f} must not draw a kit piece`)
    }
})
