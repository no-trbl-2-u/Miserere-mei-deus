// Shared DevLog page shell — the single source of DevLog/catalog styling and
// the HTML scaffold both build scripts (build-devlog.mjs, build-catalog.mjs)
// render into. Zero dependencies (matches the dep-free root).

export function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Stable, diffable heading ids ("Today's intent" -> "todays-intent").
export function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Minimal inline markdown → HTML (links, bold, italics, code spans).
export function inline(text) {
  const codes = [];
  let s = String(text).replace(/`([^`]+)`/g, (_, code) => {
    codes.push(`<code>${escapeHtml(code)}</code>`);
    return `\x00${codes.length - 1}\x00`;
  });
  s = escapeHtml(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const safe = href.replace(/"/g, "&quot;");
    return `<a href="${safe}">${label}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
  s = s.replace(/(^|[^A-Za-z0-9])_([^_]+)_/g, "$1<em>$2</em>");
  s = s.replace(/\x00(\d+)\x00/g, (_, i) => codes[Number(i)]);
  return s;
}

// ---------------------------------------------------------------------------
// The single source of DevLog styling. Base theme + devlog entry chrome +
// catalog chrome (grids, tiles, glyphs) — additive, harmless on every page.
// ---------------------------------------------------------------------------
export const STYLE = `
:root {
  color-scheme: light dark;
  --bg: #0e1116; --fg: #d7dde5; --fg-strong: #f0f3f7; --muted: #6b7480;
  --accent: #8ab4f8; --panel: #161b22; --card: #12171f; --border: #222833;
  --row: #141a22; --code-bg: #1b212b; --th: #aeb7c2; --list-head: #9aa4b0;
  --add: rgba(80,200,120,.16); --del: rgba(230,90,90,.16);
}
@media (prefers-color-scheme: light) {
  :root {
    --bg: #f7f5ef; --fg: #33302a; --fg-strong: #1a160f; --muted: #6f6656;
    --accent: #3a5db0; --panel: #efece3; --card: #fbfaf5; --border: #ddd7c9;
    --row: #efece3; --code-bg: #e9e5d9; --th: #5c5344; --list-head: #6f6656;
    --add: rgba(35,140,75,.16); --del: rgba(190,55,55,.16);
  }
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--fg);
  font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  -webkit-text-size-adjust: 100%;
}
.wrap { max-width: 46rem; margin: 0 auto; padding: 20px 18px 80px; }
header.top {
  position: sticky; top: 0; z-index: 5;
  background: var(--bg); border-bottom: 1px solid var(--border); margin: 0 0 20px;
}
header.top .wrap { padding-top: 14px; padding-bottom: 14px; display: flex; align-items: baseline; gap: 14px; }
header.top a.home, header.top .home { color: var(--accent); text-decoration: none; font-weight: 600; }
header.top .crumb { color: var(--muted); font-size: 14px; font-variant-numeric: tabular-nums; }
h1, h2, h3, h4 { line-height: 1.25; color: var(--fg-strong); }
h1 { font-size: 26px; margin: 0 0 6px; }
h2 { font-size: 19px; margin: 0; }
a { color: var(--accent); }
p { margin: 8px 0; }
code { background: var(--code-bg); padding: 1px 6px; border-radius: 5px; font-size: 0.86em; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
pre { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; overflow-x: auto; }
pre code { background: none; padding: 0; }
.tablewrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; margin: 12px 0; }
th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
th { background: var(--panel); color: var(--th); font-weight: 600; white-space: nowrap; }
tr:last-child td { border-bottom: none; }
ul, ol { padding-left: 22px; }
li { margin: 4px 0; }
.muted { color: var(--muted); }

.st { font-weight: 600; white-space: nowrap; }
.st::before { content: ""; display: inline-block; width: .5em; height: .5em; border-radius: 50%; margin-right: .38em; background: currentColor; vertical-align: middle; }
.st-ok { color: #4bb96a; }
.st-neutral { color: var(--muted); }
.st-warn { color: #d0a92b; }
.st-bad { color: #e0574b; }

.headline { font-size: 19px; color: var(--fg-strong); margin: 0 0 12px; }
.counts { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 22px; }

.chip {
  display: inline-block; font-size: 12px; font-weight: 700; letter-spacing: .04em;
  text-transform: uppercase; padding: 2px 9px; border-radius: 999px;
  color: #0b0d10; background: var(--cat, var(--accent)); white-space: nowrap;
}
.cat-mechanics { --cat: #d0a92b; }
.cat-ui { --cat: #5aa9e6; }
.cat-content { --cat: #7fc45a; }
.cat-infra { --cat: #b08bf0; }
.cat-balance { --cat: #e6864b; }

.card {
  background: var(--card); border: 1px solid var(--border);
  border-left: 4px solid var(--cat, var(--accent));
  border-radius: 10px; padding: 14px 18px; margin: 14px 0; scroll-margin-top: 72px;
}
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.card-head h2 { font-size: 18px; }
.field { margin: 6px 0; }
.flabel {
  display: inline-block; min-width: 3.2em; margin-right: 4px; color: var(--muted);
  font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: .04em;
}
.commits { margin: 8px 0 2px; }
.commit { font-size: 12px; }

.panel { margin: 22px 0; scroll-margin-top: 72px; }
.panel > h2 { padding-bottom: 6px; border-bottom: 1px solid var(--border); margin-bottom: 8px; }

.diff {
  border: 1px solid var(--border); border-radius: 8px; overflow-x: auto; margin: 12px 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; line-height: 1.5;
  background: var(--bg);
}
.dl { padding: 0 12px; white-space: pre; }
.dl.add { background: var(--add); }
.dl.del { background: var(--del); }
.dl.hunk { color: var(--accent); }
.dl.meta { color: var(--muted); }

figure.shotset { margin: 14px 0; }
figure.shotset > figcaption { font-size: 14px; color: var(--fg); margin-bottom: 8px; }
.shots { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.shot { margin: 0; }
.shot .role { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); text-align: center; margin-bottom: 3px; }
.shot img { width: 100%; height: auto; border: 1px solid var(--border); border-radius: 8px; display: block; }

.entry-list { list-style: none; padding: 0; margin: 8px 0 0; }
.entry-list li { margin: 0; border-bottom: 1px solid var(--border); }
.entry-list a { display: block; padding: 14px 4px; text-decoration: none; color: var(--fg); }
.entry-list a:hover { background: var(--row); }
.entry-list .date { color: var(--accent); font-weight: 600; font-variant-numeric: tabular-nums; }
.entry-list .head { color: var(--list-head); font-size: 14px; margin: 2px 0 6px; }
footer.foot { margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--border); color: var(--muted); font-size: 13px; }

/* ── Hub (landing page) ──────────────────────────────────────────────── */
.hub { display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: 14px; margin: 22px 0 0; }
.hub a {
  display: block; text-decoration: none; color: var(--fg);
  background: var(--card); border: 1px solid var(--border);
  border-left: 4px solid var(--hue, var(--accent));
  border-radius: 12px; padding: 18px 20px; transition: background .12s, transform .12s;
}
.hub a:hover { background: var(--row); transform: translateY(-1px); }
.hub .h-title { font-size: 19px; font-weight: 700; color: var(--fg-strong); margin: 0 0 4px; }
.hub .h-sub { font-size: 14px; color: var(--muted); }
.hub .h-glyph { font-size: 22px; line-height: 1; margin-bottom: 8px; display: block; }
.hue-cards { --hue: #5aa9e6; }
.hue-enemies { --hue: #e0574b; }
.hue-effects { --hue: #b08bf0; }
.hue-log { --hue: #d0a92b; }
.hue-atlas { --hue: #8fa855; }
.hue-tuning { --hue: #3ec9b0; }

/* ── Catalog: cards grid ─────────────────────────────────────────────── */
.searchbar { margin: 14px 0 4px; }
.searchbar input {
  width: 100%; padding: 10px 14px; border-radius: 10px; font-size: 15px;
  background: var(--card); color: var(--fg); border: 1px solid var(--border);
}
.count-note { color: var(--muted); font-size: 13px; margin: 6px 0 16px; }
.grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: 16px; }
.gcard {
  background: var(--card); border: 1px solid var(--border); border-radius: 12px;
  overflow: hidden; display: flex; flex-direction: column;
}
.gcard .art { aspect-ratio: 4 / 3; background: var(--panel); overflow: hidden; }
.gcard .art img { width: 100%; height: 100%; object-fit: cover; display: block; }
.gcard .art.none { display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 26px; }
.gcard .body { padding: 12px 14px 14px; }
.gcard .name { font-weight: 700; color: var(--fg-strong); margin: 0 0 8px; }
.gcard .statrow { margin: 0 0 8px; }

/* ── Catalog: enemies ────────────────────────────────────────────────── */
.grid-enemies { display: grid; grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr)); gap: 16px; }
.ecard { background: var(--card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
/* Enemy paintings are alpha-matted (figures float on a keyed-out black), so a
   solid black plate behind them reads as intended in both themes. */
.ecard .portrait { aspect-ratio: 1 / 1; background: #000; overflow: hidden; }
.ecard .portrait img { width: 100%; height: 100%; object-fit: contain; display: block; }
.ecard .portrait.none { display: flex; align-items: center; justify-content: center; color: #6b7480; font-size: 34px; }
.ecard .body { padding: 12px 15px 15px; }
.ecard .name { font-size: 18px; font-weight: 700; color: var(--fg-strong); margin: 0; }
.ecard .sub { color: var(--muted); font-size: 13px; margin: 2px 0 10px; text-transform: capitalize; }
.statrow { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; }
.stat { font-size: 12px; font-weight: 700; padding: 2px 9px; border-radius: 999px; background: var(--panel); border: 1px solid var(--border); color: var(--fg); white-space: nowrap; }
.stat .k { color: var(--muted); font-weight: 600; margin-right: 3px; }
.stat.hp { --sc: #e0574b; } .stat.body { --sc: #e6864b; } .stat.mind { --sc: #5aa9e6; } .stat.heart { --sc: #7fc45a; }
.stat.hp, .stat.body, .stat.mind, .stat.heart { border-color: color-mix(in srgb, var(--sc) 55%, var(--border)); }
.sec-label { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); font-weight: 700; margin: 10px 0 5px; }
.fights { font-size: 14px; margin: 0 0 4px; }
.hint { font-size: 13px; color: var(--muted); font-style: italic; margin: 4px 0 0; }
.skill { border-top: 1px solid var(--border); padding: 8px 0 0; margin: 8px 0 0; }
.skill .sk-name { font-weight: 700; color: var(--fg-strong); font-size: 14px; }
.skill .sk-text { font-size: 13px; color: var(--fg); margin: 2px 0 0; }
.no-skills { font-size: 13px; color: var(--muted); }

/* ── Catalog: effects ────────────────────────────────────────────────── */
.eff-list { display: grid; gap: 10px; margin: 8px 0 0; }
.eff {
  display: grid; grid-template-columns: 3rem 1fr; gap: 14px; align-items: start;
  background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px;
}
.eff .glyph {
  width: 3rem; height: 3rem; border-radius: 10px; display: flex; align-items: center; justify-content: center;
  font-size: 26px; line-height: 1; color: #0b0d10; font-weight: 700;
  background: var(--gc, var(--accent)); box-shadow: inset 0 0 0 1px rgba(0,0,0,.15);
}
.eff .name { font-weight: 700; color: var(--fg-strong); margin: 0 0 6px; }
.eff .statrow { margin: 0 0 6px; }

/* ── Raw-stat mechanic lines (cards + effects) ───────────────────────── */
.mods { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 3px; }
.mods li {
  margin: 0; font-size: 13px; line-height: 1.4; color: var(--fg);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  padding-left: 12px; position: relative;
}
.mods li::before { content: "›"; position: absolute; left: 0; color: var(--muted); }
`;

// Build the sticky top nav's home element: a link, or a plain root label.
function homeEl(home) {
  if (!home) return `<span class="home">Miserere Mei, Deus</span>`;
  if (home.href) return `<a class="home" href="${home.href}">${escapeHtml(home.label)}</a>`;
  return `<span class="home">${escapeHtml(home.label)}</span>`;
}

// The full HTML document. `home` is { href, label } (a back-link) or null (the
// hub root). `crumb` is the small right-hand context label.
export function page({ title, home, crumb, body, extraStyle, footerNote }) {
  const note = footerNote || "generated by <code>scripts/build-devlog.mjs</code>";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)}</title>
<style>${STYLE}${extraStyle || ""}</style>
</head>
<body>
<header class="top"><div class="wrap">${homeEl(home)}${crumb ? `<span class="crumb">${escapeHtml(crumb)}</span>` : ""}</div></header>
<main class="wrap">
${body}
<footer class="foot">Miserere Mei, Deus DevLog &middot; ${note}</footer>
</main>
</body>
</html>
`;
}
