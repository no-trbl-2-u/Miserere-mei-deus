/**
 * Export the game's canonical libraries into flat JSON the zero-dep DevLog
 * catalog build (`scripts/build-catalog.mjs`) renders into HTML pages. This is
 * the one place the art-free mechanics package meets the mobile art registries,
 * so the catalog can show real paintings next to real data.
 *
 * Run it (repo root):  npm run catalog:export
 * Then render HTML:     npm run catalog:build
 * Or both at once:      npm run catalog
 *
 * It writes:
 *   devlog/data/{cards,enemies,effects}.json  — flat records for the renderer
 *   devlog/data/atlas.json                    — the Atlas page's data (src/Atlas)
 *   devlog/assets/catalog/cards/*             — copied card paintings
 *   devlog/assets/catalog/enemies/*           — copied enemy portraits
 *
 * Card / enemy art lives in the mobile package as Metro `require('./x.webp')`
 * literals (not importable from Node), so the two art registries are parsed as
 * text to recover the id/key → filename mapping, then the files are copied into
 * devlog/ so the served site is self-contained.
 */

import {
    readFileSync,
    writeFileSync,
    mkdirSync,
    copyFileSync,
    existsSync,
    rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

import { cardLibrary, getCardById } from '../src/Cards/cards.library';
import { toCombatCard } from '../src/Combat/combat.cards';
import { CARD_RANK_NAMES, rankToRarity } from '../src/Cards/types';
import { STARTING_CARD_IDS } from '../src/Combat/combat.rewards';
import { mechanicText, riderText } from '../src/Combat/combat.cards';
import { EnemyLibrary } from '../src/Enemy/enemy.library';
import { effectsLibrary, lookupEffect } from '../src/Effects/effects.library';
import { buildAtlasData } from '../src/Atlas/atlas.data';
// Pure, dependency-free presentation mappings (effect → glyph + colour;
// effect id → registry keyword — the same vocabulary the card faces speak).
import { effectGlyph } from '../../axiomancer-mobile/components/combat/statusGlyphs';
import { keywordForEffect } from '../../axiomancer-mobile/state/combat/keywords';

const MECH = join(__dirname, '..');
const ROOT = join(MECH, '..');
const DEVLOG = join(ROOT, 'devlog');
const DATA = join(DEVLOG, 'data');
const CATALOG_ASSETS = join(DEVLOG, 'assets', 'catalog');

const MOBILE_IMAGES = join(ROOT, 'axiomancer-mobile', 'assets', 'images');
const CARD_ART_DIR = join(MOBILE_IMAGES, 'cards');
const ENEMY_ART_DIR = join(MOBILE_IMAGES, 'enemies');

// ---------------------------------------------------------------------------
// Art registry parsing — recover id/key → source filename from the mobile
// `index.ts` files (Metro require literals, so this is the only sane read path).
// ---------------------------------------------------------------------------

/** Enemy registry: `'portrait-key': require('./file.webp'),` — key → filename. */
function parseEnemyArt(): Record<string, string> {
    const src = readFileSync(join(ENEMY_ART_DIR, 'index.ts'), 'utf8');
    const map: Record<string, string> = {};
    const re = /'([^']+)':\s*require\('\.\/([^']+)'\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) map[m[1]] = m[2];
    return map;
}

/**
 * Card registry is two-level: `const varName = require('./file.webp')` then
 * `'card-id': varName,` inside CARD_ART_BY_ID. Resolve id → filename, with the
 * shared placeholder as the fallback for unmapped ids.
 */
function parseCardArt(): { byId: Record<string, string>; fallback: string } {
    const src = readFileSync(join(CARD_ART_DIR, 'index.ts'), 'utf8');
    const varToFile: Record<string, string> = {};
    const varRe = /const\s+(\w+)\s*=\s*require\('\.\/([^']+)'\)/g;
    let m: RegExpExecArray | null;
    while ((m = varRe.exec(src)) !== null) varToFile[m[1]] = m[2];

    const fallbackMatch = src.match(/FALLBACK_CARD_ART\s*=\s*require\('\.\/([^']+)'\)/);
    const fallback = fallbackMatch ? fallbackMatch[1] : 'circe-placeholder.jpg';

    const byId: Record<string, string> = {};
    const idRe = /'([^']+)':\s*(\w+)\s*,/g;
    while ((m = idRe.exec(src)) !== null) {
        const file = varToFile[m[2]];
        if (file) byId[m[1]] = file;
    }
    return { byId, fallback };
}

