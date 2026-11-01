#!/usr/bin/env node
// Slice T's item sheets into per-item icons (spec 136, EQ3k; "The icons").
//
//   node scripts/slice-item-sheet.mjs --sheet A=<sheet-a.png> --sheet D=<sheet-d.png> [--out <dir>]
//       the 23 icons of the table below, named by item id (default dir: OUT_DIR)
//   node scripts/slice-item-sheet.mjs <sheet.png> <out dir>
//       every cell of one sheet, as <row>-<col>.png
//
// T's masters (sheet-a-cool-silver.png, sheet-d-ivory-lavender.png) live in the
// art department's masters/items folder, outside the app tree, so the sheets are
// arguments here, never paths this script resolves.
//
// A sheet is a 6x6 grid, but the pictures are not tidy: a fixed crop of a cell
// shows slivers of its neighbours (the vial beside the heart flask, a belt's
// ribbon). So the cut is by blob. Every 8-connected run of pixels with alpha
// ALPHA or more belongs to the cell holding its centroid; a cell is cropped to
// the union box of its own blobs, only those blobs are copied onto a
// transparent square (PAD px around, centred), and the square is resized to
// SIZE px. A sliver crossing a grid line goes home; an icon that overflows its
// cell stays whole.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const require = createRequire(import.meta.url);

export const GRID = 6;
export const ALPHA = 24;
export const PAD = 6;
export const SIZE = 256;

/** The sheet names `ITEM_CELLS` draws from; the CLI takes a file for each (T's masters sit outside the app tree). */
export const SHEET_NAMES = ['A', 'D'];

/** Item id to [sheet, row, col]: the table in spec 136 "The icons". */
export const ITEM_CELLS = {
    'weapon-opening-blade': ['A', 2, 5],
    'armor-bracing-coat': ['A', 4, 4],
    'weapon-siphoning-blade': ['A', 2, 4],
    'armor-bloodward-mail': ['A', 4, 5],
    'weapon-stormcaller-staff': ['A', 3, 1],
    'armor-flame-guard': ['A', 4, 1],
    'weapon-bulwark-mace': ['D', 3, 0],
    'armor-scavengers-coat': ['A', 4, 0],
    'weapon-humbling-rod': ['D', 3, 1],
    'armor-mending-vestments': ['A', 5, 3],
    'relic-disarming-plea': ['A', 0, 0],
    'relic-crimson-circlet': ['A', 0, 1],
    'relic-ruby-signet': ['A', 0, 2],
    'relic-bleeding-signet': ['A', 0, 3],
    'relic-elementalist-signet': ['A', 0, 4],
    'relic-elementalist-brooch': ['A', 0, 5],
    'relic-elementalist-belt': ['A', 1, 0],
    'relic-thornback-signet': ['A', 1, 1],
    'relic-mirror-brooch': ['A', 1, 2],
    'relic-carapace-belt': ['A', 1, 3],
    'minor-healing-potion': ['A', 1, 4],
    'healing-potion': ['A', 1, 5],
    'greater-healing-potion': ['A', 2, 0],
};

export const OUT_DIR = 'axiomancer-mobile/assets/images/items';

function loadSharp() {
    // Hoisted at the repo root in a checkout; the mobile workspace otherwise.
    for (const base of [ROOT, path.join(ROOT, 'axiomancer-mobile')]) {
        try {
            return createRequire(path.join(base, 'package.json'))('sharp');
        } catch {
            /* try the next */
        }
    }
    return require('sharp');
}

/**
 * Cut raw RGBA pixels into per-cell icons by blob.
 * Returns Map<cellIndex, {side, rgba}> where rgba is a square `side` x `side` canvas.
 */
export function blobCells({ data, width, height }, { n = GRID, alpha = ALPHA, pad = PAD } = {}) {
    const W = width;
    const H = height;
    const cellSize = W / n;
    const label = new Int32Array(W * H).fill(-1);
    const boxes = new Array(n * n).fill(null);
    const stack = new Int32Array(W * H);
    for (let p = 0; p < W * H; p++) {
        if (label[p] !== -1 || data[p * 4 + 3] < alpha) continue;
        let sp = 0;
        let sx = 0;
        let sy = 0;
        let count = 0;
        let x0 = W;
        let y0 = H;
        let x1 = 0;
        let y1 = 0;
        const pix = [];
        stack[sp++] = p;
        label[p] = 0;
        while (sp) {
            const q = stack[--sp];
            const x = q % W;
            const y = (q / W) | 0;
            pix.push(q);
            sx += x;
            sy += y;
            count++;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
                    const r = ny * W + nx;
                    if (label[r] === -1 && data[r * 4 + 3] >= alpha) {
                        label[r] = 0;
                        stack[sp++] = r;
                    }
                }
            }
        }
        const cell =
            Math.min(n - 1, (sy / count / cellSize) | 0) * n + Math.min(n - 1, (sx / count / cellSize) | 0);
        for (const q of pix) label[q] = cell + 1;
        const b = boxes[cell];
        boxes[cell] = b
            ? [Math.min(b[0], x0), Math.min(b[1], y0), Math.max(b[2], x1), Math.max(b[3], y1)]
            : [x0, y0, x1, y1];
    }
    const out = new Map();
    for (let cell = 0; cell < n * n; cell++) {
        const b = boxes[cell];
        if (!b) continue;
        const bw = b[2] - b[0] + 1;
        const bh = b[3] - b[1] + 1;
        const side = Math.max(bw, bh) + 2 * pad;
        const rgba = Buffer.alloc(side * side * 4);
        const ox = (((side - bw) / 2) | 0) - b[0];
        const oy = (((side - bh) / 2) | 0) - b[1];
        for (let y = b[1]; y <= b[3]; y++) {
            for (let x = b[0]; x <= b[2]; x++) {
                const p = y * W + x;
                if (label[p] !== cell + 1) continue;
                Buffer.from(data.buffer, data.byteOffset + p * 4, 4).copy(rgba, ((y + oy) * side + (x + ox)) * 4);
            }
        }
        out.set(cell, { side, rgba });
    }
    return out;
}

