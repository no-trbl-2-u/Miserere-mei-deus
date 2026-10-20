// scripts/lib/page-ready.mjs
//
// The ready wait the screenshot scripts use in place of a fixed sleep. The
// app sets `data-axm-ready="1"` on <html> once every font has settled
// (`markWebReady` in `app/_layout.tsx`, web only); this waits for that, for
// `document.fonts` to report nothing still loading, then for two animation
// frames so the last React commit has painted.

/** The `<html>` dataset key the app sets, and the value that means ready. */
export const READY_KEY = 'axmReady'
export const READY_VALUE = '1'

/**
 * Waits until the app on `page` is ready to be shot.
 *
 * @param {import('playwright').Page} page a page on the web export.
 * @param {{ timeout?: number }} [options] how long to wait for the signal, ms.
 */
export async function waitForReady(page, { timeout = 15_000 } = {}) {
    await page.waitForFunction(
        ([key, value]) => document.documentElement.dataset[key] === value && document.fonts.status === 'loaded',
        [READY_KEY, READY_VALUE],
        { timeout },
    )
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))))
}