/** Copy a source painting into devlog/ and return the site-relative path. */
function copyArt(srcDir: string, file: string, subdir: string): string | null {
    const from = join(srcDir, file);
    if (!existsSync(from)) return null;
    const destDir = join(CATALOG_ASSETS, subdir);
    mkdirSync(destDir, { recursive: true });
    copyFileSync(from, join(destDir, file));
    return `./assets/catalog/${subdir}/${file}`;
}

/**
 * Every card ships its point-pricing arithmetic as a `// pts: ...` comment
 * inside its object literal (the point table). It's source-only —
 * never surfaced on the `Card` type — so recover it the same way art gets
 * recovered: parse the declaring file as text, one block per
 * `const <name>: Card = { ... }`, id → first `// pts:` line in the block.
 */
function parsePricingComments(): Record<string, string> {
    const src = readFileSync(join(MECH, 'src', 'Cards', 'cards.library.ts'), 'utf8');
    const blocks = src.split(/\n(?=const \w+: Card = \{)/);
    const out: Record<string, string> = {};
    for (const block of blocks) {
        const id = block.match(/id:\s*'([^']+)'/)?.[1];
        const pts = block.match(/\/\/\s*pts:\s*(.+)/)?.[1]?.trim();
        if (id && pts) out[id] = pts;
    }
    return out;
}

// ---------------------------------------------------------------------------
// How an enemy fights — human blurb per AI logic (Enemy/types.ts).
// ---------------------------------------------------------------------------
const LOGIC_BLURB: Record<string, string> = {
    random: 'Unpredictable — any stance, any action, no pattern to read.',
    aggressive: 'Aggressive — attacks most turns, countering your last stance.',
    defensive: 'Defensive — turtles until wounded, then strikes your weakest stat.',
    balanced: 'Balanced — presses while healthy, defends once below half HP.',
    strategic: 'Strategic — reads your active effects and exploits your vulnerabilities.',
    boss: 'Boss script — a telegraphed, round-keyed signature pattern.',
};

// ---------------------------------------------------------------------------
// Raw-stat summarizers — turn a typed Card / Effect into flat, display-ready
// stat rows. `chips` are compact key/value badges; `lines` are the mechanical
// effects spelled out. No flavour text — just the numbers.
// ---------------------------------------------------------------------------
type Chip = { k: string; v: string };
const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
const pct = (n: number) => `${n > 0 ? '+' : ''}${Math.round((n - 1) * 100)}%`;

/** A card's special-mechanic entry → one short label. */
function specialMechanicLabel(sm: any): string {
    const amt = sm.amount ?? sm.count ?? sm.rungs;
    return mechanicText(sm) ?? (amt != null ? `${sm.kind} ${amt}` : String(sm.kind));
}

// Non-effect FREE riders (guard / draw / premise …) → a terse rune for the
// giant free-glyph; affliction riders use their own effect glyph instead.
// Only rider fields whose keyword is live get a rune; the others fall back
// to the ◆ rune.
const FREE_TXT_GLYPH: Record<string, string> = {
    guard: '❖', barrier: '❖', healHp: '✚', drawCards: '⚑',
    sway: '∿', foretell: '◉', pips: '⬡', stagger: '⚔', cleanse: '✦',
};

