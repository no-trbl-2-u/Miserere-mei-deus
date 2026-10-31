#!/usr/bin/env node
// Build the DevLog site:
//   - devlog/index.html                 the HUB — links: Catalog, DevLog, Atlas
//   - devlog/log.html                   the DevLog entry list (newest first)
//   - devlog/entries/DIGEST_<date>.html one page per structured markdown entry
//
// The single Catalog page is built by scripts/build-catalog.mjs from
// devlog/data/*.json (produced by `npm run catalog:export`). This script only
// reads those JSON files (if present) to show live counts on the hub.
//
// Zero dependencies (matches the dep-free root). Entries are Markdown with a
// light structure the /digest skill authors (see skills/digest.md §3.4):
//
//   # <YYYY-MM-DD>
//   > one-line headline
//
//   ## [mechanics] Title of a change      <- a work-item CARD (bracketed category)
//   **What:** what changed
//   **Why:** why it changed
//   **Commits:** 16e1386, 09faf57
//   ```diff
//   @@ ... @@
//   - old
//   + new
//   ```
//
//   ## [ui] Title of a UI change
//   **What:** ...
//   **Why:** ...
//   **Shot:** combat-encounter — caption   <- pulls devlog/assets/<date>/combat-encounter.{before,after,diff}.png
//
//   ## Pulse                              <- an un-bracketed PANEL (rendered as-is)
//   | Tick | Verb | Outcome |
//   ...
//
// Usage: node scripts/build-devlog.mjs   (or: npm run devlog:build)

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { escapeHtml, inline, page, slug } from "./devlog-shell.mjs";
// The entry grammar (parse + block Markdown + the category vocabulary) is
// shared with the public DevLog build — scripts/devlog-entry.mjs is its single
// home, so the two sites can never drift into two grammars.
import {
  CATEGORIES,
  CAT_LABEL,
  extractFields,
  mdToHtml,
  parseEntry,
} from "./devlog-entry.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEVLOG = join(ROOT, "devlog");
const ENTRIES = join(DEVLOG, "entries");
const ASSETS = join(DEVLOG, "assets");
const DATA = join(DEVLOG, "data");

const ENTRY_RE = /^DIGEST_(\d{4}-\d{2}-\d{2})\.md$/;