/** Read an image file or buffer to raw RGBA. */
export async function readRaw(sharp, input) {
    const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
}

/** One cell's icon as a SIZE px PNG buffer. */
export async function cellPng(sharp, { side, rgba }, size = SIZE) {
    return sharp(rgba, { raw: { width: side, height: side, channels: 4 } })
        .resize(size, size)
        .png({ compressionLevel: 9, effort: 10, palette: true, quality: 90 })
        .toBuffer();
}

/** Write every cell of one sheet as <row>-<col>.png. */
export async function sliceSheet(sharp, sheetPath, outDir, opts) {
    const cells = blobCells(await readRaw(sharp, sheetPath), opts);
    fs.mkdirSync(outDir, { recursive: true });
    for (const [cell, icon] of cells) {
        const name = `${(cell / GRID) | 0}-${cell % GRID}.png`;
        fs.writeFileSync(path.join(outDir, name), await cellPng(sharp, icon, opts?.size));
    }
    return cells.size;
}

/** Write the item table's icons, named by item id, with the provenance file. */
export async function sliceItems(sharp, { sheets, outDir = path.join(ROOT, OUT_DIR) }) {
    const cache = new Map();
    fs.mkdirSync(outDir, { recursive: true });
    for (const [id, [sheet, row, col]] of Object.entries(ITEM_CELLS)) {
        if (!sheets?.[sheet]) throw new Error(`${id}: no file given for sheet ${sheet}`);
        if (!cache.has(sheet)) cache.set(sheet, blobCells(await readRaw(sharp, sheets[sheet])));
        const icon = cache.get(sheet).get(row * GRID + col);
        if (!icon) throw new Error(`${id}: sheet ${sheet} cell ${row},${col} is empty`);
        fs.writeFileSync(path.join(outDir, `${id}.png`), await cellPng(sharp, icon));
    }
    const provenance = [
        {
            generated_by: 'scripts/slice-item-sheet.mjs',
            date: '2026-11-01',
            tool: 'sharp, blob slicing of owner-supplied item sheets (spec 136, EQ3k)',
            covers: Object.keys(ITEM_CELLS).map((id) => `${id}.png`),
            source: "T's item sheets: sheet-a-cool-silver.png (every icon but two) and sheet-d-ivory-lavender.png (the hammer and the scepter). Each icon is one 6x6 cell found by blob, centred on a transparent square with 6 px padding, resized to 256 px.",
            license: 'open source (T, 2026-10-29, D115)',
            used_by: ['components/icons/item-sprites.ts (registry: ITEM_SPRITES)'],
            post_process: 'node scripts/slice-item-sheet.mjs --sheet A=<sheet-a> --sheet D=<sheet-d>',
        },
    ];
    fs.writeFileSync(path.join(outDir, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
    return Object.keys(ITEM_CELLS).length;
}

async function main(argv) {
    const sharp = loadSharp();
    const sheets = {};
    let outDir;
    const rest = [];
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--sheet') {
            const [name, file] = (argv[++i] ?? '').split('=');
            if (!SHEET_NAMES.includes(name) || !file) throw new Error('--sheet takes A=<png> or D=<png>');
            sheets[name] = file;
        } else if (argv[i] === '--out') outDir = argv[++i];
        else rest.push(argv[i]);
    }
    if (Object.keys(sheets).length > 0) {
        const n = await sliceItems(sharp, { sheets, ...(outDir ? { outDir } : {}) });
        console.log(`sliced ${n} icons into ${outDir ?? OUT_DIR}`);
        return;
    }
    const [sheet, out] = rest;
    if (!out) throw new Error('usage: slice-item-sheet.mjs --sheet A=<png> --sheet D=<png> [--out <dir>] | <sheet.png> <out dir>');
    console.log(`sliced ${await sliceSheet(sharp, sheet, out)} cells into ${out}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main(process.argv.slice(2)).catch((e) => {
        console.error(e.message);
        process.exit(1);
    });
}