// Rider field → the UPPERCASE face keyword the silhouette table keys off
// (build-catalog.mjs GLYPH_SHAPES — the copy of mobile glyphShapes.ts).
const FREE_RIDER_KW: Record<string, string> = {
    guard: 'GUARD', barrier: 'GUARD', healHp: 'HEAL', drawCards: 'DRAW',
    sway: 'PLEA', foretell: 'FORETELL', pips: 'PIP', stagger: 'STAGGER',
    cleanse: 'CLEANSE',
};
// Effect id → UPPERCASE face keyword. The mobile registry (keywordForEffect —
// the exact map the card faces speak) wins; ids outside the registry fall back
// to the stripped id so a silhouette keyed on the raw name can still match.
function effectKw(effectId: string): string {
    const kw = keywordForEffect(effectId);
    if (kw) return kw.toUpperCase();
    if (/mark$/.test(effectId)) return 'MARK';
    return effectId.replace(/^(debuff|buff|tier\d)_/, '').toUpperCase();
}

// The #5 rail FACE fields — ① the giant FREE glyph + intensity (freeKw picks
// the effect-shaped silhouette downstream), ② the authored PAID sentence
// (composed through the real engine, keywords bolded downstream).
function cardFace(c: any): { freeGlyph: string; freeKw: string | null; freeVal: string | null; paid: string } {
    let freeGlyph = '';
    let freeKw: string | null = null;
    let freeVal: string | null = null;
    if (c.free?.applyEffect?.effectId) {
        const eff = lookupEffect(c.free.applyEffect.effectId);
        if (eff) {
            freeGlyph = effectGlyph({ id: eff.id, name: eff.name, type: eff.type, category: eff.category, payload: eff.payload }).glyph;
        }
        freeKw = effectKw(c.free.applyEffect.effectId);
        freeVal = `${c.free.applyEffect.intensity ?? 1}`;
    } else if (c.free) {
        const key = Object.keys(FREE_TXT_GLYPH).find((k) => c.free[k] != null);
        freeGlyph = key ? FREE_TXT_GLYPH[key] : '◆';
        freeKw = key ? FREE_RIDER_KW[key] ?? null : null;
        const num = riderText(c.free).match(/\d+/);
        freeVal = num ? num[0] : null;
    }

    let paid = '';
    const cc = toCombatCard(c.id, getCardById, lookupEffect);
    if (cc) {
        paid = (cc.bottomActionText || '').replace(/^PAID(\s*\([^)]*\))?\s*—\s*/i, '').replace(/\s*Costs\s+1\s+die\.?\s*$/i, '').trim();
    }
    return { freeGlyph, freeKw, freeVal, paid };
}

/**
 * The FREE rider in the authored-prose register — the
 * catalog's FREE line must read like the glyph it annotates, not like
 * `riderText`'s telegraphese ("mark i1 d1 (self)"). Clause order mirrors the
 * glyph-priority order in `cardFace` (applyEffect first, then the
 * FREE_TXT_GLYPH key order), so the line always LEADS with the keyword the
 * giant glyph draws. Same rider data, no invented numbers.
 */
