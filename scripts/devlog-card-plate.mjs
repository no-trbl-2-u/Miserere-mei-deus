#!/usr/bin/env node
// scripts/devlog-card-plate.mjs — draw one card or foe as a plate, in SVG.
//
// WHAT THIS IS, SAID PLAINLY
// --------------------------
// The publish prompt asks for a renderer that produces "a PNG of the card as a
// player sees it", and warns in the same breath: "A renderer that flatters the
// card is worse than no renderer." Those two pull against each other, and this
// file resolves them by being modest and saying so on the page.
//
// This renders THE CARD'S PRINTED TEXT, in the shipped face's LAYOUT, from the
// engine's own export:
//
//   name         <- the card record's name
//   free effect  <- face.freeGlyph / face.freeKw / face.freeVal
//   paid text    <- face.paid, the same string the app prints on the face
//   stance frame <- STANCE_COLORS, read from the combat presenter
//
// Every one of those fields comes from `axiomancer-mechanics`'s
// `catalog:export`, which builds them with the same view-model the game uses,
// so the words on this plate are the words on the card. What it does NOT
// reproduce is the app's typography, its art, or its chrome: an SVG in a
// browser is not React Native, and pretending otherwise is exactly the second,
// prettier truth the prompt warns about. The plate therefore carries no
// painting (the catalog page shows the paintings; this plate is the card's text
// only) and the site captions it as a plate of the card's text, not a screenshot.
//
// Why SVG and not a rasterised PNG: determinism. The nightly runs unattended
// with no browser and no model call; a headless rasteriser would add both. SVG
// is exact, diffable, ~2 KB, and scales to any box — and a before/after pair of
// SVGs is a genuine pair of images to a reader and to a screen reader alike.
//
// Zero dependencies. Pure: same record in, same bytes out.

import { readStanceColors } from './devlog-tokens.mjs'

/** Plate geometry, in SVG user units — the card's 3:4 shape (DESIGN.md §7). */
export const PLATE = { width: 300, height: 400 }

/** The fields this renderer reads. The test asserts the exporter still emits them. */
export const CARD_FIELDS = ['id', 'name', 'face', 'chips']
export const FACE_FIELDS = ['freeGlyph', 'freeKw', 'freeVal', 'paid']

const escapeXml = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')

/**
 * Wrap text to a pixel width, deterministically.
 *
 * SVG has no text layout, so the wrap is computed here against an average
 * glyph width for the size. It is approximate by design — the plate is read at
 * a glance and a line that breaks a word early costs nothing, while a
 * non-deterministic layout would make every night's plate differ from the last
 * for no reason.
 */
export function wrap(text, { width, fontSize, charRatio = 0.55 }) {
    const perLine = Math.max(8, Math.floor(width / (fontSize * charRatio)))
    const lines = []
    let line = ''
    for (const word of String(text || '').split(/\s+/).filter(Boolean)) {
        if (!line.length) line = word
        else if (line.length + 1 + word.length <= perLine) line += ` ${word}`
        else { lines.push(line); line = word }
    }
    if (line) lines.push(line)
    return lines
}

/** The stance a card record declares, as the exporter writes it into `chips`. */
export function stanceOf(card) {
    const chip = (card.chips || []).find((c) => c.k === 'Stance')
    return (chip && chip.v) || 'body'
}

/**
 * Render one card plate.
 *
 * @param {object} card    a record from devlog/data/cards.json
 * @param {object} [opts]
 * @param {Record<string,string>} [opts.stances] stance -> hex (defaults to the app's)
 * @param {string} [opts.note] a line under the plate, e.g. "as it stood on 11 aug"
 * @returns {string} a standalone SVG document
 */