// ---------------------------------------------------------------------------
// Render a UI screenshot set (before / after / diff) if the assets exist
// ---------------------------------------------------------------------------
function renderShots(shots, date) {
  const dir = join(ASSETS, date);
  const out = [];
  for (const { screen, caption } of shots) {
    if (!screen) continue;
    const roles = [
      ["before", "Before"],
      ["after", "After"],
      ["diff", "Changes"],
    ];
    const figs = roles
      .filter(([r]) => existsSync(join(dir, `${screen}.${r}.png`)))
      .map(
        ([r, label]) =>
          `<figure class="shot"><div class="role">${label}</div>` +
          `<img loading="lazy" src="../assets/${date}/${screen}.${r}.png" alt="${escapeHtml(screen)} ${label}"></figure>`
      );
    if (figs.length === 0) continue;
    out.push(
      `<figure class="shotset"><figcaption><code>${escapeHtml(screen)}</code>${
        caption ? " — " + inline(caption) : ""
      }</figcaption><div class="shots">${figs.join("")}</div></figure>`
    );
  }
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// Render a whole entry body
// ---------------------------------------------------------------------------
function renderSections(sections, date) {
  const counts = {};
  const html = sections
    .map((s) => {
      if (s.kind === "panel") {
        return `<section class="panel" id="${slug(s.title)}"><h2>${inline(s.title)}</h2>\n${mdToHtml(
          s.bodyLines.join("\n")
        )}</section>`;
      }
      counts[s.category] = (counts[s.category] || 0) + 1;
      const { fields, body } = extractFields(s.bodyLines);
      const parts = [];
      parts.push(
        `<div class="card-head"><span class="chip cat-${s.category}">${CAT_LABEL[s.category] || s.category}</span><h2>${inline(
          s.title
        )}</h2></div>`
      );
      if (fields.what) parts.push(`<p class="field"><span class="flabel">What</span> ${inline(fields.what)}</p>`);
      if (fields.why) parts.push(`<p class="field"><span class="flabel">Why</span> ${inline(fields.why)}</p>`);
      if (fields.commits.length)
        parts.push(
          `<p class="commits">${fields.commits
            .map((c) => `<code class="commit">${escapeHtml(c)}</code>`)
            .join(" ")}</p>`
        );
      if (body) parts.push(mdToHtml(body));
      if (fields.shots.length) parts.push(renderShots(fields.shots, date));
      return `<section class="card cat-${s.category}" id="${slug(s.title)}">${parts.join("\n")}</section>`;
    })
    .join("\n");
  return { html, counts };
}

function countsBar(counts) {
  const chips = CATEGORIES.filter((c) => counts[c]).map(
    (c) => `<span class="chip cat-${c}">${counts[c]} ${CAT_LABEL[c] || c}</span>`
  );
  return chips.length ? `<div class="counts">${chips.join("")}</div>` : "";
}

// ---------------------------------------------------------------------------
// The hub (devlog/index.html) — three links into the site
// ---------------------------------------------------------------------------
function dataCount(name) {
  try {
    const arr = JSON.parse(readFileSync(join(DATA, `${name}.json`), "utf8"));
    return Array.isArray(arr) ? arr.length : null;
  } catch {
    return null;
  }
}

// Counts for the Atlas tile, from devlog/data/atlas.json (an object, not an array).
function atlasCounts() {
  try {
    const a = JSON.parse(readFileSync(join(DATA, "atlas.json"), "utf8"));
    return { cards: a.cards.length, relics: a.relics.length, regions: a.regions.length };
  } catch {
    return null;
  }
}

function buildHub(entryCount) {
  const atlas = atlasCounts();
  const cards = dataCount("cards");
  const enemies = dataCount("enemies");
  const effects = dataCount("effects");
  const sub = (n, noun) => (n == null ? "browse the catalog" : `${n} ${noun}`);

  const tiles = [
    {
      href: "./catalog.html",
      hue: "cards",
      glyph: "🂠",
      title: "Catalog",
      sub: [sub(cards, "cards"), sub(enemies, "foes"), sub(effects, "statuses")].join(" · "),
    },
    {
      href: "./log.html",
      hue: "log",
      glyph: "❯",
      title: "DevLog",
      sub: entryCount === 0 ? "no entries yet" : `${entryCount} ${entryCount === 1 ? "entry" : "entries"}`,
    },
    {
      href: "./atlas.html",
      hue: "atlas",
      glyph: "⌖",
      title: "Atlas",
      sub: atlas
        ? `${atlas.cards} cards · ${atlas.relics} relics · ${atlas.regions} regions`
        : "architecture and content map",
    },
  ];

  const grid = tiles
    .map(
      (t) =>
        `  <a class="hue-${t.hue}" href="${t.href}"><span class="h-glyph">${t.glyph}</span>` +
        `<div class="h-title">${escapeHtml(t.title)}</div><div class="h-sub">${escapeHtml(t.sub)}</div></a>`
    )
    .join("\n");

  return (
    `<h1>Miserere Mei, Deus</h1>\n` +
    `<p class="muted">A private index of the game's content and the nightly development log.</p>\n` +
    `<div class="hub">\n${grid}\n</div>`
  );
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
function build() {
  if (!existsSync(ENTRIES)) mkdirSync(ENTRIES, { recursive: true });

  const files = readdirSync(ENTRIES).filter((f) => ENTRY_RE.test(f)).sort().reverse();

  const meta = [];
  for (const file of files) {
    const date = file.match(ENTRY_RE)[1];
    const md = readFileSync(join(ENTRIES, file), "utf8");
    const { headline, sections } = parseEntry(md);
    const { html, counts } = renderSections(sections, date);

    const body = `<h1 id="headline">${date}</h1>\n${
      headline ? `<p class="headline">${inline(headline)}</p>` : ""
    }\n${countsBar(counts)}\n${html}`;

    writeFileSync(
      join(ENTRIES, `DIGEST_${date}.html`),
      page({
        title: `Miserere Mei, Deus digest — ${date}`,
        home: { href: "../log.html", label: "← DevLog" },
        crumb: date,
        body,
      })
    );
    meta.push({ date, headline, counts });
  }

  // DevLog entry list → log.html
  const listBody =
    meta.length === 0
      ? `<h1>DevLog</h1>\n<p class="muted">No entries yet — the next nightly digest will land the first one.</p>`
      : `<h1>DevLog</h1>\n<p class="muted">${meta.length} ${
          meta.length === 1 ? "entry" : "entries"
        }, newest first.</p>\n<ul class="entry-list">\n${meta
          .map(
            (m) =>
              `  <li><a href="./entries/DIGEST_${m.date}.html"><span class="date">${m.date}</span>` +
              `<div class="head">${escapeHtml(m.headline)}</div>${countsBar(m.counts)}</a></li>`
          )
          .join("\n")}\n</ul>`;

  writeFileSync(
    join(DEVLOG, "log.html"),
    page({
      title: "Miserere Mei, Deus — DevLog",
      home: { href: "./index.html", label: "← Miserere Mei, Deus" },
      crumb: "DevLog",
      body: listBody,
    })
  );

  // Hub → index.html
  writeFileSync(
    join(DEVLOG, "index.html"),
    page({ title: "Miserere Mei, Deus", home: null, crumb: "", body: buildHub(meta.length) })
  );

  console.log(`devlog: built hub + log + ${meta.length} entr${meta.length === 1 ? "y" : "ies"}`);
}

build();