function riderProse(r: any, opts?: { selfTargetCard?: boolean }): string {
    const parts: string[] = [];
    const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
    if (r.applyEffect) {
        const kw = effectKw(r.applyEffect.effectId);
        const i = r.applyEffect.intensity ?? 1;
        const d = r.applyEffect.duration;
        const toSelf = (r.applyEffect.to ?? 'opponent') === 'self';
        const side = toSelf === !!opts?.selfTargetCard ? '' : toSelf ? ' on yourself' : ' on the enemy';
        parts.push(`${kw} ${i}${d ? ` for ${plural(d, 'turn')}` : ''}${side}`);
    }
    if (r.guard) parts.push(`GUARD ${r.guard}`);
    if (r.barrier) parts.push(`GUARD ${r.barrier} (persists)`);
    if (r.healHp) parts.push(`HEAL ${r.healHp}`);
    if (r.drawCards) parts.push(`DRAW ${r.drawCards}`);
    if (r.premises) parts.push(`gain ${plural(r.premises, 'PREMISE').replace(/PREMISEs/, 'PREMISES')}`);
    if (r.sway) parts.push(`SWAY ${r.sway}`);
    if (r.souls) parts.push(`gain ${plural(r.souls, 'SOUL').replace(/SOULs/, 'SOULS')}`);
    if (r.foretell) parts.push(`FORETELL ${r.foretell}`);
    if (r.pips) parts.push(`+${plural(r.pips, 'PIP').replace(/PIPs/, 'PIPS')} to every Reserve die`);
    if (r.stagger) parts.push(`STAGGER ${r.stagger}`);
    if (r.tickOne) parts.push('TICK');
    if (r.tickAllDots) parts.push('TICK every DoT');
    if (r.cleanse) parts.push(`CLEANSE ${r.cleanse}`);
    if (r.recoil) parts.push(`RECOIL ${r.recoil}`);
    if (r.millCards) parts.push(`MILL ${r.millCards}`);
    if (r.revealStance) parts.push('reveal the next stance');
    if (r.conviction) parts.push(`+${r.conviction} Conviction`);
    if (r.refreshDie) parts.push('refresh the die');
    if (r.bonusIntensity) parts.push(`+${r.bonusIntensity} intensity to this card's statuses`);
    if (r.bonusDuration) parts.push(`+${plural(r.bonusDuration, 'turn')} to this card's statuses`);
    if (r.ruptureMarks) parts.push(`consume all MARK stacks — ${r.ruptureMarks} damage per stack`);
    if (r.intensityPerPip) parts.push(`+${r.intensityPerPip} intensity to one DoT per pip`);
    return parts.join(', then ');
}

function cardStats(c: any): { chips: Chip[]; lines: string[] } {
    const chips: Chip[] = [
        { k: 'Stance', v: c.color },
        { k: 'Type', v: c.category },
        { k: 'Tier', v: String(c.tier) },
        { k: 'Target', v: c.targetType === 'self' ? 'self' : 'enemy' },
    ];
    chips.push({ k: 'Rank', v: `${CARD_RANK_NAMES[c.rank as 1] ?? c.rank} (${rankToRarity(c.rank)})` });
    chips.push({ k: 'Kind', v: c.cardType });
    // Every card is both a starter and a reward.
    chips.push({ k: 'Source', v: STARTING_CARD_IDS.includes(c.id) ? 'starter' : 'reward' });

    const lines: string[] = [];
    if (c.free) lines.push(`FREE — ${riderProse(c.free, { selfTargetCard: c.targetType === 'self' })}.`);
    for (const ce of c.combatEffects ?? []) {
        const nm = lookupEffect(ce.effectId)?.name ?? ce.effectId;
        const who = ce.appliedTo === 'self' ? 'self' : 'enemy';
        const dur = ce.duration ? `, ${ce.duration}t` : '';
        lines.push(`Applies ${nm} ×${ce.intensity ?? 1}${dur} → ${who}`);
    }
    for (const sm of c.specialMechanics ?? []) lines.push(specialMechanicLabel(sm));
    return { chips, lines };
}

/** An effect's payload → short mechanical stat lines. */
function payloadLines(p: any): string[] {
    if (!p) return [];
    const out: string[] = [];
    for (const m of p.statModifiers ?? []) {
        out.push(`${m.stat} ${m.isMultiplier ? `×${m.value}` : signed(m.value)}`);
    }
    const d = p.damageOverTime;
    if (d) out.push(`DoT ${d.damagePerRound}/round × intensity (${d.damageType}, ticks ${d.trigger ?? 'round start'})`);
    if (p.damageTakenMult && p.damageTakenMult !== 1) out.push(`Damage taken ${pct(p.damageTakenMult)}`);
    if (p.outgoingDamageMulPct) out.push(`Outgoing damage ${signed(p.outgoingDamageMulPct)}%`);
    const ar = p.actionRestriction;
    if (ar?.skipTurn) out.push('Skips turn');
    return out;
}

