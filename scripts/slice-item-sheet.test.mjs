// Tests for scripts/slice-item-sheet.mjs (spec 136, EQ3k, A19).
//   node --test scripts/slice-item-sheet.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { ITEM_CELLS, SHEETS, blobCells, readRaw, sliceItems, sliceSheet } from './slice-item-sheet.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sharp = createRequire(path.join(ROOT, 'package.json'))('sharp');

// A 60x60 sheet is a 6x6 grid of 10 px cells. Cell (0,0) holds a red icon whose
// right edge crosses the grid line at x=10 (its centroid is in col 0); cell
// (0,1) holds a separate blue icon; cell (1,0) holds a green one.
function syntheticSheet() {
    const W = 60;
    const data = Buffer.alloc(W * W * 4);
    const paint = (x0, y0, x1, y1, [r, g, b]) => {
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) data.set([r, g, b, 255], (y * W + x) * 4);
        }
    };
    paint(2, 2, 11, 7, [255, 0, 0]); // crosses x=10: 10 px of red in col 0, 2 px in col 1
    paint(14, 2, 17, 7, [0, 0, 255]);
    paint(2, 12, 6, 17, [0, 255, 0]);
    return { data, width: W, height: W };
}

function pixels({ side, rgba }) {
    const out = [];
    for (let i = 0; i < side * side; i++) {
        if (rgba[i * 4 + 3] > 0) out.push([rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]]);
    }
    return out;
}

test('a blob crossing a grid line goes to the cell holding its centroid, whole', () => {
    const cells = blobCells(syntheticSheet());
    assert.deepEqual([...cells.keys()].sort((a, b) => a - b), [0, 1, 6]);
    const red = pixels(cells.get(0));
    assert.equal(red.length, 10 * 6, 'the whole red blob, sliver included');
    assert.ok(red.every(([r, g, b]) => r === 255 && g === 0 && b === 0));
});

test('the neighbour cell carries no sliver of the blob that crossed in', () => {
    const blue = pixels(blobCells(syntheticSheet()).get(1));
    assert.equal(blue.length, 4 * 6);
    assert.ok(blue.every(([r, g, b]) => r === 0 && g === 0 && b === 255), 'no red in the blue cell');
});

test('each icon is a centred square with padding', () => {
    const { side, rgba } = blobCells(syntheticSheet()).get(6); // green, 5x6 px
    assert.equal(side, 6 + 2 * 6);
    assert.equal(rgba.length, side * side * 4);
    // Transparent on every edge: the padding is empty.
    for (let i = 0; i < side; i++) {
        assert.equal(rgba[(0 * side + i) * 4 + 3], 0);
        assert.equal(rgba[((side - 1) * side + i) * 4 + 3], 0);
        assert.equal(rgba[(i * side + 0) * 4 + 3], 0);
        assert.equal(rgba[(i * side + side - 1) * 4 + 3], 0);
    }
});

test('a faint haze under the alpha threshold is not a blob', () => {
    const sheet = syntheticSheet();
    sheet.data.set([10, 10, 10, 5], (40 * 60 + 40) * 4);
    assert.equal(blobCells(sheet).size, 3);
});

test('sliceSheet writes 256 px PNGs named row-col', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slice-sheet-'));
    try {
        const src = path.join(dir, 'sheet.png');
        const { data, width, height } = syntheticSheet();
        await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(src);
        const out = path.join(dir, 'out');
        assert.equal(await sliceSheet(sharp, src, out), 3);
        assert.deepEqual(fs.readdirSync(out).sort(), ['0-0.png', '0-1.png', '1-0.png']);
        const meta = await sharp(path.join(out, '0-0.png')).metadata();
        assert.equal(meta.width, 256);
        assert.equal(meta.height, 256);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('the item table names 23 distinct ids, each on a known sheet and a real cell', () => {
    const ids = Object.keys(ITEM_CELLS);
    assert.equal(ids.length, 23);
    const spots = new Set();
    for (const [id, [sheet, row, col]] of Object.entries(ITEM_CELLS)) {
        assert.ok(SHEETS[sheet], `${id}: unknown sheet ${sheet}`);
        assert.ok(row >= 0 && row < 6 && col >= 0 && col < 6, `${id}: cell off the grid`);
        spots.add(`${sheet}${row}${col}`);
    }
    assert.equal(spots.size, 23, 'two items share one cell');
});

test("T's sheets slice into all 23 icons, each non-empty, with a provenance file", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slice-items-'));
    try {
        assert.equal(await sliceItems(sharp, { outDir: dir }), 23);
        for (const id of Object.keys(ITEM_CELLS)) {
            const { data, width } = await readRaw(sharp, path.join(dir, `${id}.png`));
            assert.equal(width, 256, id);
            let opaque = 0;
            for (let i = 3; i < data.length; i += 4) if (data[i] >= 24) opaque++;
            assert.ok(opaque > 2000, `${id}: nearly empty`);
        }
        const prov = JSON.parse(fs.readFileSync(path.join(dir, 'provenance.json'), 'utf8'));
        assert.equal(prov[0].covers.length, 23);
        assert.match(prov[0].license, /D115/);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('the committed icons are what the script writes', async () => {
    const committed = path.join(ROOT, 'axiomancer-mobile', 'assets', 'images', 'items');
    for (const id of Object.keys(ITEM_CELLS)) {
        assert.ok(fs.existsSync(path.join(committed, `${id}.png`)), `${id}.png missing: run node scripts/slice-item-sheet.mjs`);
    }
    const prov = JSON.parse(fs.readFileSync(path.join(committed, 'provenance.json'), 'utf8'));
    assert.deepEqual(prov[0].covers, Object.keys(ITEM_CELLS).map((id) => `${id}.png`));
});
