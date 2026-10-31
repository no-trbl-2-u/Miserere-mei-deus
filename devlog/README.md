# DevLog

Two sites are built from this one directory.

**The public DevLog** (`npm run site:public`, output `dist/devlog-public/`) is
the game's public face: the log, the evidence and the full catalog, written for
a player rather than a maintainer. Its design system is
[`DESIGN.md`](./DESIGN.md); its builder is `scripts/build-devlog-public.mjs`.
T reversed the 2026-08-15 content policy on 2026-09-20 with the spoiler cost
stated — see `archive-pre-revamp:plan/archive/2026-09-25-trim-t4/plan/2026-09-20-devlog-public-publish.prompt.md`. Publication
happens at DEPLOY time, from that build directory, which is gitignored and
guarded like every other generated output here: nothing generated is ever
committed, so publishing stays a deliberate act.

**The private index** (`npm run site:build`) is the internal tool this file
originally described, unchanged: a self-contained set of pages opened from the
filesystem. `index.html` is a **hub** with three links:

- **Catalog** (`catalog.html`) — one HTML file containing every combat card,
  enemy, and live status effect, with inline CSS and inline JavaScript. It has no
  separate catalog page, script file, or stylesheet.
- **DevLog** (`log.html`) — the accumulating, one-visual-entry-per-day
  development log.
- **Atlas** (`atlas.html`) — the architecture and content atlas (phase AT1b).
  One self-contained page: the cards, relics, stats and world plates are
  generated from `data/atlas.json` (`npm run catalog:export` writes it from the
  engine; `npm run atlas:build`, i.e. `scripts/build-atlas.mjs`, renders it), and the
  context, container, engine, domain, combat, dice and loop plates are
  hand-drawn (`scripts/atlas/`) and each carry a "last checked" date.
  Generated and gitignored like the rest of this index.

The Tuning Lab (hand-authored balance reports) was retired in revamp phase R1;
its three reports sit in `archive-pre-revamp:plan/archive/tuning-lab/`.

The **catalog** (`catalog.html`) is generated from the game's canonical
libraries; the **DevLog** is one **visual** entry per day: a headline,
categorized work-item cards (each with *what* changed and *why*), rendered code
diffs for engine/mechanics work, and before/after screenshots for UI work. The
nightly `/digest` skill authors a structured markdown entry into
`entries/DIGEST_<date>.md`; `scripts/build-devlog.mjs` renders it into a
self-contained styled HTML page at `entries/DIGEST_<date>.html` — markdown
source and built HTML live side by side in `entries/`.
Only the markdown source, the dated captures (screens, card and foe plates,
world plates, rules pairs) are committed. The built HTML and the catalog
JSON/art are generated output, gitignored, and rebuilt on demand by `npm run site:build` —
the game's Cloudflare Pages project serves whatever `main`'s tree contains, so
nothing generated here is committed to it (phase 57, still in force). The
public DevLog is a separate Pages project that runs its own build; see
`docs/devlog-public-deploy.md`.

## Catalog (`catalog.html`)

It is **generated from the mechanics engine**, so it never drifts from what the
game actually ships:

- `scripts/export-catalog.ts` (run via `npm run catalog:export`, ts-node) reads
  `axiomancer-mechanics` (`cards.library`, `enemy.library`, the effect libraries)
  plus the mobile art registries, writes flat records to `data/{cards,enemies,`
  `effects}.json`, and copies the referenced paintings into
  `assets/catalog/{cards,enemies}/`. This is the one place the art-free mechanics
  package meets the mobile art files.
- `scripts/build-catalog.mjs` (`npm run catalog:build`, zero-dep) renders those
  JSON files into one `catalog.html` document with inline CSS and inline
  JavaScript. Cards, enemies, and effects are sections in the same file.

Effect **glyphs** reuse the mobile combat board's presentation mapping
(`statusGlyphs.ts`); deprecated-tagged effects are omitted.

The nightly `/digest` runs `npm run site:build`, which regenerates the catalog
from the current libraries — so as cards, enemies, and effects change, these
pages refresh automatically on the next digest commit (no manual step).

## Entry format

`entries/DIGEST_<date>.md` is Markdown with a light structure the build parses
(see `skills/digest.md` §3.4 for the authoring contract):

```markdown
# 2026-07-04
> one-line headline

## [mechanics] What was renamed and why
**What:** one line
**Why:** one line
**Commits:** 16e1386
​```diff
@@ src/World/LootCache/policy.ts @@
-export type CachePolicy = 'prober' | 'blind' | 'coward'
+export type CachePolicy = 'informed' | 'blind' | 'coward'
​```

## [ui] Combat board polish
**What:** one line
**Why:** one line
**Shot:** combat-encounter — caption

## [content] A card is reprinted
**What:** one line
**Why:** one line
**Evidence:** card frostbitten-palisade — caption   <- card | foe | plate | rule
**No capture:** why this change has no picture

## While you were out
| Tick | Verb | Outcome |
| ...  | ...  | ...     |
```

- `## [<category>] <title>` → a **card** (`mechanics | ui | content | infra |
  balance`, each color-coded).
- `## <title>` (no bracket) → a **panel**, rendered as-is (tables/lists/prose).

## UI before/after screenshots

`scripts/devlog-shots.mjs` (`npm run devlog:shots -- <since-ref> <date>`) diffs
the committed baselines (`axiomancer-mobile/screenshots/baseline/*.png`) across
the day's git range and writes
`assets/<date>/<screen>.{before,after,diff}.png` (the `diff` is a pixelmatch
highlight). A `**Shot:** <screen> — <caption>` line in a `[ui]` card embeds the
trio. No browser runs — the baselines are the source of truth, captured when the
UI change landed.

## Reading it on your phone

1. **Zero setup — GitHub mobile.** Open `entries/DIGEST_{date}.md` in the GitHub
   app on a private repo. Renders in GitHub's markdown style (not the custom
   theme, and no rendered diffs/shots), but needs nothing extra.
2. **Full experience — Cloudflare Pages + Access (free).** Serves the whole site
   (hub + catalog + DevLog) as a real webpage, gated to just your email:
   - Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
     **Connect to Git** → pick this repo.
   - Build settings: **Framework preset = None**, **Build command = (empty)**,
     **Build output directory = `devlog`**. (This is the setting that scopes what
     gets served — *not* the Advanced "Root directory / Path" field. Leave that
     default. Files are pre-built and committed, so Cloudflare just serves them.)
   - After the first deploy: **Settings → Access policy** (Cloudflare Zero Trust)
     → allow only your email (one-time PIN login). This makes the site private.
   - Every time the cron pushes a digest commit, Cloudflare auto-deploys.

The site sends `noindex` and, behind Access, is not publicly reachable.

## Regenerating locally

```bash
npm run site:build                         # everything: catalog export + build + devlog
npm run catalog                            # just the catalog: export JSON + build HTML
npm run devlog:build                       # just the hub + DevLog entries
npm run devlog:shots -- <since-ref> <date> # collect UI before/after/diff
```

`npm run catalog:export` needs the `axiomancer-mechanics` dev deps installed
(ts-node); `catalog:build` and `devlog:build` are dependency-free.