// ---------------------------------------------------------------------------
// Build the three record sets
// ---------------------------------------------------------------------------
function buildCards() {
    const { byId, fallback } = parseCardArt();
    const pricing = parsePricingComments();
    const seen = new Set<string>();
    return cardLibrary
        .filter((c) => {
            if (seen.has(c.id)) return false;
            seen.add(c.id);
            return true;
        })
        .map((c) => {
            const file = byId[c.id] ?? fallback;
            const image = copyArt(CARD_ART_DIR, file, 'cards');
            return { id: c.id, name: c.name, image, pricing: pricing[c.id] ?? null, face: cardFace(c), ...cardStats(c) };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
}

function buildEnemies() {
    const art = parseEnemyArt();
    return EnemyLibrary.map((e: any) => {
        const file = art[e.portraitAsset];
        const image = file ? copyArt(ENEMY_ART_DIR, file, 'enemies') : null;
        const cards = (e.cards ?? []).map((s: any) => ({
            name: s.name,
            text: s.description ?? '',
        }));
        return {
            id: e.id,
            name: e.name,
            image,
            level: e.level,
            difficulty: e.difficulty,
            maxHealth: e.maxHealth,
            stats: {
                body: e.baseStats?.body ?? 0,
                mind: e.baseStats?.mind ?? 0,
                heart: e.baseStats?.heart ?? 0,
            },
            logic: e.logic,
            logicBlurb: LOGIC_BLURB[e.logic] ?? e.logic,
            cards,
        };
    }).sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.name.localeCompare(b.name));
}

function buildEffects() {
    const all = [...effectsLibrary.buffs, ...effectsLibrary.debuffs];
    return all
        .filter((e: any) => !(e.tags ?? []).includes('deprecated'))
        .map((e: any) => {
            const g = effectGlyph({
                id: e.id,
                name: e.name,
                type: e.type,
                category: e.category,
                payload: e.payload,
            });
            const chips: Chip[] = [
                { k: 'Type', v: e.type },
                { k: 'Category', v: e.category },
                { k: 'Tier', v: String(e.tier) },
                {
                    k: 'Duration',
                    v: e.duration === -1 ? 'permanent' : e.duration === 0 ? 'instant' : `${e.duration} rounds`,
                },
                { k: 'Stacking', v: e.stacking },
            ];
            return {
                id: e.id,
                name: e.name,
                type: e.type as 'buff' | 'debuff',
                glyph: g.glyph,
                // Registry keyword → the renderer draws the effect's card-face
                // SILHOUETTE where one exists (not every effect has a glyph).
                kw: effectKw(e.id),
                color: g.color,
                kind: g.kind,
                chips,
                lines: payloadLines(e.payload),
            };
        })
        .sort(
            (a, b) =>
                a.type.localeCompare(b.type) || a.name.localeCompare(b.name),
        );
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------
function main() {
    // Start the copied-art tree clean so renamed/removed paintings don't linger.
    if (existsSync(CATALOG_ASSETS)) rmSync(CATALOG_ASSETS, { recursive: true, force: true });
    mkdirSync(DATA, { recursive: true });

    const cards = buildCards();
    const enemies = buildEnemies();
    const effects = buildEffects();

    // Freshness stamp: the catalog is a derived view of the
    // engine libraries — record WHICH tree it was derived from so a stale
    // render is visible on the page itself instead of masquerading as truth.
    let commit = 'unknown';
    try {
        commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    } catch { /* not a git checkout (e.g. exported tarball) — stamp stays 'unknown' */ }
    const meta = { commit, generatedAt: new Date().toISOString().slice(0, 10) };

    writeFileSync(join(DATA, 'cards.json'), JSON.stringify(cards, null, 1) + '\n');
    writeFileSync(join(DATA, 'enemies.json'), JSON.stringify(enemies, null, 1) + '\n');
    writeFileSync(join(DATA, 'effects.json'), JSON.stringify(effects, null, 1) + '\n');
    writeFileSync(join(DATA, 'meta.json'), JSON.stringify(meta, null, 1) + '\n');
    writeFileSync(join(DATA, 'atlas.json'), JSON.stringify(buildAtlasData(meta), null, 1) + '\n');

    console.log(
        `catalog:export — ${cards.length} cards, ${enemies.length} enemies, ` +
            `${effects.length} effects → devlog/data/`,
    );
}

main();
