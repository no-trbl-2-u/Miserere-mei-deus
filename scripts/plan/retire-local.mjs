// scripts/plan/retire-local.mjs: Miserere's own step in the kit's settle (spec 164, SR1a; docs/nexus-deviations.md).
//
// The kit's settle holds back a file that would leave a spec with no chunk and waits for a hand absorb
// (`skills/next/land.md` §1), and no Miserere run takes that path, so finished specs sat at "1 left" and pr-resolve
// went red. Here a spec's last close says where the spec's lasting rules went, in its front matter:
//
//   absorb: D?<slug> (this file's decisions) | a file named (a test that pins the rule, identity/…) | none
//
// and settle retires the spec when the run's end state leaves it empty (a later file may refill it): the spec file is
// deleted, its roadmap row and any lane line naming one of its chunks go (the ladder's path), any section whose
// heading says "Follow-ups" is copied to plan/CANDIDATES.md as an `[owner]` row under `## Pending`, and
// `- <date> · NN · spec complete: <the row's title> · <absorb> · deleted in (this commit)` is archived after the
// close's own line. A last close without `absorb:` is held exactly as before, and the hold names the key.
// settle.mjs calls in here from lines marked `// Miserere:`, so a kit sync keeps them.
import path from 'node:path';

/** The words the hold adds for a close with no `absorb:` (A3): the key it is missing, and what it takes. A close that has one says nothing (its key speaks for another spec). */
export function absorbHint(p) {
  return p.close && !p.absorb ? `; or give this close the missing "absorb:" key (where the spec's lasting rules went: D?<slug> decisions in this file, a file named, or none) and settle retires the spec` : '';
}

/** Whether `p`'s `absorb:` speaks for `spec`: only the spec its own close empties. */
export function absorbs(p, spec) {
  return Boolean(p.absorb && p.close && path.basename(spec).startsWith(`${p.close.split('.')[0]}-`));
}

/** The roadmap row's Initiative cell for `name` (a spec's file name), else the spec's own heading. */
export function specTitle(readme, name, text) {
  const row = (readme ?? '').split('\n').find((l) => /^\|/.test(l) && l.includes(`](${name})`));
  const cell = row?.split('|')[2]?.trim();
  if (cell) return cell;
  const head = /^# (.+)$/m.exec(text ?? '')?.[1];
  return head ? head.replace(/^\d{2,}\s*[·—–-]\s*/, '').trim() : name;
}

