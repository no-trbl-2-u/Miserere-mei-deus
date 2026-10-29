# Deploying the public DevLog

The public development log is a **second Cloudflare Pages project**, separate
from the one that serves the game's web build. This file is the handoff: what a
human has to do at the dashboard (once), what the repo already does (every
time), and how to prove the result.

Written 2026-09-20 alongside `devlog/DESIGN.md` and the build
(`scripts/build-devlog-public.mjs`).

---

## Why a second project, and not the existing one

The `axiomancer` Pages project serves **whatever `main`'s tree contains**. That
is the mechanism phase 57 had to fight: committing generated HTML was the only
way to publish, and it published by accident what nobody had decided to
publish. T's 2026-09-20 reversal changes what MAY be published; it does not
change how publication should work.

So the public DevLog publishes from a **build command**, not from the tree:

- `main`'s tree still contains no generated DevLog output. The guard
  (`scripts/check-devlog-not-served.mjs`), its pre-commit hook and the weekly
  `check-devlog-served.yml` sweep are untouched, and now cover `dist/` too.
- The new project runs `npm run site:public` at deploy time and serves
  `dist/devlog-public/`.
- Nothing about the existing project changes. It keeps serving the game build
  from the tree, and keeps serving no DevLog.

---

## What the repo already provides

| command | what it does |
|---|---|
| `npm run site:public` | the full build: catalog export, then the public site into `dist/devlog-public/` |
| `npm run devlog:public` | the site alone (assumes a catalog export exists) |
| `node scripts/build-devlog-public.mjs --strict` | the same, but non-zero if any page blows its payload budget |
| `node scripts/check-devlog-public-live.mjs <url>` | the post-deploy proof (below) |

The build is zero-dependency Node plus `sharp` for image derivatives, which the
repo already carries. It takes about two seconds for fifty-four entries.

---

## The dashboard steps (a human, once)

A Cloudflare Pages project cannot be created from inside this repository —
there is no API token in the tree and no `wrangler.toml`, which phase 57 also
recorded. Do this once, in one sitting:

1. **Cloudflare dashboard -> Workers & Pages -> Create -> Pages -> Connect to
   Git.** Pick the `no-trbl-2-u/Miserere-mei-deus` repository. (The same repository as
   the game project; a Pages project is a build configuration, not a
   repository, so two projects over one repository is the intended shape.)
2. **Project name:** `axiomancer-devlog`. This decides the URL —
   `https://axiomancer-devlog.pages.dev`.
3. **Production branch:** `main`.
4. **Build settings:**
   - Framework preset: **None**
   - Build command: `npm ci && npm run site:public`
   - Build output directory: `dist/devlog-public`
   - Root directory: *(leave empty — the repo root)*
5. **Environment variables:** none are required. Set `NODE_VERSION` to match
   the repo's `engines` field if the default image is older.
6. **Preview deployments:** turn them **off**, or restrict them to `main`.
   Per-branch preview URLs are guessable, and the open AUDIT row about
   guessable previews on the game's project applies here too — do not open a
   second instance of the same finding.
