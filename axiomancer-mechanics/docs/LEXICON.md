# Lexicon — canonical and retired Axiomancer terminology

<!-- lexicon-ok: src-skills-path, base-power, chip-hp, pressure-tracks, doxa, lemma, thesis, theorem, axiom, enchantment, disenchant, thoughtform, strike-ban-doctrine, status-primacy-doctrine, win-rate-objective-doctrine, colour-match-bonus -->

> The machine-authoritative retired-terms registry is
> [`lexicon.json`](./lexicon.json) — `node scripts/check-lexicon.mjs`
> (repo root) enforces it in CI against every live prose surface. This
> file is the human guide: what the terms mean, which near-collisions
> are deliberate, and how to retire a concept without a three-day
> cleanup.

## The word "skill" — three senses, only one dead

| Sense | Status | Say instead / notes |
|---|---|---|
| The old player-ability data layer (`src/Skills/`, `Skill*` type family, skill trees, `skill.library.ts`) | **RETIRED** (PR #48; de-conflation rename) | `src/Cards/` and the `Card*` type family — cards are the actions played in combat |
| **Signature skills** (`SignatureSkill` family — token-activated abilities: Second Wind, signatures; the Befriend alt-win path; equipment-granted per the phase 18-23 signet epic) | **CANONICAL** | Keep calling them signature skills / signatures |
| AI-harness skills (`skills/` loop verbs, `.claude/skills/` design skills) | out of scope | Harness vocabulary, not game vocabulary — the registry never flags it |

## Other load-bearing canon (quick disambiguation)

- **Hazard-Pattern Combat** is the ONLY combat engine (witness:
  `simulateHazardPatternCombat`). The legacy turn-based
  `resolveCombatRound` and the Pressure Tracks win model are gone
  (2026-06-22).
- **THE STRIKE IS DEAD** (spec 32 v3, 2026-07-08) is itself RETIRED as
  doctrine (THE UNSHACKLING, 2026-08-08): direct damage is legal again.
  What survives is the schema purge — `basePower` / `chipHp` are retired
  words except when describing their removal, and a card wanting raw HP
  damage authors its own field/verb through the full wiring checklist.
- **tier vs rank — never conflate:** `tier` (1-3) is the RESIST axis;
  `rank` (1-6: Ash/Tooth/Splinter/Rib/Skull/Saint — spec 34 R-14, was
  Doxa/Lemma/Thesis/Theorem/Axiom/Aporia) is the QUALITY axis; rarity
  derives from rank.
- **Equipment (post-phase-18):** 5 pieces across 3 slot kinds — 1
  weapon, 1 armor, 3 relics. A relic may be named anything and fits any
  relic position; it has no kind (D105, v39). The 7-slot model and (per the phase 19-23
  epic, as it ships) the procedural modifier/rarity/affix machinery are
  legacy.
- **The colour-match bonus is RETIRED** (D79, 2026-10-10): a die of the
  card's own colour adds nothing. Only the Color Law survives: a die powers
  a grey card, a card of its own colour, or (gold) any card.
- Authority for meaning disputes: root `docs/truth-sources.md` § Source-of-truth hierarchy
  (specs and ADRs outrank docs; docs outrank memory).

## How the enforcement works

- `node scripts/check-lexicon.mjs` scans live prose surfaces
  (root + package `AGENTS.md` / `CLAUDE.md` / `VISION.md` / READMEs,
  `docs/`, `plan/bearings.md`, `skills/`, `.claude/` prompts) for every
  `retired[].pattern`.
- **Two row shapes** (`retired[].type`, phase 66):
  - `identifier` (the default when the field is absent) — a *term*
    (`basePower`, `chipHp`). Matched line by line, as it always was.
  - `doctrine` — a retired *design law* stated as a claim ("THE STRIKE
    IS DEAD", "status effects are the MAIN fun"). Matched against the
    whole file with runs of whitespace collapsed to one space, so a
    sentence wrapped across markdown line breaks is still caught — the
    exact case that let the same drift survive three sweeps in one week.
    Findings still report the original line number.
  - Doctrine patterns are **assertion-scoped**: they match the law
    stated as current, not a mention of its retirement. Otherwise every
    reconciliation the lint asks for would create a new finding.
- **Exempt by zone** (dated records, allowed to speak in period terms):
  `CHANGELOG.md`, `braindump/`, `devlog/`, `plan/`
  (except `bearings.md`), `docs/reports/`, `docs/adr/`, `automation/`,
  and `specs/`.
- **Exempt by banner:** a file whose head carries
  `**Status:** HISTORICAL` is a point-in-time record — stamp dated
  audits/handoffs with it instead of rewriting them.
- **Exempt by pragma:** a file that must legitimately mention a retired
  term (usually to say it was removed) carries
  `<!-- lexicon-ok: base-power, chip-hp -->` once, using the registry
  `id`s. The id list may be followed by ` — why`, and that justification
  is ignored by the parser: `<!-- lexicon-ok: strike-ban-doctrine —
  superseded record, dates itself -->`.

## How to retire a concept (the whole procedure)

1. Add a row to `lexicon.json` (`id`, `type`, `pattern`, `replacement`,
   `since`). Precision beats breadth — pattern the *retired* phrasing,
   not a common word (see "skill" above for why). A retired *law* is a
   `doctrine` row and is authored against single-space prose; a retired
   *term* is an `identifier` row.
2. Run `node scripts/check-lexicon.mjs`. Every flag is either real rot
   (fix the prose), a dated record (add the HISTORICAL banner), or a
   legitimate removal-mention (add the pragma).
3. Update this file's tables if the term is load-bearing.
4. Commit. CI now guards the term forever — a march tick, a tuning PR,
   or a 2am edit that reintroduces it goes red with the file, line, and
   replacement named.