/** Every section of `text` whose heading (any level) says "Follow-ups": [{ heading, level, lines }]. */
export function followUps(text) {
  const lines = (text ?? '').split('\n');
  const out = [];
  let fenced = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^(```|~~~)/.test(lines[i])) fenced = !fenced;
    const m = !fenced && /^(#{1,6}) (.*)$/.exec(lines[i]);
    // Not the title (`# 167 — Follow-ups from a pilot` is the whole spec, not a section of it).
    if (!m || m[1].length === 1 || !/follow-ups/i.test(m[2])) continue;
    const level = m[1].length;
    let end = i + 1;
    for (let inner = false; end < lines.length; end++) {
      if (/^(```|~~~)/.test(lines[end])) inner = !inner;
      const h = !inner && /^(#{1,6}) /.exec(lines[end]);
      if (h && h[1].length <= level) break;
    }
    const body = lines.slice(i + 1, end);
    while (body.length && !body.at(-1).trim()) body.pop();
    out.push({ heading: m[2].trim(), level, lines: body });
    i = end - 1;
  }
  return out;
}

// The fixed fields of a CANDIDATES row (scripts/check-plan-queues.mjs), which a carried body line must not repeat.
const ROW_FIELD = /^- (proposed|source signals|rationale|proposed scope|conflicts|estimated phases):/;

/**
 * The CANDIDATES row carrying `sections` (followUps) of spec `num`: its own `### [ ] [owner]` header and fields, then
 * each section as written, its headings moved down so the section's own heading reads `####` (a `#`-`###` heading
 * would end the row in the queue's lint).
 */
export function followUpsRow(num, title, file, date, sections) {
  const out = [
    `### [ ] [owner] Follow-ups carried from spec ${num} when it retired: ${title}`,
    `- proposed: ${date}, settle retired spec ${num} (its last close's \`absorb:\`); kept verbatim, some may already be done, T triages`,
    `- source signals: the Follow-ups section of \`plan/${file}\`, deleted in the settle commit that added this row.`,
    '- proposed scope: none yet; each is plotted on its own.',
  ];
  for (const s of sections) {
    const shift = 4 - s.level;
    out.push('', `#### ${s.heading}`);
    // The queue lint reads every line, fences included: a fenced `#` line shifts like a heading, and a body line shaped
    // like one of the row's own fields (`- proposed:`) is indented so it does not read as that field twice.
    for (const l of s.lines) {
      const h = /^(#{1,6}) (.*)$/.exec(l);
      out.push(h ? `${'#'.repeat(Math.min(6, Math.max(4, h[1].length + shift)))} ${h[2]}` : ROW_FIELD.test(l) ? `  ${l}` : l);
    }
  }
  return out.join('\n');
}

/** `candidates` with `row` at the end of its `## Pending` section (a new one at the end when it has none). */
export function addCandidate(candidates, row) {
  const lines = candidates.replace(/\n+$/, '').split('\n');
  const start = lines.findIndex((l) => /^## Pending\s*$/.test(l));
  if (start < 0) return `${lines.join('\n')}\n\n## Pending\n\n${row}\n`;
  let end = lines.findIndex((l, i) => i > start && /^## /.test(l));
  if (end < 0) end = lines.length;
  let at = end;
  while (at > start + 1 && !lines[at - 1].trim()) at--;
  lines.splice(at, end - at, '', ...row.split('\n'), ...(end < lines.length ? [''] : []));
  return `${lines.join('\n')}\n`;
}

/**
 * Retire `spec` (plan/NN-*.md, emptied by its last close `p`, which carries `absorb:`): the writes it takes, file →
 * text (null deletes), read through `read`, and what to say. `queue` is the config's build-queue file or null.
 */
export function retireSpec({ spec, p, read, queue = null }) {
  const name = path.basename(spec);
  const num = name.split('-')[0];
  const writes = new Map([[spec, null]]);
  const said = [];
  const readme = read('plan/README.md');
  const title = specTitle(readme, name, read(spec));
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Its rows (the ladder's closeLadderRows, any spec's name), and a lane line still naming one of its chunks.
  const drop = (text, re) => (text === null ? null : text.split('\n').filter((l) => !re.test(l)).join('\n'));
  const rows = [
    ['plan/README.md', new RegExp(`^\\|.*\\]\\(${esc}\\)|^- \\*\\*${num}\\.\\w+\\*\\* · `)],
    ['README.md', new RegExp(`^\\|.*\\(plan/${esc}\\)`)],
    ...(queue ? [[queue, new RegExp(`^- \\[.\\] Phase .*\\(\\.\\./${esc}\\)`)]] : []),
  ];
  for (const [file, re] of rows) {
    const before = read(file);
    const after = drop(before, re);
    if (after !== before) writes.set(file, after);
  }
  const archive = read('plan/ARCHIVE.md') ?? '';
  writes.set('plan/ARCHIVE.md', `${archive.replace(/\n*$/, '\n')}- ${p.date} · ${num} · spec complete: ${title} · ${p.absorb} · deleted in (this commit)\n`);
  const sections = followUps(read(spec));
  const candidates = read('plan/CANDIDATES.md');
  if (sections.length && candidates !== null) {
    writes.set('plan/CANDIDATES.md', addCandidate(candidates, followUpsRow(num, title, name, p.date, sections)));
    said.push(`spec ${num}'s Follow-ups went to plan/CANDIDATES.md`);
  }
  said.unshift(`spec ${num} lists no chunk now: settle retired it (absorb: ${p.absorb}), its rows out, "spec complete" archived`);
  return { writes, said };
}