7. **Build watch paths** (Settings > Build > Build watch paths):
   - **Include:** `devlog/PUBLISH`, `devlog/builds.json`
   - **Exclude:** *(empty)*

   `devlog/builds.json` is the playable-build ledger (see "Offering a
   playable build" below). A newly recorded build is news a player can act
   on, so recording one redeploys the site on its own.

   The site deploys on player-visible news, not on every push (T,
   2026-09-22). `devlog/PUBLISH` is an append-only publish ledger.
   `/digest` appends a line only for a major release (a shipped phase or
   new system), a UI or quality-of-life change, or a fix to something that
   blocks play (`skills/digest.md` §3 step 5b). Content, balance and minor
   fixes are held back and appear with the next publish. The default (`*`)
   rebuilt on every push to `main`: about 300 builds a month at the loop's
   cadence, against the free plan's 500 per account, which the game's
   `axiomancer` project shares
   (<https://developers.cloudflare.com/pages/platform/limits/>).

   Consequences:
   - Engine, catalog, art and site-script changes reach the public site
     only with the next publish. To ship a fix to the site's own build
     sooner, append a `<YYYY-MM-DD> — manual: <reason>` line to
     `devlog/PUBLISH`.
   - Pages ignores the filter and always builds a push of 20+ commits or
     3000+ files
     (<https://developers.cloudflare.com/pages/configuration/build-watch-paths/>).
8. **Deploy**, wait for the first build, then run the proof below.
9. **Record the URL** in this file (replace the placeholder in the next
   section) and in `docs/external-architecture.md`'s register, and correct
   `plan/bearings.md`'s "no hosted web surface" sentence in the same commit —
   it will be false the moment this project exists.

### The URL, once it exists

```
DEVLOG_PUBLIC_URL = https://axiomancer-devlog.pages.dev
```

---

## Proving the deploy

```bash
node scripts/check-devlog-public-live.mjs https://axiomancer-devlog.pages.dev
```

It checks four things, each of which fails differently:

1. the landing page serves and names the game — the site is up;
2. the newest post serves **and carries its own title** — the build is current,
   which is the failure a front page cannot show you;
3. the catalog serves and carries card plates;
4. the feed serves as an Atom document.

Exit 0 means live and current. Run it after the first deploy, and after any
change to the build command.

---

## What the nightly does

`/digest` writes the entry and the day's captures, runs `npm run verify` and
`npm run site:public`, and commits **source only** — the entry, the dated
captures, nothing generated. On a night that passes the publish gate
(a major release, a UI or quality-of-life change, or a play-blocking fix) it also
appends a line to `devlog/PUBLISH`. That push triggers the Pages build, which
runs the same command the digest just ran locally. On any other night, and
for every other loop commit, the site does not move. The ledger line is the
whole publish step, and there is no generated file in the commit.

If the Pages project does not exist yet, nothing about that changes: the
nightly still builds locally, and the build is its own check that the entry
renders.

---

## Offering a playable build

The landing page carries a **Play the latest build** band. It links the
newest Android preview APK recorded in `devlog/builds.json`, and it only
appears when that file holds a valid record.

- **Why a link.** The APK is about 100 MB. Pages refuses any file over
  25 MiB, so the site links Expo's artifact URL, which serves the APK without
  a login.
- **Why not the build page.** Expo's build page is not linked, because it may
  require an Expo login.
- **Recording a build.** After an EAS `preview` build finishes, run:

  ```bash
  npm run devlog:record-build   # needs EXPO_TOKEN or a logged-in eas-cli
  ```

  It prepends the newest finished Android preview build (date, commit, APK
  URL, measured size) to `devlog/builds.json`. It does nothing if that build
  is already recorded. Commit the file. Merging it to `main` redeploys the
  site with the new link.
- **No builds in the nightly.** The nightly digest does not record builds.
  The night workflow holds no Expo credentials, and preview builds are
  started by hand.

---

## If something goes wrong

| symptom | likely cause |
|---|---|
| build fails on `sharp` | the Pages image lacks a prebuilt binary; the build degrades to copying originals if `sharp` is absent, so this is a warning, not a stop — confirm the log says so |
| a page is over budget | `--strict` is not on by default; run `node scripts/build-devlog-public.mjs --strict` locally to see which page and why (DESIGN.md §9) |
| the newest post is missing | the entry's file name must match `DIGEST_<YYYY-MM-DD>.md` |
| the newest post is missing, and the build did not run | that night did not publish: no new line in `devlog/PUBLISH` (by design unless it carried a major release, a UI/QOL change or a play-blocking fix) — append a `manual:` line to force one |
| an image is missing from a post | the capture is missing, or the work item has no usable `**What:**` line — the site refuses to publish an image it cannot label (DESIGN.md §7) |
| a card's art is blank | the gate refused the file (its provenance record names no licence it recognises, DESIGN.md §10), or `devlog/data` is missing (`npm run catalog:export`) |
