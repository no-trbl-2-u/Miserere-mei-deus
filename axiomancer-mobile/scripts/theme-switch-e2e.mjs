// Live theme-switch e2e against the shared web export.
// Serves .smoke-dist, opens /settings (the picker moved there 2026-09-23), expands the COLOUR THEME picker,
// switches themes, and asserts the palette actually re-paints in place
// (no reload, no console errors).

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { ensureWebExport } from './lib/web-export.mjs';

// fileURLToPath, not URL.pathname: the latter yields /C:/… on Windows,
// which Node path APIs and spawn cwd reject.
const DIST = fileURLToPath(new URL('../.smoke-dist', import.meta.url));

// The shared export, reused when its stamp matches the tree.
const exported = await ensureWebExport({ outDir: DIST, log: (m) => console.log(`theme-e2e: ${m}`) });
if (!exported.ok) { console.error('theme-e2e: expo export failed'); process.exit(3); }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.map': 'application/json' };

const server = createServer(async (req, res) => {
    try {
        let p = decodeURIComponent((req.url || '/').split('?')[0]);
        let file = join(DIST, p);
        if (p === '/' ) file = join(DIST, 'index.html');
        else if (!extname(p)) {
            // expo-router static export emits <route>.html
            const html = join(DIST, p + '.html');
            file = existsSync(html) ? html : join(DIST, 'index.html');
        }
        if (!existsSync(file)) { res.statusCode = 404; res.end('nf'); return; }
        const buf = await readFile(file);
        res.setHeader('content-type', MIME[extname(file)] || 'application/octet-stream');
        res.end(buf);
    } catch (e) { res.statusCode = 500; res.end(String(e)); }
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
console.log('serving', base);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

let failed = false;
const check = (label, cond) => { console.log(`${cond ? 'PASS' : 'FAIL'}: ${label}`); if (!cond) failed = true; };

try {
    await page.goto(`${base}/settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Sentinel to detect a full reload (a reload wipes window state).
    await page.evaluate(() => { window.__noReload = 'alive'; });

    // Helper: read the COLOUR THEME label colour (driven by AXM.bone).
    const labelColor = () => page.evaluate(() => {
        const els = [...document.querySelectorAll('*')];
        const el = els.find((e) => e.children.length === 0 && e.textContent === 'COLOUR THEME');
        return el ? getComputedStyle(el).color : null;
    });

    const toggle = page.getByTestId('theme-switcher-toggle');
    check('COLOUR THEME switcher present', await toggle.count() > 0);
    // On /settings the picker mounts EXPANDED (2026-09-23); clicking the
    // toggle there would collapse it and hide the swatches. Only expand when
    // the swatches are not already on screen.
    if (await page.getByTestId('theme-frost-marrow').count() === 0) {
        await toggle.click();
        await page.waitForTimeout(300);
    }

    const before = await labelColor();
    check('read initial themed label colour', !!before);

    // Switch to Frost Marrow.
    await page.getByTestId('theme-frost-marrow').click();
    await page.waitForTimeout(400);
    const afterFrost = await labelColor();
    check('label colour changed after switching to Frost Marrow', before && afterFrost && before !== afterFrost);

    // Switch to Plague Bloom — should differ again.
    await page.getByTestId('theme-plague-bloom').click();
    await page.waitForTimeout(400);
    const afterPlague = await labelColor();
    check('label colour changed again after Plague Bloom', afterFrost && afterPlague && afterFrost !== afterPlague);

    // No full reload happened (state survived).
    const sentinel = await page.evaluate(() => window.__noReload);
    check('no full page reload during switches', sentinel === 'alive');

    // URL unchanged (still on /settings).
    check('stayed on /settings', new URL(page.url()).pathname.startsWith('/settings'));

    check('zero console / page errors', consoleErrors.length === 0);
    if (consoleErrors.length) console.log('  errors:', consoleErrors.slice(0, 5));

    console.log('colours:', { before, afterFrost, afterPlague });
} catch (e) {
    console.log('FAIL: exception', e.message);
    failed = true;
} finally {
    await browser.close();
    server.close();
}

process.exit(failed ? 1 : 0);