export function cardPlate(card, { stances = readStanceColors(), note = '' } = {}) {
    const stance = stanceOf(card)
    const frame = stances[stance] || stances.body
    const face = card.face || {}

    const nameLines = wrap(card.name, { width: PLATE.width - 24, fontSize: 19, charRatio: 0.52 }).slice(0, 2)
    // The ledger sits under however many lines the name took, and the paid
    // text starts under the ledger: the plate has no dead band in it.
    const nameTop = nameLines.length > 1 ? 74 : 52
    const paidTop = nameTop + 64
    const paidLines = wrap(face.paid, { width: PLATE.width - 28, fontSize: 12.5 })
        .slice(0, Math.floor((PLATE.height - 44 - paidTop) / 18))

    const name = nameLines
        .map((line, i) => `<text x="14" y="${30 + i * 22}" class="name">${escapeXml(line)}</text>`)
        .join('')
    const paid = paidLines
        .map((line, i) => `<text x="14" y="${paidTop + i * 18}" class="paid">${escapeXml(line)}</text>`)
        .join('')
    const freeLabel = [face.freeGlyph, face.freeKw, face.freeVal].filter(Boolean).join(' ')

    // SVG has no text flow, so the printed text is laid out line by line. The
    // <title>/<desc> pair carries it back as ONE string: a screen reader, a
    // search index and this file's tests all read the card's full text there
    // rather than reassembling it from <text> elements.
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PLATE.width} ${PLATE.height}" width="${PLATE.width}" height="${PLATE.height}" role="img" aria-label="${escapeXml(card.name)}">
  <title>${escapeXml(card.name)}</title>
  <desc>${escapeXml([freeLabel, face.paid].filter(Boolean).join('. '))}</desc>
  <style>
    .plate { fill: #15110c; }
    .name { font-family: Georgia, 'Times New Roman', serif; font-size: 19px; fill: #ece0c8; }
    .free { font-family: ui-monospace, Menlo, monospace; font-size: 13px; fill: #dcb04a; }
    .paid { font-family: Georgia, 'Times New Roman', serif; font-size: 12.5px; fill: rgba(236,224,200,0.78); }
    .note { font-family: ui-monospace, Menlo, monospace; font-size: 10px; fill: #9c937f; }
    .rule { stroke: rgba(236,224,200,0.14); stroke-width: 1; }
  </style>
  <rect class="plate" x="0.5" y="0.5" width="${PLATE.width - 1}" height="${PLATE.height - 1}" fill="#15110c" stroke="${escapeXml(frame)}" stroke-width="2"/>
  ${name}
  <line class="rule" x1="14" y1="${nameTop}" x2="${PLATE.width - 14}" y2="${nameTop}"/>
  <text x="14" y="${nameTop + 26}" class="free">${escapeXml(freeLabel)}</text>
  <line class="rule" x1="14" y1="${nameTop + 42}" x2="${PLATE.width - 14}" y2="${nameTop + 42}"/>
  ${paid}
  <line class="rule" x1="14" y1="${PLATE.height - 34}" x2="${PLATE.width - 14}" y2="${PLATE.height - 34}"/>
  <text x="14" y="${PLATE.height - 16}" class="note">${escapeXml(note || `${stance} · ${card.id}`)}</text>
</svg>
`
}

/**
 * Render one foe plate — the same plumbing, not a fork of it.
 *
 * Publish prompt §3.3: "same mechanism as cards where the data shape allows.
 * Reuse, do not fork, the card renderer's plumbing." A foe record is mapped
 * onto the card record's shape and drawn by `cardPlate`, so a change to the
 * plate is a change to both.
 */
export function foePlate(foe, opts = {}) {
    const stats = foe.stats || {}
    const strongest = ['body', 'mind', 'heart']
        .sort((a, b) => (stats[b] || 0) - (stats[a] || 0))[0] || 'body'
    return cardPlate({
        id: foe.id,
        name: foe.name,
        chips: [{ k: 'Stance', v: strongest }],
        face: {
            freeGlyph: '',
            freeKw: `LEVEL ${foe.level ?? '?'}`,
            freeVal: `HP ${foe.maxHealth ?? '?'}`,
            paid: [
                foe.logicBlurb || '',
                `body ${stats.body ?? '?'} · mind ${stats.mind ?? '?'} · heart ${stats.heart ?? '?'}`,
            ].filter(Boolean).join(' '),
        },
    }, opts)
}
