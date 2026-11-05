// The Brass Gothic kit's disk-level rules, in `assets:check`.
//
//   node --test axiomancer-mobile/scripts/brass-kit.test.mjs

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const KIT = path.join(MOBILE, 'assets/images/experience')

test('every delivered non-vellum piece has its converted WebP', () => {
    const delivered = fs.readdirSync(KIT)
        .filter((f) => f.endsWith('.png'))
        .map((f) => f.replace('.png', ''))
        .filter((n) => !n.includes('vellum') && !n.includes('-ink'))
    const converted = fs.readdirSync(path.join(KIT, 'brass'))
        .filter((f) => f.endsWith('.webp'))
        .map((f) => f.replace('.webp', ''))
    assert.deepEqual(converted.sort(), delivered.sort())
})

test('the combat card face wears no kit piece (T, 2026-11-05)', () => {
    const board = fs.readFileSync(path.join(MOBILE, 'components/combat/encounter/CombatBoard.tsx'), 'utf8')
    const start = board.search(/(function|const) CombatCardFace\b/)
    assert.ok(start > -1, 'CombatCardFace moved: point this guard at its new home')
    const end = board.indexOf('\n});', start)
    assert.ok(end > start)
    assert.ok(!board.slice(start, end).includes('<Kit'), 'a kit piece is drawn on the card face')
})
